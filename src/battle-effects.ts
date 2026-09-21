import * as T from "three";
import type { World } from "./world";

type Particle = {
  sector: number;
  age: number;
  life: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
};
const random = (n: number) => {
  const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};
/** Fixed pools: no meshes, geometries, materials, or vectors are allocated on impact. */
export class BattleEffects {
  chips: T.InstancedMesh;
  dust: T.InstancedMesh;
  particles: Particle[] = [];
  rings: T.Mesh[] = [];
  ringAges = [10, 10, 10, 10];
  object = new T.Object3D();
  constructor(public world: World) {
    this.chips = new T.InstancedMesh(
      new T.DodecahedronGeometry(1, 0),
      world.mat(0xffffff),
      96,
    );
    const smokeMat = new T.MeshBasicMaterial({
      color: 0xe0c8a3,
      transparent: true,
      opacity: 0.46,
      depthWrite: false,
    });
    this.dust = new T.InstancedMesh(
      new T.IcosahedronGeometry(1, 1),
      smokeMat,
      64,
    );
    this.dust.userData.ownedMaterial = smokeMat;
    for (const mesh of [this.chips, this.dust]) {
      mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
      mesh.frustumCulled = false;
      mesh.raycast = () => {};
      world.root.add(mesh);
    }
    for (let i = 0; i < 160; i++) {
      const sector = i < 96 ? Math.floor(i / 24) : Math.floor((i - 96) / 16);
      this.particles.push({
        sector,
        age: 99,
        life: 1,
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        size: 0,
      });
      if (i < 96)
        this.chips.setColorAt(
          i,
          new T.Color([0x9b7350, 0xc6ab80, 0xa1493c, 0x8d8270][i % 4]),
        );
    }
    for (let i = 0; i < 4; i++) {
      const material = new T.MeshBasicMaterial({
        color: 0xf6d9a3,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
        side: T.DoubleSide,
      });
      const ring = new T.Mesh(new T.RingGeometry(0.85, 1, 28), material);
      ring.rotation.x = -Math.PI / 2;
      ring.visible = false;
      ring.userData.ownedMaterial = material;
      ring.raycast = () => {};
      world.root.add(ring);
      this.rings.push(ring);
    }
    this.update(0);
  }
  reset(sector: number) {
    this.particles.forEach((p) => {
      if (p.sector === sector) p.age = 99;
    });
    this.ringAges[sector] = 99;
  }
  burst(sector: number, shot: number, position: T.Vector3) {
    for (let i = 0; i < 160; i++) {
      const p = this.particles[i];
      if (p.sector !== sector) continue;
      const seed = i + shot * 191,
        angle = random(seed) * Math.PI * 2,
        dust = i >= 96;
      p.age = 0;
      p.life = dust
        ? 1.5 + random(seed + 7) * 0.6
        : 1.7 + random(seed + 5) * 0.7;
      p.x = position.x;
      p.y = 0.12;
      p.z = position.z;
      const speed = dust
        ? 0.3 + random(seed + 4) * 1.6
        : 1.2 + random(seed + 4) * 2.1;
      p.vx = Math.cos(angle) * speed;
      p.vz = Math.sin(angle) * speed;
      p.vy = dust ? 0.5 + random(seed + 2) : 1.8 + random(seed + 2) * 2.2;
      p.size = dust
        ? 0.17 + random(seed + 3) * 0.24
        : 0.045 + random(seed + 3) * 0.1;
    }
    this.ringAges[sector] = 0;
    this.rings[sector].position.set(position.x, 0.035, position.z);
  }
  update(dt: number) {
    const obj = this.object;
    let chipCount = 0,
      dustCount = 0;
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i],
        dust = i >= 96;
      p.age += dt;
      const alive = p.age < p.life;
      if (alive) {
        if (dust) dustCount = i - 96 + 1;
        else chipCount = i + 1;
        p.x += p.vx * dt;
        p.z += p.vz * dt;
        p.y += p.vy * dt;
        p.vy -= dt * (dust ? 0.28 : 7);
        if (p.y < 0.035) {
          p.y = 0.035;
          p.vy = Math.abs(p.vy) * 0.27;
          p.vx *= 0.88;
          p.vz *= 0.88;
        }
        obj.position.set(p.x, p.y, p.z);
        obj.rotation.set(dust ? 0 : p.age * 4 + i, dust ? 0 : p.age * 2, 0);
        const fade = Math.min(1, (p.life - p.age) * 3);
        const scale = p.size * (dust ? 1 + p.age * 2 : 1) * fade;
        obj.scale.set(scale, scale * (dust ? 0.72 : 1), scale);
      } else obj.scale.setScalar(0);
      obj.updateMatrix();
      (dust ? this.dust : this.chips).setMatrixAt(
        dust ? i - 96 : i,
        obj.matrix,
      );
    }
    this.chips.count = chipCount;
    this.dust.count = dustCount;
    this.chips.instanceMatrix.needsUpdate = true;
    this.dust.instanceMatrix.needsUpdate = true;
    this.rings.forEach((ring, n) => {
      const age = (this.ringAges[n] += dt);
      ring.visible = age < 0.6;
      if (ring.visible) {
        ring.scale.setScalar(0.15 + age * 3);
        (ring.material as T.MeshBasicMaterial).opacity = (1 - age / 0.6) * 0.65;
      }
    });
  }
}
