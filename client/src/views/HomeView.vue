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
      <h1>Top Down CS</h1>
      <div class="user-bar">
        <span v-if="auth.user">{{ auth.user.username }}</span>
        <router-link to="/lobby" class="btn-lobby">Лобби</router-link>
        <router-link to="/maps" class="btn-lobby">Карты</router-link>
        <router-link to="/game/dust2" class="btn-lobby">Играть (тест)</router-link>
        <button class="btn-logout" @click="logout">Выйти</button>
      </div>
    </header>
    <main class="main">
      <p>Добро пожаловать, {{ auth.user?.username }}!</p>
      <router-link to="/lobby" class="btn-play">Играть</router-link>
    </main>
  </div>
</template>

<style scoped>
.home-view {
  min-height: 100vh;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: #1e1e32;
}
.user-bar {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.btn-logout {
  padding: 0.5rem 1rem;
  background: transparent;
  border: 1px solid #555;
  border-radius: 6px;
  color: #eee;
  cursor: pointer;
}
.btn-logout:hover {
  background: #333;
}
.main {
  padding: 2rem;
}
.btn-lobby {
  padding: 0.5rem 1rem;
  background: #4a90d9;
  border-radius: 6px;
  color: #fff;
  text-decoration: none;
}
.btn-play {
  display: inline-block;
  margin-top: 1rem;
  padding: 1rem 2rem;
  background: #4a90d9;
  border-radius: 8px;
  color: #fff;
  text-decoration: none;
  font-weight: 600;
}
</style>
