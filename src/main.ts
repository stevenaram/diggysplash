import "@fontsource/outfit/latin-600.css";
import "@fontsource/outfit/latin-800.css";
import "@fontsource/dm-sans/latin-500.css";
import "./style.css";
import { Game, ratingForDigs } from "./game";
import { levels } from "./levels";
import { World } from "./world";
const icons = {
  star: '<path d="m12 2 3 6.5 7 1-5 5 1.2 7-6.2-3.3-6.2 3.3 1.2-7-5-5 7-1Z"/>',
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
  Math.min(levels.length, Number(read("diggy-completed", "0")) || 0),
);
let stage = 0;
let game = new Game(levels[stage]);
let muted = read("diggy-muted", "false") === "true";
let audio: AudioContext | undefined;
let celebrated = false;
let lastPowered = 0;
let focused = game.level.solution[0];
let bestStars: number[] = levels.map(() => 0);
try {
  const saved = JSON.parse(read("diggy-story-stars", "[]"));
  if (Array.isArray(saved))
    bestStars = bestStars.map((_, i) =>
      Number.isInteger(saved[i]) ? Math.max(0, Math.min(3, saved[i])) : 0,
    );
} catch {
  /* Older or unavailable storage is harmless. */
}
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
<nav aria-label="Stages">${levels.map((_, n) => `<button class="stage" data-stage="${n}" aria-label="Stage ${n + 1}"><span>${n + 1}</span><small class="stage-stars" aria-hidden="true"></small></button>`).join("")}</nav>
<button class="icon-button sound" aria-label="Mute sound">${svg("sound")}</button></header>
<main><div class="sun-disc" aria-hidden="true"></div>
<div class="scene" tabindex="0" role="application" aria-label="Desert puzzle board. Click sand to dig. Drag to pan; scroll or pinch to zoom. Arrow keys select a tile, Enter digs, Z undoes."></div>
<section class="story-heading" aria-label="Level objective"><div class="chapter" id="chapter">01 / ${String(levels.length).padStart(2, "0")}</div><h1 id="story-title"></h1><p id="story-goal"></p><div class="score-guide"><span id="rating-preview" aria-label="Potential stars"></span><span id="thresholds"></span></div></section>
<div class="view-controls" role="group" aria-label="Camera controls"><button id="zoom-out" class="icon-button" aria-label="Zoom out" title="Zoom out">${svg("minus")}</button><button id="zoom-in" class="icon-button" aria-label="Zoom in" title="Zoom in">${svg("plus")}</button><button id="overview" class="icon-button" aria-label="Show whole board" title="Show whole board">${svg("fit")}</button></div>
<div class="intro-gesture" aria-hidden="true">${svg("shovel")}</div>
<div class="dig-tooltip" aria-hidden="true" hidden>${svg("shovel")}<strong id="hover-remaining"></strong></div>
</main>
<footer><div class="toolbar"><div class="dig-meter" aria-label="Digs remaining">${svg("shovel")}<strong id="remaining">14</strong><span class="budget">/ <span id="budget">14</span></span><div class="dig-pips" aria-hidden="true"></div></div><span class="divider"></span><div id="targets" aria-label="Water objectives"></div><span class="divider"></span><div class="actions"><button id="undo" class="icon-button" aria-label="Undo last dig" title="Undo · Z">${svg("undo")}</button><button id="restart" class="icon-button" aria-label="Restart stage" title="Restart · R">${svg("restart")}</button></div></div></footer>
<dialog id="result" aria-labelledby="result-title" aria-describedby="result-message"><div class="result-chapter" id="result-chapter"></div><h2 id="result-title"></h2><p id="result-message"></p><div class="result-stars" id="result-stars" aria-label="Stars earned"></div><div class="result-score" id="result-score"></div><div class="result-actions"><button id="result-primary" class="primary"></button><button id="result-secondary" class="secondary"></button></div></dialog>
<div id="status" class="sr-only" aria-live="polite"></div>`;
const $ = <T extends HTMLElement>(q: string) => document.querySelector<T>(q)!;
const host = $(".scene"),
  result = $<HTMLDialogElement>("#result");
let world: World;
try {
  world = new World(host, game, dig);
} catch (error) {
  host.innerHTML =
    '<p class="fallback">This little world needs WebGL. Try a browser with hardware acceleration enabled.</p>';
  throw error;
}
function starMarkup(count: number) {
  return [0, 1, 2]
    .map(
      (n) =>
        `<span class="${n < count ? "earned" : "unearned"}">${svg("star")}</span>`,
    )
    .join("");
}
function dig(i: number) {
  const before = game.wet.size;
  if (!game.dig(i)) return;
  $(".intro-gesture").hidden = true;
  world.burst(i);
  world.sync();
  sound(game.wet.size > before ? "water" : "dig");
  update();
}
function closeResult() {
  if (result.open) result.close();
}
function showResult() {
  const success = game.won;
  $("#result-chapter").textContent =
    `${String(stage + 1).padStart(2, "0")} / ${String(levels.length).padStart(2, "0")}`;
  $("#result-title").textContent = success ? "Level complete" : "Level failed";
  $("#result-message").textContent = success
    ? game.level.story!.success
    : "Out of digs. Try a shorter route.";
  $("#result-stars").innerHTML = starMarkup(game.stars);
  $("#result-stars").hidden = !success;
  $("#result-stars").setAttribute("aria-label", `${game.stars} of 3 stars`);
  $("#result-score").innerHTML =
    `${svg("shovel")} <strong>${game.digs.length}</strong> / ${game.level.budget}<span>digs used</span>`;
  $("#result-primary").innerHTML = success
    ? stage === levels.length - 1
      ? `Play again ${svg("restart")}`
      : `Next level ${svg("arrow")}`
    : `Retry ${svg("restart")}`;
  $("#result-secondary").textContent = success
    ? game.stars < 3
      ? "Retry for more stars"
      : "Replay level"
    : "Undo last dig";
  result.classList.toggle("failed", !success);
  if (!result.open) {
    $(".dig-tooltip").hidden = true;
    result.showModal();
  }
}
const objectiveNames: Record<string, string[]> = {
  oasis: ["Watering hole"],
  bridge: ["Drawbridge"],
  city: ["West gate", "East gate"],
  harvest: ["West mill", "East mill"],
  caravan: ["Ochre wagon pump", "Teal wagon pump", "Cream wagon pump"],
  temple: ["West shrine", "East shrine", "South shrine"],
  fortress: ["West barricade", "Middle barricade", "East barricade"],
  battle: ["North cannon", "Upper cannon", "Lower cannon", "South cannon"],
};
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
        `<span class="target ${active ? "active" : ""}" role="img" title="${objectiveNames[game.level.story!.kind][n]}" aria-label="${objectiveNames[game.level.story!.kind][n]}: ${active ? "active" : "dry"}">${svg(active ? "check" : stage === 0 ? "drop" : "wheel")}</span>`,
    )
    .join("");
  $<HTMLButtonElement>("#undo").disabled = !game.digs.length;
  $(".toolbar").classList.toggle("empty", game.failed && world.settled);
  $("#story-title").textContent = game.level.story!.title;
  $("#story-goal").textContent = game.level.story!.goal;
  $("#chapter").textContent =
    `${String(stage + 1).padStart(2, "0")} / ${String(levels.length).padStart(2, "0")}`;
  $("#rating-preview").innerHTML = starMarkup(
    ratingForDigs(game.level, game.digs.length),
  );
  $("#rating-preview").setAttribute(
    "aria-label",
    `${ratingForDigs(game.level, game.digs.length)} stars at this dig count`,
  );
  $("#thresholds").textContent =
    `★★★ ≤ ${game.level.starThresholds!.three} · ★★ ≤ ${game.level.starThresholds!.two}`;
  document.querySelectorAll<HTMLButtonElement>(".stage").forEach((b, n) => {
    b.disabled = n > completed;
    b.classList.toggle("selected", n === stage);
    b.classList.toggle("done", n < completed);
    b.setAttribute("aria-current", n === stage ? "step" : "false");
    b.setAttribute("aria-label", `Stage ${n + 1}, best ${bestStars[n]} stars`);
    b.querySelector(".stage-stars")!.textContent =
      "★".repeat(bestStars[n]) + "·".repeat(3 - bestStars[n]);
  });
  $(".sound").innerHTML = svg(muted ? "mute" : "sound");
  $(".sound").setAttribute("aria-label", muted ? "Enable sound" : "Mute sound");
  $(".sound").setAttribute("aria-pressed", String(muted));
  $("#status").textContent =
    world.settled && game.won
      ? `${game.level.story!.success} Level complete. ${game.stars} stars.`
      : world.settled && game.failed
        ? "Level failed. Out of digs. Retry or undo."
        : `${game.remaining} digs remaining.`;
  if (world.settled && (game.won || game.failed)) showResult();
  else closeResult();
}
world.onSettled = () => {
  const powered = game.active.filter(Boolean).length;
  if (powered > lastPowered && stage > 0) sound("machine");
  lastPowered = powered;
  if (game.won && !celebrated) {
    celebrated = true;
    completed = Math.max(completed, stage + 1);
    bestStars[stage] = Math.max(bestStars[stage], game.stars);
    save("diggy-completed", String(completed));
    save("diggy-story-stars", JSON.stringify(bestStars));
    sound("win");
  }
  update();
};
world.onHover = (i) => {
  const tooltip = $(".dig-tooltip");
  tooltip.hidden = i === null || result.open;
  if (i === null) return;
  const p = world.screen(i);
  tooltip.style.left = `${Math.max(8, Math.min(innerWidth - 100, p.x + 18))}px`;
  tooltip.style.top = `${Math.max(70, Math.min(innerHeight - 70, p.y - 48))}px`;
  $("#hover-remaining").textContent = String(game.remaining);
};
function load(n: number) {
  closeResult();
  stage = n;
  lastPowered = 0;
  game = new Game(levels[n]);
  world.game = game;
  celebrated = false;
  focused = game.level.solution[0];
  world.build();
  world.framePuzzle();
  $(".intro-gesture").hidden = true;
  $(".dig-tooltip").hidden = true;
  update();
}
function undo() {
  closeResult();
  game.undo();
  celebrated = false;
  world.sync();
  sound("undo");
  update();
}
$("#undo").onclick = undo;
$("#restart").onclick = () => load(stage);
$("#result-primary").onclick = () =>
  load(game.won ? (stage === levels.length - 1 ? 0 : stage + 1) : stage);
$("#result-secondary").onclick = () => (game.won ? load(stage) : undo());
result.addEventListener("cancel", (e) => e.preventDefault());
$("#zoom-in").onclick = () => world.zoomBy(1.25);
$("#zoom-out").onclick = () => world.zoomBy(0.8);
$("#overview").onclick = () => world.overview();
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
  if (e.key.toLowerCase() === "z") undo();
  if (e.key.toLowerCase() === "r") load(stage);
});
function positionGesture() {
  const p = world.screen(game.level.solution[0]),
    r = document.querySelector("main")!.getBoundingClientRect();
  $(".intro-gesture").style.left = `${p.x - r.left - 14}px`;
  $(".intro-gesture").style.top = `${p.y - r.top - 25}px`;
}
world.onViewChanged = positionGesture;
positionGesture();
window.addEventListener("resize", positionGesture);
update();
if (import.meta.env.DEV)
  Object.assign(window, {
    __diggy: {
      get game() {
        return game;
      },
      get stage() {
        return stage;
      },
      get story() {
        return {
          power: world.story?.campaign?.power,
          progress: world.story?.progress,
          done: world.story?.done,
          actors: world.story?.actors.map((a) => ({
            x: a.root.position.x,
            z: a.root.position.z,
          })),
          bridge: world.story?.bridge?.rotation.z,
          gates: world.story?.gates.map((g) => g.position.y),
        };
      },
      levels,
      screen: (i: number) => world.screen(i),
    },
  });
