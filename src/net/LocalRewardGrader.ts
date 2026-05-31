/**
 * LocalRewardGrader — a DRIVEN ADAPTER implementing RewardGrader for guest /
 * offline play. It runs the SAME domain reducer (`applyActivity`) the server
 * uses, then persists via the injected repository.
 *
 * It contains no economy rules of its own — those live in the domain. This
 * adapter only orchestrates load → applyActivity → save and supplies the
 * word-id lookup and clock.
 */

import type { RewardGrader, PlayerStateRepository, Clock } from "../domain/ports";
import { applyActivity, initialPlayerState, type ActivityResult } from "../domain/player";

export class LocalRewardGrader implements RewardGrader {
  constructor(
    private readonly repo: PlayerStateRepository,
    private readonly clock: Clock,
    private readonly objectiveWordIds: (objectiveId: string) => string[],
  ) {}

  async grant(activity: ActivityResult) {
    const prev = (await this.repo.load()) ?? initialPlayerState();
    const result = applyActivity(
      prev,
      activity,
      this.clock.now(),
      this.objectiveWordIds,
    );
    await this.repo.save(result.state);
    return result;
  }
}
