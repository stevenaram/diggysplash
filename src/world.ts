import * as T from "three";
import { Game } from "./game";
import { SurfaceTextures, type Surface } from "./textures";
import { StoryScene } from "./story";
const palette = {
  sand: 0xe8c58c,
  edge: 0xc28e60,
  water: 0x36bfc4,
  wood: 0x80533b,
};
export class World {
  scene = new T.Scene();
  camera = new T.PerspectiveCamera(34, 1, 0.1, 500);
  renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
  root = new T.Group();
  story?: StoryScene;
  banks = new Map<number, T.Mesh[]>();
  onHover: (i: number | null) => void = () => {};
  onViewChanged = () => {};
  onBattleSound: (kind: "wind" | "launch" | "impact") => void = () => {};
  tiles: T.Mesh[] = [];
  waters = new Map<number, T.Mesh>();
  wheels: T.Group[] = [];
  palms: T.Group[] = [];
  markers: T.Mesh[] = [];
  hover = new T.Mesh(
    new T.BoxGeometry(0.95, 0.045, 0.95),
    new T.MeshBasicMaterial({
      color: 0xfff5c7,
      transparent: true,
      opacity: 0.65,
    }),
  );
  ray = new T.Raycaster();
  reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  frame = 0;
  last = 0;
  wetAt = new Map<number, number>();
  particles: { mesh: T.Mesh; v: T.Vector3; life: number }[] = [];
  onSettled = () => {};
  settled = false;
  elapsed = 0;
  mats = new Map<string, T.MeshBasicMaterial>();
  textures = new SurfaceTextures();
  viewTarget = new T.Vector3();
  viewDirection = new T.Vector3(23, 30, 29).normalize();
  zoom = 1;
  fitDistance = 40;
  cameraTransition?: {
    from: T.Vector3;
    to: T.Vector3;
    start: number;
    fromZoom: number;
    toZoom: number;
  };
  viewChanged = false;
  pointers = new Map<number, T.Vector2>();
  gesture = false;
  pointerStart = new T.Vector2();
  resizeObserver: ResizeObserver;
  constructor(
    public host: HTMLElement,
    public game: Game,
    public onDig: (i: number) => void,
  ) {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x000000, 0);
    host.append(this.renderer.domElement);
    this.renderer.domElement.setAttribute("aria-hidden", "true");
    this.camera.position.set(23, 26, 29);
    this.camera.lookAt(0, 0, 0);
    this.scene.add(this.root, this.hover);
    this.hover.visible = false;
    host.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      if (this.pointers.size === 0) {
        this.gesture = false;
        this.pointerStart.set(e.clientX, e.clientY);
        this.highlight(this.pick(e.clientX, e.clientY));
      }
      this.pointers.set(e.pointerId, new T.Vector2(e.clientX, e.clientY));
      if (this.pointers.size > 1) this.gesture = true;
      host.setPointerCapture(e.pointerId);
    });
    host.addEventListener("pointermove", (e) => {
      const previous = this.pointers.get(e.pointerId);
      if (!previous) {
        this.highlight(this.pick(e.clientX, e.clientY));
        return;
      }
      const next = new T.Vector2(e.clientX, e.clientY);
      if (this.pointers.size > 1) {
        const other = [...this.pointers.entries()].find(
          ([id]) => id !== e.pointerId,
        )![1];
        const before = previous.distanceTo(other),
          after = next.distanceTo(other);
        if (before > 4) this.zoomBy(after / before);
        this.panPixels((next.x - previous.x) / 2, (next.y - previous.y) / 2);
      } else if (this.gesture || next.distanceTo(this.pointerStart) > 7) {
        this.gesture = true;
        this.panPixels(next.x - previous.x, next.y - previous.y);
      }
      this.pointers.set(e.pointerId, next);
    });
    host.addEventListener("pointerup", (e) => {
      const known = this.pointers.has(e.pointerId);
      this.pointers.delete(e.pointerId);
      if (known && !this.gesture && this.pointers.size === 0) {
        const i = this.pick(e.clientX, e.clientY);
        if (i >= 0) this.onDig(i);
      }
      if (host.hasPointerCapture(e.pointerId))
        host.releasePointerCapture(e.pointerId);
    });
    host.addEventListener("pointercancel", (e) => {
      this.pointers.delete(e.pointerId);
      this.gesture = true;
    });
    host.addEventListener("pointerleave", () => {
      this.hover.visible = false;
      this.onHover(null);
    });
    host.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        this.zoomBy(Math.exp(-e.deltaY * 0.0015));
      },
      { passive: false },
    );
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) cancelAnimationFrame(this.frame);
      else {
        this.last = 0;
        this.animate(0);
      }
    });
    this.build();
    this.resize();
    this.animate(0);
  }
  mat(color: number, surface?: Surface, vertexColors = false) {
    const key = `${color}:${surface ?? "solid"}:${vertexColors}`;
    if (!this.mats.has(key))
      this.mats.set(
        key,
        new T.MeshBasicMaterial({
          color,
          vertexColors,
          map: surface ? this.textures.get(surface) : null,
          side: surface === "leaf" ? T.DoubleSide : T.FrontSide,
        }),
      );
    return this.mats.get(key)!;
  }
  // Painted directional face colors give low-poly meshes volume without scene lights.
  shaded(geometry: T.BufferGeometry, color: number, surface?: Surface) {
    const normals = geometry.getAttribute("normal"),
      colors = [];
    for (let i = 0; i < normals.count; i++) {
      const shade =
        0.79 +
        0.16 * normals.getY(i) +
        0.08 * normals.getX(i) +
        0.08 * normals.getZ(i);
      colors.push(shade, shade, shade);
    }
    geometry.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
    return new T.Mesh(geometry, this.mat(color, surface, true));
  }
  box(
    parent: T.Object3D,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    c: number,
    surface?: Surface,
  ) {
    if (
      !surface &&
      [0x80533b, 0xb6824d, 0xa37145, 0x947052, 0x916749].includes(c)
    )
      surface = "wood";
    const shade = new T.Color(c);
    const colors = [
      shade.clone().multiplyScalar(0.82),
      shade.clone().multiplyScalar(0.72),
      shade,
      shade.clone().multiplyScalar(0.65),
      shade.clone().multiplyScalar(0.9),
      shade.clone().multiplyScalar(0.78),
    ];
    const geometry = new T.BoxGeometry(w, h, d);
    let material: T.Material | T.Material[];
    if (this.game.level.story?.kind === "battle") {
      const vertexColors = colors.flatMap((c) =>
        Array.from({ length: 4 }, () => [c.r, c.g, c.b]).flat(),
      );
      geometry.setAttribute(
        "color",
        new T.Float32BufferAttribute(vertexColors, 3),
      );
      geometry.clearGroups();
      material = this.mat(0xffffff, surface, true);
    } else material = colors.map((c) => this.mat(c.getHex(), surface));
    const m = new T.Mesh(geometry, material);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  }
  cylinder(
    parent: T.Object3D,
    x: number,
    y: number,
    z: number,
    r: number,
    h: number,
    c: number,
    top = r,
  ) {
    const m = this.shaded(
      new T.CylinderGeometry(top, r, h, 8),
      c,
      c === 0x9c7350 || c === 0xb68a5c ? "wood" : undefined,
    );
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  }
  build() {
    this.disposeRoot();
    this.root = new T.Group();
    this.scene.add(this.root);
    this.tiles = [];
    this.banks.clear();
    this.story = undefined;
    this.waters.clear();
    this.wheels = [];
    this.palms = [];
    this.markers = [];
    this.wetAt.clear();
    this.particles = [];
    if (this.game.level.story?.kind === "bridge") {
      this.box(this.root, -3, -1.08, 0, 10, 1.5, 16.15, 0xb17b51, "stone");
      this.box(this.root, 6, -1.08, 0, 4, 1.5, 16.15, 0xb17b51, "stone");
      this.box(this.root, 3, -1.8, 0, 2, 0.15, 16.15, 0x553f33);
      this.box(this.root, -3, -0.39, 0, 10, 0.2, 16.15, 0xd5a36b);
      this.box(this.root, 6, -0.39, 0, 4, 0.2, 16.15, 0xd5a36b);
    } else {
      this.box(this.root, 0, -0.82, 0, 16.15, 0.9, 16.15, 0xb97e55);
      this.box(this.root, 0, -0.35, 0, 16.2, 0.12, 16.2, 0xd5a36b);
    }
    for (let i = 0; i < 256; i++) {
      const x = (i % 16) - 7.5,
        z = Math.floor(i / 16) - 7.5,
        t = this.game.level.tiles[i];
      const color = [0xe7c58d, 0xeac992, 0xe4c087, 0xedcd95][
        (i * 13 + Math.floor(i / 16) * 7) % 4
      ];
      const tile: T.Mesh = this.box(
        this.root,
        x,
        -0.09,
        z,
        0.985,
        0.2,
        0.985,
        color,
        "sand",
      );
      this.tiles.push(tile);
      tile.userData.cell = i;
      tile.userData.sandMaterial = tile.material;
      if (t === "building")
        this.box(this.root, x, 0.012, z, 0.94, 0.025, 0.94, 0xcaae83);
      if (t === "rock") {
        if (i % 16 === 0 || i % 16 === 15 || i < 16 || i >= 240) {
          this.box(this.root, x, 0.01, z, 0.86, 0.14, 0.86, 0xcbae84);
          if (i % 3 === 0)
            this.box(this.root, x, 0.12, z, 0.55, 0.12, 0.6, 0xd4b88e);
        } else {
          const rock = this.shaded(
            new T.DodecahedronGeometry(0.52, 0),
            0xc4ad87,
            "sand",
          );
          rock.scale.set(0.88, 0.67, 0.86);
          rock.position.set(x, 0.26, z);
          rock.rotation.y = i * 0.71;
          this.root.add(rock);
          const chip = this.shaded(
            new T.DodecahedronGeometry(0.18, 0),
            0xd6bd92,
          );
          chip.scale.y = 0.6;
          chip.position.set(x - 0.27, 0.08, z + 0.24);
          this.root.add(chip);
        }
      }
      if (t === "ravine") {
        tile.position.y = -1.8;
        tile.material = this.mat(0x573c2f, "soil");
      }
      if (["source", "channel", "target", "basin"].includes(t))
        tile.position.y = -0.3;
      if (["channel", "target", "basin"].includes(t))
        tile.material = this.mat(t === "basin" ? 0x94603b : 0x6a452d, "soil");
      if (["source", "channel", "target", "basin", "aqueduct"].includes(t))
        this.addWater(i);
    }
    if (this.game.level.story?.kind !== "oasis")
      this.game.level.targets.forEach((i, n) => this.machine(i, n));
    this.story = new StoryScene(this);
    // Sparkle-like source landmarks rise above the oasis.
    const source = this.game.level.sources[0];
    const sx = (source % 16) - 7.5,
      sz = Math.floor(source / 16) - 7.5;
    const drop = new T.Mesh(new T.OctahedronGeometry(0.18), this.mat(0x79e2dc));
    drop.position.set(sx, 0.72, sz);
    this.root.add(drop);
    this.markers.push(drop);
    this.sync();
  }
  house(x: number, z: number, w: number, d: number, h: number, c: number) {
    this.box(this.root, x, h / 2, z, w, h, d, c, "plaster");
    this.box(this.root, x, h + 0.08, z, w + 0.18, 0.18, d + 0.18, 0xf4d7a3);
    this.box(
      this.root,
      x,
      h + 0.2,
      z,
      w - 0.3,
      0.08,
      d - 0.3,
      0xb58a64,
      "stone",
    );
    for (const a of [-1, 1])
      this.box(
        this.root,
        x + (a * w) / 2,
        h + 0.26,
        z,
        0.16,
        0.34,
        d,
        0xe8c895,
      );
    this.box(
      this.root,
      x,
      0.54,
      z + d / 2 + 0.012,
      0.49,
      1.05,
      0.045,
      0x755a46,
    );
    this.box(this.root, x, 0.5, z + d / 2 + 0.045, 0.31, 0.91, 0.04, 0x947052);
    this.box(
      this.root,
      x + w * 0.3,
      h * 0.65,
      z + d / 2 + 0.02,
      0.32,
      0.42,
      0.04,
      0x687a73,
    );
    for (let j = 0; j < 3; j++)
      this.box(
        this.root,
        x - w * 0.4 + j * 0.35,
        h - 0.17,
        z + d / 2 + 0.1,
        0.12,
        0.12,
        0.3,
        0x916749,
      );
  }
  palm(x: number, z: number, h: number) {
    this.cylinder(this.root, x, 0.02, z, 0.6, 0.025, 0xc4a575);
    for (let k = 0; k < 6; k++)
      this.cylinder(
        this.root,
        x + k * 0.025,
        (h * (k + 0.5)) / 6,
        z,
        0.11,
        h / 6,
        k % 2 ? 0x9c7350 : 0xb68a5c,
        0.085,
      );
    const crown = new T.Group();
    crown.position.set(x + 0.13, h, z);
    this.root.add(crown);
    this.palms.push(crown);
    for (let a = 0; a < 7; a++) {
      const leaf = new T.Group();
      leaf.rotation.y = (a * Math.PI * 2) / 7;
      const vertices: number[] = [],
        uvs: number[] = [],
        indices: number[] = [];
      for (let k = 0; k < 5; k++) {
        const x = k * 0.34,
          y = 0.16 - Math.pow(k / 4, 2) * 0.48,
          width = [0.035, 0.21, 0.23, 0.15, 0.005][k];
        vertices.push(x, y, -width, x, y + 0.055, 0, x, y, width);
        uvs.push(0, k / 4, 0.5, k / 4, 1, k / 4);
        if (k < 4) {
          const j = k * 3;
          indices.push(
            j,
            j + 3,
            j + 1,
            j + 1,
            j + 3,
            j + 4,
            j + 1,
            j + 4,
            j + 2,
            j + 2,
            j + 4,
            j + 5,
          );
        }
      }
      const geometry = new T.BufferGeometry();
      geometry.setAttribute(
        "position",
        new T.Float32BufferAttribute(vertices, 3),
      );
      geometry.setAttribute("uv", new T.Float32BufferAttribute(uvs, 2));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      leaf.add(
        new T.Mesh(
          geometry,
          this.mat([0x568b59, 0x74a360, 0x8bb969][a % 3], "leaf"),
        ),
      );
      crown.add(leaf);
    }
    this.cylinder(this.root, x + 0.12, h - 0.12, z, 0.2, 0.28, 0x887049);
  }
  machine(i: number, n: number) {
    const firstChild = this.root.children.length;
    const x = (i % 16) - 7.5,
      z = Math.floor(i / 16) - 7.5;
    // Machine stays inside its blocked target cell; neighboring sand remains visible.
    this.box(this.root, x, 0.05, z, 0.9, 0.14, 0.9, 0x9c8d72);
    for (const s of [-1, 1])
      this.box(
        this.root,
        x + s * 0.35,
        0.49,
        z,
        0.12,
        0.92,
        0.16,
        palette.wood,
      );
    const wheel = new T.Group();
    wheel.position.set(x, 0.57, z);
    if (n === 0 && this.game.level.targets.length === 3) {
      wheel.scale.setScalar(1.16);
      wheel.position.y = 0.66;
    }
    this.root.add(wheel);
    this.wheels.push(wheel);
    const ring = new T.Mesh(
      new T.TorusGeometry(0.43, 0.065, 4, 12),
      this.mat(0x855138),
    );
    wheel.add(ring);
    for (let a = 0; a < 8; a++) {
      const spoke = this.box(wheel, 0, 0, 0, 0.075, 0.82, 0.12, 0xb6824d);
      spoke.rotation.z = (a * Math.PI) / 4;
      const paddle = this.box(
        wheel,
        Math.sin((a * Math.PI) / 4) * 0.43,
        Math.cos((a * Math.PI) / 4) * 0.43,
        0,
        0.2,
        0.13,
        0.32,
        0xa37145,
      );
      paddle.rotation.z = (-a * Math.PI) / 4;
    }
    this.cylinder(wheel, 0, 0, 0, 0.1, 0.15, 0xf1c679);
    const marker = new T.Mesh(
      new T.OctahedronGeometry(0.13),
      this.mat(0xe5a64e),
    );
    marker.position.set(x, 1.35, z);
    this.root.add(marker);
    this.markers.push(marker);
    this.box(this.root, x, 0.13, z + 0.42, 0.45, 0.06, 0.16, 0xe9b965);
    if (this.game.level.story?.consequenceFocus) {
      // Dense later puzzles need compact wheels so paddles do not cover the
      // centers of neighboring sand tiles at the portrait camera angle.
      const parts = this.root.children.slice(firstChild);
      const machine = new T.Group();
      machine.position.set(x, 0, z);
      machine.scale.setScalar(0.78);
      parts.forEach((part) => {
        part.position.x -= x;
        part.position.z -= z;
        machine.add(part);
      });
      this.root.add(machine);
    }
  }
  addWater(i: number) {
    if (this.waters.has(i)) return;
    const x = (i % 16) - 7.5,
      z = Math.floor(i / 16) - 7.5;
    const terrain = this.game.level.tiles[i],
      elevated = terrain === "aqueduct",
      pool =
        ["source", "basin"].includes(terrain) ||
        (terrain === "target" && this.game.level.story?.kind === "oasis");
    const mesh = this.box(
      this.root,
      x,
      elevated ? 1.74 : -0.14,
      z,
      elevated || pool ? 0.985 : 0.72,
      0.035,
      elevated ? 0.38 : pool ? 0.985 : 0.72,
      palette.water,
      "water",
    );
    mesh.visible = false;
    mesh.userData.cell = i;
    this.waters.set(i, mesh);
    if (!elevated && !pool)
      for (const [dx, dz] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const arm = this.box(
          mesh,
          dx * 0.425,
          0,
          dz * 0.425,
          dx ? 0.29 : 0.72,
          0.035,
          dz ? 0.29 : 0.72,
          palette.water,
          "water",
        );
        arm.userData.neighbor = i + dx + dz * 16;
      }
    for (let k = 0; k < 2; k++)
      this.box(
        mesh,
        -0.22 + k * 0.38,
        0.025,
        0.13 - k * 0.28,
        0.23,
        0.01,
        0.055,
        0x86e4d4,
      );
  }
  sync() {
    this.settled = false;
    for (let i = 0; i < 256; i++) {
      const dug = this.game.digs.includes(i),
        t = this.game.level.tiles[i];
      if (dug) {
        this.tiles[i].position.y = -0.32;
        this.tiles[i].material = this.mat(0x64402b, "soil");
        this.addWater(i);
        if (!this.banks.has(i)) {
          const edges: T.Mesh[] = [];
          for (const [dx, dz] of [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ]) {
            const bank = this.box(
              this.root,
              (i % 16) - 7.5 + dx * 0.44,
              -0.085,
              Math.floor(i / 16) - 7.5 + dz * 0.44,
              dx ? 0.12 : 0.985,
              0.17,
              dz ? 0.12 : 0.985,
              0x815334,
              "soil",
            );
            bank.userData.neighbor = i + dx + dz * 16;
            edges.push(bank);
          }
          this.banks.set(i, edges);
        }
      } else if (t === "sand") {
        this.tiles[i].position.y = -0.09;
        this.tiles[i].material = this.tiles[i].userData.sandMaterial;
      }
      this.banks.get(i)?.forEach((bank) => {
        const j = bank.userData.neighbor;
        bank.visible =
          dug &&
          !this.game.digs.includes(j) &&
          !["source", "channel", "target", "basin"].includes(
            this.game.level.tiles[j],
          );
      });
    }
    let delay = 0;
    const ordered = [...this.game.wet].sort((a, b) => a[1] - b[1]);
    for (const [i] of ordered)
      if (!this.wetAt.has(i)) {
        this.wetAt.set(i, this.elapsed + (this.reduced ? 0 : delay));
        delay += 0.055;
      }
    for (const [i, m] of this.waters)
      if (!this.game.wet.has(i)) {
        m.visible = false;
        this.wetAt.delete(i);
      }
    this.hover.visible = false;
    this.onHover(null);
  }
  burst(i: number, celebrate = false) {
    if (this.reduced) return;
    for (let k = 0; k < (celebrate ? 45 : 8); k++) {
      const m = this.box(
        this.root,
        (i % 16) - 7.5,
        0.12,
        Math.floor(i / 16) - 7.5,
        0.08,
        0.08,
        0.08,
        celebrate ? [0x63c7be, 0xf2c66c, 0xe99176][k % 3] : 0x805334,
      );
      m.raycast = () => {};
      this.particles.push({
        mesh: m,
        v: new T.Vector3(
          (Math.random() - 0.5) * 3,
          2 + Math.random() * 3,
          (Math.random() - 0.5) * 3,
        ),
        life: 1,
      });
    }
  }
  pick(clientX: number, clientY: number) {
    // A retry can receive pointer input before the next rendered frame.
    this.root.updateMatrixWorld(true);
    const r = this.host.getBoundingClientRect();
    this.ray.setFromCamera(
      new T.Vector2(
        ((clientX - r.left) / r.width) * 2 - 1,
        (-(clientY - r.top) / r.height) * 2 + 1,
      ),
      this.camera,
    );
    const hits = this.ray
      .intersectObjects(this.root.children, true)
      .filter((hit) => {
        let o: T.Object3D | null = hit.object;
        while (o) {
          if (!o.visible) return false;
          o = o.parent;
        }
        return true;
      });
    let object: T.Object3D | null = hits[0]?.object ?? null;
    while (object) {
      if (typeof object.userData.cell === "number") return object.userData.cell;
      object = object.parent;
    }
    return -1;
  }
  highlight(i: number) {
    const valid =
      this.game.level.tiles[i] === "sand" &&
      !this.game.digs.includes(i) &&
      this.game.remaining > 0 &&
      !this.game.won;
    this.hover.visible = valid;
    this.onHover(valid ? i : null);
    this.host.style.cursor = valid ? "pointer" : "default";
    if (valid)
      this.hover.position.set((i % 16) - 7.5, 0.035, Math.floor(i / 16) - 7.5);
  }
  screen(i: number) {
    const p = new T.Vector3(
        (i % 16) - 7.5,
        0,
        Math.floor(i / 16) - 7.5,
      ).project(this.camera),
      r = this.host.getBoundingClientRect();
    return {
      x: r.left + ((p.x + 1) * r.width) / 2,
      y: r.top + ((1 - p.y) * r.height) / 2,
    };
  }
  reveal(i: number) {
    const p = this.screen(i),
      r = this.host.getBoundingClientRect();
    if (
      p.x < r.left + 35 ||
      p.x > r.right - 35 ||
      p.y < r.top + 65 ||
      p.y > r.bottom - 35
    ) {
      this.viewChanged = true;
      this.viewTarget.set((i % 16) - 7.5, 0, Math.floor(i / 16) - 7.5);
      this.updateCamera();
    }
  }
  updateCamera() {
    this.camera.zoom = this.zoom;
    this.camera.updateProjectionMatrix();
    this.camera.position
      .copy(this.viewDirection)
      .multiplyScalar(this.fitDistance)
      .add(this.viewTarget);
    this.camera.lookAt(this.viewTarget);
    this.camera.updateMatrixWorld(true);
    this.hover.visible = false;
    this.onHover(null);
    this.onViewChanged();
  }
  zoomBy(factor: number) {
    this.cameraTransition = undefined;
    this.viewChanged = true;
    this.zoom = T.MathUtils.clamp(this.zoom * factor, 0.75, 4);
    this.updateCamera();
  }
  panPixels(dx: number, dy: number) {
    this.cameraTransition = undefined;
    this.viewChanged = true;
    const scale =
      (2 *
        (this.fitDistance / this.zoom) *
        Math.tan(T.MathUtils.degToRad(this.camera.fov / 2))) /
      this.host.clientHeight;
    const right = new T.Vector3()
      .crossVectors(new T.Vector3(0, 1, 0), this.viewDirection)
      .normalize();
    const forward = new T.Vector3(
      this.viewDirection.x,
      0,
      this.viewDirection.z,
    ).normalize();
    this.viewTarget
      .addScaledVector(right, -dx * scale)
      .addScaledVector(forward, (-dy * scale) / this.viewDirection.y);
    this.viewTarget.x = T.MathUtils.clamp(this.viewTarget.x, -8, 8);
    this.viewTarget.z = T.MathUtils.clamp(this.viewTarget.z, -8, 8);
    this.updateCamera();
  }
  overview() {
    this.cameraTransition = undefined;
    this.viewChanged = true;
    this.zoom = 1;
    this.viewTarget.set(0, 0, 0);
    this.updateCamera();
  }
  framePuzzle() {
    this.cameraTransition = undefined;
    this.viewChanged = false;
    const cells = [
      ...new Set([
        ...(this.game.level.story?.focus ?? []),
        ...this.game.level.sources,
        ...this.game.level.targets,
      ]),
    ];
    const xs = cells.map((i) => (i % 16) - 7.5),
      zs = cells.map((i) => Math.floor(i / 16) - 7.5);
    this.viewTarget.set(
      (Math.min(...xs) + Math.max(...xs)) / 2,
      0,
      (Math.min(...zs) + Math.max(...zs)) / 2,
    );
    const { width: w, height: h } = this.host.getBoundingClientRect();
    // A full-board overview on a phone makes individual cells too small to tap.
    // Start near the puzzle, then let pinch/drag and the overview button reveal the perimeter.
    const estimatedCell = Math.min(w / 24, h / 19);
    const preferred = T.MathUtils.clamp(34 / estimatedCell, 1.12, 3.2);
    this.zoom = 1;
    this.updateCamera();
    let maxX = 0,
      maxY = 0;
    for (const i of cells)
      for (const dx of [-0.6, 0.6])
        for (const dz of [-0.6, 0.6])
          for (const y of [0, 1.2]) {
            const p = new T.Vector3(
              (i % 16) - 7.5 + dx,
              y,
              Math.floor(i / 16) - 7.5 + dz,
            ).project(this.camera);
            maxX = Math.max(maxX, Math.abs(p.x));
            maxY = Math.max(maxY, Math.abs(p.y));
          }
    this.zoom = Math.max(0.8, Math.min(preferred, 0.89 / maxX, 0.84 / maxY));
    this.updateCamera();
  }
  resize() {
    const { width: w, height: h } = this.host.getBoundingClientRect();
    if (!w || !h) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.fitDistance =
      Math.max(9.6, 12.2 / this.camera.aspect) /
      Math.tan(T.MathUtils.degToRad(this.camera.fov / 2));
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(Math.round(w), Math.round(h), false);
    if (!this.viewChanged) this.framePuzzle();
    else this.updateCamera();
  }
  focusConsequence() {
    const kind = this.game.level.story?.kind;
    const [x, z] =
      this.game.level.story?.consequenceFocus ??
      (kind === "oasis"
        ? [11.6, 8.4]
        : kind === "bridge"
          ? [10.6, 10]
          : [9.7, 5.2]);
    const target = new T.Vector3(x - 7.5, 0, z - 7.5);
    const zoom = this.game.level.story?.consequenceFocus
      ? this.zoom
      : Math.max(this.zoom, 1.45);
    if (kind === "battle") {
      // Follow the action toward the enemy line without shrinking the models.
      // Empty island corners need not dictate the cinematic framing.
      target.set(1.2, 0, -2);
    }
    if (this.reduced) {
      this.viewTarget.copy(target);
      this.zoom = zoom;
      this.updateCamera();
    } else
      this.cameraTransition = {
        from: this.viewTarget.clone(),
        to: target,
        start: this.elapsed,
        fromZoom: this.zoom,
        toZoom: zoom,
      };
    this.viewChanged = true;
  }

  animate = (time: number) => {
    if (document.hidden) return;
    const dt = this.last ? Math.min((time - this.last) / 1000, 0.05) : 0;
    this.last = time;
    this.elapsed += dt;
    let pending = false;
    for (const [i, m] of this.waters) {
      const at = this.wetAt.get(i);
      m.visible = at !== undefined && this.elapsed >= at;
      if (at !== undefined && !m.visible) pending = true;
      if (m.visible && !this.reduced)
        m.position.y =
          (this.game.level.tiles[i] === "aqueduct" ? 1.74 : -0.14) +
          Math.sin(this.elapsed * 2 + i) * 0.006;
      for (const arm of m.children)
        if (typeof arm.userData.neighbor === "number")
          arm.visible =
            this.wetAt.has(arm.userData.neighbor) &&
            this.elapsed >= this.wetAt.get(arm.userData.neighbor)!;
    }
    this.wheels.forEach((w, n) => {
      const active = this.waters.get(this.game.level.targets[n])?.visible;
      this.markers[n].material = this.mat(active ? 0x67d1bb : 0xe5a64e);
      if (active && !this.reduced) w.rotation.z -= dt * 1.3;
    });
    const active = this.game.level.targets.map(
      (i) => !!this.waters.get(i)?.visible,
    );
    this.story?.update(dt, active, this.elapsed);
    if (this.cameraTransition) {
      const t = this.cameraTransition,
        p = Math.min(1, (this.elapsed - t.start) / 0.8),
        e = p * p * (3 - 2 * p);
      this.viewTarget.lerpVectors(t.from, t.to, e);
      this.zoom = T.MathUtils.lerp(t.fromZoom, t.toZoom, e);
      this.updateCamera();
      if (p === 1) this.cameraTransition = undefined;
    }
    if (this.game.won && !this.story?.done) pending = true;
    if (!this.reduced) {
      this.palms.forEach(
        (p, n) => (p.rotation.z = Math.sin(this.elapsed * 1.4 + n) * 0.025),
      );
      this.markers.forEach((m, n) =>
        m.scale.setScalar(1 + Math.sin(this.elapsed * 3 + n) * 0.12),
      );
    }
    for (const p of this.particles) {
      p.life -= dt;
      p.v.y -= dt * 6;
      p.mesh.position.addScaledVector(p.v, dt);
      p.mesh.scale.setScalar(Math.max(0, p.life));
    }
    this.particles = this.particles.filter((p) => {
      if (p.life > 0) return true;
      this.root.remove(p.mesh);
      p.mesh.geometry.dispose();
      return false;
    });
    if (!pending && !this.settled) {
      this.settled = true;
      this.onSettled();
    }
    this.renderer.render(this.scene, this.camera);
    this.frame = requestAnimationFrame(this.animate);
  };
  disposeRoot() {
    this.scene.remove(this.root);
    this.root.traverse((o) => {
      if (o instanceof T.Mesh) o.geometry.dispose();
      if (o instanceof T.InstancedMesh) o.dispose();
      o.userData.ownedTexture?.dispose();
      o.userData.ownedMaterial?.dispose();
    });
  }
}
