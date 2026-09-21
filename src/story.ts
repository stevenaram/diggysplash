import * as T from "three";
import { HarvestScene } from "./harvest-scene";
import { CitySprites } from "./city-sprites";
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
    if (kind === "harvest") this.harvestScene=new HarvestScene(world);
    if (kind && !["oasis", "bridge", "city", "harvest"].includes(kind))
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
    const w = this.world;
    this.bridgeSprites = new BridgeSprites(w);
    const bridge = this.at(12.5, 10);
    bridge.position.y = 0.13;
    this.bridge = bridge;
    for (let j = 0; j < 14; j++)
      w.box(
        bridge,
        0.1 + j * 0.225,
        0,
        .65,
        0.205,
        0.12,
        3.1,
        j % 3 ? 0xba8957 : 0xa97649,
        "wood",
      );
    for (const z of [-0.85, 2.15]) {
      w.box(bridge, 1.55, -0.1, z, 3.2, 0.15, 0.1, 0x80533b);
      for (const x of [0.05, 1.05, 2.05, 3.05])
        w.box(bridge, x, 0.29, z, 0.065, 0.66, 0.065, 0x916749);
      for (let j = 0; j < 6; j++)
        this.pole(
          bridge,
          new T.Vector3(j * 0.53, 0.59, z),
          new T.Vector3((j + 1) * 0.53, 0.59, z),
          0.018,
          0xd8b785,
        );
    }
    bridge.children.forEach((child) => (child.position.x *= -1));
    bridge.rotation.z = -Math.PI * 0.36;
    for (const z of [9.15, 12.15]) {
      const anchor = this.at(9.4, z);
      w.cylinder(anchor, 0, 0.25, 0, 0.18, 0.5, 0x9c8060);
      w.box(anchor, 0, 0.65, 0, 0.12, 0.65, 0.12, 0x80533b);
    }
    // A crank shaft visibly connects the powered wheel to the bridge winch.
    this.pole(
      w.root,
      new T.Vector3(0, 2.24, -1),
      new T.Vector3(0, 1.14, 1.65),
      0.045,
      0x8d7657,
    );
    this.pole(
      w.root,
      new T.Vector3(0, 1.14, 1.65),
      new T.Vector3(1.9, 1.14, 1.65),
      0.045,
      0x8d7657,
    );
    // Exposed strata and broken ledges emphasize the depth of the canyon.
    for (let z = 1; z < 15; z += 2) {
      for (const side of [9.6, 11.4]) {
        const rock = w.shaded(
          new T.DodecahedronGeometry(0.36, 0),
          z % 3 ? 0x956349 : 0xab7753,
          "stone",
        );
        rock.position.set(side - 7.5, -0.8 - (z % 3) * 0.18, z - 7.5);
        rock.scale.set(0.6, 1.4, 1.3);
        w.root.add(rock);
      }
    }
  }
  city() {
    const w=this.world;
    this.citySprites=new CitySprites(w);
    // Two broad wheel silhouettes flank a deliberately clear central entrance.
    w.house(-1.9,-6.4,1.9,1.3,1.25,0xe3bc86);
    w.house(6.35,-6.4,1.7,1.2,1.4,0xe8c594);
    for(const x of [-2.5,-1.5,-.5,.5,1,5,6,7]) {
      const tower=x===1||x===5, h=tower?4.7:3.8;
      w.box(w.root,x,h/2,-4.5,tower?1:.98,h,.85,0xe4c394,"stone");
      w.box(w.root,x,h+.06,-4.5,tower?1.15:1.04,.2,1.02,0xf3d9aa,"stone");
      for(const dx of [-.28,.28])w.box(w.root,x+dx,h+.3,-4.5,.24,.45,.92,0xe9cd9f,"stone");
      if(tower)w.box(w.root,x,3.25,-4.04,.4,1.1,.04,x===1?0x579b96:0xc9815a);
    }
    // Twin lifting panels have a wide opening for full-size billboard people.
    for(const x of [2.2,3.8]) {
      const gate=new T.Group();gate.position.set(x,0,-4.5);w.root.add(gate);this.gates.push(gate);
      for(let j=0;j<6;j++)w.box(gate,-.65+j*.26,1.85,0,.13,3.7,.2,0x826c51,"wood");
      for(const y of [.35,1.8,3.25])w.box(gate,0,y,0,1.5,.18,.26,0x92754f,"wood");
    }
    w.box(w.root,3,4.05,-4.5,3.3,.4,1.02,0xeccf9f,"stone");
    w.box(w.root,3,4.36,-4.5,3.3,.2,1.1,0xf3d9aa,"stone");
    for(const x of [1.55,2.15,2.75,3.35,3.95,4.45])
      w.box(w.root,x,4.65,-4.5,.3,.4,.95,0xe9cd9f,"stone");
    // Dry drive shafts stay behind each wheel. Water reaches the two ground inlets independently.
    for(const x of [0,6]) {
      this.pole(w.root,new T.Vector3(x,2.24,-1.45),new T.Vector3(x,2.24,-3.85),.055,0x8d7657);
      w.box(w.root,x,2.24,-3.85,.35,.35,.3,0x80533b,"wood");
    }
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
        this.world.focusConsequence();
      }
      this.progress = this.world.reduced
        ? 1
        : Math.min(
            1,
            this.progress +
              dt /
                (this.campaign?.duration ??
                  (this.oasisSprites ? OASIS_DURATION : this.world.game.level.story?.kind === "city" ? 9 : this.world.game.level.story?.kind === "bridge" ? 6 : 4)),
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
    this.citySprites?.update(this.progress,time);
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
