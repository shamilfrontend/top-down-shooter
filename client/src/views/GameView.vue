<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMaps } from '@/composables/useMaps';
import { useGameAudio } from '@/composables/useGameAudio';
import { useFullscreen } from '@/composables/useFullscreen';
import { GameEngine } from '@/game/GameEngine';
import type { ServerPlayer } from '@/game/GameEngine';
import { LocalGameSession, type BotDifficulty } from '@/game/LocalGameSession';
import GameHUD from '@/components/GameHUD.vue';
import ShopModal from '@/components/ShopModal.vue';

const BOT_DIFFICULTY_KEY = 'trainingBotDifficulty';
const BOT_COUNT_KEY = 'trainingBotCount';
const TRAINING_MAP_KEY = 'trainingMapId';
const BOT_COUNT_MIN = 0;
const BOT_COUNT_MAX = 20;
const TRAINING_ROUNDS_TO_WIN = 13;

function loadBotDifficulty(): BotDifficulty {
  const saved = localStorage.getItem(BOT_DIFFICULTY_KEY);
  return saved === 'easy' || saved === 'medium' || saved === 'hard' ? saved : 'medium';
}

function loadBotCount(): number {
  const saved = localStorage.getItem(BOT_COUNT_KEY);
  const n = saved != null ? parseInt(saved, 10) : 10;
  return Number.isFinite(n) ? Math.max(BOT_COUNT_MIN, Math.min(BOT_COUNT_MAX, n)) : 10;
}

const route = useRoute();
const router = useRouter();

const botDifficulty = ref<BotDifficulty>(loadBotDifficulty());
const botCount = ref<number>(loadBotCount());
const selectedMapId = ref<string>((route.params.mapId as string) || localStorage.getItem(TRAINING_MAP_KEY) || 'dust2');
const { fetchMap, fetchMapsList, mapsList } = useMaps();
const { playShot, playReload, playWinCt, playWinTer, playPickupAmmo, playPickupMedkit, playGo, isMuted, toggleMute } = useGameAudio();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const mapLoadError = ref<string | null>(null);
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
  armor: 0,
  weapons: [null, 'usp'] as [string | null, string],
  currentSlot: 1,
  round: 1,
  roundTimeLeft: 180,
});

const shopOpen = ref(false);

const lastHealth = ref(100);
const damageFlash = ref(false);
watch(
  () => hudState.value.health,
  (health) => {
    if (health < lastHealth.value && health > 0) {
      damageFlash.value = true;
      engine?.addCameraShake(1.2);
      setTimeout(() => { damageFlash.value = false; }, 300);
    }
    lastHealth.value = health;
  }
);

interface KillFeedEntry {
  killerName: string;
  victimName: string;
  time: number;
}
const killFeed = ref<KillFeedEntry[]>([]);
const KILL_FEED_DURATION_MS = 5000;
const KILL_FEED_MAX = 6;
const killFeedVisible = computed(() => [...killFeed.value].slice(-KILL_FEED_MAX).reverse());
const showHitMarker = ref(false);
const showKillConfirm = ref(false);
const roundEndTint = ref<{ winner: 'ct' | 't' } | null>(null);
const gameOver = ref<{ winner: 'ct' | 't'; players: Array<{ id: string; username: string; team: string; kills: number; deaths: number }> } | null>(null);
const sortedGameOverPlayers = computed(() => {
  if (!gameOver.value) return [];
  return [...gameOver.value.players].sort((a, b) =>
    a.team !== b.team ? (a.team === 'ct' ? -1 : 1) : b.kills - a.kills
  );
});

const scoreboardOpen = ref(false);
const pauseOpen = ref(false);
const scoreboardPlayers = ref<ServerPlayer[]>([]);
const sortedScoreboardPlayers = computed(() => {
  const list = [...scoreboardPlayers.value];
  return list.sort((a, b) => (a.team !== b.team ? (a.team === 'ct' ? -1 : 1) : b.kills - a.kills));
});

const canvasWrapRef = ref<HTMLDivElement | null>(null);
const canvasHovered = ref(false);
const { isFullscreen, toggle: toggleFullscreen } = useFullscreen(canvasWrapRef);

function applySettings() {
  const count = Math.max(BOT_COUNT_MIN, Math.min(BOT_COUNT_MAX, botCount.value));
  botCount.value = count;
  localStorage.setItem(BOT_DIFFICULTY_KEY, botDifficulty.value);
  localStorage.setItem(BOT_COUNT_KEY, String(count));
  localStorage.setItem(TRAINING_MAP_KEY, selectedMapId.value);
  engine?.stop();
  localSession?.stop();
  engine = null;
  localSession = null;
  init();
}

