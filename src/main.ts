import {farmSound,type FarmCue} from './farm-sound';
import {citySound,type CityCue} from './city-sound';
import {CITY_DURATION} from './city-timeline';
import {timberSound} from './timber-sound';
import {splashSound,scoopSound,blockedSound} from './splash-sound';
import { BRIDGE_DURATION } from "./bridge-timeline";
import { OASIS_DURATION } from "./oasis-timeline";
import { showFirstDigHint } from "./tutorial";
import { creatureSound, stopCreatureSounds, type CreatureCue } from "./creature-sound";
import "@fontsource/outfit/latin-600.css";
import "@fontsource/outfit/latin-800.css";
import "@fontsource/dm-sans/latin-500.css";
import "./style.css";
import { SIZE, Game } from "./game";
import { levels } from "./levels";
import { World } from "./world";
const icons = {
  motion: '<path d="m9 5 11 7-11 7Z"/><path d="M3 6h2M2 12h3M3 18h2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  fit: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
  shovel:
    '<g transform="rotate(32 12 12)"><path d="M8 2h8v3a4 4 0 0 1-8 0Z" fill="#d7ac68"/><path d="M12 9v7" stroke="#a67542" stroke-width="3"/><path d="M7 15h10v4c0 2-3 4-5 5-2-1-5-3-5-5Z" fill="#8fa9a1"/><path d="M12 17v4" stroke="#e9f1db"/></g>',
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
let battleNoise: AudioBuffer | undefined;
let celebrated = false;
let lastPowered = 0;
let focused = game.level.solution[0];
// Preserve existing completion saves; ratings no longer exist.
let retrying=false;
let retryTimer=0;
let retryGeneration=0;
function sound(
  kind:
    "dig" | "water" | "win" | "undo" | "machine" | "wind" | "launch" | "impact" | "wood" | "blocked" | CreatureCue | CityCue | FarmCue,
) {
  if (muted) return;
  try {
    audio ??= new AudioContext();
    void audio.resume();
    if(['harvest-chime','feast-pop','farm-fall','wolf-call'].includes(kind)){farmSound(audio,kind as FarmCue);return;}
    if(kind === "geyser" || kind === "collapse" || kind === "flood"){citySound(audio,kind);return;}
    if(kind === "blocked"){blockedSound(audio);return;}
    if(kind === "wood"){timberSound(audio);return;}
    if(kind === "dig"){scoopSound(audio);return;}
    if(kind === "water"){splashSound(audio);return;}
    if(['bloom','twist','roar','gasp','grab','gulp','uproot','sizzle'].includes(kind)){
      creatureSound(audio,kind as CreatureCue);return;
    }
    if (["wind", "launch", "impact"].includes(kind)) {
      const t = audio.currentTime,
        impact = kind === "impact",
        duration = impact ? 0.65 : kind === "launch" ? 0.35 : 0.28;
      if (!battleNoise) {
        battleNoise = audio.createBuffer(1, audio.sampleRate, audio.sampleRate);
        const data = battleNoise.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      }
      const source = audio.createBufferSource(),
        filter = audio.createBiquadFilter(),
        gain = audio.createGain();
      source.buffer = battleNoise;
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(
        impact ? 700 : kind === "launch" ? 1800 : 250,
        t,
      );
      filter.frequency.exponentialRampToValueAtTime(100, t + duration);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(impact ? 0.13 : 0.05, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(audio.destination);
      source.start(t);
      source.stop(t + duration);
      source.onended = () => {
        source.disconnect();
        filter.disconnect();
        gain.disconnect();
      };
      if (impact) {
        const bass = audio.createOscillator(),
          envelope = audio.createGain();
        bass.frequency.setValueAtTime(95, t);
        bass.frequency.exponentialRampToValueAtTime(28, t + 0.4);
        envelope.gain.setValueAtTime(0.095, t);
        envelope.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
        bass.connect(envelope);
        envelope.connect(audio.destination);
        bass.start(t);
        bass.stop(t + 0.5);
        bass.onended = () => {
          bass.disconnect();
          envelope.disconnect();
        };
      }
      return;
    }
    const notes =
      kind === "win"
        ? [523, 659, 784, 1047]
        : kind === "undo"
            ? [260]
            : kind === "machine"
              ? [90, 130, 90]
              : [160, 100];
    notes.forEach((hz, i) => {
      const osc = audio!.createOscillator(),
        gain = audio!.createGain(),
        t = audio!.currentTime + i * 0.09;
      osc.type = "sine";
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
<header><nav aria-label="Stages">${levels.map((_, n) => `<button class="stage" data-stage="${n}" aria-label="Stage ${n + 1}"><span>${n + 1}</span><small class="stage-complete" aria-hidden="true"></small></button>`).join("")}</nav>
</header>
<main><div class="sun-disc" aria-hidden="true"></div>
<div class="scene" tabindex="0" role="application" aria-label="Desert puzzle board. Click sand to dig. Pinch to magnify the page. Arrow keys select a tile, Enter digs."></div>
</main>
<footer><div class="toolbar"><div class="dig-meter" aria-label="Digs remaining">${svg("shovel")}<strong id="remaining">4</strong></div><button id="sound-toggle" class="icon-button" type="button" aria-label="Mute sound"></button></div></footer>
<div id="retry-notice" role="status" aria-live="polite" hidden><strong>Out of digs</strong><span>Try again</span><div class="retry-track"><i></i></div></div><dialog id="result" aria-labelledby="result-title" aria-describedby="result-message"><div class="result-chapter" id="result-chapter"></div><h2 id="result-title"></h2><p id="result-message" class="sr-only"></p><div class="result-check" aria-hidden="true">${svg("check")}</div><div class="result-score" id="result-score"></div><div class="result-actions"><button id="result-primary" class="primary"></button><button id="result-secondary" class="secondary"></button></div></dialog>
<div id="dig-tutorial" hidden role="img" aria-label="Dig the highlighted sand tile next to the water. Press Enter or tap it."><svg class="tutorial-tile" aria-hidden="true"><polygon /></svg><span class="tutorial-shovel" aria-hidden="true">${svg("shovel")}<i></i></span></div>
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
function updateTutorial(){
  const guide=$("#dig-tutorial"),i=game.level.solution[0];
  guide.hidden=retrying||!showFirstDigHint(stage,completed,game.digs,i,game.won);
  if(guide.hidden)return;
  const p=world.screen(i),shovel=guide.querySelector<HTMLElement>(".tutorial-shovel")!;
  shovel.style.left=`${p.x}px`;shovel.style.top=`${p.y}px`;
  guide.querySelector(".tutorial-tile")!.setAttribute("viewBox",`0 0 ${innerWidth} ${innerHeight}`);
  guide.querySelector("polygon")!.setAttribute("points",world.screenTile(i).map(p=>`${p.x},${p.y}`).join(" "));
}
world.onViewChanged=updateTutorial;
function showDigDrop(i: number) {
  const p = world.screen(i);
  const drop = document.createElement("div");
  drop.className = "dig-drop";
  drop.setAttribute("aria-hidden", "true");
  drop.innerHTML = `${svg("shovel")}<strong>${game.remaining}</strong>`;
  drop.style.left = `${Math.max(44, Math.min(innerWidth - 44, p.x))}px`;
  drop.style.top = `${Math.max(90, Math.min(innerHeight - 35, p.y - 12))}px`;
  document.body.append(drop);
  // Separate elements let quick consecutive digs each show their own count.
  drop.addEventListener("animationend", () => drop.remove(), { once: true });
  window.setTimeout(() => drop.remove(), 2400);
}
function dig(i: number,point?:{x:number;y:number}) {
  if(retrying||game.won)return;
  if (!game.dig(i)){sound(world.tapBlocked(i,point));return;}
  showDigDrop(i);
  world.burst(i);
  world.sync();
  sound("dig");
  update();
}
function closeResult() {
  if (result.open) result.close();
}
function showResult() {
  $("#result-chapter").textContent=`${stage+1} / ${levels.length}`;
  $("#result-title").textContent="Level complete";
  $("#result-message").textContent=game.level.story!.success;
  $("#result-score").innerHTML="";
  $("#result-primary").innerHTML=stage===levels.length-1?`Play again ${svg("restart")}`:`Next level ${svg("arrow")}`;
  $("#result-secondary").textContent="Replay level";
  if(!result.open)result.showModal();
}
function autoRetry(){
  if(retrying)return;
  retrying=true;
  const generation=++retryGeneration;
  stopCreatureSounds();
  closeResult();
  document.querySelectorAll(".dig-drop").forEach(drop=>drop.remove());
  $("#retry-notice").classList.remove("leaving");
  $("#retry-notice").hidden=false;
  $("#dig-tutorial").hidden=true;
  $("#app").classList.add("retrying");
  sound("undo");
  const interval=world.reduced?30:Math.min(160,1000/game.digs.length);
  $("#retry-notice").style.setProperty("--retry-duration",`${(world.reduced?500:850)+interval*game.digs.length+220}ms`);
  const rewind=()=>{
    if(generation!==retryGeneration)return;
    if(document.hidden){retryTimer=window.setTimeout(rewind,100);return;}
    if(game.digs.length){
      const cell=game.digs[game.digs.length-1];
      game.undo();world.sync();
      if(!world.reduced)world.restoreDust(cell);
      sound("undo");update();
      retryTimer=window.setTimeout(rewind,interval);
    }else {
      $("#retry-notice").classList.add("leaving");
      retryTimer=window.setTimeout(()=>{if(generation===retryGeneration)load(stage);},world.reduced?180:700);
    }
  };
  retryTimer=window.setTimeout(rewind,world.reduced?500:850);
}
function update() {
  updateTutorial();
  $("#remaining").textContent = String(game.remaining);
  $(".toolbar").classList.toggle("empty", game.failed && world.settled);
  document.querySelectorAll<HTMLButtonElement>(".stage").forEach((b, n) => {
    b.disabled = n > completed;
    b.classList.toggle("selected", n === stage);
    b.classList.toggle("done", n < completed);
    b.setAttribute("aria-current", n === stage ? "step" : "false");
    b.setAttribute("aria-label", `Stage ${n + 1}, ${n<completed?"complete":"incomplete"}`);
    b.querySelector(".stage-complete")!.textContent = n<completed?"✓":"";
  });
  $("#status").textContent =
    world.settled && game.won
      ? `${game.level.story!.success} Level complete. `
      : world.settled && game.failed
        ? "Out of digs. Resetting the board."
        : `${game.remaining} digs remaining.`;
  if (world.settled && game.won && !retrying) showResult();
  else if(world.settled&&game.failed&&!retrying)autoRetry();
  else closeResult();
}
world.onSettled = () => {
  if(retrying)return;
  const powered = game.active.filter(Boolean).length;
  if (powered > lastPowered && stage > 0) sound("machine");
  lastPowered = powered;
  if (game.won && !celebrated) {
    celebrated = true;
    completed = Math.max(completed, stage + 1);
    save("diggy-completed", String(completed));
    sound("win");
  }
  update();
};
function load(n: number) {
  clearTimeout(retryTimer);retryGeneration++;retrying=false;
  $("#retry-notice").hidden=true;$("#app").classList.remove("retrying");
  stopCreatureSounds();
  closeResult();
  document.querySelectorAll(".dig-drop").forEach(drop => drop.remove());
  stage = n;
  lastPowered = 0;
  game = new Game(levels[n]);
  world.game = game;
  celebrated = false;
  focused = game.level.solution[0];
  world.build();
  world.framePuzzle();
  update();
}
matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", update);
$("#result-primary").onclick = () =>
  load(game.won ? (stage === levels.length - 1 ? 0 : stage + 1) : stage);
$("#result-secondary").onclick = () => load(stage);
result.addEventListener("cancel", (e) => e.preventDefault());
document
  .querySelectorAll<HTMLButtonElement>(".stage")
  .forEach((b, n) => (b.onclick = () => load(n)));
host.addEventListener("keydown", (e) => {
  const moves: Record<string, number> = {
    ArrowLeft: -1,
    ArrowRight: 1,
    ArrowUp: -SIZE,
    ArrowDown: SIZE,
  };
  if (e.key in moves) {
    e.preventDefault();
    const x = focused % SIZE,
      z = Math.floor(focused / SIZE);
    const nx = Math.max(
      0,
      Math.min(
        SIZE - 1,
        x + (e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0),
      ),
    );
    const nz = Math.max(
      0,
      Math.min(
        SIZE - 1,
        z + (e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : 0),
      ),
    );
    focused = nz * SIZE + nx;
    world.highlight(focused);
  }
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    dig(focused);
  }
});
const muteButton=document.querySelector<HTMLButtonElement>('#sound-toggle')!;
function renderMute(){
  muteButton.innerHTML=svg(muted?'mute':'sound');
  muteButton.setAttribute('aria-label',muted?'Unmute sound':'Mute sound');
  muteButton.setAttribute('aria-pressed',String(muted));
  muteButton.title=muted?'Unmute sound':'Mute sound';
}
muteButton.addEventListener('click',()=>{
  muted=!muted;save('diggy-muted',String(muted));
  if(muted){stopCreatureSounds();if(audio){void audio.close();audio=undefined;}}
  renderMute();
});
renderMute();
world.onWater=()=>sound("water");
world.onBattleSound = sound;
world.onCitySound = sound;
world.onFarmSound = sound;
world.onCreatureSound = sound;
document.addEventListener("visibilitychange",()=>{if(document.hidden)stopCreatureSounds();});
update();
if (import.meta.env.DEV)
  Object.assign(window, {
    __diggy: {
      get game() {
        return game;
      },
      get waterAnimation(){return [...world.waters].map(([i,m])=>({cell:i,visible:m.visible,scale:m.scale.toArray(),start:world.wetAt.get(i),parent:m.userData.parent}));},
      get renderStats() {
        return {
          ...world.renderer.info.render,
          geometries: world.renderer.info.memory.geometries,
          textures: world.renderer.info.memory.textures,
        };
      },
      get stage() {
        return stage;
      },
      get story() {
        return {
          oasis: world.story?.oasisSprites ? {
            plant:world.story.oasisSprites.monster.plant.visible,
            plantPosition:world.story.oasisSprites.monster.plant.position.toArray(),
            shepherdScale:world.story.oasisSprites.walkers[0].sprite.scale.toArray(),
            shepherdFrame:world.story.oasisSprites.walkers[0].sprite.userData.frame,
            outlineCount:world.story.oasisSprites.monster.root.getObjectsByProperty('name','inverted-hull').length,
            palm:world.story.oasisSprites.monster.palm.visible,
            actors:world.story.oasisSprites.walkers.map(a=>a.sprite.visible),
            roasts:world.story.oasisSprites.monster.roasts.map(r=>r.visible),
            fire:world.story.oasisSprites.monster.flames.some(f=>f.visible),
            angles:{...world.viewAngles},
          }:undefined,
          harvestPower: world.story?.harvestScene?.power,
          cityFrames: world.story?.citySprites?.people.map(a=>a.sprite.userData.frame),
          wheelRotation: world.wheels[0]?.rotation.z,
          spriteFrames: world.story?.oasisSprites?.walkers.map(a => a.sprite.userData.frame),
          battle: world.story?.campaign?.battleScene
            ? {
                ages: [...world.story.campaign.battleScene.state.ages],
                hits: [...world.story.campaign.battleScene.state.hits],
                complete: world.story.campaign.battleScene.state.complete,
                flying: world.story.campaign.battleScene.engines.map(
                  (e) => e.stone.visible,
                ),
                arms: world.story.campaign.battleScene.engines.map(
                  (e) => e.arm.rotation.x,
                ),
                wrecks: world.story.campaign.battleScene.forts.map(
                  (f) => f.wreck.visible,
                ),
              }
            : undefined,
          fortress: world.story?.campaign?.fortressScene
            ? {
                power: [...world.story.campaign.fortressScene.state.power],
                convoy: world.story.campaign.fortressScene.state.convoy,
                escort: world.story.campaign.fortressScene.state.escort,
                gate: world.story.campaign.fortressScene.state.gate,
                age: world.story.campaign.fortressScene.state.arrivalAge,
                complete: world.story.campaign.fortressScene.state.complete,
                wagonX: world.story.campaign.fortressScene.wagons.map(
                  (w) => w.root.position.x + 7.5,
                ),
              }
            : undefined,
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
      previewOasis(seconds:number){
        if(!world.story?.oasisSprites)return;
        cancelAnimationFrame(world.frame);
        world.story.progress=seconds/OASIS_DURATION;
        world.story.oasisSprites.update(world.story.progress,seconds);
        stopCreatureSounds();
        world.renderer.render(world.scene,world.camera);
      },
      previewFarm(seconds:number){
        if(!world.story?.harvestScene)return;
        cancelAnimationFrame(world.frame);
        world.story.harvestScene.update(2,[true,true],seconds/18,seconds);
        world.renderer.render(world.scene,world.camera);
      },
      previewCity(seconds:number){
        document.querySelectorAll(".dig-drop").forEach(drop=>drop.remove());
        if(!world.story?.citySprites)return;
        cancelAnimationFrame(world.frame);
        world.waterEffects.reset();world.waterEffects.update(world.elapsed,world.reduced);
        for(const [i,m]of world.waters)m.visible=world.game.wet.has(i);
        world.story.progress=seconds/CITY_DURATION;
        world.story.citySprites.update(world.story.progress,seconds);
        world.renderer.render(world.scene,world.camera);
      },
      previewBridge(seconds:number){
        if(!world.story?.bridgeSprites)return;
        cancelAnimationFrame(world.frame);
        world.story.progress=seconds/BRIDGE_DURATION;
        document.querySelectorAll(".dig-drop").forEach(drop=>drop.remove());
        world.story.bridgeSprites.update(world.story.progress,seconds);
        world.updateCamera();
        world.renderer.render(world.scene,world.camera);
        const scene=world.story.bridgeSprites;
        return {angle:scene.wheel.rotation.z+(scene.wheel.getObjectByName('bridge-wheel-rotor')?.rotation.z??0),dust:scene.river.dust.filter(p=>p.visible).length,ripples:scene.river.rings.filter(p=>p.visible).length};
      },
      resumeAnimation(){world.last=0;world.animate(0);},
      levels,
      screen: (i: number) => world.screen(i),
    },
  });
