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

  loadMap(map: GameMap, objState: ObjectiveState) {
    this.currentMap = map;
    this.renderRoom(map, objState);
  }

  refresh(objState: ObjectiveState) {
    this.renderRoom(this.currentMap, objState);
  }

  updateHud(pesos: number) {
    const info = this.barEl.querySelector(".hud-info");
    if (info) info.textContent = `💰 ${pesos}`;
  }

  getPlayerX(): number { return 0; }
  destroy() { this.root.remove(); }

  private renderRoom(map: GameMap, objState: ObjectiveState) {
    this.barEl.innerHTML = `
      <span class="room-name">${map.name}</span>
      <span class="hud-info"></span>
    `;

    this.bodyEl.innerHTML = "";

    for (const npc of npcsOn(map)) {
      const available = isNpcAvailable(npc, objState);
      const card = document.createElement("div");
      card.className = "card card-npc";
      if (!available) card.style.opacity = "0.4";
      card.innerHTML = `
        <div class="card-icon" style="background:#${npc.color.toString(16).padStart(6, "0")}"></div>
        <div class="card-label">${npc.name}</div>
        <div class="card-hint">${available ? "Tap to talk" : "🔒 Complete other tasks first"}</div>
      `;
      if (available) {
        card.addEventListener("pointerdown", (e) => {
          e.stopPropagation();
          this.callbacks.onNpcTap(npc);
        });
      }
      this.bodyEl.appendChild(card);
    }

    for (const door of doorsOn(map)) {
      const unlocked = isDoorUnlocked(door, objState);
      const card = document.createElement("div");
      card.className = `card card-door ${unlocked ? "unlocked" : "locked"}`;
      card.innerHTML = `
        <div class="card-icon-text">${unlocked ? "🚪" : "🔒"}</div>
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
