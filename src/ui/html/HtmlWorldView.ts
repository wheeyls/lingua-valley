/**
 * HtmlWorldView — flat point-and-click hub.
 *
 * A single static screen showing tappable NPCs and live cards. Tap an NPC to
 * talk. No movement, no scrolling, no player character, no sub-screens.
 */

import "./room.css";
import type { GameMap, MapNpc } from "../../domain/gameMap";
import { npcAvatarSvg } from "../../content/art";

export interface WorldViewCallbacks {
  onNpcTap: (npc: MapNpc) => void;
}

/** A live, state-driven card injected by the controller (the garden). */
export interface ExtraCard {
  id: string;
  icon: string;
  label: string;
  hint: string;
  grid?: string[][];
  onTap: () => void;
}

export class HtmlWorldView {
  private root: HTMLDivElement;
  private barEl: HTMLDivElement;
  private bodyEl: HTMLDivElement;
  private callbacks: WorldViewCallbacks;
  private currentMap!: GameMap;
  private extraCards: ExtraCard[] = [];
  private lastCompleted: Set<string> = new Set();

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

  loadMap(map: GameMap, completedNpcIds: Set<string> = new Set()) {
    this.currentMap = map;
    this.lastCompleted = completedNpcIds;
    this.renderRoom(map, completedNpcIds);
  }

  /** Set the live, controller-driven cards (field, station) and re-render. */
  setExtraCards(cards: ExtraCard[]) {
    this.extraCards = cards;
    if (this.currentMap) {
      this.renderRoom(this.currentMap, this.lastCompleted);
    }
  }

  updateHud(money: number) {
    const info = this.barEl.querySelector(".hud-info");
    if (info) info.textContent = `💰 ${money}`;
  }

  /**
   * Show (or hide, when `url` is null) a link to this week's group checkpoint
   * in the HUD bar, just left of the user/logout block.
   */
  setCheckpointLink(url: string | null) {
    const existing = this.barEl.querySelector(".hud-checkpoint") as HTMLAnchorElement | null;
    if (!url) {
      existing?.remove();
      return;
    }
    let linkEl = existing;
    if (!linkEl) {
      linkEl = document.createElement("a");
      linkEl.className = "hud-checkpoint";
      linkEl.title = "This week's checkpoint";
      linkEl.textContent = "💐";
      const userEl = this.barEl.querySelector(".hud-user");
      if (userEl) this.barEl.insertBefore(linkEl, userEl);
      else this.barEl.appendChild(linkEl);
    }
    linkEl.href = url;
  }

  /** Show the current user email + logout button in the HUD bar. */
  setUser(displayName: string, onLogout: () => void) {
    let userEl = this.barEl.querySelector(".hud-user") as HTMLElement | null;
    if (!userEl) {
      userEl = document.createElement("div");
      userEl.className = "hud-user";
      this.barEl.appendChild(userEl);
    }
    userEl.innerHTML = `
      <span class="hud-user-name">${displayName}</span>
      <button class="hud-logout-btn">Logout</button>
    `;
    userEl.querySelector(".hud-logout-btn")!.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      onLogout();
    });
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

  destroy() { this.root.remove(); }

  private renderRoom(map: GameMap, completedNpcIds: Set<string> = new Set()) {
    // Top bar — update the per-room bits (name) in place rather than
    // resetting the whole bar's innerHTML, so persistent overlay children
    // appended elsewhere (.hud-info, .hud-checkpoint, .hud-user, .hud-daily)
    // survive across the multiple renderRoom calls one GameController.render()
    // triggers (loadMap/setExtraCards each call this).
    let nameEl = this.barEl.querySelector(".room-name") as HTMLElement | null;
    if (!nameEl) {
      nameEl = document.createElement("span");
      nameEl.className = "room-name";
      this.barEl.insertBefore(nameEl, this.barEl.firstChild);
    }
    nameEl.textContent = map.name;

    if (!this.barEl.querySelector(".hud-info")) {
      const infoEl = document.createElement("span");
      infoEl.className = "hud-info";
      this.barEl.insertBefore(infoEl, nameEl.nextSibling);
    }

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

    // NPC cards — SVG avatar as the icon, an optional icon badge for flavor.
    for (const npc of map.npcs) {
      const done = completedNpcIds.has(npc.npcId);
      const color = `#${npc.color.toString(16).padStart(6, "0")}`;
      const initial = npc.name[0].toUpperCase();
      const card = document.createElement("div");
      card.className = `card card-npc${done ? " card-npc-done" : ""}`;
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
        <div class="card-label">${npc.icon ? `${npc.icon} ` : ""}${npc.name}</div>
        <div class="card-hint">${done ? "Done today ✓" : "Tap to talk"}</div>
      `;
      card.addEventListener("pointerdown", (e) => {
        e.stopPropagation();
        this.callbacks.onNpcTap(npc);
      });
      this.bodyEl.appendChild(card);
    }

    for (const extra of this.extraCards) {
      const card = document.createElement("div");
      card.className = extra.grid ? "card card-item card-garden" : "card card-item";
      const visual = extra.grid
        ? `<div class="garden-grid">${extra.grid
            .map(
              (row) =>
                `<div class="garden-row">${row
                  .map((cell) => `<span class="garden-cell">${cell}</span>`)
                  .join("")}</div>`,
            )
            .join("")}</div>`
        : `<div class="card-icon-text">${extra.icon}</div>`;
      card.innerHTML = `
        ${visual}
        <div class="card-label">${extra.label}</div>
        <div class="card-hint">${extra.hint}</div>
      `;
      card.addEventListener("pointerdown", (e) => {
        e.stopPropagation();
        extra.onTap();
      });
      this.bodyEl.appendChild(card);
    }
  }
}
