<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMaps } from '@/composables/useMaps';
import { useGameAudio } from '@/composables/useGameAudio';
import { useFullscreen } from '@/composables/useFullscreen';
import { GameEngine } from '@/game/GameEngine';
import type { ServerPlayer } from '@/game/GameEngine';
import { LocalGameSession } from '@/game/LocalGameSession';
import GameHUD from '@/components/GameHUD.vue';
import ShopModal from '@/components/ShopModal.vue';

const route = useRoute();
const router = useRouter();
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

const scoreboardOpen = ref(false);
const scoreboardPlayers = ref<ServerPlayer[]>([]);
const sortedScoreboardPlayers = computed(() => {
  const list = [...scoreboardPlayers.value];
  return list.sort((a, b) => (a.team !== b.team ? (a.team === 'ct' ? -1 : 1) : b.kills - a.kills));
});

const canvasWrapRef = ref<HTMLDivElement | null>(null);
const { isFullscreen, toggle: toggleFullscreen } = useFullscreen(canvasWrapRef);

function onScoreboardKey(e: KeyboardEvent) {
  if (e.code === 'Tab') {
    e.preventDefault();
    scoreboardOpen.value = !scoreboardOpen.value;
  } else if (e.code === 'Escape') {
    scoreboardOpen.value = false;
  }
}

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
      scoreboardPlayers.value = state.players;
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

function exitGame() {
  router.push({ name: 'home' });
}

onMounted(() => {
  init();
  window.addEventListener('keydown', onScoreboardKey);
});

onUnmounted(() => {
  window.removeEventListener('keydown', onScoreboardKey);
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
      <div class="game-header-actions">
        <button type="button" class="btn-exit" @click="exitGame">Выйти</button>
        <button
          type="button"
          class="btn-fullscreen"
          :title="isFullscreen ? 'Выйти из полноэкранного режима' : 'На весь экран'"
          @click="toggleFullscreen"
        >
          {{ isFullscreen ? '⊡' : '⊞' }}
        </button>
      </div>
    </div>
    <div ref="canvasWrapRef" class="game-canvas-wrap">
      <canvas ref="canvasRef" class="game-canvas" />
      <div v-if="scoreboardOpen" class="scoreboard-overlay">
        <div class="scoreboard panel-cs">
          <div class="scoreboard-header">
            <span class="scoreboard-score">
              <span class="team-ct">{{ hudState.scoreCt }}</span>
              <span class="scoreboard-sep">:</span>
              <span class="team-t">{{ hudState.scoreT }}</span>
            </span>
            <span class="scoreboard-round">Раунд {{ hudState.round }}</span>
            <span class="scoreboard-time">
              {{ Math.floor((hudState.roundTimeLeft ?? 0) / 60) }}:{{ String((hudState.roundTimeLeft ?? 0) % 60).padStart(2, '0') }}
            </span>
          </div>
          <div class="scoreboard-table">
            <div class="scoreboard-row scoreboard-head">
              <span>Игрок</span>
              <span>K</span>
              <span>D</span>
            </div>
            <div
              v-for="p in sortedScoreboardPlayers"
              :key="p.id"
              class="scoreboard-row"
              :class="p.team"
            >
              <span class="scoreboard-name">{{ p.username }}</span>
              <span>{{ p.kills }}</span>
              <span>{{ p.deaths }}</span>
            </div>
          </div>
          <p class="scoreboard-hint">TAB или ESC — закрыть</p>
        </div>
      </div>
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
.game-header-actions {
  position: absolute;
  top: 0.5rem;
  right: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.btn-exit {
  padding: 0.35rem 0.8rem;
  background: #4a90d9;
  border: none;
  border-radius: 6px;
  color: #fff;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
}
.btn-exit:hover {
  background: #5a9fe9;
}
.btn-fullscreen {
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
.scoreboard-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  pointer-events: auto;
}
.scoreboard {
  padding: 20px 28px;
  border: 1px solid var(--cs-panel-border);
  min-width: 320px;
  max-width: 90%;
  font-family: Tahoma, Arial, sans-serif;
}
.scoreboard-header {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--cs-panel-border);
}
.scoreboard-score {
  font-size: 1.5rem;
  font-weight: 700;
}
.scoreboard-score .team-ct { color: #6b9bd1; }
.scoreboard-score .team-t { color: #d4a574; }
.scoreboard-sep { margin: 0 4px; color: var(--cs-text-dim); }
.scoreboard-round,
.scoreboard-time {
  font-size: 13px;
  color: var(--cs-text-dim);
}
.scoreboard-time {
  color: var(--cs-orange);
  font-weight: 600;
}
.scoreboard-table {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.scoreboard-row {
  display: grid;
  grid-template-columns: 1fr 40px 40px;
  gap: 12px;
  padding: 6px 10px;
  font-size: 13px;
}
.scoreboard-row.scoreboard-head {
  color: var(--cs-text-dim);
  font-size: 12px;
  border-bottom: 1px solid var(--cs-panel-border);
  margin-bottom: 4px;
}
.scoreboard-row.ct .scoreboard-name { color: #6b9bd1; }
.scoreboard-row.t .scoreboard-name { color: #d4a574; }
.scoreboard-hint {
  margin: 12px 0 0;
  font-size: 11px;
  color: var(--cs-text-dim);
  text-align: center;
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
