export const VOLLEYS = 3;
export const CYCLE = 3.65;
export const RELEASE = 1.05;
export const FLIGHT = 1.18;
export const IMPACT = RELEASE + FLIGHT;
export type BattleEvent = {
  sector: number;
  shot: number;
  kind: "wind" | "launch" | "impact" | "reset";
};
/** Deterministic clocks, independent of frame rate, geometry, or target order. */
export class BattleState {
  ages = [-1, -1, -1, -1];
  hits = [0, 0, 0, 0];
  victoryAge = 0;
  events: BattleEvent[] = [];
  get complete() {
    return this.hits.every((n) => n === VOLLEYS) && this.victoryAge >= 1.25;
  }
  update(dt: number, active: boolean[], reduced = false) {
    this.events.length = 0;
    const alreadyDefeated = this.hits.every((n) => n === VOLLEYS);
    for (let n = 0; n < 4; n++) {
      const previous = this.ages[n];
      if (!active[n]) {
        if (previous >= 0)
          this.events.push({ sector: n, shot: 0, kind: "reset" });
        this.ages[n] = -1;
        this.hits[n] = 0;
        continue;
      }
      if (reduced) {
        this.ages[n] = CYCLE * VOLLEYS;
        this.hits[n] = VOLLEYS;
        continue;
      }
      const next = Math.min(CYCLE * VOLLEYS, Math.max(0, previous) + dt);
      this.ages[n] = next;
      for (let shot = 0; shot < VOLLEYS; shot++)
        for (const [offset, kind] of [
          [0.08, "wind"],
          [RELEASE, "launch"],
          [IMPACT, "impact"],
        ] as const) {
          const at = shot * CYCLE + offset;
          if (previous < at && next >= at) {
            this.events.push({ sector: n, shot, kind });
            if (kind === "impact") this.hits[n] = shot + 1;
          }
        }
    }
    this.victoryAge = this.hits.every((n) => n === VOLLEYS)
      ? reduced
        ? 2
        : this.victoryAge +
          (alreadyDefeated
            ? dt
            : Math.max(
                0,
                Math.min(
                  dt,
                  ...this.ages.map(
                    (age) => age - ((VOLLEYS - 1) * CYCLE + IMPACT),
                  ),
                ),
              ))
      : 0;
    return this.events;
  }
}
