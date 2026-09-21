import * as T from "three";
import { reducedMotion } from "./motion";
import { Game, SIZE, CELL_COUNT, TILE_SIZE, BORDER_WIDTH, BOARD_EXTENT, gridWorld } from "./game";
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
    new T.BoxGeometry(1.9, 0.045, 1.9),
    new T.MeshBasicMaterial({
      color: 0xfff5c7,
      transparent: true,
      opacity: 0.65,
    }),
  );
  ray = new T.Raycaster();
  get reduced() { return reducedMotion(); }
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
  viewDirection = new T.Vector3(23, 40, 29).normalize();
  // Approved view: X tilt 60°, Y orbit 0°, Z roll 0° (YXZ).
  readonly viewAngles = { x: 60, y: 0, z: 0 } as const;
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
    const metric=["bridge","city","harvest"].includes(this.game.level.story?.kind ?? "") && (surface === "wood" || surface === "stone" || surface === "plaster");
    const key = `${color}:${surface ?? "solid"}:${vertexColors}:${metric}`;
    if (!this.mats.has(key))
      this.mats.set(
        key,
        new T.MeshBasicMaterial({
          color,
          vertexColors,
          map: surface ? (metric ? this.textures.world(surface) : this.textures.get(surface)) : null,
          side: surface === "leaf" ? T.DoubleSide : T.FrontSide,
        }),
      );
    return this.mats.get(key)!;
  }
  // Painted directional face colors give low-poly meshes volume without scene lights.
  shaded(geometry: T.BufferGeometry, color: number, surface?: Surface) {
    if(["bridge","city","harvest"].includes(this.game.level.story?.kind ?? "")) {
      if(geometry instanceof T.CylinderGeometry) {
        surface="wood";
        const uv=geometry.getAttribute("uv"), p=geometry.parameters;
        for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*Math.PI*(p.radiusTop+p.radiusBottom)/TILE_SIZE,uv.getY(i)*p.height/TILE_SIZE);
      } else if(surface === "stone") {
        const uv=geometry.getAttribute("uv"), pos=geometry.getAttribute("position");
        for(let i=0;i<uv.count;i++)uv.setXY(i,pos.getX(i)/TILE_SIZE,pos.getY(i)/TILE_SIZE);
      }
    }
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
    if(["bridge","city","harvest"].includes(this.game.level.story?.kind ?? "") && (surface === "wood" || surface === "stone" || surface === "plaster")) {
      const uv=geometry.getAttribute("uv");
      // Each box face gets its real dimensions, never a full texture squeezed onto a beam.
      const spans=[[d,h],[d,h],[w,d],[w,d],[w,h],[w,h]];
      spans.forEach(([u,v],face)=>{for(let j=0;j<4;j++){const i=face*4+j;uv.setXY(i,uv.getX(i)*u/(surface === "plaster" ? TILE_SIZE*2 : TILE_SIZE),uv.getY(i)*v/(surface === "plaster" ? TILE_SIZE*2 : TILE_SIZE));}});
    }
    let material: T.Material | T.Material[];
    if (["battle", "fortress", "oasis"].includes(this.game.level.story?.kind ?? "")) {
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
    const bridge = this.game.level.story?.kind === "bridge";
    const half = BOARD_EXTENT / 2;
    if (bridge) {
      // The ravine stays aligned to column five, including the narrow rim.
      this.box(this.root, (-half + 2) / 2, -1.08, 0, half + 2, 1.5, BOARD_EXTENT, 0xb17b51, "stone");
      this.box(this.root, (half + 4) / 2, -1.08, 0, half - 4, 1.5, BOARD_EXTENT, 0xb17b51, "stone");
      this.box(this.root, 3, -1.8, 0, 2, 0.15, BOARD_EXTENT, 0x553f33);
    } else {
      this.box(this.root, 0, -0.82, 0, BOARD_EXTENT, 0.9, BOARD_EXTENT, 0xb97e55);
    }
    // A quarter-world-unit lip: exactly one eighth of a two-unit tile.
    const edge = SIZE * TILE_SIZE / 2 + BORDER_WIDTH / 2;
    for (const sign of [-1, 1]) {
      this.box(this.root, sign * edge, -0.09, 0, BORDER_WIDTH, 0.2, BOARD_EXTENT, 0xcaae83, "stone");
      for (let x = 0; x < SIZE; x++) {
        const ravine = bridge && x === 5;
        this.box(this.root, gridWorld(x), ravine ? -1.8 : -0.09, sign * edge,
          TILE_SIZE, 0.2, BORDER_WIDTH, ravine ? 0x573c2f : 0xcaae83, ravine ? "soil" : "stone");
      }
    }
    for (let i = 0; i < CELL_COUNT; i++) {
      const x = gridWorld(i % SIZE),
        z = gridWorld(Math.floor(i / SIZE)),
        t = this.game.level.tiles[i];
      const color = [0xe7c58d, 0xeac992, 0xe4c087, 0xedcd95][
        (i * 13 + Math.floor(i / SIZE) * 7) % 4
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
      tile.scale.set(TILE_SIZE, 1, TILE_SIZE);
      this.tiles.push(tile);
      tile.userData.cell = i;
      tile.userData.sandMaterial = tile.material;
      if (t === "building")
        this.box(this.root, x, 0.012, z, 1.94, 0.025, 1.94, 0xcaae83);
      if (t === "rock" && !["oasis", "bridge", "city", "harvest"].includes(this.game.level.story?.kind ?? "")) {
        const rock = this.shaded(
          new T.DodecahedronGeometry(0.52, 0),
          0xc4ad87,
          "sand",
        );
        rock.scale.set(1.55, 1.1, 1.5);
        rock.position.set(x, 0.26, z);
        rock.rotation.y = i * 0.71;
        this.root.add(rock);
        const chip = this.shaded(new T.DodecahedronGeometry(0.18, 0), 0xd6bd92);
        chip.scale.y = 0.6;
        chip.position.set(x - 0.27, 0.08, z + 0.24);
        this.root.add(chip);
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
    const sceneryStart = this.root.children.length;
    this.story = new StoryScene(this);
    this.root.children.slice(sceneryStart).forEach((object) =>
      object.traverse((part) => {
        part.raycast = () => {};
      }),
    );
    if (["oasis", "bridge", "city", "harvest"].includes(this.game.level.story?.kind ?? "")) { this.sync(); return; }
    // Sparkle-like source landmarks rise above the oasis.
    const source = this.game.level.sources[0];
    const sx = gridWorld(source % SIZE),
      sz = gridWorld(Math.floor(source / SIZE));
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
  bridgeMachine(i: number) {
    // Two reserved cells directly north of the inlet own the full mechanism footprint.
    const city=["city","harvest"].includes(this.game.level.story?.kind ?? "");
    const x=gridWorld(i%SIZE)+(city?1:-1)*TILE_SIZE/2, z=gridWorld(Math.floor(i/SIZE))-(city?0:TILE_SIZE);
    this.box(this.root,x,.06,z,3.8,.16,1.5,0x9c8d72,"stone");
    for(const sign of [-1,1])
      this.box(this.root,x+sign*.76,1.02,z-.24,.24,1.88,.32,0x80533b,"wood");
    // Physical dimensions are doubled before UV generation: texels stay 1/32 tile.
    const mount=new T.Group();
    mount.name="bridge-wheel-mount";
    mount.position.set(x,2.24,z);
    mount.rotation.x=-Math.PI/6;
    this.root.add(mount);
    const axle=this.cylinder(mount,0,0,-.24,.26,.96,0x82603f);
    axle.rotation.x=Math.PI/2;
    const rotor=new T.Group();
    rotor.name="bridge-wheel-rotor";
    mount.add(rotor);
    this.wheels.push(rotor);
    const rim=this.shaded(new T.TorusGeometry(1.68,.16,6,24),0x976741);
    rotor.add(rim);
    for(let k=0;k<8;k++) {
      const angle=k*Math.PI/4;
      const spoke=this.box(rotor,0,0,0,.22,3.16,.28,0xb6824d,"wood");
      spoke.rotation.z=angle;
      const paddle=this.box(rotor,Math.sin(angle)*1.68,Math.cos(angle)*1.68,0,.6,.4,.6,0xa37145,"wood");
      paddle.rotation.z=-angle;
    }
    const hub=this.cylinder(rotor,0,0,.22,.34,.32,0xf1c679);
    hub.rotation.x=Math.PI/2;
  }
  machine(i: number, n: number) {
    if(["bridge","city","harvest"].includes(this.game.level.story?.kind ?? "")) {this.bridgeMachine(i);return;}
    const firstChild = this.root.children.length;
    const x = gridWorld(i % SIZE),
      z = gridWorld(Math.floor(i / SIZE));
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
    const x = gridWorld(i % SIZE),
      z = gridWorld(Math.floor(i / SIZE));
    const terrain = this.game.level.tiles[i],
      elevated = terrain === "aqueduct",
      pool =
        ["source", "basin"].includes(terrain) ||
        (terrain === "target" && this.game.level.story?.kind === "oasis");
    const mesh = this.box(
      this.root,
      x,
      elevated ? (this.game.level.story?.kind === "city" ? 3.34 : 1.74) : -0.14,
      z,
      elevated || pool ? 0.985 : 0.72,
      0.035,
      elevated ? 0.38 : pool ? 0.985 : 0.72,
      palette.water,
      "water",
    );
    mesh.scale.set(TILE_SIZE, 1, TILE_SIZE);
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
        arm.userData.neighbor = i + dx + dz * SIZE;
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
    for (let i = 0; i < CELL_COUNT; i++) {
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
              gridWorld(i % SIZE) + dx * 0.88,
              -0.085,
              gridWorld(Math.floor(i / SIZE)) + dz * 0.88,
              dx ? 0.24 : 1.97,
              0.17,
              dz ? 0.24 : 1.97,
              0x815334,
              "soil",
            );
            bank.userData.neighbor = i + dx + dz * SIZE;
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
    if (this.story?.oasisSprites) { this.story.oasisSprites.burst(i); return; }
    for (let k = 0; k < (celebrate ? 45 : 8); k++) {
      const m = this.box(
        this.root,
        gridWorld(i % SIZE),
        0.12,
        gridWorld(Math.floor(i / SIZE)),
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
      this.hover.position.set(
        gridWorld(i % SIZE),
        0.035,
        gridWorld(Math.floor(i / SIZE)),
      );
  }
  screen(i: number) {
    const p = new T.Vector3(
        gridWorld(i % SIZE),
        0,
        gridWorld(Math.floor(i / SIZE)),
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
      this.viewTarget.set(
        gridWorld(i % SIZE),
        0,
        gridWorld(Math.floor(i / SIZE)),
      );
      this.updateCamera();
    }
  }
  updateCamera() {
    const orientation = new T.Quaternion().setFromEuler(new T.Euler(
      -T.MathUtils.degToRad(this.viewAngles.x),
      T.MathUtils.degToRad(this.viewAngles.y),
      T.MathUtils.degToRad(this.viewAngles.z),
      "YXZ",
    ));
    this.viewDirection.set(0, 0, 1).applyQuaternion(orientation);
    this.camera.up.set(0, 1, 0).applyQuaternion(orientation);
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
    const right = new T.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0);
    const up = new T.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 1);
    this.viewTarget
      .addScaledVector(right, -dx * scale)
      .addScaledVector(up, dy * scale);
    this.viewTarget.x = T.MathUtils.clamp(this.viewTarget.x, -8, 8);
    this.viewTarget.z = T.MathUtils.clamp(this.viewTarget.z, -8, 8);
    this.viewTarget.y = T.MathUtils.clamp(this.viewTarget.y, -8, 8);
    this.updateCamera();
  }
  overview() {
    this.framePuzzle();
  }
  framePuzzle() {
    this.cameraTransition = undefined;
    this.viewChanged = false;
    this.viewTarget.set(0, 0, 0);
    this.zoom = 1;
    this.updateCamera();
    // Fit the complete island, including its decorative ring, into the actual
    // scene area. UI rails are outside this area in either orientation.
    const half = BOARD_EXTENT / 2;
    const corners: T.Vector3[] = [];
    for (const x of [-half, half])
      for (const z of [-half, half])
        for (const y of [-1.9, 0]) corners.push(new T.Vector3(x, y, z));
    // Headroom for rear banners, city walls, and artillery during their animations.
    for (const x of [-half, half]) corners.push(new T.Vector3(x, 3.5, -half));
    // Center the projected footprint, compensating for perspective foreshortening.
    for (let pass = 0; pass < 3; pass++) {
      const points = corners.map(p => p.clone().project(this.camera));
      const midX = (Math.min(...points.map(p => p.x)) + Math.max(...points.map(p => p.x))) / 2;
      const midY = (Math.min(...points.map(p => p.y)) + Math.max(...points.map(p => p.y))) / 2;
      const depth = this.viewTarget.clone().project(this.camera).z;
      this.viewTarget.copy(new T.Vector3(midX, midY, depth).unproject(this.camera));
      this.updateCamera();
    }
    const points = corners.map(p => p.clone().project(this.camera));
    const maxX = Math.max(...points.map(p => Math.abs(p.x)));
    const maxY = Math.max(...points.map(p => Math.abs(p.y)));
    this.zoom = Math.min(0.96 / maxX, 0.96 / maxY);
    this.updateCamera();
  }
  resize() {
    const { width: w, height: h } = this.host.getBoundingClientRect();
    if (!w || !h) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.fitDistance =
      Math.max(11.6, 14.5 / this.camera.aspect) /
      Math.tan(T.MathUtils.degToRad(this.camera.fov / 2));
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(Math.round(w), Math.round(h), false);
    this.framePuzzle();
  }
  focusConsequence() {
    if (this.reduced) return;
    // Restore the victory camera beat without abandoning the chosen angle or
    // tightly cropping the larger campaign scenes.
    const focus = this.game.level.story?.consequenceFocus;
    const target = focus
      ? new T.Vector3(focus[0] - 7.5, 0, focus[1] - 7.5)
      : new T.Vector3(
          gridWorld(this.game.level.targets[0] % SIZE),
          0,
          gridWorld(Math.floor(this.game.level.targets[0] / SIZE)),
        );
    const city=this.game.level.story?.kind === "city";
    const harvest=this.game.level.story?.kind === "harvest";
    if(city) target.set(0,0,-2);
    if(harvest) target.set(0,0,2);
    this.cameraTransition = {
      from: this.viewTarget.clone(),
      to: this.viewTarget.clone().lerp(target, 0.14),
      start: this.elapsed,
      fromZoom: this.zoom,
      toZoom: this.zoom * (city || harvest ? .98 : 1.045),
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
          (this.game.level.tiles[i] === "aqueduct" ? (this.game.level.story?.kind === "city" ? 3.34 : 1.74) : -0.14) +
          Math.sin(this.elapsed * 2 + i) * 0.006;
      for (const arm of m.children)
        if (typeof arm.userData.neighbor === "number")
          arm.visible =
            this.wetAt.has(arm.userData.neighbor) &&
            this.elapsed >= this.wetAt.get(arm.userData.neighbor)!;
    }
    this.wheels.forEach((w, n) => {
      const active = this.waters.get(this.game.level.targets[n])?.visible;
      if(this.markers[n]) this.markers[n].material = this.mat(active ? 0x67d1bb : 0xe5a64e);
      if (active && !this.reduced) w.rotation.z -= dt * 1.3;
    });
    const active = this.game.level.targets.map(
      (i) => !!this.waters.get(i)?.visible,
    );
    this.story?.update(dt, active, this.elapsed);
    if (this.cameraTransition) {
      const t = this.cameraTransition,
        p = Math.min(1, (this.elapsed - t.start) / 1.6),
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
    this.story?.oasisSprites?.dispose();
    this.story?.bridgeSprites?.dispose();
    this.story?.citySprites?.dispose();
    this.story?.harvestScene?.dispose();
    this.scene.remove(this.root);
    this.root.traverse((o) => {
      if (o instanceof T.Mesh) o.geometry.dispose();
      if (o instanceof T.InstancedMesh) o.dispose();
      o.userData.ownedTexture?.dispose();
      o.userData.ownedMaterial?.dispose();
    });
  }
}
