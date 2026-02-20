<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'vue-router';

const auth = useAuthStore();
const router = useRouter();

const MENU_MUSIC_VOLUME_KEY = 'menuMusicVolume';
const menuMusic = ref<HTMLAudioElement | null>(null);
const isMusicMuted = ref(localStorage.getItem('menuMusicMuted') === '1');
const menuMusicVolume = ref(
  Math.min(100, Math.max(0, parseInt(localStorage.getItem(MENU_MUSIC_VOLUME_KEY) ?? '80', 10) || 80))
);

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

onMounted(() => {
  const audio = new Audio('/music/intro.mp3');
  audio.loop = true;
  audio.muted = isMusicMuted.value;
  audio.volume = isMusicMuted.value ? 0 : menuMusicVolume.value / 100;
  menuMusic.value = audio;
  audio.play().catch(() => {});
});

onUnmounted(() => {
  menuMusic.value?.pause();
  menuMusic.value = null;
});
</script>

<template>
  <div class="main-menu" @click.once="tryPlayMenuMusic">
    <h1 class="logo">SHOOTOUT</h1>
    <nav class="menu">
      <router-link to="/lobby" class="menu-item" active-class="menu-item-active">
        Играть
      </router-link>
      <router-link to="/maps" class="menu-item" active-class="menu-item-active">
        Карты
      </router-link>
      <router-link to="/game/dust2" class="menu-item" active-class="menu-item-active">
        Тренировка
      </router-link>
      <button type="button" class="menu-item menu-item-btn" @click="logout">
        Выйти
      </button>
    </nav>
    <div class="bottom-right">
      <div v-if="!isMusicMuted" class="music-indicator" aria-hidden="true">
        <span class="music-bar"></span>
        <span class="music-bar"></span>
        <span class="music-bar"></span>
        <span class="music-bar"></span>
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

	&::after {
		content: "";
		position: absolute;
		left: 0;
		top: 0;
		right: 0;
		bottom: 0;
		z-index: 1;
		background-color: #000;
		opacity: 0.7;
	}
}

.logo {
  position: absolute;
  top: 48px;
  left: 50%;
	z-index: 2;
  transform: translateX(-50%);
  font-size: 2.75rem;
  font-weight: bold;
  color: #fff;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  margin: 0;
}

.menu {
  position: absolute;
  left: 48px;
  top: 50%;
	z-index: 2;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 4px;
  list-style: none;
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
</style>
