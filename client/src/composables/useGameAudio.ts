import { ref } from 'vue';

const PISTOLS = ['usp'];
const MACHINE_GUNS = ['ak47', 'm4'];
const SNIPERS = ['awp'];
const MUTED_KEY = 'gameAudioMuted';
const MUSIC_VOLUME_KEY = 'gameMusicVolume';

function createAudio(src: string): HTMLAudioElement {
  const a = new Audio(src);
  a.preload = 'auto';
  return a;
}

const allAudio: HTMLAudioElement[] = [];
let audioReady = false;
let gameMusic: HTMLAudioElement | null = null;

const isMuted = ref(localStorage.getItem(MUTED_KEY) === '1');
const musicVolume = ref(
  Math.min(1, Math.max(0, parseFloat(localStorage.getItem(MUSIC_VOLUME_KEY) ?? '0.8') || 0.8))
);

function applyMute() {
  const v = isMuted.value ? 0 : 1;
  allAudio.forEach((a) => { a.volume = v; });
  if (gameMusic) {
    gameMusic.volume = isMuted.value ? 0 : musicVolume.value;
  }
  localStorage.setItem(MUTED_KEY, isMuted.value ? '1' : '0');
}

function setMusicVolume(v: number) {
  const n = Math.min(1, Math.max(0, v));
  musicVolume.value = n;
  localStorage.setItem(MUSIC_VOLUME_KEY, String(n));
  if (gameMusic && !isMuted.value) {
    gameMusic.volume = n;
  }
}
function toggleMute() {
  isMuted.value = !isMuted.value;
  applyMute();
}

function ensureAudio() {
  if (audioReady) return;
  audioReady = true;
  const list = [
    '/audio/shot-gun.mp3',
    '/audio/shot-machine-gun.mp3',
    '/audio/reloading.mp3',
    '/audio/win-ct.mp3',
    '/audio/win-ter.mp3',
    '/audio/add-ammunition.mp3',
    '/audio/add-hp.mp3',
    '/audio/go.mp3',
    '/audio/go2.mp3',
  ];
  list.forEach((src) => {
    const a = createAudio(src);
    allAudio.push(a);
  });
  applyMute(); // применить сохранённый mute при первой инициализации
}

export function useGameAudio() {
  ensureAudio();
  const [shotGun, shotMachineGun, reloading, winCt, winTer, addAmmo, addHp, go, go2] = allAudio;
  let goRoundIndex = 0;

  function playShot(weapon: string) {
    if (PISTOLS.includes(weapon)) {
      shotGun.currentTime = 0;
      shotGun.play().catch(() => {});
    } else if (SNIPERS.includes(weapon)) {
      shotGun.currentTime = 0;
      shotGun.play().catch(() => {});
    } else if (MACHINE_GUNS.includes(weapon)) {
      shotMachineGun.currentTime = 0;
      shotMachineGun.play().catch(() => {});
    }
  }

  function playReload() {
    reloading.currentTime = 0;
    reloading.play().catch(() => {});
  }

  function playWinCt() {
    winCt.currentTime = 0;
    winCt.play().catch(() => {});
  }

  function playWinTer() {
    winTer.currentTime = 0;
    winTer.play().catch(() => {});
  }

  function playPickupAmmo() {
    addAmmo.currentTime = 0;
    addAmmo.play().catch(() => {});
  }

  function playPickupMedkit() {
    addHp.currentTime = 0;
    addHp.play().catch(() => {});
  }

  function playGo() {
    const isEven = goRoundIndex % 2 === 0;
    goRoundIndex++;
    const audio = isEven ? go : go2;
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }

  function startGameMusic() {
    if (gameMusic) return;
    const audio = new Audio('/music/game.mp3');
    audio.loop = true;
    audio.volume = isMuted.value ? 0 : musicVolume.value;
    gameMusic = audio;
    audio.play().catch(() => {});
  }

  function tryPlayGameMusic() {
    if (gameMusic && !isMuted.value) {
      gameMusic.play().catch(() => {});
    }
  }

  function stopGameMusic() {
    if (gameMusic) {
      gameMusic.pause();
      gameMusic = null;
    }
  }

  return { playShot, playReload, playWinCt, playWinTer, playPickupAmmo, playPickupMedkit, playGo, isMuted, toggleMute, musicVolume, setMusicVolume, startGameMusic, stopGameMusic, tryPlayGameMusic };
}
