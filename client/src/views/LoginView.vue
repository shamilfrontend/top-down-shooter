<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import LoginForm from '@/components/LoginForm.vue';

const router = useRouter();
const auth = useAuthStore();
const formRef = ref<InstanceType<typeof LoginForm> | null>(null);

async function onSubmit(email: string, password: string) {
  try {
    await auth.login(email, password);
    router.push({ name: 'home' });
  } catch (err) {
    formRef.value?.setError(err instanceof Error ? err.message : 'Ошибка входа');
  }
}
</script>

<template>
  <div class="auth-view">
    <div class="auth-card">
      <h1>Вход</h1>
      <LoginForm ref="formRef" @submit="onSubmit" />
      <p class="auth-link">
        Нет аккаунта?
        <router-link to="/register">Регистрация</router-link>
      </p>
    </div>
  </div>
</template>

<style scoped>
.auth-view {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
.auth-card {
  background: #1e1e32;
  padding: 2rem;
  border-radius: 12px;
  text-align: center;
}
.auth-card h1 {
  margin-bottom: 1.5rem;
  font-size: 1.5rem;
}
.auth-link {
  margin-top: 1.5rem;
  font-size: 0.9rem;
}
.auth-link a {
  color: #4a90d9;
}
</style>
