<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRoomStore } from '@/stores/room';
import JoinRoomModal from '@/components/JoinRoomModal.vue';

const emit = defineEmits<{
  close: [];
}>();

const room = useRoomStore();
const joinTarget = ref<{ id: string; name: string; hasPassword: boolean } | null>(null);

function getRoomStatusLabel(status: 'waiting' | 'playing') {
  return status === 'playing' ? 'Идет игра' : 'Ожидание';
}

function getUnavailableReasonLabel(reason?: 'playing' | 'full') {
  if (reason === 'playing') return 'Недоступно: игра уже идет';
  if (reason === 'full') return 'Недоступно: комната заполнена';
  return 'Недоступно для входа';
}

function openJoin(roomId: string, name: string, hasPassword: boolean, isJoinable: boolean) {
  if (!isJoinable) return;
  joinTarget.value = { id: roomId, name, hasPassword };
}

function handleJoin(roomId: string, password?: string) {
  room.joinRoom(roomId, password);
}

function onKeydown(e: KeyboardEvent) {
  if (e.code === 'Escape') {
    if (joinTarget.value) {
      joinTarget.value = null;
    } else {
      emit('close');
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown);
});
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="browser-modal panel-cs">
      <header class="header">
        <div class="header-orange"></div>
        <h2 class="title">Доступные игры</h2>
        <div class="header-actions">
          <button type="button" class="btn-cs" @click="room.fetchRoomList">Обновить</button>
          <button type="button" class="btn-cs" @click="emit('close')">Закрыть</button>
        </div>
      </header>

      <div v-if="room.error" class="error-banner" @click="room.clearError">
        {{ room.error }} ×
      </div>

      <main class="room-list">
        <div v-if="room.roomList.length === 0" class="empty">
          Нет доступных комнат. Создайте свою!
        </div>
        <div v-else class="rooms">
          <div
            v-for="r in room.roomList"
            :key="r.id"
            class="room-card panel-cs"
            :class="{ 'room-card-disabled': !r.isJoinable }"
            @click="openJoin(r.id, r.name, r.hasPassword, r.isJoinable)"
          >
            <span class="room-name">{{ r.name }}</span>
            <span class="room-map">{{ r.map }}{{ r.roundsToWin != null ? ` · до ${r.roundsToWin} побед` : '' }}</span>
            <span class="room-status" :class="{ 'room-status-playing': r.status === 'playing' }">
              {{ getRoomStatusLabel(r.status) }}
            </span>
            <span class="room-players">{{ r.playerCount }} / {{ r.maxPlayers }}</span>
            <span v-if="r.hasPassword" class="room-lock">🔒</span>
            <span v-if="!r.isJoinable" class="room-reason">{{ getUnavailableReasonLabel(r.unavailableReason) }}</span>
          </div>
        </div>
      </main>

      <JoinRoomModal
        v-if="joinTarget"
        :room-id="joinTarget.id"
        :room-name="joinTarget.name"
        :has-password="joinTarget.hasPassword"
        @submit="handleJoin"
        @close="joinTarget = null"
      />
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 70;
  padding: 24px;
}

.browser-modal {
  width: min(760px, 100%);
  max-height: 86vh;
  overflow: auto;
}

.header {
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
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
  font-size: 16px;
  letter-spacing: 0.08em;
  margin-left: 10px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.error-banner {
  background: #3a1515;
  color: var(--cs-orange);
  padding: 8px 16px;
  text-align: center;
  cursor: pointer;
  border-bottom: 1px solid #5a2020;
}

.room-list {
  padding: 18px;
}

.empty {
  color: var(--cs-text-dim);
  font-size: 13px;
}

.rooms {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.room-card {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  padding: 10px 14px;
  cursor: pointer;
  border: 1px solid var(--cs-panel-border);
}

.room-card:hover {
  border-left-color: var(--cs-orange);
  border-left-width: 3px;
  padding-left: 12px;
}

.room-card-disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.room-card-disabled:hover {
  border-left-color: var(--cs-panel-border);
  border-left-width: 1px;
  padding-left: 14px;
}

.room-name {
  font-weight: 600;
  flex: 1;
  font-size: 13px;
}

.room-map,
.room-players,
.room-status,
.room-reason {
  color: var(--cs-text-dim);
  font-size: 12px;
}

.room-status {
  border: 1px solid var(--cs-panel-border);
  padding: 2px 8px;
  border-radius: 2px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.room-status-playing {
  color: var(--cs-orange);
  border-color: var(--cs-orange);
}

.room-reason {
  width: 100%;
  color: var(--cs-orange);
}
</style>
