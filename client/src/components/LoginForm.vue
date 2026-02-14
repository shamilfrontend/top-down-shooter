<script setup lang="ts">
import { ref } from 'vue';

const emit = defineEmits<{
  submit: [email: string, password: string];
}>();

const email = ref('');
const password = ref('');
const error = ref('');

function handleSubmit() {
  error.value = '';
  if (!email.value || !password.value) {
    error.value = 'Заполните все поля';
    return;
  }
  emit('submit', email.value, password.value);
}

defineExpose({ setError: (msg: string) => (error.value = msg) });
</script>

<template>
  <form class="login-form" @submit.prevent="handleSubmit">
    <div v-if="error" class="form-error">{{ error }}</div>
    <input
      v-model="email"
      type="email"
      placeholder="Email"
      class="input-cs"
      autocomplete="email"
    />
    <input
      v-model="password"
      type="password"
      placeholder="Пароль"
      class="input-cs"
      autocomplete="current-password"
    />
    <button type="submit" class="btn-cs btn-cs-primary" style="width: 100%; margin-top: 4px;">Войти</button>
  </form>
</template>

<style scoped>
.login-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 320px;
  margin: 0 auto;
}
.form-error {
  color: var(--cs-orange);
  font-size: 13px;
}
.login-form .input-cs {
  width: 100%;
}
</style>
