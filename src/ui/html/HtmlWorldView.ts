/**
 * HtmlWorldView — flat point-and-click hub.
 *
 * A single static screen: a small mini-map (aspect-locked SVG stage) with
 * tappable NPC pins positioned over it. Tap a pin to talk. No movement, no
 * scrolling, no player character, no sub-screens.
 *
 * Two orientation stages (landscape/portrait, from the campaign's HubMaps)
 * are both built into the DOM; a CSS breakpoint in room.css shows exactly
 * one, so switching is instant on resize with no JS resize listener. The
 * campaign's growable resource cards (garden/foliage/etc) no longer render
 * inline here — they live in an HtmlInventoryDrawer, opened via the
 * backpack button in the top bar, so the stage gets the full screen.
 */

import "./room.css";
import type { GameMap, HubMaps, MapNpc } from "../../domain/gameMap";
import { npcThumbnailSvg } from "../../content/art";
import { HtmlInventoryDrawer, type ExtraCard } from "./HtmlInventoryDrawer";

export interface WorldViewCallbacks {
  onNpcTap: (npc: MapNpc) => void;
}

export class HtmlWorldView {
  private root: HTMLDivElement;
  private barEl: HTMLDivElement;
  private bodyEl: HTMLDivElement;
  private callbacks: WorldViewCallbacks;
  private drawer: HtmlInventoryDrawer;

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

    this.drawer = new HtmlInventoryDrawer();
    this.setupInventoryButton();
  }

  loadMap(hub: HubMaps, completedNpcIds: Set<string> = new Set()) {
    this.renderRoom(hub, completedNpcIds);
  }

  /** Set the live, controller-driven cards (field, station) in the drawer. */
  setExtraCards(cards: ExtraCard[]) {
    this.drawer.setCards(cards);
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

  destroy() {
    this.root.remove();
    this.drawer.destroy();
  }

  /** Backpack button, top bar — opens the inventory drawer. Inserted once;
   *  survives renderRoom's per-orientation rebuilds since those only ever
   *  touch .room-bar's name/info spans, not this. */
  private setupInventoryButton() {
    const btn = document.createElement("button");
    btn.className = "hud-inventory-btn";
    btn.type = "button";
    btn.title = "Your things";
    btn.textContent = "🎒";
    btn.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.drawer.toggle();
    });
    this.barEl.appendChild(btn);
  }

  private renderRoom(hub: HubMaps, completedNpcIds: Set<string> = new Set()) {
    // Top bar — update the per-room bits (name) in place rather than
    // resetting the whole bar's innerHTML, so persistent overlay children
    // appended elsewhere (.hud-info, .hud-checkpoint, .hud-user, .hud-daily,
    // .hud-inventory-btn) survive across the multiple renderRoom calls one
    // GameController.render() triggers (loadMap/setExtraCards each call this).
    let nameEl = this.barEl.querySelector(".room-name") as HTMLElement | null;
    if (!nameEl) {
      nameEl = document.createElement("span");
      nameEl.className = "room-name";
      this.barEl.insertBefore(nameEl, this.barEl.firstChild);
    }
    nameEl.textContent = hub.landscape.name;

    if (!this.barEl.querySelector(".hud-info")) {
      const infoEl = document.createElement("span");
      infoEl.className = "hud-info";
      this.barEl.insertBefore(infoEl, nameEl.nextSibling);
    }

    this.bodyEl.innerHTML = "";
    this.bodyEl.appendChild(this.buildStage(hub.landscape, "room-stage--landscape", completedNpcIds));
    this.bodyEl.appendChild(this.buildStage(hub.portrait, "room-stage--portrait", completedNpcIds));
  }

  /** Build one orientation's aspect-locked stage: background art + NPC pins. */
  private buildStage(
    map: GameMap,
    orientationClass: string,
    completedNpcIds: Set<string>,
  ): HTMLElement {
    const stage = document.createElement("div");
    stage.className = `room-stage ${orientationClass}`;
    stage.style.aspectRatio = `${map.viewBoxWidth} / ${map.viewBoxHeight}`;

    const bg = document.createElement("div");
    bg.className = "room-stage-bg";
    bg.style.cssText = "position:absolute;inset:0;";
    bg.innerHTML = map.backgroundSvg;
    stage.appendChild(bg);

    // NPC pins — small "mini-map" markers positioned over the stage.
    const markers = document.createElement("div");
    markers.className = "room-markers";
    for (const npc of map.npcs) {
      const done = completedNpcIds.has(npc.npcId);
      const color = `#${npc.color.toString(16).padStart(6, "0")}`;
      const marker = document.createElement("div");
      marker.className = `map-marker${done ? " marker-done" : ""}`;
      marker.style.left = `${npc.x}%`;
      marker.style.top = `${npc.y}%`;
      marker.innerHTML = `
        <div class="marker-pin">
          <div class="marker-avatar">
            ${npc.art
              ? `<img src="${npc.art}" alt="${npc.name}"/>`
              : npcThumbnailSvg(color)
            }
          </div>
          ${done ? '<div class="marker-badge">✓</div>' : ""}
        </div>
        <div class="marker-label">
          <div class="marker-location">${npc.icon ? `${npc.icon} ` : ""}${npc.locationName}</div>
          <div class="marker-npc-name">${npc.name}</div>
        </div>
      `;
      marker.addEventListener("pointerdown", (e) => {
        e.stopPropagation();
        this.callbacks.onNpcTap(npc);
      });
      markers.appendChild(marker);
    }
    stage.appendChild(markers);

    return stage;
  }
}
