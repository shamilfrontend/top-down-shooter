<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import GameHUD from '@/components/GameHUD.vue';
import ShopModal from '@/components/ShopModal.vue';
import { useRoute, useRouter } from 'vue-router';
import { useMaps } from '@/composables/useMaps';
import { useSocket } from '@/composables/useSocket';
import { useGameAudio } from '@/composables/useGameAudio';
import { useFullscreen } from '@/composables/useFullscreen';
import { useRoomStore } from '@/stores/room';
import { GameEngine } from '@/game/GameEngine';
import type { ServerPlayer } from '@/game/GameEngine';

const route = useRoute();
const router = useRouter();
const { fetchMap } = useMaps();
const { connect, socket, pingMs, isConnected } = useSocket();
const roomStore = useRoomStore();
const { playShot, playReload, playWinCt, playWinTer, playPickupAmmo, playPickupMedkit, playGo, isMuted, toggleMute } = useGameAudio();
const lastRound = ref<number | null>(null);

const canvasRef = ref<HTMLCanvasElement | null>(null);
let engine: GameEngine | null = null;

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
  roundPhase: 'playing' as 'playing' | 'ended',
  isAlive: true,
});

const shopOpen = ref(false);

const lastHealth = ref(100);
const damageFlash = ref(false);
watch(
  () => hudState.value.health,
  (health) => {
    if (health < lastHealth.value && health > 0 && hudState.value.isAlive !== false) {
      damageFlash.value = true;
      engine?.addCameraShake(1.2);
      setTimeout(() => { damageFlash.value = false; }, 300);
    }
    lastHealth.value = health;
  }
);

const canvasWrapRef = ref<HTMLDivElement | null>(null);
const canvasHovered = ref(false);
const { isFullscreen, toggle: toggleFullscreen } = useFullscreen(canvasWrapRef);

const roomId = ref<string | null>(null);
const mapId = ref('dust2');

const gameOver = ref<{ winner: 'ct' | 't'; players: Array<{ id: string; username: string; team: string; kills: number; deaths: number }> } | null>(null);

interface KillFeedEntry {
  killerName: string;
  victimName: string;
  weapon?: string;
  time: number;
}
const killFeed = ref<KillFeedEntry[]>([]);
const KILL_FEED_DURATION_MS = 5000;
const KILL_FEED_MAX = 6;
const killFeedVisible = computed(() => [...killFeed.value].slice(-KILL_FEED_MAX).reverse());
function weaponShort(w?: string): string {
  if (!w) return '';
  return w === 'usp' ? 'USP' : w.toUpperCase();
}

const scoreboardOpen = ref(false);
const pauseOpen = ref(false);
const scoreboardPlayers = ref<ServerPlayer[]>([]);
const sortedScoreboardPlayers = computed(() => {
  const list = [...scoreboardPlayers.value];
  return list.sort((a, b) => (a.team !== b.team ? (a.team === 'ct' ? -1 : 1) : b.kills - a.kills));
});

const sortedGameOverPlayers = computed(() => {
  if (!gameOver.value) return [];
  return [...gameOver.value.players].sort((a, b) => {
    if (a.team !== b.team) return a.team === 'ct' ? -1 : 1;
    return b.kills - a.kills;
  });
});

const roundStartOverlay = ref<{ round: number } | null>(null);
const showHitMarker = ref(false);
const showKillConfirm = ref(false);
const roundEndTint = ref<{ winner: 'ct' | 't' } | null>(null);

function exitToLobby() {
  roomStore.leaveRoom();
  gameOver.value = null;
  router.push({ name: 'lobby' });
}

