import Phaser from "phaser";
import { AREAS, type Npc } from "../content/world";
import { comprehend } from "../domain/comprehension";
import { objectiveById } from "../content/curriculum";
import { GameState, REGISTRY_KEY } from "../game/state";
import { FONT, TYPE, COLOR, MARGIN, makeButton } from "../game/layout";

function findNpc(id: string): Npc | undefined {
  for (const a of AREAS) {
    const n = a.npcs.find((n) => n.id === id);
    if (n) return n;
  }
  return undefined;
}

export class DialogueScene extends Phaser.Scene {
  private state!: GameState;
  private npc!: Npc;
  private lineIndex = 0;
  private container!: Phaser.GameObjects.Container;

  constructor() {
    super("DialogueScene");
  }

  create(data: { npcId: string }) {
    this.state = this.registry.get(REGISTRY_KEY) as GameState;
    this.npc = findNpc(data.npcId)!;
    this.lineIndex = 0;
    this.renderLine();

    this.input.keyboard!.on("keydown-SPACE", () => this.advance());
    this.input.keyboard!.on("keydown-ESC", () => this.close());
  }

  private advance() {
    if (this.lineIndex < this.npc.lines.length - 1) {
      this.lineIndex++;
      this.renderLine();
    } else {
      // End of dialogue. If this NPC teaches something the player hasn't
      // mastered, and the line was comprehensible, start the learning challenge.
      const objId = this.npc.teachesObjectiveId;
      if (objId && !this.state.proficiency.isMastered(objId)) {
        this.scene.stop();
        // Voiced conversation gate takes priority when configured; otherwise
        // fall back to the multiple-choice mini-game.
        if (this.npc.conversation) {
          this.scene.launch("ConversationScene", { npcId: this.npc.id });
        } else {
          this.scene.launch("MinigameScene", { objectiveId: objId });
        }
      } else {
        this.close();
      }
    }
  }

  private close() {
    this.scene.stop();
    this.scene.resume("WorldScene");
  }

  private renderLine() {
    this.container?.destroy();

    const line = this.npc.lines[this.lineIndex];
    const result = comprehend(line.es, line.level, this.state.proficiency);

    const w = this.scale.width;
    const h = this.scale.height;

    // Bottom-sheet panel sized for portrait: tall enough for big type + buttons.
    const panelH = 320;
    const top = h - panelH;
    const pad = MARGIN + 8;
    const contentW = w - pad * 2;

    const children: Phaser.GameObjects.GameObject[] = [];

    const panel = this.add
      .rectangle(0, top, w, panelH, COLOR.panel, 0.96)
      .setOrigin(0, 0)
      .setStrokeStyle(3, COLOR.goldNum);
    children.push(panel);

    const nameTag = this.add.text(pad, top + 18, this.npc.name, {
      fontFamily: FONT,
      fontSize: TYPE.heading,
      color: COLOR.gold,
    });
    children.push(nameTag);

    // Progress dots (which line of the exchange).
    const dots = this.npc.lines
      .map((_, i) => (i === this.lineIndex ? "●" : "○"))
      .join(" ");
    const dotText = this.add
      .text(w - pad, top + 24, dots, {
        fontFamily: FONT,
        fontSize: TYPE.small,
        color: COLOR.muted,
      })
      .setOrigin(1, 0.5);
    children.push(dotText);

    const esText = this.add.text(pad, top + 60, result.rendered, {
      fontFamily: FONT,
      fontSize: TYPE.heading,
      color: result.actionable ? COLOR.parchment : COLOR.muted,
      wordWrap: { width: contentW },
      lineSpacing: 6,
    });
    children.push(esText);

    // English hint / over-level notice below the Spanish.
    const hintY = top + 60 + esText.height + 14;
    if (result.clarity >= 0.6) {
      children.push(
        this.add.text(pad, hintY, `“${line.en}”`, {
          fontFamily: FONT,
          fontSize: TYPE.label,
          color: COLOR.green,
          fontStyle: "italic",
          wordWrap: { width: contentW },
        }),
      );
    } else {
      children.push(
        this.add.text(
          pad,
          hintY,
          "Too advanced to follow — learn more in an earlier area first.",
          {
            fontFamily: FONT,
            fontSize: TYPE.label,
            color: COLOR.rose,
            fontStyle: "italic",
            wordWrap: { width: contentW },
          },
        ),
      );
    }

    // Lesson tease when actionable.
    const objId = this.npc.teachesObjectiveId;
    if (objId && result.actionable && !this.state.proficiency.isMastered(objId)) {
      const obj = objectiveById(objId);
      children.push(
        this.add.text(pad, hintY + 30, `▶ Lesson: ${obj?.label}`, {
          fontFamily: FONT,
          fontSize: TYPE.label,
          color: COLOR.gold,
        }),
      );
    }

    this.container = this.add.container(0, 0, children).setDepth(50);

    // Action buttons (thumb-reachable at the bottom of the sheet).
    const isLast = this.lineIndex >= this.npc.lines.length - 1;
    const continueLabel = isLast
      ? objId && !this.state.proficiency.isMastered(objId) && result.actionable
        ? "Start lesson ▶"
        : "Done"
      : "Continue ▶";
    const btnY = h - 44;
    const cont = makeButton(this, w / 2 + 70, btnY, continueLabel, () => this.advance(), {
      width: 180,
      depth: 51,
    });
    const leave = makeButton(this, MARGIN + 70, btnY, "Leave", () => this.close(), {
      width: 120,
      fill: COLOR.roseFill,
      depth: 51,
    });
    this.container.add([cont.container, leave.container]);
  }
}