function onScoreboardKey(e: KeyboardEvent) {
  if (e.code === 'Tab') {
    e.preventDefault();
    scoreboardOpen.value = !scoreboardOpen.value;
  } else if (e.code === 'Escape') {
    if (gameOver.value) return;
    if (scoreboardOpen.value) {
      scoreboardOpen.value = false;
    } else if (shopOpen.value) {
      shopOpen.value = false;
    } else {
      pauseOpen.value = !pauseOpen.value;
    }
  }
}

async function init() {
  const mapId = selectedMapId.value;
  const canvas = canvasRef.value;
  if (!canvas) return;

  mapLoadError.value = null;
  gameOver.value = null;
  try {
    const map = await fetchMap(mapId);
    localSession = new LocalGameSession(map, {
      ctBotCount: 0,
      tBotCount: Math.max(0, Math.min(BOT_COUNT_MAX, botCount.value)),
      botDifficulty: botDifficulty.value,
      roundsToWin: TRAINING_ROUNDS_TO_WIN,
    });
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
        if (localSession?.reload('local')) playReload();
      },
      onSwitchWeapon: (slot) => localSession?.switchWeapon('local', slot),
      onOpenShop: () => { shopOpen.value = !shopOpen.value; },
      onHUDUpdate: (s) => { hudState.value = { ...s, roundsToWin: TRAINING_ROUNDS_TO_WIN }; },
    });

    localSession.setOnState((state) => {
      scoreboardPlayers.value = state.players;
      engine?.setServerState(
        state.players,
        state.pickups,
        { round: state.round, roundTimeLeft: state.roundTimeLeft, roundWins: state.roundWins, roundPhase: state.roundPhase }
      );
    });

    localSession.setOnShotTrail((x1, y1, x2, y2) => {
      engine?.addBulletTrail(x1, y1, x2, y2);
    });
    localSession.setOnShot((weapon) => {
      playShot(weapon);
      engine?.addMuzzleFlash();
    });
    localSession.setOnRoundEnd((winner) => {
      if (winner === 'ct') playWinCt();
      else playWinTer();
      roundEndTint.value = { winner };
      setTimeout(() => { roundEndTint.value = null; }, 1500);
    });
    localSession.setOnRoundStart(() => playGo());
    localSession.setOnPickup((type) => {
      if (type === 'ammo') playPickupAmmo();
      else if (type === 'medkit' || type === 'armor') playPickupMedkit();
    });
    localSession.setOnHit((x, y, damage) => {
      engine?.addFloatingDamage(x, y, damage);
    });
    localSession.setOnKill((killerName, victimName) => {
      showHitMarker.value = true;
      showKillConfirm.value = true;
      setTimeout(() => { showHitMarker.value = false; }, 250);
      setTimeout(() => { showKillConfirm.value = false; }, 900);
      killFeed.value.push({ killerName, victimName, time: Date.now() });
    });
    localSession.setOnGameOver((winner, players) => {
      gameOver.value = { winner, players };
      if (winner === 'ct') playWinCt();
      else playWinTer();
      engine?.stop();
    });

    localSession.start();
    engine.setFogOfWar(true);
    engine.start();
  } catch (e) {
    console.error('Failed to load map:', e);
    mapLoadError.value = 'Не удалось загрузить карту. Запустите сервер (npm run dev в папке server).';
  }
}

function buyWeapon(id: string) {
  localSession?.buyWeapon('local', id);
  shopOpen.value = false;
}

function exitGame() {
  router.push({ name: 'home' });
}

let killFeedInterval: ReturnType<typeof setInterval> | null = null;
onMounted(async () => {
  await fetchMapsList();
  init();
  killFeedInterval = setInterval(() => {
    const now = Date.now();
    killFeed.value = killFeed.value.filter((e) => now - e.time < KILL_FEED_DURATION_MS);
  }, 500);
  window.addEventListener('keydown', onScoreboardKey);
});

onUnmounted(() => {
  if (killFeedInterval) clearInterval(killFeedInterval);
  window.removeEventListener('keydown', onScoreboardKey);
  localSession?.stop();
  localSession = null;
  engine?.stop();
  engine = null;
});

watch(
  () => route.params.mapId,
  (mapId) => {
    if (mapId) {
      selectedMapId.value = mapId as string;
      localSession?.stop();
      localSession = null;
      engine?.stop();
      init();
    }
  }
);
</script>

