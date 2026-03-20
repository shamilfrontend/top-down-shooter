<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue';
import { useRouter } from 'vue-router';

import { useAuthStore } from '@/stores/auth';
import { useRoomStore } from '@/stores/room';
import { useSocket } from '@/composables/useSocket';
import CreateRoomForm from '@/components/CreateRoomForm.vue';
import RoomSettingsModal from '@/components/RoomSettingsModal.vue';
import ServerBrowserModal from '@/components/ServerBrowserModal.vue';

const auth = useAuthStore();
const router = useRouter();
const room = useRoomStore();
const { connect } = useSocket();

const MENU_MUSIC_VOLUME_KEY = 'menuMusicVolume';
const menuMusic = ref<HTMLAudioElement | null>(null);
const isMusicMuted = ref(localStorage.getItem('menuMusicMuted') === '1');
const menuMusicVolume = ref(
  Math.min(
		100, Math.max(
			0, parseInt(localStorage.getItem(MENU_MUSIC_VOLUME_KEY) ?? '80', 10) || 80
		)
	)
);

type CreateRoomOptions = {
  name: string;
  password?: string;
  map: string;
  maxPlayers: number;
  roundsToWin: number;
  team: 'ct' | 't';
};

function logout() {
  auth.logout();
  router.push({ name: 'login' });
}

function toggleMusic() {
  isMusicMuted.value = !isMusicMuted.value;
  localStorage.setItem('menuMusicMuted', isMusicMuted.value ? '1' : '0');
  if (menuMusic.value) {
    menuMusic.value.muted = isMusicMuted.value;
    if (!isMusicMuted.value) {
      menuMusic.value.play().catch(() => {});
    }
  }
}

function tryPlayMenuMusic() {
  if (menuMusic.value && !isMusicMuted.value) {
    menuMusic.value.play().catch(() => {});
  }
}

function setMenuMusicVolume(v: number) {
  const n = Math.min(100, Math.max(0, v));
  menuMusicVolume.value = n;
  localStorage.setItem(MENU_MUSIC_VOLUME_KEY, String(n));
  if (menuMusic.value && !isMusicMuted.value) {
    menuMusic.value.volume = n / 100;
  }
}

const showCreateForm = ref(false);
const showServerBrowser = ref(false);
let cleanupRoomListeners: null | (() => void) = null;
let roomListRefreshInterval: ReturnType<typeof setInterval> | null = null;
const ROOM_LIST_REFRESH_MS = 8000;

const roomModalVisible = computed(() => !!room.currentRoom && room.currentRoom.status !== 'playing');

function ensureRoomListeners() {
  if (cleanupRoomListeners) return;
  // Подключаем сокет и подписки только когда реально открывается/нужна модалка комнаты.
  connect();
  cleanupRoomListeners = room.setupListeners() ?? null;
}

const handleNewGameBtnClick = (): void => {
  ensureRoomListeners();

  showCreateForm.value = true;
};

function openServerBrowser() {
  ensureRoomListeners();
  room.fetchRoomList();
  showServerBrowser.value = true;
}

function closeServerBrowser() {
  showServerBrowser.value = false;
}

function onCreateRoomSubmit(opts: CreateRoomOptions) {
  room.createRoom(opts);
  showCreateForm.value = false;
}

watch(
  () => room.currentRoom,
  (r) => {
    if (!r) return;

    showCreateForm.value = false;
    if (r.status === 'playing') {
      router.push({ name: 'networked-game', params: { roomId: r.id }, query: { origin: 'home' } });
    } else {
      ensureRoomListeners();
    }
  }
);

watch(showServerBrowser, (open) => {
  if (open) {
    room.fetchRoomList();
    roomListRefreshInterval = setInterval(() => {
      room.fetchRoomList();
    }, ROOM_LIST_REFRESH_MS);
    return;
  }

  if (roomListRefreshInterval) {
    clearInterval(roomListRefreshInterval);
    roomListRefreshInterval = null;
  }
});

onMounted(() => {
  const audio = new Audio('/music/intro.mp3');
  audio.loop = true;
  audio.muted = isMusicMuted.value;
  audio.volume = isMusicMuted.value ? 0 : menuMusicVolume.value / 100;
  menuMusic.value = audio;
  audio.play().catch(() => {});

  // Возврат из игры: если комната уже загружена в сторе, снова включаем подписки.
  if (roomModalVisible.value) ensureRoomListeners();
});

onUnmounted(() => {
  if (roomListRefreshInterval) clearInterval(roomListRefreshInterval);
  cleanupRoomListeners?.();
  menuMusic.value?.pause();
  menuMusic.value = null;
});
</script>

