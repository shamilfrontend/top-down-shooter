<script setup lang="ts">
import { onMounted, onUnmounted, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useRoomStore } from '@/stores/room';
import { useSocket } from '@/composables/useSocket';
const router = useRouter();
const room = useRoomStore();
const { connect, socket } = useSocket();

const isHost = computed(() => {
  const s = socket.value;
  const r = room.currentRoom;
  if (!s || !r) return false;
  return r.hostId === s.id;
});

onMounted(() => {
  if (!room.currentRoom) {
    router.push({ name: 'lobby' });
    return;
  }
  connect();
  const cleanup = room.setupListeners();
  onUnmounted(cleanup);
});

watch(
  () => room.currentRoom,
  (r) => {
    if (!r) {
      router.push({ name: 'lobby' });
    } else if (r.status === 'playing') {
      router.push({ name: 'networked-game', params: { roomId: r.id } });
    }
  }
);

function leave() {
  room.leaveRoom();
  router.push({ name: 'lobby' });
}

function toggleReady() {
  const me = room.currentRoom?.players.find(
    (p) => p.socketId === socket.value?.id
  );
  room.setReady(!me?.isReady);
}

const bots = computed(() => room.currentRoom?.bots ?? { enabled: false, difficulty: 'medium' as const, count: 1 });

function canStart() {
  if (!isHost.value || !room.currentRoom) return false;
  const allReady = room.currentRoom.players.every((p) => p.isReady || p.isHost);
  const minPlayers = bots.value.enabled && bots.value.count > 0 ? 1 : 2;
  return room.currentRoom.players.length >= minPlayers && allReady;
}

function toggleBots() {
  room.changeBots({ enabled: !bots.value.enabled });
}

function setBotCount(n: number) {
  room.changeBots({ count: Math.max(0, Math.min(8, n)) });
}

function setBotDifficulty(d: 'easy' | 'medium' | 'hard') {
  room.changeBots({ difficulty: d });
}
</script>

<template>
  <div class="room-view">
    <header class="header">
      <div class="header-orange"></div>
      <h1 class="title">{{ room.currentRoom?.name }}</h1>
      <div class="header-actions">
        <span class="map-badge">{{ room.currentRoom?.map }}</span>
        <button type="button" class="btn-cs" @click="leave">Выйти</button>
      </div>
    </header>

    <div v-if="room.error" class="error-banner">
      {{ room.error }}
    </div>

    <main class="room-content">
      <div class="teams">
        <div class="team team-ct">
          <h3>CT ({{ room.currentRoom?.teams.ct.length ?? 0 }})</h3>
          <div
            v-for="p in room.currentRoom?.teams.ct"
            :key="p.socketId"
            class="player-row panel-cs"
            :class="{ host: p.isHost, ready: p.isReady }"
          >
            <span class="player-name">{{ p.username }}</span>
            <span v-if="p.isHost" class="badge">Хост</span>
            <span v-else-if="p.isReady" class="badge ready">Готов</span>
          </div>
        </div>
        <div class="team team-t">
          <h3>T ({{ room.currentRoom?.teams.t.length ?? 0 }})</h3>
          <div
            v-for="p in room.currentRoom?.teams.t"
            :key="p.socketId"
            class="player-row panel-cs"
            :class="{ host: p.isHost, ready: p.isReady }"
          >
            <span class="player-name">{{ p.username }}</span>
            <span v-if="p.isHost" class="badge">Хост</span>
            <span v-else-if="p.isReady" class="badge ready">Готов</span>
          </div>
        </div>
      </div>

      <div v-if="isHost" class="bots-section panel-cs">
        <h4>Боты</h4>
        <label class="bots-toggle">
          <input type="checkbox" :checked="bots.enabled" @change="toggleBots" />
          <span>Включить ботов</span>
        </label>
        <div v-if="bots.enabled" class="bots-options">
          <div class="bots-row">
            <span>Количество:</span>
            <input type="number" min="0" max="8" class="input-cs" :value="bots.count" @input="setBotCount(+(($event.target as HTMLInputElement).value) || 0)" />
          </div>
          <div class="bots-row">
            <span>Сложность:</span>
            <select class="select-cs" :value="bots.difficulty" @change="setBotDifficulty(($event.target as HTMLSelectElement).value as 'easy'|'medium'|'hard')">
              <option value="easy">Лёгкая</option>
              <option value="medium">Средняя</option>
              <option value="hard">Сложная</option>
            </select>
          </div>
        </div>
      </div>

      <div class="controls">
        <button type="button" class="btn-cs" @click="toggleReady">
          {{ room.currentRoom?.players.find((p) => p.socketId === socket?.id)?.isReady ? 'Отменить готовность' : 'Готов' }}
        </button>
        <button
          v-if="isHost"
          type="button"
          class="btn-cs btn-cs-primary"
          :disabled="!canStart()"
          @click="room.startGame"
        >
          Начать игру
        </button>
      </div>
    </main>
  </div>
</template>

<style scoped>
.room-view {
  min-height: 100vh;
}
.header {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  background: var(--cs-bg-secondary);
  border-bottom: 1px solid var(--cs-panel-border);
}
.header-orange {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: var(--cs-orange);
}
.title {
  font-size: 18px;
  letter-spacing: 0.05em;
  margin-left: 12px;
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.map-badge {
  color: var(--cs-text-dim);
  font-size: 13px;
}
.error-banner {
  background: #3a1515;
  color: var(--cs-orange);
  padding: 8px 16px;
  text-align: center;
  border-bottom: 1px solid #5a2020;
}
.room-content {
  padding: 24px;
  max-width: 800px;
  margin: 0 auto;
}
.teams {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 24px;
}
.team h3 {
  margin-bottom: 8px;
  font-size: 14px;
  letter-spacing: 0.05em;
}
.team-ct h3 {
  color: #6b9bd1;
}
.team-t h3 {
  color: #d4a574;
}
.player-row {
  padding: 8px 12px;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--cs-panel-border);
}
.player-row.ready {
  border-left: 3px solid #4caf50;
  padding-left: 10px;
}
.badge {
  font-size: 12px;
  color: var(--cs-text-dim);
}
.badge.ready {
  color: #4caf50;
}
.bots-section {
  margin-bottom: 20px;
  padding: 14px;
  border: 1px solid var(--cs-panel-border);
}
.bots-section h4 {
  margin: 0 0 10px;
  font-size: 13px;
}
.bots-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px;
}
.bots-options {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.bots-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}
.bots-row .input-cs {
  width: 64px;
}

.controls {
  display: flex;
  gap: 12px;
  justify-content: center;
}
.btn-cs:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  color: var(--cs-text-dim);
}
.btn-cs:disabled:hover {
  background: var(--cs-panel);
  color: var(--cs-text-dim);
  border-color: var(--cs-bevel-light);
}
</style>
