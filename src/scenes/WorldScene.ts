/**
 * WorldScene — side-scroller world renderer.
 *
 * Renders one GameMap at a time as a horizontal strip. The player walks
 * left/right. Doors transition between maps. Locked doors block movement.
 * NPCs and items are tappable. Thin adapter over the pure domain (gameMap.ts,
 * objective.ts).
 */

import Phaser from "phaser";
import { GameState, REGISTRY_KEY } from "../game/state";
import { HUD_BAND_HEIGHT } from "../ui/tokens";
import { isCanvasBlocked } from "../ui/html/canvasBlock";
import {
  type GameMap,
  type MapNpc,
  type MapDoor,
  type MapItem,
  npcsOn,
  doorsOn,
  itemsOn,
  isDoorUnlocked,
  isItemVisible,
  movementBound,
  nearestEntity,
} from "../domain/gameMap";
import { getMap } from "../content/maps";
import type { ObjectiveState } from "../domain/objective";

const GROUND_Y = 260; // y-position of the ground line (characters stand here)
const PLAYER_RADIUS = 17;
const NPC_RADIUS = 18;
const INTERACT_RADIUS = 50;

export class WorldScene extends Phaser.Scene {
  private state!: GameState;
  private currentMapId = "street";
  private player!: Phaser.GameObjects.Container;
  private playerX = 100;
  private busy = false;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private interactKey!: Phaser.Input.Keyboard.Key;
  private mapGroup!: Phaser.GameObjects.Group;

  constructor() {
    super("WorldScene");
  }

