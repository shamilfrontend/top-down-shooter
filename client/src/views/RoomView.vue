<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
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

const slots = computed(() => room.currentRoom?.slots ?? []);
const pending = computed(() => room.currentRoom?.pending ?? []);
const half = computed(() => Math.floor(slots.value.length / 2));
const slotsCt = computed(() => slots.value.slice(0, half.value));
const slotsT = computed(() => slots.value.slice(half.value));

const iAmPending = computed(() => pending.value.some((p) => p.socketId === socket.value?.id));
const mySlotIndex = computed(() => room.currentRoom?.slots?.findIndex((s) => s.player?.socketId === socket.value?.id) ?? -1);
const iHaveSlot = computed(() => mySlotIndex.value >= 0);
const myReady = computed(() => {
  const idx = mySlotIndex.value;
  if (idx < 0) return false;
  return room.currentRoom?.slots?.[idx]?.player?.isReady ?? false;
});

const addBotSlotIndex = ref<number | null>(null);

const difficultyLabels: Record<'easy' | 'medium' | 'hard', string> = {
  easy: 'Лёгкая',
  medium: 'Средняя',
  hard: 'Сложная',
};

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
  room.setReady(!myReady.value);
}

function canStart() {
  if (!isHost.value || !room.currentRoom) return false;
  const filled = room.currentRoom.slots.filter((s) => s.player !== null || s.bot !== null).length;
  if (filled < 2) return false;
  const allReady = room.currentRoom.slots.every(
    (s) => !s.player || s.player.socketId === room.currentRoom!.hostId || s.player.isReady
  );
  return allReady;
}

function addBot(slotIndex: number, difficulty: 'easy' | 'medium' | 'hard') {
  room.addBot(slotIndex, difficulty);
  addBotSlotIndex.value = null;
}
</script>

