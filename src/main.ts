import "@fontsource/outfit/latin-600.css";
import "@fontsource/outfit/latin-800.css";
import "@fontsource/dm-sans/latin-500.css";
import "./style.css";
import { Game } from "./game";
import { levels } from "./levels";
import { World } from "./world";
const icons = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  fit: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
  shovel:
    '<path d="m14 4 6 6m-4-8 6 6-3 3-6-6zM14 10l-5 5M8 12l4 4-4 5H3v-5z"/>',
  undo: '<path d="M8 5 3 10l5 5M3 10h10a6 6 0 0 1 0 12" transform="translate(0 -2)"/>',
  restart: '<path d="M20 8a9 9 0 1 0 1 7M20 3v6h-6"/>',
  sound:
    '<path d="M11 4 6 8H3v8h3l5 4zM15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14"/>',
  mute: '<path d="M11 4 6 8H3v8h3l5 4zM16 9l6 6m0-6-6 6"/>',
  wheel:
    '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2"/><path d="M12 2v8m0 4v8M2 12h8m4 0h8M5 5l5 5m4 4 5 5M5 19l5-5m4-4 5-5"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  drop: '<path d="M12 2S5 10 5 15a7 7 0 0 0 14 0c0-5-7-13-7-13Z"/>',
};
function svg(name: keyof typeof icons) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
}
function read(key: string, fallback: string) {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}
function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* Storage is optional. */
  }
}
let completed = Math.max(
  0,
  Math.min(3, Number(read("diggy-completed", "0")) || 0),
);
let stage = 0;
let game = new Game(levels[stage]);
let muted = read("diggy-muted", "false") === "true";
let audio: AudioContext | undefined;
let celebrated = false;
let lastPowered = 0;
let focused = game.level.sources[0] + 1;
function sound(kind: "dig" | "water" | "win" | "undo" | "machine") {
  if (muted) return;
  try {
    audio ??= new AudioContext();
    void audio.resume();
    const notes =
      kind === "win"
        ? [523, 659, 784, 1047]
        : kind === "water"
          ? [420, 620]
          : kind === "undo"
            ? [260]
            : kind === "machine"
              ? [90, 130, 90]
              : [160, 100];
    notes.forEach((hz, i) => {
      const osc = audio!.createOscillator(),
        gain = audio!.createGain(),
        t = audio!.currentTime + i * 0.09;
      osc.type = kind === "dig" ? "triangle" : "sine";
      osc.frequency.setValueAtTime(hz, t);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.035, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.connect(gain);
      gain.connect(audio!.destination);
      osc.start(t);
      osc.stop(t + 0.22);
    });
  } catch {
    /* Audio is optional. */
  }
}
document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
 <header><a class="brand" href="./" aria-label="Diggy Splash home"><span class="brand-mark">${svg("drop")}</span><span>DIGGY<span class="brand-bottom">SPLASH<span class="brand-dot">.</span></span></span></a>
 <nav aria-label="Stages">${[0, 1, 2].map((n) => `<button class="stage" data-stage="${n}" aria-label="Stage ${n + 1}">${n + 1}</button>${n < 2 ? '<span class="connector"></span>' : ""}`).join("")}</nav>
 <button class="icon-button sound" aria-label="Mute sound">${svg("sound")}</button></header>
 <main><div class="sun-disc" aria-hidden="true"></div><div class="scene" tabindex="0" role="application" aria-label="Desert puzzle board. Click sand to dig. Drag to pan, scroll or pinch to zoom. Arrow keys select a tile, Enter digs, Z undoes."></div>
 <div class="stage-caption" aria-hidden="true"><span class="tiny-drop">${svg("drop")}</span><span id="stage-number">01</span><span class="caption-line"></span><span>03</span></div>
 <div class="view-controls" role="group" aria-label="Camera controls"><button id="zoom-out" class="icon-button" aria-label="Zoom out" title="Zoom out">${svg("minus")}</button><button id="zoom-in" class="icon-button" aria-label="Zoom in" title="Zoom in">${svg("plus")}</button><button id="overview" class="icon-button" aria-label="Show whole board" title="Show whole board">${svg("fit")}</button></div>
 <div class="intro-gesture" aria-hidden="true">${svg("shovel")}</div>
 <div class="completion" hidden><span class="completion-stars" aria-hidden="true">✧ ✦ ✧</span><button id="next" aria-label="Next stage">${svg("arrow")}</button></div>
 </main>
 <footer><div class="toolbar"><div class="dig-meter" aria-label="Digs remaining">${svg("shovel")}<strong id="remaining">11</strong><span class="budget">/ <span id="budget">11</span></span><div class="dig-pips" aria-hidden="true"></div></div><span class="divider"></span><div id="targets" aria-label="Machines"></div><span class="divider"></span><div class="actions"><button id="undo" class="icon-button" aria-label="Undo last dig" title="Undo · Z">${svg("undo")}</button><button id="restart" class="icon-button" aria-label="Restart stage" title="Restart · R">${svg("restart")}</button></div></div><div class="footer-decoration" aria-hidden="true"><span>✦</span><span>·</span><span>✦</span></div></footer>
 <div id="status" class="sr-only" aria-live="polite"></div>`;
const host = document.querySelector<HTMLElement>(".scene")!;
let world: World;
try {
  world = new World(host, game, dig);
} catch (error) {
  host.innerHTML =
    '<p class="fallback">This little world needs WebGL. Try opening it in a browser with hardware acceleration enabled.</p>';
  throw error;
}
const $ = <T extends HTMLElement>(q: string) => document.querySelector<T>(q)!;
function dig(i: number) {
  const before = game.wet.size;
  if (!game.dig(i)) return;
  $(".intro-gesture").hidden = true;
  world.burst(i);
  world.sync();
  sound(game.wet.size > before ? "water" : "dig");
  update();
}
function update() {
  $("#remaining").textContent = String(game.remaining);
  $("#budget").textContent = String(game.level.budget);
  $(".dig-pips").innerHTML = Array.from(
    { length: game.level.budget },
    (_, i) => `<i class="${i < game.remaining ? "full" : ""}"></i>`,
  ).join("");
  $("#targets").innerHTML = game.active
    .map(
      (active, n) =>
        `<span class="target ${active && world.settled ? "active" : ""}" aria-label="Machine ${n + 1}: ${active && world.settled ? "powered" : "dry"}">${svg(active && world.settled ? "check" : "wheel")}</span>`,
    )
    .join("");
  $<HTMLButtonElement>("#undo").disabled = !game.digs.length;
  $(".toolbar").classList.toggle(
    "empty",
    game.remaining === 0 && !game.won && world.settled,
  );
  $(".completion").hidden = !(game.won && world.settled);
  document.querySelectorAll<HTMLButtonElement>(".stage").forEach((b, n) => {
    b.disabled = n > completed;
    b.classList.toggle("selected", n === stage);
    b.classList.toggle("done", n < completed);
    b.setAttribute("aria-current", n === stage ? "step" : "false");
  });
  $(".sound").innerHTML = svg(muted ? "mute" : "sound");
  $(".sound").setAttribute("aria-label", muted ? "Enable sound" : "Mute sound");
  $(".sound").setAttribute("aria-pressed", String(muted));
  $("#status").textContent =
    game.won && world.settled
      ? `Stage ${stage + 1} complete.`
      : `${game.remaining} digs remaining. ${game.active.filter(Boolean).length} of ${game.level.targets.length} machines powered.`;
  $("#next").innerHTML = svg(stage === 2 ? "restart" : "arrow");
  $("#next").setAttribute(
    "aria-label",
    stage === 2 ? "Replay all stages" : "Next stage",
  );
}
world.onSettled = () => {
  const powered = game.active.filter(Boolean).length;
  if (powered > lastPowered) sound("machine");
  lastPowered = powered;
  if (game.won && !celebrated) {
    celebrated = true;
    completed = Math.max(completed, stage + 1);
    save("diggy-completed", String(completed));
    sound("win");
    game.level.targets.forEach((i) => world.burst(i, true));
  }
  update();
};
function load(n: number) {
  stage = n;
  lastPowered = 0;
  game = new Game(levels[n]);
  world.game = game;
  celebrated = false;
  focused = game.level.sources[0] + 1;
  world.build();
  world.framePuzzle();
  $("#stage-number").textContent = String(n + 1).padStart(2, "0");
  $(".intro-gesture").hidden = true;
  update();
}
$("#undo").onclick = () => {
  game.undo();
  celebrated = false;
  world.sync();
  sound("undo");
  update();
};
$("#restart").onclick = () => load(stage);
$("#zoom-in").onclick = () => world.zoomBy(1.25);
$("#zoom-out").onclick = () => world.zoomBy(0.8);
$("#overview").onclick = () => world.overview();
$("#next").onclick = () => load(stage === 2 ? 0 : stage + 1);
$(".sound").onclick = () => {
  muted = !muted;
  save("diggy-muted", String(muted));
  sound("water");
  update();
};
document
  .querySelectorAll<HTMLButtonElement>(".stage")
  .forEach((b, n) => (b.onclick = () => load(n)));
host.addEventListener("keydown", (e) => {
  const moves: Record<string, number> = {
    ArrowLeft: -1,
    ArrowRight: 1,
    ArrowUp: -16,
    ArrowDown: 16,
  };
  if (e.key in moves) {
    e.preventDefault();
    focused = Math.max(0, Math.min(255, focused + moves[e.key]));
    world.reveal(focused);
    world.highlight(focused);
  }
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    dig(focused);
  }
});
window.addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key.toLowerCase() === "z") $("#undo").click();
  if (e.key.toLowerCase() === "r") $("#restart").click();
});
function positionGesture() {
  const p = world.screen(game.level.sources[0] + 1),
    r = document.querySelector("main")!.getBoundingClientRect();
  $(".intro-gesture").style.left = `${p.x - r.left - 14}px`;
  $(".intro-gesture").style.top = `${p.y - r.top - 25}px`;
}
positionGesture();
window.addEventListener("resize", positionGesture);
update();
// Development-only bridge lets browser verification use the actual projected tile centers.
if (import.meta.env.DEV)
  Object.assign(window, {
    __diggy: {
      get game() {
        return game;
      },
      get stage() {
        return stage;
      },
      levels,
      screen: (i: number) => world.screen(i),
    },
  });
