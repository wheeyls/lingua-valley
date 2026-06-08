/**
 * HtmlWorldView — replaces the Phaser canvas for the side-scroller world.
 * Pure DOM rendering: horizontal strip with NPCs, doors, items, and a player.
 * CSS handles animations, responsive layout, safe areas, and font rendering.
 */

import "./world.css";
import type { GameMap, MapNpc, MapDoor, MapItem } from "../../domain/gameMap";
import { npcsOn, doorsOn, itemsOn, isDoorUnlocked, isItemVisible, movementBound } from "../../domain/gameMap";
import type { ObjectiveState } from "../../domain/objective";

export interface WorldViewCallbacks {
  onNpcTap: (npc: MapNpc) => void;
  onDoorTap: (door: MapDoor) => void;
  onItemTap: (item: MapItem) => void;
}

const PLAYER_RADIUS = 20;

export class HtmlWorldView {
  private container: HTMLDivElement;
  private scrollEl: HTMLDivElement;
  private groundEl: HTMLDivElement;
  private playerEl: HTMLDivElement;
  private hudEl: HTMLDivElement;
  private callbacks: WorldViewCallbacks;

  private playerX = 100;
  private currentMap!: GameMap;
  private moveInterval: ReturnType<typeof setInterval> | null = null;

  constructor(callbacks: WorldViewCallbacks) {
    this.callbacks = callbacks;

    this.container = document.createElement("div");
    this.container.className = "world-container";

    // HUD bar
    this.hudEl = document.createElement("div");
    this.hudEl.className = "world-hud";
    this.container.appendChild(this.hudEl);

    // Scroll strip (contains all entities)
    this.scrollEl = document.createElement("div");
    this.scrollEl.className = "world-scroll";
    this.container.appendChild(this.scrollEl);

    // Ground
    this.groundEl = document.createElement("div");
    this.groundEl.className = "world-ground";
    this.scrollEl.appendChild(this.groundEl);

    // Player
    this.playerEl = document.createElement("div");
    this.playerEl.className = "player";
    this.playerEl.innerHTML = '<div class="player-face"></div>';
    this.scrollEl.appendChild(this.playerEl);

    // Touch zones for movement
    this.setupTouchMovement();

    // Keyboard movement
    this.setupKeyboard();

    document.body.appendChild(this.container);
  }

  loadMap(map: GameMap, objState: ObjectiveState, spawnX?: number) {
    this.currentMap = map;
    this.playerX = spawnX ?? map.spawnX;

    // Clear old entities (keep ground + player)
    this.scrollEl.querySelectorAll(".entity").forEach((e) => e.remove());

    // Ground color
    this.groundEl.style.background = `#${map.groundColor.toString(16).padStart(6, "0")}`;

    // HUD
    this.hudEl.innerHTML = `
      <span class="map-name">${map.name}</span>
    `;

    // Draw entities
    const entityBase = this.getEntityBottom();

    for (const npc of npcsOn(map)) {
      const el = this.createNpcEl(npc, entityBase);
      this.scrollEl.appendChild(el);
    }

    for (const door of doorsOn(map)) {
      const el = this.createDoorEl(door, entityBase, isDoorUnlocked(door, objState));
      this.scrollEl.appendChild(el);
    }

    for (const item of itemsOn(map)) {
      if (!isItemVisible(item, objState)) continue;
      const el = this.createItemEl(item, entityBase);
      this.scrollEl.appendChild(el);
    }

    this.updatePlayerPosition();
  }

  /** Re-render doors/items (after objectives change). */
  refresh(objState: ObjectiveState) {
    this.loadMap(this.currentMap, objState, this.playerX);
  }

  updateHud(pesos: number) {
    const pesosEl = this.hudEl.querySelector(".hud-pesos");
    if (pesosEl) {
      pesosEl.textContent = `💰 ${pesos}`;
    } else {
      const span = document.createElement("span");
      span.className = "hud-pesos";
      span.textContent = `💰 ${pesos}`;
      this.hudEl.appendChild(span);
    }
  }

  getPlayerX(): number {
    return this.playerX;
  }

  destroy() {
    if (this.moveInterval) clearInterval(this.moveInterval);
    this.container.remove();
  }

  // --- Private: entity creation ---------------------------------------------

  private getEntityBottom(): number {
    // Entities sit on the ground line. In CSS, we position from the top.
    // Ground is bottom 35% of the container, so entities bottom = 65% from top.
    return 65; // percentage
  }

