import Phaser from "phaser";
import { AREAS, townOfNpc, type Npc } from "../content/world";
import { scaffoldingFor } from "../domain/scaffolding";
import { objectiveById } from "../content/curriculum";
import { GameState, REGISTRY_KEY } from "../game/state";
import { isTownUnlocked } from "../domain/town";
import { HtmlDialogueView, type DialogueViewData } from "../ui/html/HtmlDialogueView";

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
  private view!: HtmlDialogueView;

  constructor() {
    super("DialogueScene");
  }

  create(data: { npcId: string }) {
    this.state = this.registry.get(REGISTRY_KEY) as GameState;
    this.npc = findNpc(data.npcId)!;
    this.lineIndex = 0;

    this.view = new HtmlDialogueView({
      onContinue: () => this.advance(),
      onLeave: () => this.close(),
      onTrade: () => this.openTrade(),
    });
    this.renderLine();

    // Talking to an NPC counts as "doing" any active quest step that targets them.
    void this.state.quests.noteInteraction(this.npc.id);

    this.input.keyboard!.on("keydown-SPACE", () => this.advance());
    this.input.keyboard!.on("keydown-ESC", () => this.close());

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.view.destroy());
  }

  private advance() {
    if (this.lineIndex < this.npc.lines.length - 1) {
      this.lineIndex++;
      this.renderLine();
    } else {
      const objId = this.npc.teachesObjectiveId;
      const isRolePlay = !!(
        this.npc.lessonSlug ||
        this.npc.conversation ||
        this.npc.givesQuest
      );
      if (isRolePlay) {
        this.view.destroy();
        this.scene.stop();
        this.scene.launch("ConversationScene", { npcId: this.npc.id });
      } else if (objId && !this.state.proficiency.isMastered(objId)) {
        this.view.destroy();
        this.scene.stop();
        this.scene.launch("MinigameScene", { objectiveId: objId });
      } else {
        this.close();
      }
    }
  }

  private close() {
    this.view.destroy();
    this.scene.stop();
    this.scene.resume("WorldScene");
  }

  private renderLine() {
    const line = this.npc.lines[this.lineIndex];
    const town = townOfNpc(this.npc.id);
    const englishAvail = town?.englishAvailability ?? 1;
    const scaffold = scaffoldingFor(englishAvail);

    const objId = this.npc.teachesObjectiveId;
    const teachable = !!objId && !this.state.proficiency.isMastered(objId);
    const isLast = this.lineIndex >= this.npc.lines.length - 1;

    const data: DialogueViewData = {
      npcName: this.npc.name,
      spanish: line.es,
      showSpanish: scaffold.spanishSubtitles,
      englishHint: line.en,
      showEnglishHint: scaffold.englishHints,
      lineIndex: this.lineIndex,
      lineCount: this.npc.lines.length,
      continueLabel: isLast
        ? (this.npc.conversation || this.npc.lessonSlug || this.npc.givesQuest)
          ? "Talk ▶"
          : teachable
            ? "Start lesson ▶"
            : "Done"
        : "Continue ▶",
      lessonLabel: teachable ? objectiveById(objId!)?.label : undefined,
      canTrade: this.canTrade(),
    };
    this.view.update(data);
  }

  private canTrade(): boolean {
    if (!this.npc.trades || this.npc.trades.length === 0) return false;
    if (this.npc.role === "producer") {
      const town = townOfNpc(this.npc.id);
      return !!town && isTownUnlocked(this.state.player.getState(), town.id);
    }
    return true;
  }

  private openTrade() {
    this.view.destroy();
    this.scene.stop();
    this.scene.launch("TradeScene", { npcId: this.npc.id });
  }
}