async function init() {
  roomId.value = (route.params.roomId as string) || null;
  const canvas = canvasRef.value;
  if (!canvas || !roomId.value) {
    router.push({ name: 'lobby' });
    return;
  }

  connect();
  roomStore.setupListeners();

  const room = roomStore.currentRoom;
  if (!room) {
    const mapIdFromRoute = route.query.mapId as string;
    mapId.value = mapIdFromRoute || 'dust2';
  } else {
    mapId.value = room.map;
  }

  try {
    const map = await fetchMap(mapId.value);
    const mySocketId = socket.value?.id ?? 'local';
    engine = new GameEngine({
      canvas,
      map,
      localPlayerId: mySocketId,
      networked: true,
      onInput: (state) => {
        socket.value?.emit('player:move', {
          up: state.up ?? false,
          down: state.down ?? false,
          left: state.left ?? false,
          right: state.right ?? false,
          angle: state.angle,
        });
      },
      onShoot: () => socket.value?.emit('player:shoot'),
      onReload: () => socket.value?.emit('player:reload'),
      onSwitchWeapon: (slot) => socket.value?.emit('player:switchWeapon', slot),
      onOpenShop: () => { shopOpen.value = !shopOpen.value; },
      onHUDUpdate: (s) => { hudState.value = { ...hudState.value, ...s }; },
    });

    function applyRoundSound(round: number | undefined) {
      if (typeof round !== 'number') return;
      if (lastRound.value != null && round > lastRound.value) playGo();
      lastRound.value = round;
    }
    const onGameState = (data: { map: typeof map; players: ServerPlayer[]; pickups?: Array<{ id: string; type: string; x: number; y: number }>; round?: number; roundTimeLeft?: number; roundWins?: { ct: number; t: number }; roundPhase?: 'playing' | 'ended' }) => {
      scoreboardPlayers.value = data.players;
      engine?.setServerState(data.players, data.pickups, data.round != null ? { round: data.round, roundTimeLeft: data.roundTimeLeft ?? 180, roundWins: data.roundWins, roundPhase: data.roundPhase } : undefined);
      applyRoundSound(data.round);
    };
    const onGameUpdate = (data: { players: ServerPlayer[]; pickups?: Array<{ id: string; type: string; x: number; y: number }>; round?: number; roundTimeLeft?: number; roundWins?: { ct: number; t: number }; roundPhase?: 'playing' | 'ended' }) => {
      scoreboardPlayers.value = data.players;
      engine?.setServerState(data.players, data.pickups, data.round != null ? { round: data.round, roundTimeLeft: data.roundTimeLeft ?? 180, roundWins: data.roundWins, roundPhase: data.roundPhase } : undefined);
      applyRoundSound(data.round);
    };
    const onGameEvent = (data: {
      type: string;
      playerId?: string;
      weapon?: string;
      winner?: 'ct' | 't';
      round?: number;
      players?: Array<{ id: string; username: string; team: string; kills: number; deaths: number }>;
      trail?: { x1: number; y1: number; x2: number; y2: number };
      killer?: string;
      victim?: string;
      killerName?: string;
      victimName?: string;
      x?: number;
      y?: number;
      damage?: number;
      attackerId?: string;
      victimId?: string;
    }) => {
      if (data.type === 'shot') {
        if (data.weapon) playShot(data.weapon);
        if (data.playerId === mySocketId) engine?.addMuzzleFlash();
        if (data.trail && engine) engine.addBulletTrail(data.trail.x1, data.trail.y1, data.trail.x2, data.trail.y2);
      } else if (data.type === 'hit' && typeof data.x === 'number' && typeof data.y === 'number' && typeof data.damage === 'number') {
        engine?.addFloatingDamage(data.x, data.y, data.damage);
      } else if (data.type === 'reloadStart') {
        playReload();
      } else if (data.type === 'kill') {
        if (data.killer === mySocketId) {
          showHitMarker.value = true;
          showKillConfirm.value = true;
          setTimeout(() => { showHitMarker.value = false; }, 250);
          setTimeout(() => { showKillConfirm.value = false; }, 900);
        }
        killFeed.value.push({
          killerName: data.killerName ?? '?',
          victimName: data.victimName ?? '?',
          weapon: data.weapon,
          time: Date.now(),
        });
      } else if (data.type === 'roundEnd' && (data.winner === 'ct' || data.winner === 't')) {
        if (data.winner === 'ct') playWinCt();
        else playWinTer();
        roundEndTint.value = { winner: data.winner };
        setTimeout(() => { roundEndTint.value = null; }, 1500);
      } else if (data.type === 'roundStart' && typeof data.round === 'number') {
        roundStartOverlay.value = { round: data.round };
        setTimeout(() => { roundStartOverlay.value = null; }, 2200);
      } else if (data.type === 'pickupAmmo' && data.playerId === mySocketId) {
        playPickupAmmo();
      } else if ((data.type === 'pickupMedkit' || data.type === 'pickupArmor') && data.playerId === mySocketId) {
        playPickupMedkit();
      } else if (data.type === 'gameOver' && data.winner && data.players) {
        gameOver.value = { winner: data.winner, players: data.players };
      }
    };

    socket.value?.on('game:state', onGameState);
    socket.value?.on('game:update', onGameUpdate);
    socket.value?.on('game:event', onGameEvent);

    engine.setFogOfWar(true);
    engine.start();

    onUnmounted(() => {
      socket.value?.off('game:state', onGameState);
      socket.value?.off('game:update', onGameUpdate);
      socket.value?.off('game:event', onGameEvent);
    });
  } catch (e) {
    console.error('Failed to init networked game:', e);
    router.push({ name: 'lobby' });
  }
}

