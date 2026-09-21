import * as T from "three";
import type { CampaignScene } from "./campaign";
import { bakeColored } from "./battle-mesh";
import { CYCLE, IMPACT, type BattleState } from "./battle-state";

const clamp = (n: number) => T.MathUtils.clamp(n, 0, 1);
/** Four instanced bones and ground shadows per army: sixty-four soldiers in ten draws. */
export class BattleArmy {
  meshes: T.InstancedMesh[] = [];
  count: number;
  private model = new T.Object3D();
  private bone = new T.Object3D();
  private matrix = new T.Matrix4();
  private legPivot = new T.Matrix4().makeTranslation(0, -0.3, 0);
  constructor(
    public campaign: CampaignScene,
    public enemy: boolean,
  ) {
    const s = campaign.story,
      w = campaign.w;
    const actor = campaign.soldier(0, 0, enemy ? 0xb04b40 : 0x318c96, enemy);
    actor.root.position.set(0, 0, 0);
    actor.root.rotation.set(0, 0, 0);
    const shadow = actor.root.children[0];
    const boots = actor.root.children.filter((p) => p.position.y === 0.065);
    const body = actor.root.children.filter(
      (p) =>
        p !== actor.head &&
        p !== shadow &&
        !actor.legs.includes(p) &&
        !boots.includes(p),
    );
    const groups = [
      bakeColored(actor.root, body),
      bakeColored(actor.head),
      ...actor.legs.map((l) =>
        bakeColored(actor.root, [
          l,
          ...boots.filter((b) => b.position.x === l.position.x),
        ]),
      ),
      bakeColored(actor.root, [shadow]),
    ];
    this.count = enemy ? 36 : 28;
    for (const geometry of groups) {
      const mesh = new T.InstancedMesh(
        geometry,
        w.mat(0xffffff, undefined, true),
        this.count,
      );
      mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
      mesh.frustumCulled = false;
      // Units occupy reserved scenery; their moving silhouettes never eat a tile tap.
      mesh.raycast = () => {};
      w.root.add(mesh);
      this.meshes.push(mesh);
    }
    actor.root.removeFromParent();
    actor.root.traverse((o) => {
      if (o instanceof T.Mesh) o.geometry.dispose();
    });
    s.actors.splice(s.actors.indexOf(actor), 1);
  }
  update(time: number, state: BattleState, reduced: boolean) {
    const { model, bone, matrix } = this;
    for (let i = 0; i < this.count; i++) {
      const column = i % 12,
        row = Math.floor(i / 12),
        sector = Math.floor(column / 3);
      const crew = !this.enemy && i >= 24;
      const x = crew ? 14.95 : 2.15 + column * 0.94,
        z = crew
          ? 3.2 + (i - 24) * 2.65
          : this.enemy
            ? 0.72 + row * 0.65
            : 13.7 + row * 0.73;
      const hits = state.hits[sector],
        age = state.ages[sector];
      const recent = age < 0 ? -1 : age - ((hits || 1) - 1) * CYCLE - IMPACT;
      const fallen = this.enemy && hits >= 2;
      const impact = recent >= 0 ? clamp(recent / 0.8) : 0;
      const launch = fallen
        ? reduced
          ? 1
          : clamp((age - CYCLE - IMPACT - (i % 3) * 0.055) / 0.8)
        : 0;
      const cheer = !this.enemy ? clamp(state.victoryAge / 0.9) : 0;
      model.position.copy(this.campaign.story.scenePoint(x, z));
      model.rotation.set(0, this.enemy ? 0 : Math.PI, 0);
      model.scale.setScalar(0.88);
      if (!reduced) {
        model.position.y = Math.sin(time * 2.4 + i * 1.73) * 0.012;
        model.rotation.z = Math.sin(time * 1.9 + i) * 0.035;
        const marching = Math.sin(time * 0.7 + i * 0.93) > 0.5;
        if (marching)
          model.position.y += Math.abs(Math.sin(time * 5 + i)) * 0.035;
        if (crew) {
          model.rotation.y = -Math.PI / 2;
          model.rotation.x = Math.sin(time * 4 + i) * 0.085;
        }
        if (this.enemy && hits === 1) {
          model.position.z -= impact * 0.25;
          model.rotation.y = Math.sin(time * 5 + i) * 0.13;
        }
        if (!this.enemy) {
          model.position.y += Math.abs(Math.sin(time * 7 + i)) * 0.14 * cheer;
          model.rotation.z += Math.sin(time * 5 + i) * 0.08 * cheer;
        }
      }
      if (fallen) {
        const direction = i % 2 ? 1 : -1;
        model.position.x += direction * launch * (0.35 + (i % 4) * 0.18);
        model.position.z -= launch * (0.2 + (i % 5) * 0.12);
        model.position.y =
          0.1 + Math.sin(launch * Math.PI) * (0.9 + (i % 4) * 0.2);
        model.rotation.z = direction * launch * (1.3 + (i % 3) * 0.15);
        model.rotation.y = launch * ((i % 5) - 2) * 0.45;
        model.rotation.x = launch * (0.25 + (i % 4) * 0.22);
      }
      model.updateMatrix();
      this.meshes[0].setMatrixAt(i, model.matrix);
      bone.position.set(0, 0.87, 0);
      bone.rotation.set(0, reduced ? 0 : Math.sin(time * 0.9 + i) * 0.16, 0);
      bone.scale.setScalar(1);
      bone.updateMatrix();
      matrix.multiplyMatrices(model.matrix, bone.matrix);
      this.meshes[1].setMatrixAt(i, matrix);
      for (let side = 0; side < 2; side++) {
        bone.position.set(0, 0.3, 0);
        bone.rotation.set(
          reduced || fallen
            ? 0
            : Math.sin(time * 3.3 + i + side * Math.PI) * (0.11 + cheer * 0.18),
          0,
          0,
        );
        bone.updateMatrix();
        matrix.multiplyMatrices(model.matrix, bone.matrix);
        matrix.multiply(this.legPivot);
        this.meshes[side + 2].setMatrixAt(i, matrix);
      }
      bone.position.set(model.position.x, 0, model.position.z);
      bone.rotation.set(0, 0, 0);
      bone.scale.setScalar(0.88 / (1 + Math.max(0, model.position.y) * 0.3));
      bone.updateMatrix();
      this.meshes[4].setMatrixAt(i, bone.matrix);
    }
    this.meshes.forEach((m) => (m.instanceMatrix.needsUpdate = true));
  }
}
