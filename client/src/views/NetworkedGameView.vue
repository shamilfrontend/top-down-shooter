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
const { connect, socket } = useSocket();
const roomStore = useRoomStore();
const { playShot, playReload, playWinCt, playWinTer } = useGameAudio();

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
});

const shopOpen = ref(false);

const canvasWrapRef = ref<HTMLDivElement | null>(null);
const { isFullscreen, toggle: toggleFullscreen } = useFullscreen(canvasWrapRef);

const roomId = ref<string | null>(null);
const mapId = ref('dust2');

const gameOver = ref<{ winner: 'ct' | 't'; players: Array<{ id: string; username: string; team: string; kills: number; deaths: number }> } | null>(null);

interface KillFeedEntry {
  killerName: string;
  victimName: string;
  time: number;
}
const killFeed = ref<KillFeedEntry[]>([]);
const KILL_FEED_DURATION_MS = 5000;
const KILL_FEED_MAX = 6;
const killFeedVisible = computed(() => [...killFeed.value].slice(-KILL_FEED_MAX).reverse());

const scoreboardOpen = ref(false);
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
      onHUDUpdate: (s) => { hudState.value = s; },
    });

    const onGameState = (data: { map: typeof map; players: ServerPlayer[]; pickups?: Array<{ id: string; type: string; x: number; y: number }>; round?: number; roundTimeLeft?: number; roundWins?: { ct: number; t: number } }) => {
      scoreboardPlayers.value = data.players;
      engine?.setServerState(data.players, data.pickups, data.round != null ? { round: data.round, roundTimeLeft: data.roundTimeLeft ?? 180, roundWins: data.roundWins } : undefined);
    };
    const onGameUpdate = (data: { players: ServerPlayer[]; pickups?: Array<{ id: string; type: string; x: number; y: number }>; round?: number; roundTimeLeft?: number; roundWins?: { ct: number; t: number } }) => {
      scoreboardPlayers.value = data.players;
      engine?.setServerState(data.players, data.pickups, data.round != null ? { round: data.round, roundTimeLeft: data.roundTimeLeft ?? 180, roundWins: data.roundWins } : undefined);
    };
    const onGameEvent = (data: {
      type: string;
      playerId?: string;
      weapon?: string;
      winner?: 'ct' | 't';
      players?: Array<{ id: string; username: string; team: string; kills: number; deaths: number }>;
      trail?: { x1: number; y1: number; x2: number; y2: number };
      killerName?: string;
      victimName?: string;
    }) => {
      if (data.type === 'shot') {
        if (data.weapon) playShot(data.weapon);
        if (data.trail && engine) engine.addBulletTrail(data.trail.x1, data.trail.y1, data.trail.x2, data.trail.y2);
      } else if (data.type === 'reloadStart') {
        playReload();
      } else if (data.type === 'kill') {
        killFeed.value.push({
          killerName: data.killerName ?? '?',
          victimName: data.victimName ?? '?',
          time: Date.now(),
        });
      } else if (data.type === 'roundEnd') {
        if (data.winner === 'ct') playWinCt();
        else if (data.winner === 't') playWinTer();
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
    scoreboardOpen.value = false;
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
      <p class="hint">WASD — движение, мышь — прицел, ЛКМ — стрельба, R — перезарядка, 1/2 — оружие, B — магазин</p>
      <div class="game-header-actions">
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
    <div ref="canvasWrapRef" class="game-canvas-wrap">
      <canvas ref="canvasRef" class="game-canvas" />
      <div v-if="killFeedVisible.length" class="kill-feed">
        <div
          v-for="(entry, i) in killFeedVisible"
          :key="i"
          class="kill-feed-entry"
        >
          <span class="kill-feed-killer">{{ entry.killerName }}</span>
          <span class="kill-feed-sep"> → </span>
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
      <ShopModal
        :show="shopOpen"
        :credits="hudState.credits"
        :weapons="hudState.weapons"
        @close="shopOpen = false"
        @buy="(id) => { socket?.emit('player:buy', id); shopOpen = false; }"
      />
      <div v-if="gameOver" class="game-over-overlay">
        <div class="game-over-card panel-cs">
          <h2 class="game-over-title">{{ gameOver.winner === 'ct' ? 'CT' : 'T' }} ПОБЕДИЛИ!</h2>
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
.kill-feed-sep {
  color: var(--cs-text-dim);
  margin: 0 4px;
}
.kill-feed-victim {
  color: #ccc;
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