  create() {
    this.state = this.registry.get(REGISTRY_KEY) as GameState;
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.interactKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.input.keyboard!.addKeys("A,D");
    this.mapGroup = this.add.group();

    this.loadMap("street");
    this.scene.launch("HudScene");

    this.events.on("resume", () => {
      this.busy = false;
      this.refreshMap(); // doors may have unlocked, items may have appeared
    });

    // Tap to walk or interact.
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
      if (this.busy || isCanvasBlocked()) return;
      const worldX = this.cameras.main.getWorldPoint(pointer.x, pointer.y).x;
      const map = getMap(this.currentMapId)!;
      const near = nearestEntity(map, worldX, INTERACT_RADIUS);

      if (near?.kind === "npc") {
        this.interactWithNpc(near as MapNpc);
      } else if (near?.kind === "door") {
        this.interactWithDoor(near as MapDoor);
      } else if (near?.kind === "item") {
        this.interactWithItem(near as MapItem);
      } else {
        // Walk toward the tapped x position.
        this.playerX = this.clampX(worldX);
      }
    });
  }

  // --- Map loading ----------------------------------------------------------

  private loadMap(mapId: string, spawnX?: number) {
    this.currentMapId = mapId;
    const map = getMap(mapId)!;
    this.playerX = spawnX ?? map.spawnX;

    // Clear old map objects.
    this.mapGroup.clear(true, true);
    this.children.removeAll();
    this.mapGroup = this.add.group();

    this.drawMap(map);
    this.spawnPlayer();
    this.setupCamera(map);
  }

  private drawMap(map: GameMap) {
    const h = this.scale.height;

    // Sky.
    this.add.rectangle(map.width / 2, h / 2, map.width, h, 0x87ceeb).setDepth(0);
    // Ground.
    this.add.rectangle(map.width / 2, GROUND_Y + 60, map.width, 120, map.groundColor).setDepth(1);

    // Map name.
    this.add.text(map.width / 2, 20, map.name, {
      fontFamily: "Trebuchet MS",
      fontSize: "18px",
      fontStyle: "bold",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(20);

    const objState = this.getObjState();

    // Draw doors.
    for (const door of doorsOn(map)) {
      const unlocked = isDoorUnlocked(door, objState);
      const doorColor = unlocked ? 0x8b5e3c : 0x555555;
      const g = this.add.graphics();
      g.fillStyle(doorColor, 1);
      g.fillRoundedRect(door.x - 20, GROUND_Y - 60, 40, 60, 6);
      if (!unlocked) {
        g.fillStyle(0x333333, 1);
        g.fillCircle(door.x, GROUND_Y - 30, 4); // lock dot
      }
      g.setDepth(3);

      const label = this.add.text(door.x, GROUND_Y - 70, door.label ?? "Door", {
        fontFamily: "Trebuchet MS",
        fontSize: "14px",
        fontStyle: "bold",
        color: unlocked ? "#ffe08a" : "#888888",
        stroke: "#000000",
        strokeThickness: 2,
      }).setOrigin(0.5).setDepth(4);

      if (!unlocked) {
        this.add.text(door.x, GROUND_Y - 85, "🔒", {
          fontSize: "16px",
        }).setOrigin(0.5).setDepth(5);
      }

      this.mapGroup.addMultiple([g as unknown as Phaser.GameObjects.GameObject, label]);
    }

    // Draw NPCs.
    for (const npc of npcsOn(map)) {
      const body = this.add.circle(npc.x, GROUND_Y - NPC_RADIUS, NPC_RADIUS, npc.color);
      body.setStrokeStyle(3, 0x1a1423);
      body.setDepth(6);
      const hat = this.add.rectangle(npc.x, GROUND_Y - NPC_RADIUS * 2 - 4, 24, 9, 0x1a1423).setDepth(6);
      const name = this.add.text(npc.x, GROUND_Y - NPC_RADIUS * 2 - 22, npc.name, {
        fontFamily: "Trebuchet MS",
        fontSize: "16px",
        fontStyle: "bold",
        color: "#ffffff",
        stroke: "#1a1423",
        strokeThickness: 3,
      }).setOrigin(0.5).setDepth(7);

      this.mapGroup.addMultiple([body, hat, name]);
    }

    // Draw items.
    for (const item of itemsOn(map)) {
      if (!isItemVisible(item, objState)) continue;
      const icon = this.add.text(item.x, GROUND_Y - 30, "🌱", {
        fontSize: "32px",
      }).setOrigin(0.5).setDepth(6);
      const label = this.add.text(item.x, GROUND_Y - 55, item.name, {
        fontFamily: "Trebuchet MS",
        fontSize: "14px",
        color: "#ffe08a",
        stroke: "#000000",
        strokeThickness: 2,
      }).setOrigin(0.5).setDepth(7);

      this.mapGroup.addMultiple([icon, label]);
    }
  }

  private spawnPlayer() {
    const body = this.add.circle(0, 0, PLAYER_RADIUS, 0xf4ecd8);
    body.setStrokeStyle(3, 0x1a1423);
    const face = this.add.rectangle(0, -4, 16, 6, 0x1a1423);
    this.player = this.add.container(this.playerX, GROUND_Y - PLAYER_RADIUS, [body, face]);
    this.player.setDepth(10);
  }

  private setupCamera(map: GameMap) {
    const cam = this.cameras.main;
    const band = HUD_BAND_HEIGHT;
    cam.setBounds(0, 0, map.width, this.scale.height);
    cam.setViewport(0, band, this.scale.width, this.scale.height - band);
    cam.startFollow(this.player, false, 0.15, 0);
    // Lock vertical — side-scroller only scrolls horizontally.
    cam.setFollowOffset(0, 0);
  }

  /** Re-render the current map (after objectives change, doors unlock, etc.) */
  private refreshMap() {
    this.loadMap(this.currentMapId, this.playerX);
  }

  // --- Update loop ----------------------------------------------------------

  update() {
    if (this.busy || isCanvasBlocked()) return;

    const speed = 3;
    const keys = this.input.keyboard!.addKeys("A,D") as Record<string, Phaser.Input.Keyboard.Key>;
    let dx = 0;
    if (this.cursors.left.isDown || keys.A.isDown) dx = -speed;
    else if (this.cursors.right.isDown || keys.D.isDown) dx = speed;

    if (dx !== 0) {
      this.playerX = this.clampX(this.playerX + dx);
    }

    // Smoothly move the player sprite toward playerX.
    const diff = this.playerX - this.player.x;
    if (Math.abs(diff) > 1) {
      this.player.x += diff * 0.2;
    } else {
      this.player.x = this.playerX;
    }

    // Keyboard interact.
    if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      const map = getMap(this.currentMapId)!;
      const near = nearestEntity(map, this.playerX, INTERACT_RADIUS);
      if (near?.kind === "npc") this.interactWithNpc(near as MapNpc);
      else if (near?.kind === "door") this.interactWithDoor(near as MapDoor);
      else if (near?.kind === "item") this.interactWithItem(near as MapItem);
    }
  }

  /** Clamp x to map bounds AND locked-door walls. */
  private clampX(x: number): number {
    const map = getMap(this.currentMapId)!;
    const objState = this.getObjState();
    let min = PLAYER_RADIUS;
    let max = map.width - PLAYER_RADIUS;

    const leftWall = movementBound(map, this.playerX, "left", objState);
    const rightWall = movementBound(map, this.playerX, "right", objState);
    if (leftWall !== null) min = Math.max(min, leftWall + 30); // 30px buffer so you can't overlap
    if (rightWall !== null) max = Math.min(max, rightWall - 30);

    return Math.max(min, Math.min(max, x));
  }

  // --- Interactions ---------------------------------------------------------

  private getObjState(): ObjectiveState {
    return this.state.player.getState().daily.objectiveState;
  }

  private interactWithNpc(npc: MapNpc) {
    this.busy = true;
    this.scene.pause();
    this.scene.launch("DialogueScene", { npcId: npc.npcId });
  }

  private interactWithDoor(door: MapDoor) {
    const objState = this.getObjState();
    if (!isDoorUnlocked(door, objState)) return; // locked, do nothing

    // If the door leads to the same map, just warp the player.
    if (door.targetMapId === this.currentMapId) {
      this.playerX = door.targetX;
      this.player.x = door.targetX;
      return;
    }

    // Transition to another map.
    this.loadMap(door.targetMapId, door.targetX);
  }

  private interactWithItem(item: MapItem) {
    const objState = this.getObjState();
    if (!isItemVisible(item, objState)) return;

    // For now, the only item is the flower → triggers day-complete.
    if (item.itemId === "water-bottle") {
      this.triggerDayComplete();
    }
  }

  private triggerDayComplete() {
    this.busy = true;
    this.scene.pause();
    this.scene.launch("SuccessScene");
  }
}
