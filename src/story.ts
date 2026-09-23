import {CaravanScene} from './caravan-scene';
import {CARAVAN_DURATION} from './caravan-timeline';
import * as T from "three";
import {FARM_DURATION} from "./farm-timeline";
import { HarvestScene } from "./harvest-scene";
import { CitySprites } from "./city-sprites";
import {CITY_DURATION} from "./city-timeline";
import { BRIDGE_DURATION } from "./bridge-timeline";
import { BridgeSprites } from "./bridge-sprites";
import { OasisSprites } from "./oasis-sprites";
import { OASIS_DURATION } from "./oasis-timeline";
import { SIZE, gridWorld } from "./game";
import { CampaignScene } from "./campaign";
import type { World } from "./world";

type Actor = {
  root: T.Group;
  head: T.Group;
  legs: T.Object3D[];
  start: T.Vector3;
  destination: T.Vector3;
  sheep: boolean;
  waypoints?: T.Vector3[];
};
const ease = (t: number) => {
  t = T.MathUtils.clamp(t, 0, 1);
  return t * t * (3 - 2 * t);
};

/** Story props have real moving geometry; the result waits for their consequence to finish. */
export class StoryScene {
  campaign?: CampaignScene;
  oasisSprites?: OasisSprites;
  bridgeSprites?: BridgeSprites;
  citySprites?: CitySprites;
  harvestScene?: HarvestScene;
  caravanScene?:CaravanScene;
  progress = 0;
  done = false;
  actors: Actor[] = [];
  bridge?: T.Group;
  gates: T.Group[] = [];
  greenery = new T.Group();
  hearts = new T.Group();
  wetDetails: T.Object3D[] = [];
  private started = false;
  constructor(public world: World) {
    world.root.add(this.greenery, this.hearts);
    const kind = world.game.level.story?.kind;
    if (kind === "oasis") this.oasisSprites = new OasisSprites(world);
    if (kind === "bridge") this.crossing();
    if (kind === "city") this.city();
    if(kind === "caravan")this.caravanScene=new CaravanScene(world);
    if (kind === "harvest") this.harvestScene=new HarvestScene(world);
    if (kind && !["oasis", "bridge", "city", "harvest", "caravan"].includes(kind))
      this.campaign = new CampaignScene(this);
    this.hearts.visible = false;
  }
  scenePoint(x: number, z: number) {
    if (
      !["oasis", "bridge", "city"].includes(
        this.world.game.level.story?.kind ?? "",
      )
    ) {
      const kind = this.world.game.level.story?.kind;
      // Two northern rows hold the military scenes. Other chapters use a
      // compact northern terrace. Southern roads and eastern works are on-grid.
      if (z <= 3 && kind !== "battle" && kind !== "fortress")
        z = 0.7 + (z - 1.8) * 0.4;
      if (z >= 12.5) z = 14 + (z - 14) * 0.4;
      if (x >= 13.5) x = 14.1 + (x - 14.3) * 0.35;
    }
    return new T.Vector3(x - 7.5, 0, z - 7.5);
  }
  at(x: number, z: number) {
    const group = new T.Group();
    group.position.copy(this.scenePoint(x, z));
    this.world.root.add(group);
    return group;
  }
  blob(
    parent: T.Object3D,
    x: number,
    y: number,
    z: number,
    r: number,
    color: number,
    scale = [1, 1, 1],
  ) {
    const mesh = this.world.shaded(new T.IcosahedronGeometry(r, 1), color);
    mesh.position.set(x, y, z);
    mesh.scale.set(...(scale as [number, number, number]));
    parent.add(mesh);
    return mesh;
  }
  pole(
    parent: T.Object3D,
    a: T.Vector3,
    b: T.Vector3,
    r: number,
    color: number,
  ) {
    const direction = b.clone().sub(a);
    const mesh = this.world.shaded(
      new T.CylinderGeometry(r, r, direction.length(), 6),
      color,
    );
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(
      new T.Vector3(0, 1, 0),
      direction.normalize(),
    );
    parent.add(mesh);
    return mesh;
  }
  actor(x: number, z: number, sheep = false, coat = 0x63928d): Actor {
    const w = this.world,
      root = this.at(x, z),
      head = new T.Group(),
      legs: T.Object3D[] = [];
    // Painted contact patches anchor characters to the ground without dynamic lighting.
    const shadow = w.cylinder(
      root,
      0,
      0.02,
      0,
      sheep ? 0.4 : 0.28,
      0.015,
      0xc0a17a,
    );
    shadow.scale.z = sheep ? 1.15 : 0.75;
    if (sheep) {
      for (const sx of [-0.19, 0.19])
        for (const sz of [-0.24, 0.24])
          legs.push(w.box(root, sx, 0.18, sz, 0.095, 0.28, 0.1, 0x725944));
      this.blob(root, 0, 0.46, 0, 0.34, 0xfff2d8, [1.02, 0.9, 1.3]);
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        this.blob(
          root,
          Math.sin(a) * 0.23,
          0.48 + (i % 2) * 0.055,
          Math.cos(a) * 0.28,
          0.16,
          i % 2 ? 0xf7e7c5 : 0xfff7e4,
        );
      }
      head.position.set(0, 0.5, 0.35);
      root.add(head);
      this.blob(head, 0, 0, 0.055, 0.18, 0xe9d8b7, [0.78, 0.85, 1.15]);
      this.blob(head, 0, -0.055, 0.19, 0.105, 0x806751, [1, 0.7, 0.65]);
      for (const sign of [-1, 1]) {
        this.blob(
          head,
          sign * 0.17,
          0.015,
          0,
          0.085,
          0xc8ad88,
          [1.3, 0.35, 0.7],
        );
        w.box(head, sign * 0.11, 0.025, 0.105, 0.027, 0.04, 0.026, 0x362f2b);
      }
      this.blob(root, 0, 0.51, -0.4, 0.12, 0xfff6dd);
      w.box(root, 0, 0.32, 0.32, 0.32, 0.035, 0.06, 0xc18b4e);
      w.cylinder(root, 0, 0.27, 0.35, 0.04, 0.07, 0xe6b55c);
    } else {
      for (const sign of [-1, 1]) {
        legs.push(
          w.box(root, sign * 0.11, 0.17, 0, 0.12, 0.26, 0.15, 0x775c46),
        );
        w.box(root, sign * 0.11, 0.065, 0.055, 0.14, 0.09, 0.23, 0x59483a);
      }
      w.cylinder(root, 0, 0.5, 0, 0.24, 0.52, coat, 0.17);
      w.box(root, 0, 0.39, 0.01, 0.4, 0.055, 0.34, 0x9c7450, "wood");
      for (const sign of [-1, 1]) {
        const arm = w.cylinder(root, sign * 0.23, 0.56, 0, 0.055, 0.32, coat);
        arm.rotation.z = sign * 0.17;
        this.blob(root, sign * 0.25, 0.38, 0.01, 0.07, 0xce9770);
      }
      head.position.set(0, 0.87, 0);
      root.add(head);
      this.blob(head, 0, 0, 0, 0.17, 0xe2b28a, [0.9, 1.05, 0.9]);
      w.box(head, -0.06, 0.015, 0.145, 0.026, 0.036, 0.02, 0x473e33);
      w.box(head, 0.06, 0.015, 0.145, 0.026, 0.036, 0.02, 0x473e33);
      this.blob(head, 0, -0.025, 0.16, 0.04, 0xd4a17c);
      w.cylinder(head, 0, 0.12, 0, 0.24, 0.045, 0xe0b878);
      w.cylinder(head, 0, 0.19, 0, 0.155, 0.12, 0xc89e61, 0.12);
      w.box(root, 0, 0.61, -0.19, 0.25, 0.28, 0.12, 0xb98353, "wood");
    }
    const actor = {
      root,
      head,
      legs,
      start: root.position.clone(),
      destination: root.position.clone(),
      sheep,
    };
    this.actors.push(actor);
    return actor;
  }
  shepherd(x: number, z: number) {
    const actor = this.actor(x, z, false, 0x6b9d98),
      w = this.world;
    w.cylinder(actor.root, 0.35, 0.55, 0.08, 0.025, 1.08, 0x82603f);
    const hook = new T.Mesh(
      new T.TorusGeometry(0.095, 0.025, 5, 10, Math.PI * 1.45),
      w.mat(0x82603f),
    );
    hook.position.set(0.28, 1.08, 0.08);
    actor.root.add(hook);
    w.box(actor.root, 0, 0.72, 0.14, 0.18, 0.16, 0.035, 0xf1d496);
    return actor;
  }
  heart(x: number, y: number, z: number) {
    const shape = new T.Shape();
    shape.moveTo(0, -0.7);
    shape.bezierCurveTo(-1, 0.1, -0.8, 0.8, -0.35, 0.8);
    shape.quadraticCurveTo(0, 0.8, 0, 0.45);
    shape.quadraticCurveTo(0, 0.8, 0.35, 0.8);
    shape.bezierCurveTo(0.8, 0.8, 1, 0.1, 0, -0.7);
    const mesh = new T.Mesh(
      new T.ShapeGeometry(shape, 6),
      this.world.mat(0xd98b75),
    );
    mesh.material.side = T.DoubleSide;
    mesh.scale.setScalar(0.15);
    mesh.position.copy(this.scenePoint(x, z));
    mesh.position.y = y;
    this.hearts.add(mesh);
  }
  oasis() {
    const w = this.world;
    w.palm(-5.5, -3.5, 2.5);
    w.palm(-4.5, -3.5, 2.05);
    w.palm(6.9, -1.7, 2.2);
    // An irregular limestone rim makes the destination read as a dry watering hole.
    const basin = w.game.level.tiles
      .map((t, i) => (t === "basin" || t === "target" ? i : -1))
      .filter((i) => i >= 0);
    for (const i of basin) {
      const x = i % SIZE,
        z = Math.floor(i / SIZE);
      for (const [dx, dz] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const j = (z + dz) * SIZE + x + dx;
        if (basin.includes(j)) continue;
        const rock = w.shaded(new T.DodecahedronGeometry(0.19, 0), 0xcfb48c);
        rock.position.set(
          gridWorld(x) + dx * 0.93,
          0.035,
          gridWorld(z) + dz * 0.93,
        );
        rock.scale.set(dx ? 0.6 : 1.4, 0.45, dz ? 0.6 : 1.4);
        w.root.add(rock);
        const grass = new T.Group();
        grass.position.set(
          gridWorld(x) + dx * 1.05,
          0.04,
          gridWorld(z) + dz * 1.05,
        );
        this.greenery.add(grass);
        for (let k = 0; k < 3; k++) {
          const blade = w.box(
            grass,
            (k - 1) * 0.065,
            0.12,
            0,
            0.035,
            0.28,
            0.045,
            [0x68986a, 0x8aac67, 0x80a671][k],
          );
          blade.rotation.z = (k - 1) * 0.25;
        }
      }
    }
    this.greenery.visible = false;
    const shepherd = this.shepherd(13.1, 10.4);
    shepherd.destination.add(new T.Vector3(-0.3, 0, -0.5));
    const a = this.actor(14.1, 8.2, true);
    a.destination.set(13.85 - 7.5, 0, 8.2 - 7.5);
    a.root.rotation.y = -Math.PI / 2;
    const b = this.actor(12.2, 10.4, true);
    b.destination.set(12.2 - 7.5, 0, 9.85 - 7.5);
    b.root.rotation.y = Math.PI;
    const c = this.actor(14.2, 6.8, true);
    c.destination.set(13.85 - 7.5, 0, 6.8 - 7.5);
    c.root.rotation.y = -Math.PI / 2;
    this.heart(12.8, 1.35, 8.2);
    this.heart(11.5, 1.15, 8.8);
    // Shepherd's rolled blanket, basket, and fence give the scene a lived-in edge.
    const camp = this.at(12, 10.6);
    w.cylinder(camp, 0.45, 0.16, 0, 0.18, 0.3, 0x9c7752);
    w.box(camp, -0.3, 0.1, 0, 0.55, 0.15, 0.32, 0xba7957);
    for (let k = 0; k < 4; k++)
      w.box(camp, -0.56 + k * 0.16, 0.18, 0, 0.035, 0.02, 0.33, 0xf0cc9a);
  }
  crossing() {
    this.bridgeSprites=new BridgeSprites(this.world);
    this.bridge=this.bridgeSprites.deck;
  }
  city() {
    this.citySprites=new CitySprites(this.world);
  }
  aqueductArch(x: number, z: number) {
    const w = this.world,
      group = this.at(x, z);
    const shape = new T.Shape();
    shape.moveTo(-0.5, 0);
    shape.lineTo(0.5, 0);
    shape.lineTo(0.5, 1.65);
    shape.lineTo(-0.5, 1.65);
    shape.closePath();
    const opening = new T.Path();
    opening.moveTo(-0.36, 0);
    opening.lineTo(-0.36, 0.89);
    opening.absarc(0, 0.89, 0.36, Math.PI, 0, true);
    opening.lineTo(0.36, 0);
    opening.closePath();
    shape.holes.push(opening);
    const arch = w.shaded(
      new T.ExtrudeGeometry(shape, {
        depth: 0.36,
        bevelEnabled: false,
        curveSegments: 8,
      }),
      0xd8b987,
      "stone",
    );
    arch.position.z = -0.18;
    group.add(arch);
    w.box(group, 0, 1.64, 0, 1, 0.14, 0.72, 0xe8c994, "stone");
    for (const dz of [-0.3, 0.3])
      w.box(group, 0, 1.77, dz, 1, 0.2, 0.12, 0xf2d8a9);
    // Voussoirs frame the arch with individual sunlit stones.
    for (let n = 0; n < 7; n++) {
      const a = (n * Math.PI) / 6;
      const stone = w.box(
        group,
        Math.cos(a) * 0.4,
        0.89 + Math.sin(a) * 0.4,
        0.2,
        0.18,
        0.13,
        0.06,
        0xf0d2a1,
      );
      stone.rotation.z = a - Math.PI / 2;
    }
  }
  update(dt: number, active: boolean[], time: number) {
    const won = active.length > 0 && active.every(Boolean);
    if (!won) {
      this.progress = 0;
      this.started = false;
      this.done = false;
    } else {
      if (!this.started) {
        this.started = true;
      }
      this.progress = this.world.reduced
        ? 1
        : Math.min(
            1,
            this.progress +
              dt /
                (this.campaign?.duration ??
                  (this.caravanScene ? CARAVAN_DURATION : this.harvestScene ? FARM_DURATION : this.oasisSprites ? OASIS_DURATION : this.world.game.level.story?.kind === "city" ? CITY_DURATION : this.world.game.level.story?.kind === "bridge" ? BRIDGE_DURATION : 4)),
          );
      this.done = this.progress >= 1;
    }
    if (this.oasisSprites) {
      this.oasisSprites.update(this.progress, time);
      return;
    }
    const kind = this.world.game.level.story?.kind;
    const travel = ease((this.progress - 0.35) / 0.6);
    if (this.bridge)
      this.bridge.rotation.z =
        -(1 - ease(this.progress / 0.35)) * Math.PI * 0.36;
    this.bridgeSprites?.update(this.progress,time);
    if(this.citySprites){this.citySprites.update(this.progress,time);return;}
    if(this.caravanScene){this.caravanScene.update(this.progress,active,time);return;}
    this.harvestScene?.update(dt,active,this.progress,time);
    this.gates.forEach((g, n) => {
      const height = active[n] ? 3.85 : 0;
      g.position.y = this.world.reduced
        ? height
        : T.MathUtils.damp(g.position.y, height, 7, dt);
      // Gate slats retract into the lintel instead of projecting above the town.
      if(kind === "city") g.scale.y=1-.88*Math.min(1,g.position.y/3.85);
    });
    this.greenery.visible = won;
    this.greenery.scale.setScalar(0.2 + 0.8 * ease(this.progress / 0.45));
    this.hearts.visible = this.progress > 0.85;
    this.hearts.children.forEach((h) => {
      h.quaternion.copy(this.world.camera.quaternion);
      if (!this.world.reduced) h.position.y += Math.sin(time * 2) * dt * 0.06;
    });
    this.wetDetails.forEach((m, n) => (m.visible = !!active[n]));
    this.actors.forEach((actor, n) => {
      if (actor.waypoints) {
        const p =
          Math.min(
            1,
            Math.max(
              0,
              (this.progress - 0.32 - n * 0.025) / (0.68 - n * 0.025),
            ),
          ) *
          (actor.waypoints.length - 1);
        const segment = Math.min(actor.waypoints.length - 2, Math.floor(p));
        actor.root.position.lerpVectors(
          actor.waypoints[segment],
          actor.waypoints[segment + 1],
          p - segment,
        );
      } else
        actor.root.position.copy(actor.start).lerp(actor.destination, travel);
      const moving =
        travel > 0 && travel < 1 && !actor.start.equals(actor.destination);
      if (!this.world.reduced) {
        actor.root.position.y = moving
          ? Math.abs(Math.sin(time * 9 + n)) * 0.045
          : Math.sin(time * 1.4 + n) * 0.009;
        actor.legs.forEach(
          (l, j) =>
            (l.rotation.x = moving
              ? Math.sin(time * 9 + j * Math.PI) * 0.3
              : 0),
        );
      }
      if (kind === "oasis" && actor.sheep)
        actor.head.rotation.x = ease((this.progress - 0.65) / 0.25) * 0.55;
      else
        actor.head.rotation.y = this.progress > 0.92 && !actor.sheep ? -0.2 : 0;
      if (kind === "city" && moving) actor.root.rotation.y = Math.PI;
    });
    this.campaign?.update(dt, active, time);
    if (this.campaign?.fortressScene)
      this.done = won && this.campaign.fortressScene.state.complete;
    if (this.campaign?.battleScene)
      this.done = won && this.campaign.battleScene.state.complete;
  }
}
