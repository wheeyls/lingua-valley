import Phaser from "phaser";
import {
  AREAS,
  TILE,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  areaAt,
  type Area,
  type Npc,
} from "../content/world";
import { GameState, REGISTRY_KEY } from "../game/state";
import type { RemotePlayer } from "../domain/ports";

interface NpcSprite {
  npc: Npc;
  container: Phaser.GameObjects.Container;
  label: Phaser.GameObjects.Text;
}

export class WorldScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Container;
  private playerBody!: Phaser.Physics.Arcade.Body;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private interactKey!: Phaser.Input.Keyboard.Key;
  private npcs: NpcSprite[] = [];
  private currentArea?: Area;
  private busy = false; // true while a dialogue/minigame is open

  // Multiplayer presence (via the PresenceGateway port).
  private state!: GameState;
  private remoteSprites = new Map<string, Phaser.GameObjects.Container>();
  private unsubPresence: (() => void) | null = null;
  private lastBroadcast = 0;
  private facing: RemotePlayer["facing"] = "down";

  constructor() {
    super("WorldScene");
  }

  create() {
    this.state = this.registry.get(REGISTRY_KEY) as GameState;

    this.drawWorld();
    this.spawnNpcs();
    this.spawnPlayer();
    this.setupInput();
    this.setupCamera();
    this.setupPresence();

    this.scene.launch("HudScene");

    // Resume flag when overlay scenes close.
    this.events.on("resume", () => {
      this.busy = false;
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubPresence?.();
      void this.state.adapters.presence.leave();
    });
  }

  /** Join the presence channel and render remote players. Thin over the port. */
  private setupPresence() {
    const presence = this.state.adapters.presence;
    const ps = this.state.player.getState();
    const self: RemotePlayer = {
      userId: this.state.adapters.auth.current().id,
      displayName: ps.displayName,
      color: ps.avatarColor,
      x: this.player.x,
      y: this.player.y,
      facing: "down",
    };
    void presence.join("world", self);
    this.unsubPresence = presence.onPlayers((players) =>
      this.renderRemotePlayers(players),
    );
  }

  private renderRemotePlayers(players: RemotePlayer[]) {
    const seen = new Set<string>();
    for (const p of players) {
      seen.add(p.userId);
      let sprite = this.remoteSprites.get(p.userId);
      if (!sprite) {
        const body = this.add.circle(0, 0, 11, p.color).setStrokeStyle(2, 0x1a1423, 1);
        const tag = this.add
          .text(0, -22, p.displayName, {
            fontFamily: "Trebuchet MS",
            fontSize: "11px",
            color: "#cfe8ff",
          })
          .setOrigin(0.5);
        sprite = this.add.container(p.x, p.y, [body, tag]).setDepth(10);
        this.remoteSprites.set(p.userId, sprite);
      }
      // Smoothly move toward the reported position.
      this.tweens.add({ targets: sprite, x: p.x, y: p.y, duration: 120 });
    }
    // Remove players who left.
    for (const [id, sprite] of this.remoteSprites) {
      if (!seen.has(id)) {
        sprite.destroy();
        this.remoteSprites.delete(id);
      }
    }
  }

  private drawWorld() {
    const g = this.add.graphics();
    for (const area of AREAS) {
      g.fillStyle(area.groundColor, 1);
      g.fillRect(area.bounds.x, area.bounds.y, area.bounds.width, area.bounds.height);

      // Subtle tile grid for that Stardew checker feel.
      g.lineStyle(1, area.accentColor, 0.18);
      for (let x = 0; x <= area.bounds.width; x += TILE) {
        g.lineBetween(area.bounds.x + x, area.bounds.y, area.bounds.x + x, area.bounds.y + area.bounds.height);
      }
      for (let y = 0; y <= area.bounds.height; y += TILE) {
        g.lineBetween(area.bounds.x, area.bounds.y + y, area.bounds.x + area.bounds.width, area.bounds.y + y);
      }

      // Area label banner.
      this.add
        .text(area.bounds.x + 12, area.bounds.y + 10, `${area.name}  ·  ${area.level}`, {
          fontFamily: "Trebuchet MS",
          fontSize: "16px",
          color: "#ffffff",
          backgroundColor: "rgba(0,0,0,0.35)",
          padding: { x: 8, y: 4 },
        })
        .setScrollFactor(1)
        .setDepth(5);
    }

    // The threshold between Plaza (A1) and Mercado (A2): a visible archway.
    const thresholdX = AREAS[0].bounds.x + AREAS[0].bounds.width;
    const arch = this.add.graphics();
    arch.fillStyle(0x2b2024, 1);
    arch.fillRect(thresholdX - 6, 0, 12, WORLD_HEIGHT);
    arch.fillStyle(0xd9b08c, 1);
    arch.fillRect(thresholdX - 10, WORLD_HEIGHT / 2 - 48, 20, 96); // gateway gap
    this.add
      .text(thresholdX, 24, "⟶", {
        fontSize: "28px",
        color: "#f4ecd8",
      })
      .setOrigin(0.5)
      .setDepth(6);
  }

  private spawnNpcs() {
    for (const area of AREAS) {
      for (const npc of area.npcs) {
        const px = npc.tileX * TILE + TILE / 2;
        const py = npc.tileY * TILE + TILE / 2;

        const body = this.add.circle(0, 0, 12, npc.color);
        body.setStrokeStyle(2, 0x1a1423, 1);
        // A little hat to read as a "character".
        const hat = this.add.rectangle(0, -10, 16, 6, 0x1a1423);
        const label = this.add
          .text(0, -26, npc.name, {
            fontFamily: "Trebuchet MS",
            fontSize: "12px",
            color: "#fff",
          })
          .setOrigin(0.5);

        const container = this.add.container(px, py, [body, hat, label]);
        container.setDepth(10);
        this.npcs.push({ npc, container, label });
      }
    }
  }

  private spawnPlayer() {
    const start = AREAS[0];
    const px = start.bounds.x + 3 * TILE;
    const py = start.bounds.y + start.bounds.height / 2;

    const body = this.add.circle(0, 0, 11, 0xf4ecd8);
    body.setStrokeStyle(2, 0x1a1423, 1);
    const face = this.add.rectangle(0, -3, 10, 4, 0x1a1423);
    this.player = this.add.container(px, py, [body, face]);
    this.player.setDepth(11);

    this.physics.add.existing(this.player);
    this.playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    this.playerBody.setCircle(11, -11, -11);
    this.playerBody.setCollideWorldBounds(true);
  }

  private setupInput() {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.interactKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE,
    );
    // WASD support.
    this.input.keyboard!.addKeys("W,A,S,D");
  }

  private setupCamera() {
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
  }

  update() {
    if (this.busy) {
      this.playerBody.setVelocity(0, 0);
      return;
    }

    const speed = 180;
    const keys = this.input.keyboard!.addKeys("W,A,S,D") as Record<
      string,
      Phaser.Input.Keyboard.Key
    >;
    let vx = 0;
    let vy = 0;
    if (this.cursors.left.isDown || keys.A.isDown) vx = -speed;
    else if (this.cursors.right.isDown || keys.D.isDown) vx = speed;
    if (this.cursors.up.isDown || keys.W.isDown) vy = -speed;
    else if (this.cursors.down.isDown || keys.S.isDown) vy = speed;
    this.playerBody.setVelocity(vx, vy);

    if (vx < 0) this.facing = "left";
    else if (vx > 0) this.facing = "right";
    else if (vy < 0) this.facing = "up";
    else if (vy > 0) this.facing = "down";

    this.updateAreaContext();
    this.handleInteraction();
    this.broadcastMovement(vx !== 0 || vy !== 0);
  }

  /** Throttle movement broadcasts (~10Hz) through the presence port. */
  private broadcastMovement(moving: boolean) {
    if (!moving) return;
    const now = this.time.now;
    if (now - this.lastBroadcast < 100) return;
    this.lastBroadcast = now;
    this.state.adapters.presence.move({
      x: this.player.x,
      y: this.player.y,
      facing: this.facing,
    });
  }

  private updateAreaContext() {
    const area = areaAt(this.player.x, this.player.y);
    if (area && area.id !== this.currentArea?.id) {
      this.currentArea = area;
      this.cameras.main.flash(250, 255, 255, 255, false);
      this.game.events.emit("areaChanged", area);
    }
  }

  private nearestNpc(): NpcSprite | undefined {
    let best: NpcSprite | undefined;
    let bestDist = Infinity;
    for (const n of this.npcs) {
      const d = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        n.container.x,
        n.container.y,
      );
      if (d < 48 && d < bestDist) {
        best = n;
        bestDist = d;
      }
    }
    return best;
  }

  private handleInteraction() {
    const near = this.nearestNpc();
    // Highlight the interactable NPC.
    for (const n of this.npcs) {
      n.label.setColor(n === near ? "#ffe08a" : "#ffffff");
    }

    if (near && Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      this.busy = true;
      this.scene.pause();
      this.scene.launch("DialogueScene", { npcId: near.npc.id });
    }
  }
}
