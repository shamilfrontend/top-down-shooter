<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useMaps } from '@/composables/useMaps';
import { useGameAudio } from '@/composables/useGameAudio';
import { useFullscreen } from '@/composables/useFullscreen';
import { GameEngine } from '@/game/GameEngine';
import { LocalGameSession } from '@/game/LocalGameSession';
import GameHUD from '@/components/GameHUD.vue';
import ShopModal from '@/components/ShopModal.vue';

const route = useRoute();
const { fetchMap } = useMaps();
const { playShot, playReload, playWinCt, playWinTer } = useGameAudio();

const canvasRef = ref<HTMLCanvasElement | null>(null);
let engine: GameEngine | null = null;
let localSession: LocalGameSession | null = null;

const hudState = ref({
  health: 100,
  weapon: 'usp',
  ammo: 12,
  ammoReserve: 24,
  kills: 0,
  deaths: 0,
  scoreCt: 0,
  scoreT: 0,
  credits: 800,
  weapons: [null, 'usp'] as [string | null, string],
  currentSlot: 1,
  round: 1,
  roundTimeLeft: 180,
});

const shopOpen = ref(false);

const canvasWrapRef = ref<HTMLDivElement | null>(null);
const { isFullscreen, toggle: toggleFullscreen } = useFullscreen(canvasWrapRef);

async function init() {
  const mapId = (route.params.mapId as string) || 'dust2';
  const canvas = canvasRef.value;
  if (!canvas) return;

  try {
    const map = await fetchMap(mapId);
    localSession = new LocalGameSession(map);
    engine = new GameEngine({
      canvas,
      map,
      localPlayerId: 'local',
      networked: true,
      onInput: (state) => {
        localSession?.setInput('local', {
          up: state.up ?? false,
          down: state.down ?? false,
          left: state.left ?? false,
          right: state.right ?? false,
        });
        localSession?.setAngle('local', state.angle);
      },
      onShoot: () => localSession?.shoot('local'),
      onReload: () => {
        localSession?.reload('local');
        playReload();
      },
      onSwitchWeapon: (slot) => localSession?.switchWeapon('local', slot),
      onOpenShop: () => { shopOpen.value = !shopOpen.value; },
      onHUDUpdate: (s) => { hudState.value = s; },
    });

    localSession.setOnState((state) => {
      engine?.setServerState(
        state.players,
        state.pickups,
        { round: state.round, roundTimeLeft: state.roundTimeLeft, roundWins: state.roundWins }
      );
    });

    localSession.setOnShotTrail((x1, y1, x2, y2) => {
      engine?.addBulletTrail(x1, y1, x2, y2);
    });
    localSession.setOnShot((weapon) => playShot(weapon));
    localSession.setOnRoundEnd((winner) => {
      if (winner === 'ct') playWinCt();
      else playWinTer();
    });

    localSession.start();
    engine.setFogOfWar(true);
    engine.start();
  } catch (e) {
    console.error('Failed to load map:', e);
  }
}

function buyWeapon(id: string) {
  localSession?.buyWeapon('local', id);
  shopOpen.value = false;
}

onMounted(init);

onUnmounted(() => {
  localSession?.stop();
  localSession = null;
  engine?.stop();
  engine = null;
});

watch(() => route.params.mapId, () => {
  localSession?.stop();
  localSession = null;
  engine?.stop();
  init();
});
</script>

<template>
  <div class="game-view">
    <div class="game-header">
      <h2>Игра (одиночный режим)</h2>
      <p class="hint">WASD — движение, мышь — прицел, ЛКМ — стрельба, R — перезарядка, 1/2 — оружие, B — магазин</p>
      <button
        type="button"
        class="btn-fullscreen"
        :title="isFullscreen ? 'Выйти из полноэкранного режима' : 'На весь экран'"
        @click="toggleFullscreen"
      >
        {{ isFullscreen ? '⊡' : '⊞' }}
      </button>
    </div>
    <div ref="canvasWrapRef" class="game-canvas-wrap">
      <canvas ref="canvasRef" class="game-canvas" />
      <GameHUD v-bind="hudState" />
      <ShopModal
        :show="shopOpen"
        :credits="hudState.credits"
        :weapons="hudState.weapons"
        @close="shopOpen = false"
        @buy="buyWeapon"
      />
    </div>
  </div>
</template>

<style scoped>
.game-view {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #1a1a2e;
}
.game-header {
  position: relative;
  padding: 0.75rem 1rem;
  background: #1e1e32;
}
.btn-fullscreen {
  position: absolute;
  top: 0.5rem;
  right: 0.75rem;
  padding: 0.35rem 0.6rem;
  background: #333;
  border: 1px solid #555;
  border-radius: 6px;
  color: #eee;
  font-size: 1.1rem;
  cursor: pointer;
}
.btn-fullscreen:hover {
  background: #444;
}
.game-header h2 {
  font-size: 1rem;
  margin-bottom: 0.25rem;
}
.hint {
  font-size: 0.85rem;
  color: #888;
}
.game-canvas-wrap {
  flex: 1;
  position: relative;
  min-height: 400px;
}
.game-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
</style>
