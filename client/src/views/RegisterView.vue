<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import RegisterForm from '@/components/RegisterForm.vue';

const router = useRouter();
const auth = useAuthStore();
const formRef = ref<InstanceType<typeof RegisterForm> | null>(null);

async function onSubmit(email: string, username: string, password: string) {
  try {
    await auth.register(email, username, password);
    router.push({ name: 'home' });
  } catch (err) {
    formRef.value?.setError(
      err instanceof Error ? err.message : 'Ошибка регистрации'
    );
  }
}
</script>

<template>
  <div class="auth-view">
    <div class="auth-card panel-cs">
      <h1 class="auth-title">РЕГИСТРАЦИЯ</h1>
      <RegisterForm ref="formRef" @submit="onSubmit" />
      <p class="auth-link">
        Уже есть аккаунт?
        <router-link to="/login">Вход</router-link>
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
  letter-spacing: 0.1em;
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
