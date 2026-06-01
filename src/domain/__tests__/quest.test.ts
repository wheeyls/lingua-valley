import { describe, it, expect } from "vitest";
import {
  activateQuest,
  completeStep,
  completeQuest,
  lessonForPhase,
  allStepsComplete,
  INITIAL_QUEST_PROGRESS,
  type Quest,
} from "../quest";

const quest: Quest = {
  id: "errands",
  giverNpcId: "marisol",
  title: "Errands",
  planLessonSlug: "weekend-plans",
  recapLessonSlug: "morning-routine",
  reward: 60,
  steps: [
    { id: "s1", description: "buy produce", targetNpcId: "vendedora" },
    { id: "s2", description: "get bread", targetNpcId: "panadero" },
  ],
};

describe("quest state machine", () => {
  it("walks offered -> active -> recap -> done as steps complete", () => {
    let p = INITIAL_QUEST_PROGRESS;
    expect(p.phase).toBe("offered");

    p = activateQuest(p);
    expect(p.phase).toBe("active");

    p = completeStep(quest, p, "s1");
    expect(p.phase).toBe("active"); // one of two done
    expect(allStepsComplete(quest, p)).toBe(false);

    p = completeStep(quest, p, "s2");
    expect(p.phase).toBe("recap"); // all done -> ready to report back
    expect(allStepsComplete(quest, p)).toBe(true);

    p = completeQuest(p);
    expect(p.phase).toBe("done");
  });

  it("ignores duplicate / unknown step completions and out-of-phase calls", () => {
    let p = activateQuest(INITIAL_QUEST_PROGRESS);
    p = completeStep(quest, p, "s1");
    const again = completeStep(quest, p, "s1"); // duplicate
    expect(again.completedStepIds).toEqual(["s1"]);
    expect(completeStep(quest, p, "nope").completedStepIds).toEqual(["s1"]);
    // completing a step before activation does nothing
    expect(completeStep(quest, INITIAL_QUEST_PROGRESS, "s1").phase).toBe("offered");
  });

  it("serves the future lesson while planning and the past lesson at recap", () => {
    expect(lessonForPhase(quest, INITIAL_QUEST_PROGRESS)).toBe("weekend-plans");
    let p = activateQuest(INITIAL_QUEST_PROGRESS);
    expect(lessonForPhase(quest, p)).toBeNull(); // active: just go do steps
    p = completeStep(quest, p, "s1");
    p = completeStep(quest, p, "s2");
    expect(lessonForPhase(quest, p)).toBe("morning-routine"); // recap -> past tense
  });
});
