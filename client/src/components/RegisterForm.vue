<script setup lang="ts">
import { ref } from 'vue';

const emit = defineEmits<{
  submit: [email: string, username: string, password: string];
}>();

const email = ref('');
const username = ref('');
const password = ref('');
const confirmPassword = ref('');
const error = ref('');

function handleSubmit() {
  error.value = '';
  if (!email.value || !username.value || !password.value) {
    error.value = 'Заполните все поля';
    return;
  }
  if (password.value.length < 6) {
    error.value = 'Пароль не менее 6 символов';
    return;
  }
  if (password.value !== confirmPassword.value) {
    error.value = 'Пароли не совпадают';
    return;
  }
  emit('submit', email.value, username.value, password.value);
}

defineExpose({ setError: (msg: string) => (error.value = msg) });
</script>

<template>
  <form class="register-form" @submit.prevent="handleSubmit">
    <div v-if="error" class="form-error">{{ error }}</div>
    <input
      v-model="email"
      type="email"
      placeholder="Email"
      class="input-cs"
      autocomplete="email"
    />
    <input
      v-model="username"
      type="text"
      placeholder="Имя пользователя"
      class="input-cs"
      autocomplete="username"
    />
    <input
      v-model="password"
      type="password"
      placeholder="Пароль"
      class="input-cs"
      autocomplete="new-password"
    />
    <input
      v-model="confirmPassword"
      type="password"
      placeholder="Подтвердите пароль"
      class="input-cs"
      autocomplete="new-password"
    />
    <button type="submit" class="btn-cs btn-cs-primary" style="width: 100%; margin-top: 4px;">Зарегистрироваться</button>
  </form>
</template>

<style scoped>
.register-form {
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
.register-form .input-cs {
  width: 100%;
}
</style>
