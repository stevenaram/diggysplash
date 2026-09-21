import * as T from "three";
import type { CampaignScene } from "./campaign";
import {
  BattleState,
  CYCLE,
  RELEASE,
  FLIGHT,
  IMPACT,
  VOLLEYS,
} from "./battle-state";
import { BattleArmy } from "./battle-army";
import { BattleEffects } from "./battle-effects";
import { compact } from "./battle-mesh";

const ease = (v: number) => {
  const t = T.MathUtils.clamp(v, 0, 1);
  return t * t * (3 - 2 * t);
};
type Engine = {
  root: T.Group;
  arm: T.Group;
  counterweight: T.Group;
  loaded: T.Mesh;
  winch: T.Group;
  stone: T.Mesh;
  shadow: T.Mesh;
  launch: T.Vector3;
  goal: T.Vector3;
  rope: T.Mesh;
  sling: T.Group;
};
type Fort = {
  intact: T.Group;
  wreck: T.Group;
  stakes: T.Group;
  flag: T.Group;
  craters: T.Mesh[];
};
/** Level eight's scene: readable machinery, independent salvos, and bounded effects. */
export class BattleScene {
  state = new BattleState();
  effects: BattleEffects;
  enemy: BattleArmy;
  ally: BattleArmy;
  engines: Engine[] = [];
  forts: Fort[] = [];
  flags: { mesh: T.Mesh; base: Float32Array; phase: number }[] = [];
  victory: T.Group;
  trails: T.InstancedMesh;
  private trailObject = new T.Object3D();
  private v = new T.Vector3();
  private direction = new T.Vector3();
  private up = new T.Vector3(0, 1, 0);
  private axisX = new T.Vector3(1, 0, 0);
  private pivot = new T.Vector3(0, 1.15, 0);
  private anchor = new T.Vector3(0.18, 0.32, 0.5);
  constructor(public campaign: CampaignScene) {
    const s = campaign.story,
      w = campaign.w;
    this.effects = new BattleEffects(w);
    const trailMaterial = new T.MeshBasicMaterial({
      color: 0xe6d8bc,
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
    });
    this.trails = new T.InstancedMesh(
      new T.IcosahedronGeometry(1, 0),
      trailMaterial,
      28,
    );
    this.trails.userData.ownedMaterial = trailMaterial;
    this.trails.frustumCulled = false;
    this.trails.raycast = () => {};
    this.trails.instanceMatrix.setUsage(T.DynamicDrawUsage);
    this.trails.count = 0;
    w.root.add(this.trails);
    this.enemy = new BattleArmy(campaign, true);
    this.ally = new BattleArmy(campaign, false);
    for (let n = 0; n < 4; n++) {
      this.forts.push(this.fort(3.1 + n * 2.82, n));
      this.engines.push(this.trebuchet(14.35, 4 + n * 2.65, 3.1 + n * 2.82, n));
      campaign.delivery(n, 14.35, 4 + n * 2.65);
    }
    for (const x of [1.25, 12.85]) {
      this.banner(x, 13.6, 0x368e99);
      this.banner(x, 0.6, 0xaf493e);
    }
    this.victory = this.banner(7.5, 14.9, 0x368e99, 1.3);
    const props = s.at(1.35, 13.8);
    for (let k = 0; k < 6; k++)
      s.blob(
        props,
        (k % 3) * 0.25,
        0.12 + Math.floor(k / 3) * 0.2,
        (k % 2) * 0.23,
        0.14,
        0x938771,
      );
    w.box(props, 0.8, 0.25, 0, 0.5, 0.45, 0.5, 0xb18b5b, "wood");
    for (const dz of [-0.22, 0.22])
      w.box(props, 0.8, 0.26, dz, 0.56, 0.06, 0.07, 0x806747);
    compact(props, w.mat(0xffffff, undefined, true));
  }
  get w() {
    return this.campaign.w;
  }
  banner(x: number, z: number, color: number, height = 1) {
    const s = this.campaign.story,
      g = s.at(x, z),
      w = this.w;
    w.cylinder(g, 0, height * 0.6, 0, 0.023, height * 1.5, 0x836644);
    s.blob(g, 0, height * 1.37, 0, 0.055, 0xe4bc69);
    const geometry = new T.PlaneGeometry(0.65, 0.43, 8, 3);
    geometry.translate(0.325, height * 1.16, 0);
    const pos = geometry.getAttribute("position"),
      colors = [];
    const c = new T.Color(color),
      cream = new T.Color(0xf1d5a0);
    for (let i = 0; i < pos.count; i++) {
      const px = pos.getX(i),
        py = pos.getY(i) - height * 1.16;
      if (px > 0.6) pos.setX(i, px - Math.max(0, 0.14 - Math.abs(py)));
      const col = Math.abs(px - 0.3) + Math.abs(py) < 0.16 ? cream : c;
      colors.push(col.r, col.g, col.b);
    }
    geometry.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
    const material = new T.MeshBasicMaterial({
      vertexColors: true,
      side: T.DoubleSide,
    });
    const cloth = new T.Mesh(geometry, material);
    cloth.userData.ownedMaterial = material;
    cloth.raycast = () => {};
    g.add(cloth);
    this.flags.push({
      mesh: cloth,
      base: new Float32Array(pos.array),
      phase: this.flags.length * 1.37,
    });
    return g;
  }
  fort(x: number, n: number): Fort {
    const s = this.campaign.story,
      w = this.w;
    const intact = s.at(x, 0.6),
      wreck = s.at(x, 0.6),
      stakes = s.at(x, 2.65);
    // Enemy ballista: wheels, angled supports, broad bow, and taut string.
    w.box(intact, 0, 0.28, 0, 1.05, 0.18, 0.75, 0x765641, "wood");
    for (const dx of [-0.43, 0.43])
      for (const dz of [-0.43, 0.43])
        this.campaign.wheel(intact, dx, 0.24, dz, 0.2);
    for (const dx of [-0.3, 0.3])
      s.pole(
        intact,
        new T.Vector3(dx, 0.3, -0.3),
        new T.Vector3(dx, 0.95, 0.1),
        0.055,
        0xb08a5a,
      );
    const bow = w.box(intact, 0, 0.91, 0.15, 1.5, 0.09, 0.1, 0x99724c, "wood");
    bow.rotation.z = 0.04;
    w.box(intact, 0, 0.92, 0, 0.14, 0.12, 1.45, 0xbb9562, "wood");
    for (const dx of [-0.7, 0.7])
      s.pole(
        intact,
        new T.Vector3(dx, 0.9, 0.15),
        new T.Vector3(0, 0.92, -0.5),
        0.012,
        0xe2c89a,
      );
    w.box(intact, 0, 1, -0.2, 0.035, 0.035, 1.2, 0x5d5646);
    compact(intact, w.mat(0xffffff, "wood", true));
    for (let k = 0; k < 8; k++) {
      const log = w.box(
        wreck,
        Math.sin(k * 2.7) * 0.52,
        0.07 + (k % 2) * 0.05,
        Math.cos(k * 2.1) * 0.42,
        0.12,
        0.1,
        0.8,
        0x7d5b42,
        "wood",
      );
      log.rotation.y = k * 1.53;
      log.rotation.z = ((k % 3) - 1) * 0.2;
    }
    this.campaign.wheel(wreck, 0.45, 0.12, 0.2, 0.22).rotation.x = 1.3;
    s.blob(wreck, -0.2, 0.15, 0, 0.27, 0x8e8170, [1, 0.7, 1]);
    compact(wreck, w.mat(0xffffff, "wood", true));
    wreck.visible = false;
    for (let k = 0; k < 8; k++) {
      const pole = w.cylinder(
        stakes,
        (k - 3.5) * 0.24,
        0.3,
        0,
        0.055,
        0.6,
        0xa7865d,
        0.035,
      );
      pole.rotation.z = Math.sin(k) * 0.07;
    }
    w.box(stakes, 0, 0.22, 0.045, 1.9, 0.07, 0.09, 0x7b5e43, "wood");
    compact(stakes, w.mat(0xffffff, "wood", true));
    const flag = this.banner(x + 0.9, 0.5, 0xaf493e, 0.85);
    const craters: T.Mesh[] = [];
    for (let shot = 0; shot < VOLLEYS; shot++) {
      const crater = new T.Mesh(new T.CircleGeometry(0.5, 18), w.mat(0x82664e));
      crater.rotation.x = -Math.PI / 2;
      crater.position.set(x - 7.5, 0.023, 2.55 - shot * 0.91 - 7.5);
      crater.scale.y = 0.72;
      crater.visible = false;
      crater.raycast = () => {};
      w.root.add(crater);
      craters.push(crater);
    }
    return { intact, wreck, stakes, flag, craters };
  }
  trebuchet(x: number, z: number, targetX: number, n: number): Engine {
    const s = this.campaign.story,
      w = this.w,
      root = s.at(x, z);
    root.rotation.y = Math.atan2(x - targetX, z - 1.7);
    const base = new T.Group();
    root.add(base);
    for (const dx of [-0.4, 0.4]) {
      w.box(base, dx, 0.18, 0, 0.13, 0.2, 1.3, 0x896343, "wood");
      for (const dz of [-0.5, 0.5])
        s.pole(
          base,
          new T.Vector3(dx, 0.2, dz),
          new T.Vector3(dx, 1.13, 0),
          0.075,
          0xbd9360,
        );
      w.box(base, dx, 0.53, 0, 0.08, 0.09, 0.85, 0x9b734d, "wood");
    }
    for (const dz of [-0.48, 0.48])
      w.box(base, 0, 0.2, dz, 0.96, 0.12, 0.14, 0xb79060, "wood");
    w.box(base, 0, 0.23, 0.22, 0.73, 0.08, 0.58, 0xb99465, "wood");
    for (const dx of [-0.45, 0.45])
      for (const dz of [-0.43, 0.43])
        this.campaign.wheel(base, dx, 0.17, dz, 0.17);
    const axle = w.cylinder(base, 0, 1.15, 0, 0.07, 1, 0x75867d);
    axle.rotation.z = Math.PI / 2;
    for (const dx of [-0.45, 0.45]) s.blob(base, dx, 1.15, 0, 0.09, 0xd8b56e);
    // Blue cloth and a visible hydraulic winch identify the player's machines.
    w.box(base, 0, 0.71, 0.3, 0.27, 0.36, 0.035, 0x388d95);
    w.box(base, 0, 0.72, 0.323, 0.075, 0.24, 0.015, 0xe8cc94);
    compact(base, w.mat(0xffffff, "wood", true));
    const arm = new T.Group();
    arm.position.y = 1.15;
    root.add(arm);
    const beam = new T.Group();
    arm.add(beam);
    w.box(beam, 0, 0, 0.34, 0.1, 0.12, 1.64, 0xbe9660, "wood");
    for (const dz of [-0.35, 0.05, 0.7, 1.05])
      w.box(beam, 0, 0.015, dz, 0.14, 0.13, 0.055, 0x8d8067);
    compact(beam, w.mat(0xffffff, "wood", true));
    const counterweight = new T.Group();
    counterweight.position.z = -0.44;
    arm.add(counterweight);
    w.box(counterweight, 0, -0.25, 0, 0.36, 0.36, 0.31, 0x9a754d, "wood");
    for (const dx of [-0.19, 0.19])
      w.box(counterweight, dx, -0.25, 0, 0.035, 0.4, 0.35, 0xc3ac7c);
    for (let k = 0; k < 5; k++)
      s.blob(
        counterweight,
        ((k % 2) - 0.5) * 0.15,
        -0.055,
        Math.floor(k / 2) * 0.08 - 0.08,
        0.1,
        0x8d887b,
      );
    compact(counterweight, w.mat(0xffffff, "wood", true));
    const sling = new T.Group();
    sling.position.set(0, -0.14, 1.11);
    arm.add(sling);
    s.blob(sling, 0, 0, 0, 0.13, 0x79513a, [1, 0.5, 1]);
    for (const dx of [-0.08, 0.08])
      s.pole(
        sling,
        new T.Vector3(dx, 0.02, 0),
        new T.Vector3(0, 0.15, 0),
        0.012,
        0xd2b784,
      );
    compact(sling, w.mat(0xffffff, undefined, true));
    const loaded = w.shaded(new T.DodecahedronGeometry(0.135, 0), 0x96917f);
    loaded.position.set(0, -0.04, 1.11);
    arm.add(loaded);
    const winch = new T.Group();
    winch.position.set(0.51, 0.44, 0.3);
    root.add(winch);
    this.campaign.wheel(winch, 0, 0, 0, 0.24);
    winch.rotation.y = Math.PI / 2;
    compact(winch, w.mat(0xffffff, "wood", true));
    const rope = w.shaded(new T.CylinderGeometry(0.012, 0.012, 1, 5), 0xceaf7b);
    root.add(rope);
    const stone = w.shaded(new T.DodecahedronGeometry(0.16, 1), 0x938b79);
    stone.visible = false;
    stone.raycast = () => {};
    w.root.add(stone);
    const shadow = new T.Mesh(
      new T.CircleGeometry(0.22, 12),
      new T.MeshBasicMaterial({
        color: 0x6f5c48,
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
      }),
    );
    shadow.userData.ownedMaterial = shadow.material;
    shadow.rotation.x = -Math.PI / 2;
    shadow.visible = false;
    shadow.raycast = () => {};
    w.root.add(shadow);
    const launch = new T.Vector3(0, -0.04, 1.11)
      .applyAxisAngle(new T.Vector3(1, 0, 0), -1.18)
      .add(new T.Vector3(0, 1.15, 0))
      .applyAxisAngle(new T.Vector3(0, 1, 0), root.rotation.y)
      .add(root.position);
    return {
      root,
      arm,
      counterweight,
      loaded,
      winch,
      stone,
      shadow,
      launch,
      goal: new T.Vector3(targetX - 7.5, 0.13, 0),
      rope,
      sling,
    };
  }
  update(dt: number, active: boolean[], time: number) {
    const reduced = this.w.reduced,
      events = this.state.update(dt, active, reduced);
    for (const event of events) {
      if (event.kind === "reset") this.effects.reset(event.sector);
      else {
        this.w.onBattleSound(event.kind);
        if (event.kind === "impact") {
          const e = this.engines[event.sector];
          this.v.set(e.goal.x, 0.13, 2.55 - event.shot * 0.91 - 7.5);
          this.effects.burst(event.sector, event.shot, this.v);
        }
      }
    }
    let trailsVisible = false;
    this.engines.forEach((e, n) => {
      const total = this.state.ages[n],
        hits = this.state.hits[n];
      const shot = Math.min(
        VOLLEYS - 1,
        Math.floor(Math.max(0, total) / CYCLE),
      );
      const age = total - shot * CYCLE;
      const spent = hits === VOLLEYS;
      let angle = 0.82;
      if (total >= 0 && !spent) {
        if (age < 0.84) angle = 0.82 + 0.21 * ease(age / 0.84);
        else if (age < RELEASE)
          angle = T.MathUtils.lerp(
            1.03,
            -1.18,
            1 - Math.pow(1 - (age - 0.84) / (RELEASE - 0.84), 3),
          );
        else if (age < 2.65)
          angle =
            -1.18 +
            (reduced
              ? 0
              : Math.sin((age - RELEASE) * 20) *
                Math.exp(-(age - RELEASE) * 5) *
                0.1);
        else
          angle = T.MathUtils.lerp(
            -1.18,
            0.82,
            ease((age - 2.65) / (CYCLE - 2.65)),
          );
      } else if (spent) angle = -0.5;
      e.arm.rotation.x = angle;
      e.counterweight.rotation.x =
        -angle +
        (reduced
          ? 0
          : Math.sin(Math.max(0, age - RELEASE) * 11) *
            0.1 *
            Math.exp(-Math.max(0, age - RELEASE) * 2));
      e.sling.rotation.z = reduced ? 0 : Math.sin(time * 3.3 + n) * 0.075;
      e.sling.rotation.x =
        age >= RELEASE && !reduced ? Math.sin(age * 15) * 0.4 : 0;
      e.rope.visible = total < 0 || (!spent && (age < 0.84 || age > 2.65));
      e.winch.rotation.z = total >= 0 && !spent ? total * 5 : 0;
      e.root.position.y =
        !reduced && age >= RELEASE && age < RELEASE + 0.4
          ? Math.sin((age - RELEASE) * 30) * 0.05 * (1 - (age - RELEASE) / 0.4)
          : 0;
      e.loaded.visible = !spent && (total < 0 || age < RELEASE || age > 2.85);
      const flying =
        !reduced && total >= 0 && !spent && age >= RELEASE && age < IMPACT;
      e.stone.visible = flying;
      e.shadow.visible = flying;
      if (flying) {
        const t = (age - RELEASE) / FLIGHT;
        e.goal.z = 2.55 - shot * 0.91 - 7.5;
        e.stone.position.lerpVectors(e.launch, e.goal, t);
        e.stone.position.y += Math.sin(t * Math.PI) * 3.15;
        e.stone.rotation.set(time * 8, n + time * 5, 0);
        e.shadow.position.set(e.stone.position.x, 0.035, e.stone.position.z);
        e.shadow.scale.setScalar(0.5 + e.stone.position.y * 0.14);
      }
      for (let k = 0; k < 7; k++) {
        const trail = this.trailObject,
          t = (age - RELEASE) / FLIGHT - k * 0.035;
        if (flying && t >= 0) {
          trailsVisible = true;
          trail.position.lerpVectors(e.launch, e.goal, t);
          trail.position.y += Math.sin(t * Math.PI) * 3.15;
          trail.scale.setScalar(0.075 - k * 0.008);
        } else trail.scale.setScalar(0);
        trail.updateMatrix();
        this.trails.setMatrixAt(n * 7 + k, trail.matrix);
      }
      this.v
        .set(0, -0.14, 1.11)
        .applyAxisAngle(this.axisX, angle)
        .add(this.pivot);
      this.direction.copy(this.v).sub(this.anchor);
      e.rope.position.copy(this.v).add(this.anchor).multiplyScalar(0.5);
      e.rope.scale.y = this.direction.length();
      e.rope.quaternion.setFromUnitVectors(this.up, this.direction.normalize());
      const f = this.forts[n];
      f.intact.visible = hits < 3;
      f.wreck.visible = hits >= 3;
      const hitAge = total - IMPACT;
      f.stakes.rotation.x = hits > 0 ? ease(hitAge / 0.35) * 1.38 : 0;
      f.flag.rotation.z = hits >= 3 ? -0.9 : 0;
      f.intact.rotation.z =
        hits > 0 && !reduced
          ? Math.sin(hitAge * 20) * Math.exp(-Math.max(0, hitAge) * 5) * 0.1
          : 0;
      f.craters.forEach((c, j) => (c.visible = hits > j));
    });
    this.trails.count = trailsVisible ? 28 : 0;
    this.trails.instanceMatrix.needsUpdate = true;
    this.flags.forEach(({ mesh, base, phase }) => {
      const pos = mesh.geometry.getAttribute("position");
      for (let i = 0; i < pos.count; i++)
        pos.setZ(
          i,
          reduced
            ? 0
            : Math.sin(time * 3.5 + base[i * 3] * 7 + phase) *
                0.075 *
                (base[i * 3] / 0.65),
        );
      pos.needsUpdate = true;
    });
    this.victory.visible = this.state.victoryAge > 0;
    this.victory.scale.y = 0.25 + 0.75 * ease(this.state.victoryAge);
    this.enemy.update(time, this.state, reduced);
    this.ally.update(time, this.state, reduced);
    this.effects.update(reduced ? 10 : dt);
  }
}
