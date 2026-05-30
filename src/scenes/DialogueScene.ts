import Phaser from "phaser";
import { AREAS, type Npc } from "../content/world";
import { comprehend } from "../domain/comprehension";
import { objectiveById } from "../content/curriculum";
import { GameState, REGISTRY_KEY } from "../game/state";

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
    const boxH = 170;

    const panel = this.add
      .rectangle(0, h - boxH, w, boxH, 0x1a1423, 0.95)
      .setOrigin(0, 0);
    panel.setStrokeStyle(3, 0xd9b08c);

    const nameTag = this.add.text(24, h - boxH + 14, this.npc.name, {
      fontFamily: "Trebuchet MS",
      fontSize: "18px",
      color: "#ffe08a",
    });

    const esText = this.add.text(24, h - boxH + 46, result.rendered, {
      fontFamily: "Trebuchet MS",
      fontSize: "22px",
      color: result.actionable ? "#f4ecd8" : "#8a8290",
      wordWrap: { width: w - 48 },
    });

    const children: Phaser.GameObjects.GameObject[] = [panel, nameTag, esText];

    // English hint only appears when comprehension is high enough.
    if (result.clarity >= 0.6) {
      const en = this.add.text(24, h - 56, `“${line.en}”`, {
        fontFamily: "Trebuchet MS",
        fontSize: "15px",
        color: "#9bc995",
        fontStyle: "italic",
      });
      children.push(en);
    } else {
      const hint = this.add.text(
        24,
        h - 56,
        "You don't understand enough Spanish to follow this… (learn more in an earlier area)",
        {
          fontFamily: "Trebuchet MS",
          fontSize: "14px",
          color: "#b56576",
          fontStyle: "italic",
          wordWrap: { width: w - 48 },
        },
      );
      children.push(hint);
    }

    const prompt = this.add
      .text(w - 24, h - 22, "[SPACE] continue   ·   [ESC] leave", {
        fontFamily: "Trebuchet MS",
        fontSize: "13px",
        color: "#d9b08c",
      })
      .setOrigin(1, 0.5);
    children.push(prompt);

    // If the player can act and this NPC teaches, tease the lesson.
    const objId = this.npc.teachesObjectiveId;
    if (objId && result.actionable && !this.state.proficiency.isMastered(objId)) {
      const obj = objectiveById(objId);
      const tease = this.add.text(
        24,
        h - boxH + 46 + esText.height + 8,
        `▶ Lesson available: ${obj?.label}`,
        { fontFamily: "Trebuchet MS", fontSize: "14px", color: "#ffe08a" },
      );
      children.push(tease);
    }

    this.container = this.add.container(0, 0, children).setDepth(50);
  }
}
