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

onMounted(() => {
  connect();
  room.fetchRoomList();
  const cleanup = room.setupListeners();
  onUnmounted(cleanup);
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
      <h1>Лобби</h1>
      <div class="header-actions">
        <router-link to="/" class="btn-back">← Назад</router-link>
        <button class="btn-create" @click="showCreateForm = true">
          Создать комнату
        </button>
      </div>
    </header>

    <div v-if="room.error" class="error-banner" @click="room.clearError">
      {{ room.error }} ×
    </div>

    <div v-if="showCreateForm" class="create-overlay" @click.self="showCreateForm = false">
      <div class="create-card">
        <h2>Создать комнату</h2>
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
      <button class="btn-refresh" @click="room.fetchRoomList">Обновить</button>
      <div v-if="room.roomList.length === 0" class="empty">
        Нет доступных комнат. Создайте свою!
      </div>
      <div v-else class="rooms">
        <div
          v-for="r in room.roomList"
          :key="r.id"
          class="room-card"
          @click="openJoin(r.id, r.name, r.hasPassword)"
        >
          <span class="room-name">{{ r.name }}</span>
          <span class="room-map">{{ r.map }}</span>
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: #1e1e32;
}
.header-actions {
  display: flex;
  gap: 1rem;
}
.btn-back {
  padding: 0.5rem 1rem;
  color: #aaa;
  text-decoration: none;
}
.btn-create {
  padding: 0.6rem 1.2rem;
  background: #4a90d9;
  border: none;
  border-radius: 8px;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}
.btn-create:hover {
  background: #5a9fe9;
}
.error-banner {
  background: #5a2020;
  color: #ff9999;
  padding: 0.75rem 1rem;
  text-align: center;
  cursor: pointer;
}
.create-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}
.create-card {
  background: #1e1e32;
  padding: 2rem;
  border-radius: 12px;
}
.create-card h2 {
  margin-bottom: 1rem;
}
.room-list {
  padding: 2rem;
}
.btn-refresh {
  margin-bottom: 1rem;
  padding: 0.5rem 1rem;
  background: #333;
  border: 1px solid #555;
  border-radius: 6px;
  color: #eee;
  cursor: pointer;
}
.empty {
  color: #888;
}
.rooms {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.room-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: #252540;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid transparent;
}
.room-card:hover {
  border-color: #4a90d9;
}
.room-name {
  font-weight: 600;
  flex: 1;
}
.room-map {
  color: #888;
}
.room-players {
  color: #aaa;
}
</style>