  private createNpcEl(npc: MapNpc, _bottomPct: number): HTMLElement {
    const el = document.createElement("div");
    el.className = "entity entity-npc";
    el.style.left = `${npc.x}px`;
    el.style.bottom = "35%";
    el.innerHTML = `
      <div class="npc-hat"></div>
      <div class="npc-body" style="background:#${npc.color.toString(16).padStart(6, "0")}"></div>
      <div class="npc-name">${npc.name}</div>
    `;
    el.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.callbacks.onNpcTap(npc);
    });
    return el;
  }

  private createDoorEl(door: MapDoor, _bottomPct: number, unlocked: boolean): HTMLElement {
    const el = document.createElement("div");
    el.className = `entity entity-door ${unlocked ? "unlocked" : "locked"}`;
    el.style.left = `${door.x}px`;
    el.style.bottom = "35%";
    el.innerHTML = `
      ${!unlocked ? '<div class="lock-icon">🔒</div>' : ""}
      <div class="door-body"${unlocked ? ' style="background:#8b5e3c"' : ""}></div>
      <div class="door-label">${door.label ?? "Door"}</div>
    `;
    el.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.callbacks.onDoorTap(door);
    });
    return el;
  }

  private createItemEl(item: MapItem, _bottomPct: number): HTMLElement {
    const el = document.createElement("div");
    el.className = "entity entity-item";
    el.style.left = `${item.x}px`;
    el.style.bottom = "35%";
    el.innerHTML = `
      <div class="item-icon">🌱</div>
      <div class="item-name">${item.name}</div>
    `;
    el.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.callbacks.onItemTap(item);
    });
    return el;
  }

  // --- Private: movement ----------------------------------------------------

  private updatePlayerPosition() {
    this.playerEl.style.left = `${this.playerX}px`;
    this.playerEl.style.bottom = "35%";

    // Scroll the strip so the player stays centered horizontally.
    const vw = window.innerWidth;
    const offset = Math.max(0, this.playerX - vw / 2);
    const maxOffset = Math.max(0, this.currentMap.width - vw);
    this.scrollEl.style.transform = `translateX(-${Math.min(offset, maxOffset)}px)`;
  }

  private clampX(x: number, objState: ObjectiveState): number {
    let min = PLAYER_RADIUS;
    let max = this.currentMap.width - PLAYER_RADIUS;

    const leftWall = movementBound(this.currentMap, this.playerX, "left", objState);
    const rightWall = movementBound(this.currentMap, this.playerX, "right", objState);
    if (leftWall !== null) min = Math.max(min, leftWall + 30);
    if (rightWall !== null) max = Math.min(max, rightWall - 30);

    return Math.max(min, Math.min(max, x));
  }

  /** Move the player, respecting locked-door walls. */
  movePlayer(dx: number, objState: ObjectiveState) {
    this.playerX = this.clampX(this.playerX + dx, objState);
    this.updatePlayerPosition();
  }

  private setupTouchMovement() {
    const leftZone = document.createElement("div");
    leftZone.className = "touch-left";
    const rightZone = document.createElement("div");
    rightZone.className = "touch-right";

    const startMove = (dir: number) => {
      this.stopMove();
      this.moveInterval = setInterval(() => {
        // Get fresh obj state from a callback or stored reference.
        // For now, move with empty state (the app controller will pass real state).
        this.playerX += dir * 4;
        this.updatePlayerPosition();
      }, 16);
    };

    leftZone.addEventListener("pointerdown", () => startMove(-1));
    rightZone.addEventListener("pointerdown", () => startMove(1));

    const stop = () => this.stopMove();
    leftZone.addEventListener("pointerup", stop);
    leftZone.addEventListener("pointerleave", stop);
    rightZone.addEventListener("pointerup", stop);
    rightZone.addEventListener("pointerleave", stop);

    this.container.appendChild(leftZone);
    this.container.appendChild(rightZone);
  }

  private stopMove() {
    if (this.moveInterval) {
      clearInterval(this.moveInterval);
      this.moveInterval = null;
    }
  }

  private setupKeyboard() {
    const keys = new Set<string>();
    document.addEventListener("keydown", (e) => {
      keys.add(e.key);
    });
    document.addEventListener("keyup", (e) => {
      keys.delete(e.key);
    });

    const tick = () => {
      if (keys.has("ArrowLeft") || keys.has("a")) {
        this.playerX -= 4;
        this.updatePlayerPosition();
      }
      if (keys.has("ArrowRight") || keys.has("d")) {
        this.playerX += 4;
        this.updatePlayerPosition();
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}