<template>
  <div class="room-view">
    <header class="header">
      <div class="header-orange"></div>
      <h1 class="title">{{ room.currentRoom?.name }}</h1>
      <div class="header-actions">
        <span class="map-badge">{{ room.currentRoom?.map }} · {{ room.currentRoom?.maxPlayers }} слотов · до {{ room.currentRoom?.roundsToWin }} побед</span>
        <button type="button" class="btn-cs" @click="leave">Выйти</button>
      </div>
    </header>

    <div v-if="room.error" class="error-banner" @click="room.clearError" role="button" tabindex="0">
      {{ room.error }} ×
    </div>

    <main class="room-content">
      <p v-if="iAmPending" class="pending-hint">Выберите слот в одной из команд</p>
      <p v-if="pending.length && !iAmPending" class="pending-list">
        Ожидают выбора: {{ pending.map((p) => p.username).join(', ') }}
      </p>

      <div class="teams">
        <div class="team team-ct">
          <h3>Спецназ</h3>
          <div v-for="(slot, idx) in slotsCt" :key="'ct-' + idx" class="slot-row panel-cs">
            <template v-if="slot.player">
              <span class="player-name">{{ slot.player.username }}</span>
              <span v-if="slot.player.socketId === room.currentRoom?.hostId" class="badge">Хост</span>
              <span v-else-if="slot.player.isReady" class="badge ready">Готов</span>
            </template>
            <template v-else-if="slot.bot">
              <span class="player-name bot-name">Бот ({{ difficultyLabels[slot.bot.difficulty] }})</span>
              <button
                v-if="isHost"
                type="button"
                class="btn-remove-bot"
                title="Удалить"
                @click="room.removeBot(idx)"
              >×</button>
            </template>
            <template v-else>
              <span class="slot-empty">Пусто</span>
              <button
                v-if="iAmPending"
                type="button"
                class="btn-cs btn-slot-take"
                @click="room.takeSlot(idx)"
              >
                Выбрать
              </button>
              <template v-else-if="isHost">
                <button
                  type="button"
                  class="btn-cs btn-add-bot"
                  @click="addBotSlotIndex = addBotSlotIndex === idx ? null : idx"
                >
                  Добавить бота
                </button>
                <div v-if="addBotSlotIndex === idx" class="add-bot-levels">
                  <button type="button" class="btn-cs btn-level" @click="addBot(idx, 'easy')">Лёгкая</button>
                  <button type="button" class="btn-cs btn-level" @click="addBot(idx, 'medium')">Средняя</button>
                  <button type="button" class="btn-cs btn-level" @click="addBot(idx, 'hard')">Сложная</button>
                </div>
              </template>
            </template>
          </div>
        </div>
        <div class="team team-t">
          <h3>Террористы</h3>
          <div v-for="(slot, idx) in slotsT" :key="'t-' + idx" class="slot-row panel-cs">
            <template v-if="slot.player">
              <span class="player-name">{{ slot.player.username }}</span>
              <span v-if="slot.player.socketId === room.currentRoom?.hostId" class="badge">Хост</span>
              <span v-else-if="slot.player.isReady" class="badge ready">Готов</span>
            </template>
            <template v-else-if="slot.bot">
              <span class="player-name bot-name">Бот ({{ difficultyLabels[slot.bot.difficulty] }})</span>
              <button
                v-if="isHost"
                type="button"
                class="btn-remove-bot"
                title="Удалить"
                @click="room.removeBot(half + idx)"
              >×</button>
            </template>
            <template v-else>
              <span class="slot-empty">Пусто</span>
              <button
                v-if="iAmPending"
                type="button"
                class="btn-cs btn-slot-take"
                @click="room.takeSlot(half + idx)"
              >
                Выбрать
              </button>
              <template v-else-if="isHost">
                <button
                  type="button"
                  class="btn-cs btn-add-bot"
                  @click="addBotSlotIndex = addBotSlotIndex === half + idx ? null : half + idx"
                >
                  Добавить бота
                </button>
                <div v-if="addBotSlotIndex === half + idx" class="add-bot-levels">
                  <button type="button" class="btn-cs btn-level" @click="addBot(half + idx, 'easy')">Лёгкая</button>
                  <button type="button" class="btn-cs btn-level" @click="addBot(half + idx, 'medium')">Средняя</button>
                  <button type="button" class="btn-cs btn-level" @click="addBot(half + idx, 'hard')">Сложная</button>
                </div>
              </template>
            </template>
          </div>
        </div>
      </div>

      <div class="controls">
        <button
          v-if="iHaveSlot"
          type="button"
          class="btn-cs"
          @click="toggleReady"
        >
          {{ myReady ? 'Отменить готовность' : 'Готов' }}
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
  cursor: pointer;
}
.pending-hint {
  color: var(--cs-orange);
  font-size: 13px;
  margin-bottom: 8px;
}
.pending-list {
  color: var(--cs-text-dim);
  font-size: 12px;
  margin-bottom: 12px;
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
.slot-row {
  padding: 8px 12px;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  border: 1px solid var(--cs-panel-border);
}
.slot-row .player-name {
  flex: 1;
  min-width: 0;
}
.slot-row.ready {
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
.bot-name {
  color: var(--cs-text-dim);
}
.slot-empty {
  color: var(--cs-text-dim);
  font-size: 13px;
  flex: 1;
}
.btn-slot-take,
.btn-add-bot {
  font-size: 12px;
  padding: 4px 10px;
}
.btn-remove-bot {
  padding: 0 8px;
  background: transparent;
  border: none;
  color: var(--cs-text-dim);
  cursor: pointer;
  font-size: 1.2rem;
  line-height: 1;
}
.btn-remove-bot:hover {
  color: var(--cs-orange);
}
.add-bot-levels {
  display: flex;
  gap: 6px;
  margin-top: 6px;
  width: 100%;
  flex-wrap: wrap;
}
.btn-level {
  flex: 1;
  min-width: 70px;
  font-size: 11px;
  padding: 4px 8px;
}

.controls {
  display: flex;
  flex-wrap: wrap;
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
