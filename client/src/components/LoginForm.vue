<script setup lang="ts">
import { ref } from 'vue';

const emit = defineEmits<{
  submit: [name: string];
}>();

const name = ref('');
const error = ref('');

function handleSubmit() {
  error.value = '';
  const trimmed = name.value.trim();
  if (!trimmed) {
    error.value = 'Заполните все поля';
    return;
  }
  emit('submit', trimmed);
}

defineExpose({ setError: (msg: string) => (error.value = msg) });
</script>

<template>
  <form class="login-form" @submit.prevent="handleSubmit">
    <div v-if="error" class="form-error">{{ error }}</div>
    <input
      v-model="name"
      type="text"
      placeholder="Имя"
      class="input-cs"
      autocomplete="nickname"
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
