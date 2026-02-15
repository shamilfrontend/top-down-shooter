<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useRoomStore } from '@/stores/room';
import { useSocket } from '@/composables/useSocket';
import CreateRoomForm from '@/components/CreateRoomForm.vue';
import JoinRoomModal from '@/components/JoinRoomModal.vue';

const router = useRouter();
const room = useRoomStore();
const { connect } = useSocket();

const showCreateForm = ref(false);
const joinTarget = ref<{ id: string; name: string; hasPassword: boolean } | null>(null);

const ROOM_LIST_REFRESH_MS = 8000;

function onKeydown(e: KeyboardEvent) {
  if (e.code === 'Escape' && showCreateForm.value) showCreateForm.value = false;
}

onMounted(() => {
  connect();
  room.fetchRoomList();
  const cleanup = room.setupListeners();
  const refreshInterval = setInterval(() => room.fetchRoomList(), ROOM_LIST_REFRESH_MS);
  window.addEventListener('keydown', onKeydown);
  onUnmounted(() => {
    cleanup();
    clearInterval(refreshInterval);
    window.removeEventListener('keydown', onKeydown);
  });
});

watch(() => room.currentRoom, (r) => {
  if (r) {
    showCreateForm.value = false;
    joinTarget.value = null;
    if (r.status === 'playing') {
      router.push({ name: 'networked-game', params: { roomId: r.id } });
    } else {
      router.push({ name: 'room' });
    }
  }
});

function openJoin(roomId: string, name: string, hasPassword: boolean) {
  joinTarget.value = { id: roomId, name, hasPassword };
}

function handleJoin(roomId: string, password?: string) {
  room.joinRoom(roomId, password);
}
</script>

<template>
  <div class="lobby-view">
    <header class="header">
      <div class="header-orange"></div>
      <h1 class="title">ЛОББИ</h1>
      <div class="header-actions">
        <router-link to="/" class="btn-cs">← Назад</router-link>
        <button type="button" class="btn-cs btn-cs-primary" @click="showCreateForm = true">
          Создать комнату
        </button>
      </div>
    </header>

    <div v-if="room.error" class="error-banner" @click="room.clearError">
      {{ room.error }} ×
    </div>

    <div v-if="showCreateForm" class="create-overlay" @click.self="showCreateForm = false">
      <div class="create-card panel-cs">
        <h2 class="card-title">Создать комнату</h2>
        <CreateRoomForm
          @submit="(opts) => { room.createRoom(opts); showCreateForm = false; }"
          @cancel="showCreateForm = false"
        />
      </div>
    </div>

    <JoinRoomModal
      v-if="joinTarget"
      :room-id="joinTarget.id"
      :room-name="joinTarget.name"
      :has-password="joinTarget.hasPassword"
      @submit="handleJoin"
      @close="joinTarget = null"
    />

    <main class="room-list">
      <button type="button" class="btn-cs" @click="room.fetchRoomList">Обновить</button>
      <div v-if="room.roomList.length === 0" class="empty">
        Нет доступных комнат. Создайте свою!
      </div>
      <div v-else class="rooms">
        <div
          v-for="r in room.roomList"
          :key="r.id"
          class="room-card panel-cs"
          @click="openJoin(r.id, r.name, r.hasPassword)"
        >
          <span class="room-name">{{ r.name }}</span>
          <span class="room-map">{{ r.map }}{{ r.roundsToWin != null ? ` · до ${r.roundsToWin} побед` : '' }}</span>
          <span class="room-players">{{ r.playerCount }} / {{ r.maxPlayers }}</span>
          <span v-if="r.hasPassword" class="room-lock">🔒</span>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.lobby-view {
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
  letter-spacing: 0.1em;
  margin-left: 12px;
}
.header-actions {
  display: flex;
  gap: 8px;
}
.error-banner {
  background: #3a1515;
  color: #e8922e;
  padding: 8px 16px;
  text-align: center;
  cursor: pointer;
  border-bottom: 1px solid #5a2020;
}
.create-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}
.create-card {
  padding: 24px;
  border: 1px solid var(--cs-panel-border);
  min-width: 320px;
}
.card-title {
  margin-bottom: 16px;
  font-size: 16px;
  letter-spacing: 0.05em;
  color: var(--cs-orange);
}
.room-list {
  padding: 24px;
  max-width: 640px;
  margin: 0 auto;
}
.btn-refresh {
  margin-bottom: 16px;
}
.room-list > .btn-cs {
  margin-bottom: 16px;
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
.room-name {
  font-weight: 600;
  flex: 1;
  font-size: 13px;
}
.room-map {
  color: var(--cs-text-dim);
  font-size: 12px;
}
.room-players {
  color: var(--cs-text-dim);
  font-size: 12px;
}
</style>
