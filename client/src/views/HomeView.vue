<script setup lang="ts">
import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'vue-router';

const auth = useAuthStore();
const router = useRouter();

function logout() {
  auth.logout();
  router.push({ name: 'login' });
}
</script>

<template>
  <div class="home-view">
    <header class="header">
      <div class="header-orange"></div>
      <h1 class="title">TOP DOWN CS</h1>
      <div class="user-bar">
        <span v-if="auth.user" class="username">{{ auth.user.username }}</span>
        <router-link to="/lobby" class="btn-cs btn-cs-primary">Лобби</router-link>
        <router-link to="/maps" class="btn-cs">Карты</router-link>
        <router-link to="/game/dust2" class="btn-cs">Играть (тест)</router-link>
        <button type="button" class="btn-cs" @click="logout">Выйти</button>
      </div>
    </header>
    <main class="main">
      <p class="welcome">Добро пожаловать, {{ auth.user?.username }}!</p>
      <router-link to="/lobby" class="btn-cs btn-cs-primary btn-play">Играть</router-link>
    </main>
  </div>
</template>

<style scoped>
.home-view {
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
  color: var(--cs-text);
  margin-left: 12px;
}
.user-bar {
  display: flex;
  align-items: center;
  gap: 8px;
}
.username {
  color: var(--cs-text-dim);
  margin-right: 8px;
  font-size: 13px;
}
.main {
  padding: 48px 24px;
  max-width: 480px;
  margin: 0 auto;
}
.welcome {
  color: var(--cs-text-dim);
  margin-bottom: 24px;
}
.btn-play {
  padding: 10px 24px;
  font-size: 14px;
}
</style>
