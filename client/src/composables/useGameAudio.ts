const PISTOLS = ['usp'];
const MACHINE_GUNS = ['ak47', 'm4'];

function createAudio(src: string): HTMLAudioElement {
  const a = new Audio(src);
  a.preload = 'auto';
  return a;
}

export function useGameAudio() {
  const shotGun = createAudio('/audio/shot-gun.mp3');
  const shotMachineGun = createAudio('/audio/shot-machine-gun.mp3');
  const reloading = createAudio('/audio/reloading.mp3');
  const winCt = createAudio('/audio/win-ct.mp3');
  const winTer = createAudio('/audio/win-ter.mp3');
  const addAmmo = createAudio('/audio/add-ammunition.mp3');
  const addHp = createAudio('/audio/add-hp.mp3');
  const go = createAudio('/audio/go.mp3');
  const go2 = createAudio('/audio/go2.mp3');
  let goRoundIndex = 0;

  function playShot(weapon: string) {
    if (PISTOLS.includes(weapon)) {
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

  return { playShot, playReload, playWinCt, playWinTer, playPickupAmmo, playPickupMedkit, playGo };
}
