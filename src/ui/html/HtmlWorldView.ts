/**
 * HtmlWorldView — room-based point-and-click navigator.
 *
 * Each "room" is a static screen showing tappable NPCs, doors, and items as
 * cards. Tap an NPC to talk, tap a door to enter (if unlocked), back button to
 * go back. No movement, no scrolling, no player character. A tree of screens.
 */

import "./room.css";
import type { GameMap, MapNpc, MapDoor, MapItem } from "../../domain/gameMap";
import { npcsOn, doorsOn, itemsOn, isDoorUnlocked, isItemVisible, isNpcAvailable } from "../../domain/gameMap";
import type { ObjectiveState } from "../../domain/objective";
import { npcAvatarSvg, HOUSE_DOOR_SVG, LOCKED_DOOR_SVG } from "../../content/art";

export interface WorldViewCallbacks {
  onNpcTap: (npc: MapNpc) => void;
  onDoorTap: (door: MapDoor) => void;
  onItemTap: (item: MapItem) => void;
}

export class HtmlWorldView {
  private root: HTMLDivElement;
  private barEl: HTMLDivElement;
  private bodyEl: HTMLDivElement;
  private callbacks: WorldViewCallbacks;
  private currentMap!: GameMap;

  constructor(callbacks: WorldViewCallbacks) {
    this.callbacks = callbacks;

    this.root = document.createElement("div");
    this.root.className = "room";

    this.barEl = document.createElement("div");
    this.barEl.className = "room-bar";
    this.root.appendChild(this.barEl);

    this.bodyEl = document.createElement("div");
    this.bodyEl.className = "room-body";
    this.root.appendChild(this.bodyEl);

    document.body.appendChild(this.root);
  }

  loadMap(map: GameMap, objState: ObjectiveState, completedNpcIds: Set<string> = new Set()) {
    this.currentMap = map;
    this.renderRoom(map, objState, completedNpcIds);
  }

  refresh(objState: ObjectiveState, completedNpcIds: Set<string> = new Set()) {
    this.renderRoom(this.currentMap, objState, completedNpcIds);
  }

  updateHud(pesos: number) {
    const info = this.barEl.querySelector(".hud-info");
    if (info) info.textContent = `💰 ${pesos}`;
  }

  /**
   * Show a single daily status in the HUD: either "done + reset time"
   * or nothing (when not done — character cards show per-NPC status instead).
   */
  updateDailyStatus(opts: {
    allDone: boolean;
    hoursUntilReset?: number;
    minutesUntilReset?: number;
  }) {
    let statusEl = this.barEl.querySelector(".hud-daily") as HTMLElement | null;
    if (!opts.allDone) {
      if (statusEl) statusEl.remove();
      return;
    }
    if (!statusEl) {
      statusEl = document.createElement("div");
      statusEl.className = "hud-daily";
      this.barEl.appendChild(statusEl);
    }
    const h = opts.hoursUntilReset ?? 0;
    const m = opts.minutesUntilReset ?? 0;
    const timeStr = h > 0 ? `${h}h` : m > 0 ? `${m}m` : "soon";
    statusEl.innerHTML = `✅ Done! Back in ${timeStr}`;
  }

  getPlayerX(): number { return 0; }
  destroy() { this.root.remove(); }

  private renderRoom(map: GameMap, objState: ObjectiveState, completedNpcIds: Set<string> = new Set()) {
    // Top bar
    this.barEl.innerHTML = `
      <span class="room-name">${map.name}</span>
      <span class="hud-info"></span>
    `;

    // Background: full-bleed SVG behind the cards
    const existingBg = this.root.querySelector(".room-bg");
    if (existingBg) existingBg.remove();
    if (map.backgroundSvg) {
      const bg = document.createElement("div");
      bg.className = "room-bg";
      bg.style.cssText = "position:absolute;inset:0;z-index:0;overflow:hidden;";
      bg.innerHTML = map.backgroundSvg;
      const svg = bg.querySelector("svg");
      if (svg) svg.style.cssText = "width:100%;height:100%;object-fit:cover;display:block;";
      this.root.insertBefore(bg, this.bodyEl);
    }

    // Make body sit above the background
    this.bodyEl.style.position = "relative";
    this.bodyEl.style.zIndex = "1";

    this.bodyEl.innerHTML = "";

    // NPC cards — SVG avatar as the icon
    for (const npc of npcsOn(map)) {
      const available = isNpcAvailable(npc, objState);
      const done = completedNpcIds.has(npc.npcId);
      const color = `#${npc.color.toString(16).padStart(6, "0")}`;
      const initial = npc.name[0].toUpperCase();
      const card = document.createElement("div");
      card.className = `card card-npc${done ? " card-npc-done" : ""}`;
      if (!available) card.style.opacity = "0.45";
      card.innerHTML = `
        <div class="card-avatar-wrap">
          <div class="card-avatar">
            ${npc.art
              ? `<img src="${npc.art}" alt="${npc.name}" class="card-avatar-img"/>`
              : npcAvatarSvg(color, initial)
            }
          </div>
          ${done ? '<div class="card-npc-badge">✓</div>' : ""}
        </div>
        <div class="card-label">${npc.name}</div>
        <div class="card-hint">${!available ? "🔒 Talk to others first" : done ? "Done today ✓" : "Tap to talk"}</div>
      `;
      if (available) {
        card.addEventListener("pointerdown", (e) => {
          e.stopPropagation();
          this.callbacks.onNpcTap(npc);
        });
      }
      this.bodyEl.appendChild(card);
    }

    // Door cards — house facade SVG
    for (const door of doorsOn(map)) {
      const unlocked = isDoorUnlocked(door, objState);
      const card = document.createElement("div");
      card.className = `card card-door ${unlocked ? "unlocked" : "locked"}`;
      card.innerHTML = `
        <div class="card-door-art">${unlocked ? HOUSE_DOOR_SVG : LOCKED_DOOR_SVG}</div>
        <div class="card-label">${door.label ?? "Door"}</div>
      `;
      if (unlocked) {
        card.addEventListener("pointerdown", (e) => {
          e.stopPropagation();
          this.callbacks.onDoorTap(door);
        });
      }
      this.bodyEl.appendChild(card);
    }

    // Item cards
    for (const item of itemsOn(map)) {
      if (!isItemVisible(item, objState)) continue;
      const card = document.createElement("div");
      card.className = "card card-item";
      card.innerHTML = `
        <div class="card-icon-text">🌱</div>
        <div class="card-label">${item.name}</div>
      `;
      card.addEventListener("pointerdown", (e) => {
        e.stopPropagation();
        this.callbacks.onItemTap(item);
      });
      this.bodyEl.appendChild(card);
    }
  }
}
