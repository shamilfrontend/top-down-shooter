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
      class="form-input"
      autocomplete="email"
    />
    <input
      v-model="password"
      type="password"
      placeholder="Пароль"
      class="form-input"
      autocomplete="current-password"
    />
    <button type="submit" class="form-btn">Войти</button>
  </form>
</template>

<style scoped>
.login-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 320px;
}
.form-error {
  color: #ff6b6b;
  font-size: 0.9rem;
}
.form-input {
  padding: 0.75rem 1rem;
  border: 1px solid #333;
  border-radius: 8px;
  background: #252540;
  color: #eee;
}
.form-btn {
  padding: 0.75rem 1rem;
  background: #4a90d9;
  border: none;
  border-radius: 8px;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}
.form-btn:hover {
  background: #5a9fe9;
}
</style>