let killFeedInterval: ReturnType<typeof setInterval> | null = null;
function onScoreboardKey(e: KeyboardEvent) {
  if (e.code === 'Tab') {
    e.preventDefault();
    scoreboardOpen.value = !scoreboardOpen.value;
  } else if (e.code === 'Escape') {
    if (scoreboardOpen.value) {
      scoreboardOpen.value = false;
    } else if (!gameOver.value) {
      pauseOpen.value = !pauseOpen.value;
    }
  }
}
onMounted(() => {
  init();
  killFeedInterval = setInterval(() => {
    const now = Date.now();
    killFeed.value = killFeed.value.filter((e) => now - e.time < KILL_FEED_DURATION_MS);
  }, 500);
  window.addEventListener('keydown', onScoreboardKey);
});

onUnmounted(() => {
  window.removeEventListener('keydown', onScoreboardKey);
  if (killFeedInterval) clearInterval(killFeedInterval);
  engine?.stop();
  engine = null;
});

watch(() => route.params.roomId, () => {
  engine?.stop();
  init();
});
</script>

<template>
  <div class="game-view">
    <div class="game-header">
      <h2>Сетевая игра</h2>
      <p class="hint">WASD — движение, мышь — прицел, ЛКМ — стрельба, R — перезарядка, 1/2 — оружие, B — магазин, колёсико — зум, ESC — пауза</p>
      <div class="game-header-actions">
        <span v-if="pingMs != null" class="ping-display" title="Задержка до сервера">{{ pingMs }} ms</span>
        <button
          type="button"
          class="btn-icon"
          :title="isMuted ? 'Включить звук' : 'Выключить звук'"
          @click="toggleMute"
        >
          {{ isMuted ? '🔇' : '🔊' }}
        </button>
        <button type="button" class="btn-cs" @click="exitToLobby">Выйти</button>
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
      <canvas ref="canvasRef" class="game-canvas" />
      <div v-if="killFeedVisible.length" class="kill-feed kill-feed-cs">
        <TransitionGroup name="kill-feed-slide">
          <div
            v-for="(entry, i) in killFeedVisible"
            :key="entry.time + i"
            class="kill-feed-entry"
          >
            <span class="kill-feed-killer">{{ entry.killerName }}</span>
            <span class="kill-feed-weapon">{{ weaponShort(entry.weapon) }}</span>
            <span class="kill-feed-victim">{{ entry.victimName }}</span>
          </div>
        </TransitionGroup>
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
      <GameHUD v-bind="hudState" :rounds-to-win="roomStore.currentRoom?.roundsToWin" />
      <div v-if="hudState.isAlive === false" class="dead-overlay">
        <span class="dead-text">Вы мертвы</span>
        <span class="dead-hint">Наблюдаете за союзником до следующего раунда</span>
        <span v-if="hudState.roundPhase === 'ended' && hudState.roundTimeLeft != null" class="dead-respawn-timer">
          След. раунд через {{ Math.floor((hudState.roundTimeLeft ?? 0) / 60) }}:{{ String((hudState.roundTimeLeft ?? 0) % 60).padStart(2, '0') }}
        </span>
      </div>
      <div v-if="damageFlash" class="damage-flash" aria-hidden="true" />
      <div v-if="showHitMarker" class="hit-marker" aria-hidden="true">
        <span class="hit-marker-x" aria-hidden="true">✕</span>
      </div>
      <div v-if="showKillConfirm" class="kill-confirm" aria-hidden="true">
        <span class="kill-confirm-text">+300</span>
      </div>
      <div v-if="roundEndTint" class="round-end-tint" :class="roundEndTint.winner" aria-hidden="true" />
      <div v-if="roundStartOverlay" class="round-start-overlay" aria-hidden="true">
        <span class="round-start-text">Раунд {{ roundStartOverlay.round }}</span>
      </div>
      <div v-if="roomId && !isConnected" class="reconnect-overlay">
        <span class="reconnect-text">Соединение потеряно</span>
        <span class="reconnect-hint">Ожидание переподключения…</span>
      </div>
      <div v-if="pauseOpen && !gameOver" class="pause-overlay" @click.self="pauseOpen = false">
        <div class="pause-panel panel-cs">
          <h3 class="pause-title">Пауза</h3>
          <button type="button" class="btn-cs btn-cs-primary pause-btn" @click="pauseOpen = false">
            Продолжить (ESC)
          </button>
          <button type="button" class="btn-cs pause-btn" @click="exitToLobby">
            Выйти в лобби
          </button>
        </div>
      </div>
      <ShopModal
        :show="shopOpen"
        :credits="hudState.credits"
        :weapons="hudState.weapons"
        :teleport-to="isFullscreen && canvasWrapRef ? canvasWrapRef : null"
        @close="shopOpen = false"
        @buy="(id) => { socket?.emit('player:buy', id); shopOpen = false; }"
      />
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
          <button type="button" class="btn-cs btn-cs-primary" @click="exitToLobby">
            Выход
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.game-view {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--cs-bg);
}
.game-header {
  position: relative;
  padding: 0.75rem 1rem;
  background: var(--cs-bg-secondary);
  border-bottom: 1px solid var(--cs-panel-border);
}
.dead-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  pointer-events: none;
  z-index: 50;
  background: rgba(0, 0, 0, 0.4);
  font-family: Tahoma, Arial, sans-serif;
}
.dead-text {
  font-size: 1.75rem;
  font-weight: 700;
  color: #c03030;
  text-shadow: 0 0 12px rgba(0, 0, 0, 0.9), 1px 1px 0 #000;
}
.dead-hint {
  font-size: 0.9rem;
  color: var(--cs-text-dim);
}
.dead-respawn-timer {
  margin-top: 6px;
  font-size: 1rem;
  font-weight: 700;
  color: var(--cs-orange);
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
.round-start-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 48;
}
.round-start-text {
  font-size: 2rem;
  font-weight: 700;
  color: var(--cs-orange);
  text-shadow: 0 0 12px rgba(0, 0, 0, 0.9), 1px 1px 0 #000;
  font-family: Tahoma, Arial, sans-serif;
}
.reconnect-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: rgba(0, 0, 0, 0.75);
  z-index: 200;
  pointer-events: none;
  font-family: Tahoma, Arial, sans-serif;
}
.reconnect-text {
  font-size: 1.25rem;
  font-weight: 700;
  color: #e0a030;
}
.reconnect-hint {
  font-size: 0.9rem;
  color: var(--cs-text-dim);
}
.pause-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 150;
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
.kill-feed {
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
.kill-feed-weapon {
  margin: 0 6px;
  font-size: 0.75em;
  color: var(--cs-text-dim);
}
.kill-feed-victim {
  color: #ccc;
}
.kill-feed-slide-enter-active,
.kill-feed-slide-leave-active {
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.kill-feed-slide-enter-from {
  transform: translateX(24px);
  opacity: 0;
}
.kill-feed-slide-leave-to {
  transform: translateX(-12px);
  opacity: 0;
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
.game-header-actions {
  position: absolute;
  top: 0.5rem;
  right: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.ping-display {
  font-size: 12px;
  color: var(--cs-text-dim);
  font-variant-numeric: tabular-nums;
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
.game-header-actions .btn-cs {
  padding: 0.35rem 0.8rem;
  font-size: 0.9rem;
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
.game-canvas-wrap {
  flex: 1;
  position: relative;
  min-height: 400px;
}
.game-canvas-wrap.cursor-none {
  cursor: none;
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
  border: 1px solid var(--cs-panel-border);
  min-width: 320px;
  text-align: center;
  font-family: Tahoma, Arial, sans-serif;
}
.game-over-title {
  margin: 0 0 16px;
  font-size: 1.25rem;
  letter-spacing: 0.1em;
  color: var(--cs-orange);
}
.stats-table {
  margin-bottom: 1.25rem;
  text-align: left;
}
.stats-header {
  display: grid;
  grid-template-columns: 1fr 60px 40px 40px;
  gap: 0.5rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid #444;
  font-size: 0.85rem;
  color: #888;
}
.stats-row {
  display: grid;
  grid-template-columns: 1fr 60px 40px 40px;
  gap: 0.5rem;
  padding: 0.4rem 0;
  font-size: 0.95rem;
}
.stats-row.ct { color: #6b9bd1; }
.stats-row.t { color: #d4a574; }
.game-over-card .btn-cs-primary {
  margin-top: 8px;
  padding: 8px 24px;
}
</style>
