import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
/** Bake painted face colors and local transforms into one reusable geometry. */
export function bakeColored(
  root: T.Object3D,
  parts: T.Object3D[] = root.children,
): T.BufferGeometry {
  root.updateWorldMatrix(true, true);
  const inverse = root.matrixWorld.clone().invert(),
    chunks: T.BufferGeometry[] = [];
  for (const part of parts)
    part.traverse((o) => {
      if (!(o instanceof T.Mesh)) return;
      const source = o.geometry as T.BufferGeometry;
      const g = source.index ? source.toNonIndexed() : source.clone();
      const count = g.getAttribute("position").count;
      const old = g.getAttribute("color"),
        colors = new Float32Array(count * 3);
      const materials = Array.isArray(o.material) ? o.material : [o.material];
      for (const group of g.groups.length
        ? g.groups
        : [{ start: 0, count, materialIndex: 0 }]) {
        const mat = (materials[group.materialIndex ?? 0] ??
          materials[0]) as T.MeshBasicMaterial;
        for (
          let i = group.start;
          i < Math.min(count, group.start + group.count);
          i++
        ) {
          colors[i * 3] =
            mat.color.r * (mat.vertexColors && old ? old.getX(i) : 1);
          colors[i * 3 + 1] =
            mat.color.g * (mat.vertexColors && old ? old.getY(i) : 1);
          colors[i * 3 + 2] =
            mat.color.b * (mat.vertexColors && old ? old.getZ(i) : 1);
        }
      }
      g.setAttribute("color", new T.BufferAttribute(colors, 3));
      if (!g.getAttribute("uv"))
        g.setAttribute(
          "uv",
          new T.BufferAttribute(new Float32Array(count * 2), 2),
        );
      g.applyMatrix4(new T.Matrix4().multiplyMatrices(inverse, o.matrixWorld));
      g.clearGroups();
      chunks.push(g);
    });
  const merged = mergeGeometries(chunks, false)!;
  chunks.forEach((g) => g.dispose());
  return merged;
}
export function compact(root: T.Group, material: T.Material) {
  const geometry = bakeColored(root);
  root.traverse((o) => {
    if (o instanceof T.Mesh) o.geometry.dispose();
  });
  root.clear();
  const mesh = new T.Mesh(geometry, material);
  root.add(mesh);
  return mesh;
}
