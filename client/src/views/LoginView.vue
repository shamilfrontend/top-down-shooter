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
    <div class="auth-card panel-cs">
      <h1 class="auth-title">ВХОД</h1>
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
  padding: 32px;
  text-align: center;
  border: 1px solid var(--cs-panel-border);
  min-width: 320px;
}
.auth-title {
  margin-bottom: 24px;
  font-size: 18px;
  letter-spacing: 0.15em;
  color: var(--cs-orange);
}
.auth-link {
  margin-top: 20px;
  font-size: 13px;
  color: var(--cs-text-dim);
}
.auth-link a {
  color: var(--cs-orange);
}
.auth-link a:hover {
  color: var(--cs-orange-hover);
}
</style>
