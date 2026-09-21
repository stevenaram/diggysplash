const ease = (v: number) => {
  const t = Math.max(0, Math.min(1, v));
  return t * t * (3 - 2 * t);
};
/** The convoy moves only when the wall, water supply, and gate are ready. */
export class FortressState {
  power = [0, 0, 0];
  arrivalAge = 0;
  update(dt: number, active: boolean[], reduced = false) {
    const readyDelay = Math.max(...this.power.map((p) => (1 - p) / 1.1));
    this.power = this.power.map((p, n) =>
      reduced
        ? Number(active[n])
        : Math.max(0, Math.min(1, p + dt * (active[n] ? 1.1 : -1.8))),
    );
    if (!active.every(Boolean)) this.arrivalAge = 0;
    else if (reduced) this.arrivalAge = 10;
    else if (this.power.every((p) => p === 1))
      this.arrivalAge += Math.max(0, dt - readyDelay);
  }
  get convoy() {
    return ease((this.arrivalAge - 0.5) / 5.3);
  }
  get escort() {
    return ease((this.arrivalAge - 0.8) / 5.7);
  }
  get gate() {
    return this.power[2] * (1 - ease((this.arrivalAge - 6.8) / 1));
  }
  get complete() {
    return this.power.every((p) => p === 1) && this.arrivalAge >= 8.9;
  }
}
