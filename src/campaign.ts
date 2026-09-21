import * as T from "three";
import { SIZE, gridWorld } from "./game";
import { BattleScene } from "./battle";
import { FortressScene } from "./fortress";
import type { StoryScene } from "./story";

const smooth = (v: number) => {
  const t = T.MathUtils.clamp(v, 0, 1);
  return t * t * (3 - 2 * t);
};
const teal = 0x398e98,
  red = 0xb85345,
  gold = 0xe8b951;
/** Each objective owns an independent, reversible mechanical consequence. */
export class CampaignScene {
  battleScene?: BattleScene;
  fortressScene?: FortressScene;
  power: number[];
  effects: ((p: number, time: number) => void)[] = [];
  deliveries: ((p: number, time: number) => void)[] = [];
  finale: (p: number, time: number) => void = () => {};
  constructor(public story: StoryScene) {
    this.power = story.world.game.level.targets.map(() => 0);
    const kind = story.world.game.level.story!.kind;
    if (kind === "harvest") this.harvest();
    if (kind === "caravan") this.caravan();
    if (kind === "temple") this.temple();
    if (kind === "fortress") this.fortress();
    if (kind === "battle") this.battle();
    // The returning shepherd provides continuity across the campaign.
    if (kind !== "battle" && kind !== "fortress") {
      const shepherd = story.shepherd(2, 13.5);
      shepherd.root.rotation.y = Math.PI;
      const sheep = story.actor(3.1, 13.5, true);
      sheep.root.rotation.y = Math.PI;
    }
  }
  get w() {
    return this.story.world;
  }
  get duration() {
    return this.w.game.level.story?.kind === "fortress"
      ? 10
      : this.w.game.level.story?.kind === "battle"
        ? 7
        : 4.5;
  }
  // Sealed delivery pipes follow tile seams, leaving trench centers clear.
  // These are mechanical scenery, not extra diggable channels or puzzle links.
  delivery(n: number, x: number, z: number) {
    const i = this.w.game.level.targets[n],
      sx = gridWorld(i % SIZE) + 7.5,
      sz = gridWorld(Math.floor(i / SIZE)) + 7.5;
    const destination = this.story.scenePoint(x, z);
    x = destination.x + 7.5;
    z = destination.z + 7.5;
    const seam = 0.94 - n * 0.035;
    const points = [
      [sx + 0.28, sz + 0.28],
      [sx + seam, sz + seam],
      [x > 13 ? x : sx + seam, z > 3 ? sz + seam : 2.5 + n * 0.04],
      [x, z],
    ].map(([a, b]) => new T.Vector3(a - 7.5, 0.065, b - 7.5));
    const path = new T.CurvePath<T.Vector3>();
    for (let j = 1; j < points.length; j++)
      if (points[j].distanceTo(points[j - 1]) > 0.001)
        path.add(new T.LineCurve3(points[j - 1], points[j]));
    const pipe = new T.Mesh(
      new T.TubeGeometry(
        path,
        Math.ceil(path.getLength() * 4),
        0.042,
        6,
        false,
      ),
      this.w.mat(0xb89562),
    );
    pipe.raycast = () => {};
    this.w.root.add(pipe);
    const flow = new T.Mesh(
      new T.TubeGeometry(
        path,
        Math.ceil(path.getLength() * 4),
        0.021,
        5,
        false,
      ),
      this.w.mat(0x54c9c6),
    );
    flow.position.y = 0.035;
    flow.raycast = () => {};
    this.w.root.add(flow);
    const bead = this.story.blob(this.w.root, 0, 0, 0, 0.065, 0xc3f7e3);
    bead.raycast = () => {};
    for (const point of [points[0], points[points.length - 1]]) {
      const cuff = this.w.cylinder(
        this.w.root,
        point.x,
        0.12,
        point.z,
        0.09,
        0.2,
        0x95744f,
      );
      cuff.raycast = () => {};
    }
    this.deliveries[n] = (p, time) => {
      flow.visible = p > 0.04;
      bead.visible = p > 0.1 && !this.w.reduced;
      bead.position.copy(path.getPointAt((time * 0.22 + n * 0.23) % 1));
      bead.position.y += 0.045;
    };
  }
  flag(parent: T.Object3D, x: number, y: number, z: number, color: number) {
    this.w.cylinder(parent, x, y + 0.6, z, 0.027, 1.2, 0x806243);
    const flag = this.w.box(
      parent,
      x + 0.25,
      y + 0.95,
      z,
      0.48,
      0.3,
      0.035,
      color,
    );
    this.w.box(
      parent,
      x + 0.25,
      y + 0.95,
      z + 0.022,
      0.07,
      0.25,
      0.02,
      0xf5dab0,
    );
    return flag;
  }
  terrace(x: number, z: number, width = 2.4) {
    const g = this.story.at(x, z);
    this.w.box(g, 0, 0.08, 0, width, 0.17, 1.6, 0xbc9466, "stone");
    for (const dz of [-0.77, 0.77])
      this.w.box(g, 0, 0.2, dz, width, 0.17, 0.1, 0xe4c898, "stone");
    return g;
  }
  wheel(parent: T.Object3D, x: number, y: number, z: number, r = 0.48) {
    const g = new T.Group();
    g.position.set(x, y, z);
    parent.add(g);
    const rim = this.w.shaded(
      new T.TorusGeometry(r, 0.065, 5, 12),
      0x99714b,
      "wood",
    );
    g.add(rim);
    for (let n = 0; n < 8; n++) {
      const spoke = this.w.box(
        g,
        0,
        0,
        0,
        0.055,
        r * 2,
        0.07,
        0xbf9460,
        "wood",
      );
      spoke.rotation.z = (n * Math.PI) / 4;
      const a = (n * Math.PI) / 4;
      this.w.box(
        g,
        Math.sin(a) * r,
        Math.cos(a) * r,
        0,
        0.17,
        0.14,
        0.22,
        0xd0a570,
        "wood",
      );
    }
    this.w.cylinder(g, 0, 0, 0, 0.1, 0.14, 0x73634e).rotation.x = Math.PI / 2;
    return g;
  }
  spray(x: number, z: number, dx: number, dz: number) {
    const g = this.story.at(x, z);
    const path = new T.QuadraticBezierCurve3(
      new T.Vector3(0, 0.65, 0),
      new T.Vector3(dx / 2, 2.25, dz / 2),
      new T.Vector3(dx, 0.45, dz),
    );
    const jet = new T.Mesh(
      new T.TubeGeometry(path, 16, 0.055, 5, false),
      this.w.mat(0x68dce0),
    );
    g.add(jet);
    for (let n = 0; n < 12; n++) {
      const p = path.getPoint(n / 12);
      this.story.blob(g, p.x, p.y, p.z, 0.075, 0xbcf5e8);
    }
    g.traverse((o) => {
      o.raycast = () => {};
    });
    g.visible = false;
    return g;
  }
  wagon(x: number, z: number, color: number) {
    const g = this.story.at(x, z);
    this.w.box(g, 0, 0.43, 0, 1.45, 0.2, 0.78, 0x9e7047, "wood");
    for (const dz of [-0.4, 0.4]) {
      this.w.box(g, 0, 0.68, dz, 1.5, 0.4, 0.07, 0xbc9059, "wood");
      for (const dx of [-0.5, 0.5]) this.wheel(g, dx, 0.29, dz * 1.2, 0.24);
    }
    // Barrel-vaulted canvas, open ends, stitched ribs and a rolled rear flap.
    const cover = this.w.shaded(
      new T.CylinderGeometry(0.53, 0.53, 1.35, 10, 1, true, 0, Math.PI),
      color,
    );
    cover.rotation.z = Math.PI / 2;
    cover.rotation.x = Math.PI / 2;
    cover.position.y = 0.83;
    g.add(cover);
    for (const dx of [-0.62, 0, 0.62]) {
      const rib = new T.Mesh(
        new T.TorusGeometry(0.54, 0.024, 4, 12, Math.PI),
        this.w.mat(0xf3d6a4),
      );
      rib.rotation.y = Math.PI / 2;
      rib.position.set(dx, 0.82, 0);
      g.add(rib);
    }
    this.w.box(g, 0.94, 0.35, 0, 0.65, 0.055, 0.08, 0x926846, "wood");
    return g;
  }
  harvest() {
    const s = this.story,
      w = this.w;
    for (let n = 0; n < 2; n++) {
      const x = 6 + n * 5,
        g = this.terrace(x, 1.8, 4.1);
      w.box(g, -1, 0.7, 0, 1.2, 1.25, 1.2, 0xe1bf8b, "plaster");
      const roof = w.shaded(new T.ConeGeometry(0.96, 0.62, 4), 0xb77750);
      roof.rotation.y = Math.PI / 4;
      roof.position.set(-1, 1.55, 0);
      g.add(roof);
      w.box(g, -1, 0.57, 0.61, 0.32, 0.66, 0.025, 0x725840, "wood");
      const wheel = this.wheel(g, -0.32, 0.75, 0.67, 0.52);
      const crops = new T.Group();
      g.add(crops);
      for (let row = 0; row < 3; row++)
        for (let col = 0; col < 5; col++) {
          const a = 0.15 + col * 0.3,
            b = -0.55 + row * 0.48;
          w.box(g, a, 0.19, b, 0.24, 0.08, 0.36, 0x785438, "soil");
          w.cylinder(crops, a, 0.42, b, 0.024, 0.48, 0x9f9f56);
          for (const sign of [-1, 1]) {
            const ear = s.blob(
              crops,
              a + sign * 0.045,
              0.68,
              b,
              0.075,
              0xe6b64e,
              [0.55, 1.5, 0.7],
            );
            ear.rotation.z = sign * 0.25;
          }
        }
      const bread = new T.Group();
      g.add(bread);
      for (let k = 0; k < 4; k++)
        s.blob(
          bread,
          -1.3 + k * 0.2,
          0.3,
          0.91,
          0.13,
          0xd99d4b,
          [1, 0.65, 1.5],
        );
      this.delivery(n, x - 1, 2.3);
      this.effects.push((p, t) => {
        wheel.rotation.z = t * p;
        crops.scale.y = 0.2 + 0.8 * p;
        bread.visible = p > 0.9;
      });
      s.actor(x, 13.5, false, n ? 0xc29b57 : 0x71977a).root.rotation.y =
        Math.PI;
    }
    w.palm(6.5, 4, 1.8);
  }
  caravan() {
    const s = this.story,
      w = this.w;
    for (let n = 0; n < 3; n++) {
      const x = 4 + n * 4;
      this.wagon(x, 1.8, [0xbe8654, 0x719c9a, 0xbba078][n]);
      const flames = s.at(x, 1.8);
      for (let k = 0; k < 7; k++) {
        const fire = w.shaded(
          new T.ConeGeometry(0.19 + (k % 2) * 0.08, 0.85 + (k % 3) * 0.2, 5),
          k % 2 ? 0xf1b34f : 0xe8753f,
        );
        fire.position.set(
          ((k % 3) - 1) * 0.4,
          0.85,
          Math.floor(k / 3) * 0.32 - 0.4,
        );
        flames.add(fire);
      }
      const smoke = s.at(x, 1.8);
      for (let k = 0; k < 4; k++)
        s.blob(
          smoke,
          (k % 2) * 0.18,
          1.65 + k * 0.25,
          0,
          0.23 + k * 0.05,
          0x9a8c79,
        );
      const pump = s.at(x - 1.25, 2.2);
      w.cylinder(pump, 0, 0.42, 0, 0.15, 0.8, 0x99754c);
      w.box(pump, 0.18, 0.8, 0, 0.5, 0.09, 0.12, 0xd7b478);
      const spray = this.spray(x - 1.25, 2.2, 1.25, -0.4);
      this.delivery(n, x - 1.25, 2.2);
      this.effects.push((p, t) => {
        flames.visible = p < 0.98;
        flames.scale.y =
          (1 - p) * (1 + (w.reduced ? 0 : Math.sin(t * 8 + n) * 0.1));
        smoke.visible = p < 0.95;
        smoke.scale.setScalar(1 - p * 0.8);
        spray.visible = p > 0.03;
      });
      const traveler = s.actor(
        x,
        13.5,
        false,
        [0xbb795b, 0x769f98, 0xae965f][n],
      );
      traveler.root.rotation.y = Math.PI;
      s.heart(x, 1.4, 13.5);
    }
    this.wagon(11, 14, 0xe2c18c);
  }
  temple() {
    const s = this.story,
      w = this.w,
      g = this.terrace(8, 1.6, 3.6);
    for (let k = 0; k < 3; k++)
      w.box(
        g,
        0,
        0.22 + k * 0.2,
        0,
        2.8 - k * 0.45,
        0.22,
        1.65 - k * 0.15,
        0xd8ba89,
        "stone",
      );
    const obelisk = new T.Group();
    g.add(obelisk);
    w.box(obelisk, 0, 1.4, 0, 0.52, 1.6, 0.52, 0x8ca69c, "stone");
    const tip = w.shaded(new T.ConeGeometry(0.38, 0.55, 4), gold);
    tip.rotation.y = Math.PI / 4;
    tip.position.y = 2.47;
    obelisk.add(tip);
    const halo = new T.Mesh(new T.TorusGeometry(0.7, 0.07, 5, 24), w.mat(gold));
    halo.position.y = 2.4;
    obelisk.add(halo);
    const light = s.blob(obelisk, 0, 2.4, 0, 0.28, 0xbaffdf);
    light.visible = false;
    for (const [n, x, z] of [
      [0, 3, 1.8],
      [1, 12, 1.8],
      [2, 14, 9],
    ]) {
      const shrine = this.terrace(x, z, 1.4);
      w.cylinder(shrine, 0, 0.65, 0, 0.32, 1.05, 0xd1b58b);
      const orb = s.blob(shrine, 0, 1.4, 0, 0.25, 0x6ed7ce);
      const ring = new T.Mesh(
        new T.TorusGeometry(0.42, 0.05, 5, 16),
        w.mat(gold),
      );
      ring.position.y = 1.4;
      shrine.add(ring);
      this.delivery(n, x, z);
      this.effects.push((p, t) => {
        orb.scale.setScalar(0.2 + 0.8 * p);
        ring.rotation.y = t * p * 0.5;
        ring.rotation.x = p * 0.6;
      });
    }
    this.finale = (p, t) => {
      obelisk.position.y = smooth(p / 0.4) * 0.65;
      halo.rotation.z = w.reduced ? 0 : t * 0.3;
      light.visible = p > 0.1;
      light.scale.setScalar(1 + p * 0.5);
    };
    s.actor(7, 13.6, false, 0xc39c5c);
    s.actor(8.2, 13.6, false, 0x6d8f9c);
    for (let x = 5; x < 12; x += 2) {
      const lamp = s.at(x, 13);
      w.cylinder(lamp, 0, 0.5, 0, 0.045, 1, 0x8b7352);
      const orb = s.blob(lamp, 0, 1.05, 0, 0.14, gold);
      s.greenery.add(orb);
      orb.position.add(s.scenePoint(x, 13));
    }
  }
  wall(x: number, z: number, h: number) {
    const g = this.story.at(x, z),
      w = this.w;
    w.box(g, 0, h / 2, 0, 0.95, h, 0.7, 0xcab085, "stone");
    w.box(g, 0, h, 0, 1.04, 0.14, 0.8, 0xf0d4a6);
    for (const dx of [-0.32, 0.32])
      w.box(g, dx, h + 0.17, 0, 0.24, 0.3, 0.76, 0xe0c196);
    w.box(g, 0, h * 0.65, 0.36, 0.1, 0.35, 0.025, 0x786b54);
    return g;
  }
  fortress() {
    this.fortressScene = new FortressScene(this);
  }
  soldier(x: number, z: number, color: number, enemy: boolean) {
    const a = this.story.actor(x, z, false, color),
      w = this.w;
    // Helmet covers the traveler's straw crown; shield, boss, spear and plume
    // make the two armies distinct even when viewed at a small scale.
    w.cylinder(
      a.head,
      0,
      0.16,
      0,
      0.245,
      0.16,
      enemy ? 0x8a7770 : 0x94a8a6,
      0.18,
    );
    w.box(a.head, 0, 0.27, 0, 0.065, 0.13, 0.24, color);
    w.box(a.root, -0.28, 0.48, 0.19, 0.34, 0.45, 0.1, color);
    w.box(a.root, -0.28, 0.48, 0.25, 0.065, 0.36, 0.02, 0xf2d6a2);
    this.story.blob(a.root, -0.28, 0.48, 0.28, 0.055, gold);
    w.cylinder(a.root, 0.32, 0.71, 0, 0.018, 1.38, 0x927653);
    const spear = w.shaded(new T.ConeGeometry(0.06, 0.21, 4), 0xb5c2b6);
    spear.position.set(0.32, 1.48, 0);
    a.root.add(spear);
    a.root.rotation.y = enemy ? 0 : Math.PI;
    return a;
  }
  battle() {
    this.battleScene = new BattleScene(this);
  }
  update(dt: number, active: boolean[], time: number) {
    active.forEach((on, n) => {
      this.power[n] = this.w.reduced
        ? Number(on)
        : T.MathUtils.clamp(this.power[n] + dt * (on ? 1.1 : -2), 0, 1);
      this.effects[n]?.(this.power[n], this.w.reduced ? 0 : time);
      this.deliveries[n]?.(this.power[n], this.w.reduced ? 0 : time);
    });
    this.finale(this.story.progress, this.w.reduced ? 0 : time);
    this.battleScene?.update(dt, active, time);
    this.fortressScene?.update(dt, active, time);
  }
}
