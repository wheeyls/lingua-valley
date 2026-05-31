import Phaser from "phaser";
import { AREAS, townOfNpc, type Npc } from "../content/world";
import { comprehend } from "../domain/comprehension";
import { objectiveById } from "../content/curriculum";
import { GameState, REGISTRY_KEY } from "../game/state";
import { dialogueLayout, type DialogueVM } from "../ui/layouts/dialogue";
import { renderNodes, type RenderedUI } from "../ui/PhaserRenderer";
import { isTownUnlocked } from "../domain/town";

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
  private ui?: RenderedUI;

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
      // End of dialogue, decide the learning challenge.
      const objId = this.npc.teachesObjectiveId;
      const isRolePlay = !!(this.npc.lessonSlug || this.npc.conversation);
      // Role-play/voiced NPCs are ALWAYS replayable — repeating the same
      // conversation is how you build friendship. Quiz NPCs stop once mastered.
      if (isRolePlay) {
        this.scene.stop();
        this.scene.launch("ConversationScene", { npcId: this.npc.id });
      } else if (objId && !this.state.proficiency.isMastered(objId)) {
        this.scene.stop();
        this.scene.launch("MinigameScene", { objectiveId: objId });
      } else {
        this.close();
      }
    }
  }

  private close() {
    this.scene.stop();
    this.scene.resume("WorldScene");
  }

  /** Build the pure view-model the layout consumes. */
  private viewModel(): DialogueVM {
    const line = this.npc.lines[this.lineIndex];
    const result = comprehend(line.es, line.level, this.state.proficiency);
    const objId = this.npc.teachesObjectiveId;
    const teachable =
      !!objId && !this.state.proficiency.isMastered(objId) && result.actionable;
    const isLast = this.lineIndex >= this.npc.lines.length - 1;

    return {
      npcName: this.npc.name,
      spanish: result.rendered,
      actionable: result.actionable,
      clarity: result.clarity,
      englishHint: line.en,
      overLevelNote:
        "Too advanced to follow — learn more in an earlier area first.",
      lineIndex: this.lineIndex,
      lineCount: this.npc.lines.length,
      continueLabel: isLast
        ? teachable
          ? "Start lesson ▶"
          : "Done"
        : "Continue ▶",
      lessonLabel: teachable ? objectiveById(objId!)?.label : undefined,
      canTrade: this.canTrade(),
    };
  }

  /**
   * Whether trading is offered. Producers are locked until the town's gatekeeper
   * is beaten; middlemen/others trade freely if they have goods.
   */
  private canTrade(): boolean {
    if (!this.npc.trades || this.npc.trades.length === 0) return false;
    if (this.npc.role === "producer") {
      const town = townOfNpc(this.npc.id);
      return !!town && isTownUnlocked(this.state.player.getState(), town.id);
    }
    return true;
  }

  private renderLine() {
    this.ui?.destroy();
    const nodes = dialogueLayout(this.viewModel());
    this.ui = renderNodes(this, nodes, {
      continue: () => this.advance(),
      leave: () => this.close(),
      trade: () => this.openTrade(),
    });
  }

  private openTrade() {
    this.scene.stop();
    this.scene.launch("TradeScene", { npcId: this.npc.id });
  }
}