<template>
  <div class="game-view">
    <div class="game-header">
      <h2>Тренировка</h2>
      <div class="bot-difficulty-row">
        <span class="bot-difficulty-label">Количество ботов:</span>
        <input
          v-model.number="botCount"
          type="number"
          :min="BOT_COUNT_MIN"
          :max="BOT_COUNT_MAX"
          class="input-bot-count"
        />
        <span class="bot-difficulty-label map-sep">Уровень ботов:</span>
        <label class="bot-difficulty-opt">
          <input v-model="botDifficulty" type="radio" value="easy" />
          <span>Лёгкий</span>
        </label>
        <label class="bot-difficulty-opt">
          <input v-model="botDifficulty" type="radio" value="medium" />
          <span>Средний</span>
        </label>
        <label class="bot-difficulty-opt">
          <input v-model="botDifficulty" type="radio" value="hard" />
          <span>Сложный</span>
        </label>
        <span class="bot-difficulty-label map-sep">Карта:</span>
        <select v-model="selectedMapId" class="select-map">
          <option v-for="m in mapsList" :key="m.id" :value="m.id">{{ m.name }}</option>
        </select>
        <button type="button" class="btn-cs btn-apply" @click="applySettings">Применить</button>
      </div>
      <p class="hint">WASD — движение, мышь — прицел, ЛКМ — стрельба, R — перезарядка, 1/2 — оружие, B — магазин, колёсико — зум</p>
      <div class="game-header-actions">
        <button
          type="button"
          class="btn-icon"
          :title="isMuted ? 'Включить звук' : 'Выключить звук'"
          @click="toggleMute"
        >
          {{ isMuted ? '🔇' : '🔊' }}
        </button>
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
    <div
      ref="canvasWrapRef"
      class="game-canvas-wrap"
      :class="{ 'cursor-none': canvasHovered }"
      @mouseenter="canvasHovered = true"
      @mouseleave="canvasHovered = false"
    >
      <div v-if="mapLoadError" class="map-load-error">{{ mapLoadError }}</div>
      <canvas ref="canvasRef" class="game-canvas" />
      <div v-if="pauseOpen" class="pause-overlay" @click.self="pauseOpen = false">
        <div class="pause-panel panel-cs">
          <h3 class="pause-title">Пауза</h3>
          <button type="button" class="btn-cs btn-cs-primary pause-btn" @click="pauseOpen = false">
            Продолжить (ESC)
          </button>
          <button type="button" class="btn-cs pause-btn" @click="exitGame">
            Выйти
          </button>
        </div>
      </div>
      <div v-if="killFeedVisible.length" class="kill-feed kill-feed-cs">
        <div
          v-for="(entry, i) in killFeedVisible"
          :key="i"
          class="kill-feed-entry"
        >
          <span class="kill-feed-killer">{{ entry.killerName }}</span>
          <span class="kill-feed-sep"> killed </span>
          <span class="kill-feed-victim">{{ entry.victimName }}</span>
        </div>
      </div>
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
      <div v-if="damageFlash" class="damage-flash" aria-hidden="true" />
      <div v-if="showHitMarker" class="hit-marker" aria-hidden="true">
        <span class="hit-marker-x" aria-hidden="true">✕</span>
      </div>
      <div v-if="showKillConfirm" class="kill-confirm" aria-hidden="true">
        <span class="kill-confirm-text">+300</span>
      </div>
      <div v-if="roundEndTint" class="round-end-tint" :class="roundEndTint.winner" aria-hidden="true" />
      <div v-if="gameOver" class="game-over-overlay">
        <div class="game-over-card panel-cs">
          <h2 class="game-over-title">{{ gameOver.winner === 'ct' ? 'Спецназ одержал победу!' : 'Террористы победили!' }}</h2>
          <div class="stats-table">
            <div class="stats-header">
              <span>Игрок</span>
              <span>Команда</span>
              <span>K</span>
              <span>D</span>
            </div>
            <div
              v-for="p in sortedGameOverPlayers"
              :key="p.id"
              class="stats-row"
              :class="p.team"
            >
              <span>{{ p.username }}</span>
              <span>{{ p.team === 'ct' ? 'CT' : 'T' }}</span>
              <span>{{ p.kills }}</span>
              <span>{{ p.deaths }}</span>
            </div>
          </div>
          <div class="game-over-actions">
            <button type="button" class="btn-cs btn-cs-primary" @click="init()">
              Новая игра
            </button>
            <button type="button" class="btn-cs btn-cs-secondary" @click="exitGame">
              Выйти
            </button>
          </div>
        </div>
      </div>
      <ShopModal
        :show="shopOpen"
        :credits="hudState.credits"
        :weapons="hudState.weapons"
        :armor="hudState.armor ?? 0"
        :round-phase="hudState.roundPhase"
        :teleport-to="isFullscreen && canvasWrapRef ? canvasWrapRef : null"
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
.btn-icon {
  padding: 0.35rem 0.5rem;
  background: transparent;
  border: 1px solid #555;
  border-radius: 6px;
  font-size: 1.1rem;
  cursor: pointer;
  line-height: 1;
}
.btn-icon:hover {
  background: #333;
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
.bot-difficulty-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.4rem;
}
.bot-difficulty-label {
  font-size: 0.9rem;
  color: var(--cs-text-dim);
}
.bot-difficulty-opt {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.9rem;
  cursor: pointer;
  color: #ccc;
}
.bot-difficulty-opt input { accent-color: var(--cs-orange); }
.input-bot-count {
  width: 3rem;
  margin-left: 0.35rem;
  padding: 0.2rem 0.35rem;
  font-size: 0.9rem;
  text-align: center;
  background: var(--cs-bg-secondary);
  border: 1px solid var(--cs-panel);
  color: var(--cs-text);
  border-radius: 4px;
}
.map-sep {
  margin-left: 1rem;
}
.select-map {
  padding: 0.25rem 0.5rem;
  font-size: 0.9rem;
  background: #2a2a3e;
  border: 1px solid var(--cs-panel-border);
  border-radius: 6px;
  color: #eee;
}
.btn-apply {
  padding: 0.25rem 0.6rem;
  font-size: 0.85rem;
}
.hint {
  font-size: 0.85rem;
  color: #888;
}
.kill-feed.kill-feed-cs {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 2px;
  pointer-events: none;
  font-family: Tahoma, Arial, sans-serif;
  font-size: 12px;
}
.kill-feed-entry {
  padding: 4px 10px;
  background: rgba(0, 0, 0, 0.75);
  border-left: 3px solid var(--cs-orange);
  color: var(--cs-text);
}
.kill-feed-killer {
  color: var(--cs-orange);
  font-weight: 600;
}
.kill-feed-sep {
  color: var(--cs-text-dim);
  margin: 0 4px;
}
.kill-feed-victim {
  color: #ccc;
}
.pause-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 250;
  pointer-events: auto;
}
.pause-panel {
  padding: 24px 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  min-width: 220px;
}
.pause-title {
  margin: 0 0 8px;
  font-size: 1.25rem;
  color: var(--cs-text);
}
.pause-btn {
  width: 100%;
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
.game-canvas-wrap.cursor-none {
  cursor: none;
}

.damage-flash {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 45;
  background: rgba(180, 0, 0, 0.22);
}
.hit-marker {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 46;
}
.hit-marker-x {
  font-size: 2.5rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.95);
  text-shadow: 0 0 8px rgba(0,0,0,0.9), 1px 1px 2px #000;
}
.kill-confirm {
  position: absolute;
  top: 28%;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 46;
}
.kill-confirm-text {
  font-size: 1.75rem;
  font-weight: 700;
  color: #b8e030;
  text-shadow: 0 0 10px rgba(0,0,0,0.9), 1px 1px 2px #000;
  animation: kill-confirm-pop 0.25s ease-out;
}
@keyframes kill-confirm-pop {
  from { transform: scale(0.6); opacity: 0.6; }
  to { transform: scale(1); opacity: 1; }
}
.round-end-tint {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 47;
}
.round-end-tint.ct {
  background: linear-gradient(180deg, rgba(60, 100, 180, 0.25) 0%, transparent 40%, transparent 60%, rgba(60, 100, 180, 0.2) 100%);
}
.round-end-tint.t {
  background: linear-gradient(180deg, rgba(200, 120, 40, 0.25) 0%, transparent 40%, transparent 60%, rgba(200, 120, 40, 0.2) 100%);
}

