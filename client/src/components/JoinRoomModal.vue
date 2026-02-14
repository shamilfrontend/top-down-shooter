<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{
  roomId: string;
  roomName: string;
  hasPassword: boolean;
}>();

const emit = defineEmits<{
  submit: [roomId: string, password?: string];
  close: [];
}>();

const password = ref('');

watch(() => props.roomId, () => {
  password.value = '';
});

function handleSubmit() {
  emit('submit', props.roomId, props.hasPassword ? password.value : undefined);
}
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal">
      <h3>Войти в {{ roomName }}</h3>
      <form @submit.prevent="handleSubmit" class="join-form">
        <input
          v-if="hasPassword"
          v-model="password"
          type="password"
          placeholder="Пароль"
          class="form-input"
        />
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" @click="emit('close')">
            Отмена
          </button>
          <button type="submit" class="btn btn-primary">Войти</button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.modal {
  background: #1e1e32;
  padding: 1.5rem;
  border-radius: 12px;
  min-width: 300px;
}
.modal h3 {
  margin-bottom: 1rem;
  font-size: 1.2rem;
}
.join-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.form-input {
  padding: 0.75rem 1rem;
  border: 1px solid #333;
  border-radius: 8px;
  background: #252540;
  color: #eee;
}
.form-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}
.btn {
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-weight: 500;
}
.btn-primary {
  background: #4a90d9;
  color: #fff;
}
.btn-secondary {
  background: #333;
  color: #eee;
}
</style>
