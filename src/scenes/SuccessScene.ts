/**
 * SuccessScene — celebration screen after watering the flower.
 * Shows progress summary + when the house resets. HTML overlay.
 */

import Phaser from "phaser";
import { GameState, REGISTRY_KEY } from "../game/state";
import { completeDayResult } from "../domain/dayComplete";
import { blockCanvas, unblockCanvas } from "../ui/html/canvasBlock";

export class SuccessScene extends Phaser.Scene {
  private root?: HTMLDivElement;

  constructor() {
    super("SuccessScene");
  }

  create() {
    const state = this.registry.get(REGISTRY_KEY) as GameState;
    const graph = state.objectives;
    const objState = state.player.getState().daily.objectiveState;

    // Sum up rewards earned today.
    let totalReward = 0;
    for (const obj of graph.all()) {
      if (objState[obj.id]) totalReward += obj.reward;
    }

    const result = completeDayResult(new Date(), totalReward);

    this.root = document.createElement("div");
    this.root.className = "overlay";
    this.root.style.cssText = `
      position: fixed; inset: 0; z-index: 20;
      background: rgba(13, 10, 18, 0.97);
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      font-family: "Trebuchet MS", sans-serif; color: #f4ecd8;
      padding: 24px; text-align: center;
    `;
    this.root.innerHTML = `
      <div style="font-size: 48px; margin-bottom: 12px;">🌸</div>
      <div style="font-size: 28px; font-weight: bold; color: #ffe08a; margin-bottom: 8px;">
        ¡Muy bien!
      </div>
      <div style="font-size: 20px; color: #9bc995; margin-bottom: 20px;">
        Great practice today!
      </div>
      <div style="font-size: 18px; margin-bottom: 8px;">
        💰 Earned <strong style="color: #ffe08a;">${result.totalReward} pesos</strong> today
      </div>
      <div style="font-size: 16px; color: #8a8290; margin-bottom: 30px;">
        Come back in <strong style="color: #f4ecd8;">${result.hoursUntilReset} hours</strong> for new practice!
        <br>You can replay conversations anytime — no pressure.
      </div>
      <button id="success-continue" style="
        background: #4a7c59; color: #f4ecd8; border: none; border-radius: 14px;
        padding: 16px 40px; font-size: 20px; font-weight: bold; cursor: pointer;
        font-family: inherit;
      ">Continue ▶</button>
    `;

    this.root.querySelector("#success-continue")!.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.close();
    });

    document.body.appendChild(this.root);
    blockCanvas();
  }

  private close() {
    this.root?.remove();
    unblockCanvas();
    this.scene.stop();
    this.scene.resume("WorldScene");
  }
}
