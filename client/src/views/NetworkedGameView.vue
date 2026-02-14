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
      engine?.setServerState(data.players, data.pickups, data.round != null ? { round: data.round, roundTimeLeft: data.roundTimeLeft ?? 180, roundWins: data.roundWins } : undefined);
    };
    const onGameUpdate = (data: { players: ServerPlayer[]; pickups?: Array<{ id: string; type: string; x: number; y: number }>; round?: number; roundTimeLeft?: number; roundWins?: { ct: number; t: number } }) => {
      engine?.setServerState(data.players, data.pickups, data.round != null ? { round: data.round, roundTimeLeft: data.roundTimeLeft ?? 180, roundWins: data.roundWins } : undefined);
    };
    const onGameEvent = (data: { type: string; playerId?: string; weapon?: string; winner?: 'ct' | 't'; players?: Array<{ id: string; username: string; team: string; kills: number; deaths: number }>; trail?: { x1: number; y1: number; x2: number; y2: number } }) => {
      if (data.type === 'shot') {
        if (data.weapon) playShot(data.weapon);
        if (data.trail && engine) engine.addBulletTrail(data.trail.x1, data.trail.y1, data.trail.x2, data.trail.y2);
      } else if (data.type === 'reloadStart') {
        playReload();
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

onMounted(init);

onUnmounted(() => {
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
        <button type="button" class="btn-exit" @click="exitToLobby">Выйти</button>
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
      <GameHUD v-bind="hudState" />
      <ShopModal
        :show="shopOpen"
        :credits="hudState.credits"
        :weapons="hudState.weapons"
        @close="shopOpen = false"
        @buy="(id) => { socket?.emit('player:buy', id); shopOpen = false; }"
      />
      <div v-if="gameOver" class="game-over-overlay">
        <div class="game-over-card">
          <h2>{{ gameOver.winner === 'ct' ? 'CT' : 'T' }} победили!</h2>
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
          <button type="button" class="btn-exit" @click="exitToLobby">
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
.game-header-actions .btn-exit {
  padding: 0.35rem 0.8rem;
  font-size: 0.9rem;
  font-weight: 500;
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
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1001;
}
.game-over-card {
  background: #1e1e32;
  border: 1px solid #444;
  border-radius: 12px;
  padding: 1.5rem 2rem;
  min-width: 320px;
  text-align: center;
}
.game-over-card h2 {
  margin: 0 0 1rem;
  font-size: 1.5rem;
  color: #6b9bd1;
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
.btn-exit {
  padding: 0.6rem 2rem;
  background: #4a90d9;
  border: none;
  border-radius: 8px;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}
.btn-exit:hover {
  background: #5a9fe9;
}
</style>