<template>
  <div class="main-menu" @click.once="tryPlayMenuMusic">
    <nav class="menu">
			<div class="logo">
				<img src="/images/logo.png" alt="">
			</div>

			<button
				type="button"
				class="menu-item menu-item-btn"
				@click="handleNewGameBtnClick"
			>
				Новая игра
			</button>

      <button
				type="button"
				class="menu-item menu-item-btn-inline"
				@click="openServerBrowser"
			>
        Найти серверы
			</button>

      <router-link
				to="/game/dust2"
				class="menu-item"
				active-class="menu-item-active"
			>
        Тренировка
      </router-link>

      <router-link
				to="/settings"
				class="menu-item"
				active-class="menu-item-active"
			>
        Настройки
      </router-link>

      <button
				type="button"
				class="menu-item menu-item-btn"
				@click="logout"
			>
        Выйти
      </button>
    </nav>

    <div class="bottom-right">
      <div v-if="!isMusicMuted" class="music-indicator" aria-hidden="true">
        <span v-for="i in 4" :key="i" class="music-bar" />
      </div>

      <label v-if="!isMusicMuted" class="music-volume-label" title="Громкость музыки">
        <input
          type="range"
          min="0"
          max="100"
          :value="menuMusicVolume"
          class="music-volume-slider"
          @input="setMenuMusicVolume(Number(($event.target as HTMLInputElement).value))"
        >
      </label>
      <button
        type="button"
        class="music-toggle"
        :title="isMusicMuted ? 'Включить музыку' : 'Выключить музыку'"
        @click="toggleMusic"
      >
        {{ isMusicMuted ? 'Музыка выкл' : 'Музыка вкл' }}
      </button>
      <span v-if="auth.user" class="username">{{ auth.user.username }}</span>
    </div>

    <div
			v-if="showCreateForm"
			class="create-overlay"
			@click.self="showCreateForm = false"
		>
      <div class="create-card panel-cs">
        <h2 class="card-title">Новая игра</h2>

        <CreateRoomForm
          @submit="onCreateRoomSubmit"
          @cancel="showCreateForm = false"
        />
      </div>
    </div>

    <ServerBrowserModal
      v-if="showServerBrowser"
      @close="closeServerBrowser"
    />

    <RoomSettingsModal v-if="roomModalVisible" />
  </div>
</template>

<style lang="scss" scoped>
.main-menu {
  min-height: 100vh;
  position: relative;
  background: var(--cs-bg);
  background-image: url("/images/game-bg.jpg");
	background-repeat: no-repeat;
	background-size: cover;
	background-position: center top;

	&::after {
		content: "";
		position: absolute;
		left: 0;
		top: 0;
		right: 0;
		bottom: 0;
		z-index: 1;
		background-color: #000;
		opacity: 0.65;
	}
}

.menu {
  position: absolute;
  left: 48px;
  top: 45%;
	z-index: 2;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 4px;
  list-style: none;
}

.logo {
	width: 240px;
}

.menu-item {
  padding: 8px 0;
  color: var(--cs-text);
  font-size: 20px;
  text-decoration: none;
  cursor: pointer;
  transition: color 0.15s ease, margin-left 0.15s ease;
  background: none;
  border: none;
  font-family: inherit;
  text-align: left;
}

.menu-item:hover,
.menu-item-active {
  color: var(--cs-menu-highlight);
  margin-left: 12px;
}

.menu-item-btn {
  margin-top: 16px;
}

.menu-item-btn-inline {
  margin-top: 0;
}

.bottom-right {
  position: absolute;
  right: 24px;
  bottom: 24px;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 16px;
}

.music-indicator {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 16px;
}

.music-bar {
  width: 4px;
  background: var(--cs-menu-highlight);
  border-radius: 1px;
  animation: music-pulse 0.6s ease-in-out infinite;
}

.music-bar:nth-child(1) { height: 8px;  animation-delay: 0s; }
.music-bar:nth-child(2) { height: 14px; animation-delay: 0.1s; }
.music-bar:nth-child(3) { height: 10px; animation-delay: 0.2s; }
.music-bar:nth-child(4) { height: 12px; animation-delay: 0.3s; }

@keyframes music-pulse {
  0%, 100% { transform: scaleY(0.5); opacity: 0.7; }
  50%      { transform: scaleY(1);   opacity: 1; }
}

.music-volume-label {
  display: flex;
  align-items: center;
}

.music-volume-slider {
  width: 80px;
  height: 6px;
  accent-color: var(--cs-menu-highlight);
  cursor: pointer;
}

.music-toggle {
  padding: 6px 12px;
  background: var(--cs-panel);
  color: var(--cs-text);
  border: 1px solid var(--cs-panel-border);
  font-family: inherit;
  font-size: 12px;
  cursor: pointer;
}

.music-toggle:hover {
  color: var(--cs-menu-highlight);
  border-color: var(--cs-menu-highlight);
}

.username {
  font-size: 12px;
  color: var(--cs-text-dim);
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
</style>
