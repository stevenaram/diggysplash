import * as T from "three";
import type { CampaignScene } from "./campaign";
import type { StoryScene } from "./story";
import { compact } from "./battle-mesh";
import { FortressState } from "./fortress-state";

type Actor = ReturnType<StoryScene["actor"]>;
type Walker = {
  actor: Actor;
  points: T.Vector3[];
  lengths: number[];
  total: number;
};
const ease = (v: number) => {
  const t = T.MathUtils.clamp(v, 0, 1);
  return t * t * (3 - 2 * t);
};
export class FortressScene {
  state = new FortressState();
  rampart: T.Group;
  gate: T.Group;
  water: T.Group;
  trough: T.Mesh;
  stream: T.Group;
  winches: T.Group[] = [];
  counterweights: T.Group[] = [];
  wagons: { root: T.Group; wheels: T.Group[]; start: number; end: number }[] =
    [];
  walkers: Walker[] = [];
  guards: Actor[] = [];
  scouts: Actor[] = [];
  flags: { mesh: T.Mesh; base: Float32Array; phase: number }[] = [];
  lamps: T.Mesh[] = [];
  garden: T.Group;
  oldPower = [false, false, false];
  draft?: { head: T.Group; legs: T.Mesh[] };
  constructor(public campaign: CampaignScene) {
    const s = campaign.story,
      w = campaign.w;
    this.rampart = this.buildRampart();
    const cistern = this.buildCistern();
    this.water = cistern.water;
    this.trough = cistern.trough;
    this.stream = cistern.stream;
    this.gate = this.buildRefuge();
    this.garden = s.at(13.85, 10.15);
    for (let n = 0; n < 8; n++) {
      const grass = w.box(
        this.garden,
        ((n % 2) - 0.5) * 0.32,
        0.16,
        Math.floor(n / 2) * 0.15 - 0.2,
        0.035,
        0.28,
        0.055,
        [0x759765, 0x9fb771][n % 2],
      );
      grass.rotation.z = ((n % 3) - 1) * 0.2;
    }
    compact(this.garden, w.mat(0xffffff, undefined, true));
    // Dusty ruts and paving establish a continuous road through the gate.
    const road = s.at(8, 14.8);
    for (const dz of [-0.32, 0.32])
      w.box(road, -0.3, 0.031, dz, 12.6, 0.012, 0.055, 0xa58b67);
    for (let k = 0; k < 13; k++)
      w.box(road, -6 + k, 0.025, 0.8, 0.8, 0.025, 0.14, 0xe2c99b, "stone");
    compact(road, w.mat(0xffffff, undefined, true));
    road.traverse((o) => (o.raycast = () => {}));
    for (const [x, end, color] of [
      [7.5, 12.5, 0xc99f68],
      [5.1, 10.5, 0x739e99],
    ]) {
      const root = campaign.wagon(x, 14.8, color);
      const wheels = root.children.filter(
        (p) => p instanceof T.Group && p.position.y === 0.29,
      ) as T.Group[];
      const body = new T.Group();
      root.children
        .slice()
        .filter((p) => !wheels.includes(p as T.Group))
        .forEach((p) => body.add(p));
      root.add(body);
      // Sacks, a spare wheel, and tied-down crates belong to a working supply convoy.
      s.blob(body, -0.6, 0.95, 0, 0.18, 0xd9bf8d, [0.8, 1.1, 0.8]);
      w.box(body, -0.7, 0.63, -0.2, 0.26, 0.25, 0.3, 0xa88355, "wood");
      compact(body, w.mat(0xffffff, undefined, true));
      wheels.forEach((g) => compact(g, w.mat(0xffffff, "wood", true)));
      this.wagons.push({ root, wheels, start: x - 7.5, end: end - 7.5 });
    }
    this.buildDonkey(this.wagons[0].root);
    const shepherd = s.shepherd(2.5, 14.2),
      sheep = s.actor(3.6, 14.2, true);
    this.walkers.push(
      this.walker(shepherd, [
        [2.5, 14.2],
        [10.9, 14.2],
        [13.75, 12.5],
        [13.8, 10.65],
      ]),
    );
    this.walkers.push(
      this.walker(sheep, [
        [3.6, 14.2],
        [11.4, 14.2],
        [14, 12.5],
        [14, 10.1],
      ]),
    );
    const guide = s.actor(8.8, 14.25, false, 0xb99156);
    this.walkers.push(
      this.walker(guide, [
        [8.8, 14.25],
        [10.8, 14.25],
        [12.1, 13.4],
      ]),
    );
    // Sentinels watch the red scouts beyond the unfinished curtain wall.
    for (const x of [2.3, 12.3]) {
      const guard = campaign.soldier(x, 1.9, 0x398e98, false);
      guard.start.y = 1.65;
      guard.destination.y = 1.65;
      this.guards.push(guard);
    }
    for (const x of [4.4, 7.7, 10.5]) {
      const scout = campaign.soldier(x, 0.55, 0xb35c48, true);
      scout.root.scale.setScalar(0.8);
      this.scouts.push(scout);
    }
    const receiver = s.actor(14.4, 12.75, false, 0x75966d);
    receiver.root.rotation.y = -Math.PI / 2;
    s.heart(14, 1.35, 10.2);
    s.heart(12.3, 1.35, 13.5);
    // Keep the detailed characters inexpensive while preserving their articulated heads and legs.
    for (const actor of s.actors) {
      const body = new T.Group();
      actor.root.children
        .slice()
        .filter((p) => p !== actor.head && !actor.legs.includes(p))
        .forEach((p) => body.add(p));
      actor.root.add(body);
      compact(body, w.mat(0xffffff, undefined, true));
      compact(actor.head, w.mat(0xffffff, undefined, true));
    }
    campaign.delivery(0, 4, 2.4);
    campaign.delivery(1, 14, 6);
    campaign.delivery(2, 9.6, 13.3);
  }
  get w() {
    return this.campaign.w;
  }
  get s() {
    return this.campaign.story;
  }
  flag(x: number, z: number, color: number, height = 1.8) {
    const g = this.s.at(x, z),
      w = this.w;
    w.cylinder(g, 0, height * 0.5, 0, 0.025, height, 0x967348);
    this.s.blob(g, 0, height + 0.03, 0, 0.045, 0xe4bb65);
    const geometry = new T.PlaneGeometry(0.62, 0.39, 7, 3);
    geometry.translate(0.31, height - 0.25, 0);
    const colors = [],
      a = new T.Color(color),
      b = new T.Color(0xf0d5a6),
      positions = geometry.getAttribute("position");
    for (let i = 0; i < positions.count; i++) {
      const c = Math.abs(positions.getX(i) - 0.3) < 0.065 ? b : a;
      colors.push(c.r, c.g, c.b);
    }
    geometry.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
    const material = new T.MeshBasicMaterial({
      vertexColors: true,
      side: T.DoubleSide,
    });
    const mesh = new T.Mesh(geometry, material);
    mesh.userData.ownedMaterial = material;
    mesh.raycast = () => {};
    g.add(mesh);
    this.flags.push({
      mesh,
      base: new Float32Array(positions.array),
      phase: this.flags.length,
    });
    return g;
  }
  buildRampart() {
    const s = this.s,
      w = this.w,
      stone = s.at(7.3, 1.85);
    for (const x of [2.3, 12.3]) {
      const dx = x - 7.3;
      w.box(stone, dx, 0.8, 0, 1.12, 1.6, 1.05, 0xd3b78a, "stone");
      w.box(stone, dx, 1.63, 0, 1.26, 0.17, 1.16, 0xf2d5a6, "stone");
      for (const dz of [-0.49, 0.49])
        for (const side of [-0.42, 0.42])
          w.box(stone, dx + side, 1.92, dz, 0.25, 0.43, 0.25, 0xe1c393);
      w.box(stone, dx, 0.95, 0.54, 0.1, 0.45, 0.02, 0x6c6651);
      // Iron-braced side door and sandstone arch blocks.
      w.box(stone, dx, 0.43, 0.54, 0.38, 0.72, 0.035, 0x876544, "wood");
      for (const y of [0.2, 0.65])
        w.box(stone, dx, y, 0.57, 0.39, 0.045, 0.035, 0xb4a075);
    }
    for (const x of [1.4, 3.25, 11.35, 13.2]) {
      w.box(stone, x - 7.3, 0.61, 0, 0.8, 1.2, 0.6, 0xdac093, "stone");
      w.box(stone, x - 7.3, 1.25, 0, 0.86, 0.14, 0.68, 0xf0d5a9);
    }
    // Four linked wooden sections rise from a recessed slot between the towers.
    w.box(stone, 0, 0.04, 0, 7.5, 0.09, 0.53, 0x8b7556);
    compact(stone, w.mat(0xffffff, "stone", true));
    const rampart = s.at(7.3, 1.95);
    for (let k = 0; k < 24; k++) {
      w.box(
        rampart,
        (k - 11.5) * 0.29,
        0.63,
        0,
        0.255,
        1.26,
        0.19,
        k % 3 ? 0xa98152 : 0xbc9460,
        "wood",
      );
      const tip = w.shaded(new T.ConeGeometry(0.17, 0.22, 4), 0xc7a572);
      tip.position.set((k - 11.5) * 0.29, 1.37, 0);
      tip.rotation.y = Math.PI / 4;
      rampart.add(tip);
    }
    for (const y of [0.23, 0.9])
      w.box(rampart, 0, y, 0.13, 7.1, 0.11, 0.09, 0x71543d, "wood");
    for (const x of [-2.5, -0.8, 0.8, 2.5]) {
      const brace = w.box(
        rampart,
        x,
        0.6,
        0.17,
        1.65,
        0.07,
        0.06,
        0x8a6b45,
        "wood",
      );
      brace.rotation.z = 0.46;
      for (const y of [0.25, 0.9]) s.blob(rampart, x, y, 0.21, 0.035, 0xd5b16b);
    }
    compact(rampart, w.mat(0xffffff, "wood", true));
    for (const x of [3.5, 11.05]) {
      const hoist = s.at(x, 2.25);
      w.box(hoist, 0, 0.55, 0, 0.15, 1.1, 0.18, 0x987044, "wood");
      const wheel = this.campaign.wheel(hoist, 0, 1.18, 0.05, 0.21);
      compact(wheel, w.mat(0xffffff, "wood", true));
      this.winches.push(wheel);
      const weight = s.at(x, 1.5);
      w.box(weight, 0, 0.2, 0, 0.27, 0.42, 0.27, 0x898574, "stone");
      compact(weight, w.mat(0xffffff, undefined, true));
      this.counterweights.push(weight);
      w.cylinder(hoist, -0.1, 0.6, -0.3, 0.014, 1.2, 0xb49d74);
    }
    this.flag(1.65, 1.85, 0x478e96, 2.3);
    this.flag(13.25, 1.85, 0x478e96, 2.3);
    this.flag(6.2, 0.2, 0xb35442, 1.55);
    this.flag(10, 0.2, 0xb35442, 1.55);
    return rampart;
  }
  buildCistern() {
    const s = this.s,
      w = this.w,
      g = s.at(14, 6);
    w.box(g, 0, 0.16, 0, 1.1, 0.3, 1, 0xcfb38c, "stone");
    for (const dx of [-0.39, 0.39])
      for (const dz of [-0.36, 0.36])
        w.box(g, dx, 0.59, dz, 0.13, 0.83, 0.13, 0x9e754d, "wood");
    w.box(g, 0, 0.88, 0, 0.95, 0.14, 0.94, 0xdac194, "stone");
    for (const dx of [-0.42, 0.42])
      w.box(g, dx, 1.34, 0, 0.12, 0.9, 0.84, 0xe3c799, "stone");
    w.box(g, 0, 1.34, -0.36, 0.85, 0.9, 0.14, 0xc9b080, "stone");
    for (const y of [0.91, 1.79])
      w.box(g, 0, y, 0.39, 0.92, 0.12, 0.12, 0xe8cfa6, "stone");
    for (const dx of [-0.3, 0.3])
      w.box(g, dx, 1.34, 0.43, 0.065, 0.84, 0.08, 0xb29870);
    for (let n = 0; n < 4; n++)
      w.box(g, 0.19, 1.02 + n * 0.18, 0.45, 0.12, 0.025, 0.02, 0x8b805f);
    w.box(g, 0, 1.85, 0, 1.1, 0.13, 1.03, 0xebd2a6, "stone");
    const pump = this.campaign.wheel(g, 0.45, 0.48, 0.3, 0.24);
    compact(pump, w.mat(0xffffff, "wood", true));
    this.winches.push(pump);
    // The protected transparent opening exposes the rising water level.
    const water = new T.Group();
    water.position.set(0, 0.96, 0);
    g.add(water);
    w.box(water, 0, 0.38, 0.04, 0.68, 0.76, 0.69, 0x3bbfc4, "water");
    w.box(water, 0, 0.768, 0.04, 0.65, 0.015, 0.66, 0x9fe3cf, "water");
    const staticParts = new T.Group();
    g.children
      .slice()
      .filter((p) => p !== water && p !== pump)
      .forEach((p) => staticParts.add(p));
    g.add(staticParts);
    compact(staticParts, w.mat(0xffffff, "stone", true));
    const trough = s.at(14, 9.2);
    w.box(trough, 0, 0.07, 0, 0.84, 0.12, 1.25, 0x90724f, "stone");
    for (const dx of [-0.4, 0.4])
      w.box(trough, dx, 0.19, 0, 0.1, 0.32, 1.35, 0xd8bd8d, "stone");
    for (const dz of [-0.63, 0.63])
      w.box(trough, 0, 0.19, dz, 0.87, 0.32, 0.1, 0xe4c89b, "stone");
    compact(trough, w.mat(0xffffff, "stone", true));
    const fill = w.box(
      w.root,
      this.s.scenePoint(14, 9.2).x,
      0.16,
      this.s.scenePoint(14, 9.2).z,
      0.65,
      0.045,
      1.1,
      0x40bbc0,
      "water",
    );
    // A narrow, sealed pipe feeds the trough, with a short visible falling stream.
    const pipe = s.at(14.4, 7.6);
    w.box(pipe, 0, 0.24, 0, 0.075, 0.075, 3.4, 0xb29160);
    const stream = s.at(14.3, 8.7);
    w.box(stream, 0, 0.25, 0, 0.065, 0.38, 0.065, 0x78dad2);
    return { water, trough: fill, stream };
  }
  buildRefuge() {
    const s = this.s,
      w = this.w,
      frame = s.at(9.6, 14.75);
    for (const dz of [-0.97, 0.97]) {
      w.box(frame, 0, 0.83, dz, 0.48, 1.66, 0.43, 0xdac097, "stone");
      w.box(frame, 0, 1.69, dz, 0.6, 0.16, 0.53, 0xf0d7ad);
      for (const dx of [-0.19, 0.19])
        w.box(frame, dx, 1.87, dz, 0.16, 0.25, 0.48, 0xdcc294);
    }
    w.box(frame, 0, 1.87, 0, 0.36, 0.23, 1.94, 0xe3cba1, "stone");
    w.box(frame, 0.19, 1.88, 0, 0.025, 0.14, 0.39, 0x408f96);
    compact(frame, w.mat(0xffffff, "stone", true));
    frame.scale.z = 0.65;
    const gate = s.at(9.6, 14.75);
    gate.scale.z = 0.65;
    for (let n = 0; n < 9; n++)
      w.box(gate, 0, 0.8, (n - 4) * 0.195, 0.105, 1.5, 0.075, 0x8b7150, "wood");
    for (const y of [0.24, 0.88, 1.42])
      w.box(gate, 0.015, y, 0, 0.13, 0.075, 1.77, 0xb29969);
    compact(gate, w.mat(0xffffff, "wood", true));
    const winch = this.campaign.wheel(frame, 0.3, 1.25, 0.8, 0.2);
    winch.rotation.y = Math.PI / 2;
    compact(winch, w.mat(0xffffff, "wood", true));
    this.winches.push(winch);
    const shelter = s.at(14.65, 11.5);
    shelter.rotation.y = Math.PI / 2;
    for (const dx of [-1.1, 1.1])
      w.cylinder(shelter, dx, 0.69, 0, 0.035, 1.38, 0x96724b);
    for (let k = 0; k < 10; k++) {
      const panel = w.box(
        shelter,
        (k - 4.5) * 0.245,
        1.4,
        0,
        0.247,
        0.055,
        0.65,
        k % 2 ? 0xf0d6a9 : 0x5f9997,
      );
      panel.rotation.x = -0.12;
      w.box(
        shelter,
        (k - 4.5) * 0.245,
        1.29,
        0.31,
        0.245,
        0.17,
        0.025,
        k % 2 ? 0xf0d6a9 : 0x5f9997,
      );
    }
    for (const dx of [-0.9, 0.95])
      w.cylinder(shelter, dx, 0.19, 0, 0.16, 0.34, 0xa17b50);
    compact(shelter, w.mat(0xffffff, undefined, true));
    this.flag(14.7, 12.5, 0x418f97, 1.9);
    for (const x of [10.4, 12.7, 14.65]) {
      const lamp = s.at(x, 15.35);
      w.cylinder(lamp, 0, 0.7, 0, 0.025, 1.4, 0x8b7453);
      w.box(lamp, 0, 1.33, 0, 0.19, 0.23, 0.16, 0x9b7b4d);
      const glow = w.box(lamp, 0, 1.34, 0.085, 0.13, 0.15, 0.015, 0xf2c76d);
      this.lamps.push(glow);
    }
    return gate;
  }
  buildDonkey(cart: T.Group) {
    const w = this.w,
      s = this.s,
      root = new T.Group();
    root.position.set(1.45, 0, 0);
    root.rotation.y = Math.PI / 2;
    cart.add(root);
    const body = new T.Group();
    root.add(body);
    s.blob(body, 0, 0.48, 0, 0.31, 0x9b937f, [0.8, 1, 1.5]);
    s.blob(body, 0, 0.67, 0.27, 0.18, 0xada28b, [0.8, 1.6, 0.8]);
    for (const dx of [-0.235, 0.235])
      w.box(body, dx, 0.48, 0.12, 0.035, 0.38, 0.09, 0x78583e);
    w.box(body, 0, 0.71, 0.12, 0.46, 0.04, 0.11, 0x87613f);
    s.pole(
      body,
      new T.Vector3(0, 0.53, -0.4),
      new T.Vector3(0, 0.33, -0.65),
      0.025,
      0x625648,
    );
    compact(body, w.mat(0xffffff, undefined, true));
    const head = new T.Group();
    head.position.set(0, 0.88, 0.38);
    root.add(head);
    s.blob(head, 0, 0, 0.03, 0.18, 0xb1a48d, [0.8, 0.9, 1.25]);
    s.blob(head, 0, -0.07, 0.2, 0.115, 0xd3c5ab, [1, 0.75, 1]);
    for (const dx of [-0.085, 0.085]) {
      const ear = w.box(head, dx, 0.2, -0.025, 0.075, 0.3, 0.055, 0x9c947e);
      ear.rotation.z = dx * 2;
      w.box(head, dx, 0.2, 0.007, 0.03, 0.2, 0.012, 0xc8b59a);
      w.box(head, dx * 1.5, 0.01, 0.1, 0.025, 0.033, 0.02, 0x37392f);
    }
    w.box(head, 0, -0.01, 0.13, 0.28, 0.04, 0.055, 0x775c43);
    compact(head, w.mat(0xffffff, undefined, true));
    const legs: T.Mesh[] = [];
    for (const dx of [-0.16, 0.16])
      for (const dz of [-0.25, 0.25])
        legs.push(w.box(root, dx, 0.2, dz, 0.08, 0.34, 0.095, 0x776e5a));
    for (const side of [-1, 1])
      s.pole(
        cart,
        new T.Vector3(0.7, 0.4, side * 0.3),
        new T.Vector3(1.8, 0.55, side * 0.27),
        0.014,
        0x8b7556,
      );
    this.draft = { head, legs };
  }
  walker(actor: Actor, coords: number[][]): Walker {
    const points = coords.map(([x, z]) => this.s.scenePoint(x, z));
    const lengths = points.slice(1).map((p, n) => p.distanceTo(points[n]));
    return {
      actor,
      points,
      lengths,
      total: lengths.reduce((a, b) => a + b, 0),
    };
  }
  walk(w: Walker, t: number, time: number) {
    let distance = t * w.total,
      segment = 0;
    while (segment < w.lengths.length - 1 && distance > w.lengths[segment])
      distance -= w.lengths[segment++];
    const a = w.points[segment],
      b = w.points[segment + 1],
      moving = t > 0 && t < 1;
    w.actor.root.position.lerpVectors(
      a,
      b,
      Math.min(1, distance / w.lengths[segment]),
    );
    w.actor.root.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
    if (!this.w.reduced && moving)
      w.actor.root.position.y = Math.abs(Math.sin(time * 9)) * 0.025;
    w.actor.legs.forEach(
      (l, n) =>
        (l.rotation.x =
          !this.w.reduced && moving
            ? Math.sin(time * 9 + n * Math.PI) * 0.24
            : 0),
    );
  }
  update(dt: number, active: boolean[], time: number) {
    const reduced = this.w.reduced;
    this.state.update(dt, active, reduced);
    active.forEach((on, n) => {
      if (on && !this.oldPower[n] && !reduced) this.w.onBattleSound("wind");
      this.oldPower[n] = on;
    });
    const [wall, water] = this.state.power;
    this.rampart.position.y = -1.38 + wall * 1.38;
    this.counterweights.forEach((g) => (g.position.y = 0.95 - wall * 0.82));
    this.winches.forEach(
      (g, n) =>
        (g.rotation.z =
          (n < 2 ? wall : n === 2 ? water : this.state.gate) * Math.PI * 4),
    );
    this.water.visible = water > 0.01;
    this.water.scale.y = 0.02 + 0.98 * water;
    this.trough.visible = water > 0.03;
    this.trough.scale.z = 0.03 + 0.97 * water;
    this.stream.visible = water > 0.1;
    this.stream.scale.y = reduced ? 1 : 1 + Math.sin(time * 8) * 0.06;
    this.garden.scale.y = 0.2 + 0.8 * water;
    this.gate.position.y = this.state.gate * 1.64;
    this.wagons.forEach((w) => {
      const travel = this.state.convoy;
      w.root.position.x = T.MathUtils.lerp(w.start, w.end, travel);
      w.root.position.y =
        !reduced && travel > 0 && travel < 1
          ? Math.sin(time * 11 + w.start) * 0.012
          : 0;
      w.wheels.forEach(
        (g) => (g.rotation.z = -(w.root.position.x - w.start) / 0.24),
      );
    });
    this.walkers.forEach((w) => this.walk(w, this.state.escort, time));
    if (this.draft) {
      const moving = this.state.convoy > 0 && this.state.convoy < 1;
      this.draft.head.rotation.z = reduced ? 0 : Math.sin(time * 1.3) * 0.04;
      this.draft.legs.forEach(
        (leg, n) =>
          (leg.rotation.x =
            !reduced && moving
              ? Math.sin(time * 9 + (n % 2) * Math.PI) * 0.24
              : 0),
      );
    }
    const sheep = this.walkers[1].actor;
    sheep.head.rotation.x = ease((this.state.escort - 0.92) / 0.08) * 0.58;
    this.guards.forEach((g, n) => {
      g.root.position.y = 1.65;
      g.head.rotation.y = reduced ? 0 : Math.sin(time * 0.9 + n) * 0.2;
    });
    this.scouts.forEach((a, n) => {
      a.root.position.z = a.start.z - wall * 0.15;
      a.head.rotation.y = reduced ? 0 : Math.sin(time * 0.8 + n) * 0.13;
    });
    this.flags.forEach(({ mesh, base, phase }) => {
      const pos = mesh.geometry.getAttribute("position");
      for (let i = 0; i < pos.count; i++)
        pos.setZ(
          i,
          reduced
            ? 0
            : (Math.sin(time * 3 + base[i * 3] * 7 + phase) *
                0.07 *
                base[i * 3]) /
                0.62,
        );
      pos.needsUpdate = true;
    });
    this.lamps.forEach((l) => (l.visible = water > 0.5));
  }
}