.map-load-error {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.85);
  color: #e0e0e0;
  padding: 1rem;
  text-align: center;
  z-index: 2;
}

.game-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.game-over-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1001;
}
.game-over-card {
  padding: 24px 32px;
  border: 1px solid var(--cs-panel-border, #444);
  min-width: 320px;
  text-align: center;
  font-family: Tahoma, Arial, sans-serif;
}
.game-over-title {
  margin: 0 0 16px;
  font-size: 1.25rem;
  letter-spacing: 0.1em;
  color: var(--cs-orange, #e87d2c);
}
.game-over-card .stats-table {
  margin-bottom: 1.25rem;
  text-align: left;
}
.game-over-card .stats-header {
  display: grid;
  grid-template-columns: 1fr 60px 40px 40px;
  gap: 0.5rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid #444;
  font-size: 0.85rem;
  color: #888;
}
.game-over-card .stats-row {
  display: grid;
  grid-template-columns: 1fr 60px 40px 40px;
  gap: 0.5rem;
  padding: 0.4rem 0;
  font-size: 0.95rem;
}
.game-over-card .stats-row.ct { color: #6b9bd1; }
.game-over-card .stats-row.t { color: #d4a574; }
.game-over-actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
  flex-wrap: wrap;
}
.game-over-card .btn-cs-primary,
.game-over-card .btn-cs-secondary {
  padding: 8px 24px;
}
</style>
