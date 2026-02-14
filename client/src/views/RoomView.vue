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
      <h1>{{ room.currentRoom?.name }}</h1>
      <div class="header-actions">
        <span class="map-badge">{{ room.currentRoom?.map }}</span>
        <button class="btn-leave" @click="leave">Выйти</button>
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
            class="player-row"
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
            class="player-row"
            :class="{ host: p.isHost, ready: p.isReady }"
          >
            <span class="player-name">{{ p.username }}</span>
            <span v-if="p.isHost" class="badge">Хост</span>
            <span v-else-if="p.isReady" class="badge ready">Готов</span>
          </div>
        </div>
      </div>

      <div v-if="isHost" class="bots-section">
        <h4>Боты</h4>
        <label class="bots-toggle">
          <input type="checkbox" :checked="bots.enabled" @change="toggleBots" />
          <span>Включить ботов</span>
        </label>
        <div v-if="bots.enabled" class="bots-options">
          <div class="bots-row">
            <span>Количество:</span>
            <input type="number" min="0" max="8" :value="bots.count" @input="setBotCount(+(($event.target as HTMLInputElement).value) || 0)" />
          </div>
          <div class="bots-row">
            <span>Сложность:</span>
            <select :value="bots.difficulty" @change="setBotDifficulty(($event.target as HTMLSelectElement).value as 'easy'|'medium'|'hard')">
              <option value="easy">Лёгкая</option>
              <option value="medium">Средняя</option>
              <option value="hard">Сложная</option>
            </select>
          </div>
        </div>
      </div>

      <div class="controls">
        <button class="btn-ready" @click="toggleReady">
          {{ room.currentRoom?.players.find((p) => p.socketId === socket?.id)?.isReady ? 'Отменить готовность' : 'Готов' }}
        </button>
        <button
          v-if="isHost"
          class="btn-start"
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: #1e1e32;
}
.map-badge {
  color: #888;
  margin-right: 1rem;
}
.btn-leave {
  padding: 0.5rem 1rem;
  background: transparent;
  border: 1px solid #555;
  border-radius: 6px;
  color: #eee;
  cursor: pointer;
}
.error-banner {
  background: #5a2020;
  color: #ff9999;
  padding: 0.75rem 1rem;
  text-align: center;
}
.room-content {
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
}
.teams {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin-bottom: 2rem;
}
.team h3 {
  margin-bottom: 0.75rem;
  font-size: 1rem;
}
.team-ct h3 {
  color: #6b9bd1;
}
.team-t h3 {
  color: #d4a574;
}
.player-row {
  padding: 0.5rem;
  background: #252540;
  border-radius: 6px;
  margin-bottom: 0.25rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.player-row.ready {
  border-left: 3px solid #4caf50;
}
.badge {
  font-size: 0.75rem;
  color: #888;
}
.badge.ready {
  color: #4caf50;
}
.bots-section {
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: #252540;
  border-radius: 8px;
}
.bots-section h4 {
  margin: 0 0 0.75rem;
  font-size: 0.95rem;
}
.bots-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}
.bots-options {
  margin-top: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.bots-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.bots-row input[type="number"] {
  width: 4rem;
  padding: 0.25rem;
  background: #1e1e32;
  border: 1px solid #444;
  border-radius: 4px;
  color: #eee;
}
.bots-row select {
  padding: 0.25rem 0.5rem;
  background: #1e1e32;
  border: 1px solid #444;
  border-radius: 4px;
  color: #eee;
}

.controls {
  display: flex;
  gap: 1rem;
  justify-content: center;
}
.btn-ready,
.btn-start {
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  border: none;
  font-weight: 600;
  cursor: pointer;
}
.btn-ready {
  background: #333;
  color: #eee;
}
.btn-start {
  background: #4a90d9;
  color: #fff;
}
.btn-start:disabled {
  background: #333;
  color: #666;
  cursor: not-allowed;
}
</style>
