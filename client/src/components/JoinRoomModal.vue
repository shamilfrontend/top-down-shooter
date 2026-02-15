<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';

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

function onKeydown(e: KeyboardEvent) {
  if (e.code === 'Escape') emit('close');
}

onMounted(() => window.addEventListener('keydown', onKeydown));
onUnmounted(() => window.removeEventListener('keydown', onKeydown));
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal panel-cs">
      <h3 class="modal-title">Войти в {{ roomName }}</h3>
      <form @submit.prevent="handleSubmit" class="join-form">
        <input
          v-if="hasPassword"
          v-model="password"
          type="password"
          placeholder="Пароль"
          class="input-cs"
        />
        <div class="form-actions">
          <button type="button" class="btn-cs" @click="emit('close')">Отмена</button>
          <button type="submit" class="btn-cs btn-cs-primary">Войти</button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.modal {
  padding: 24px;
  border: 1px solid var(--cs-panel-border);
  min-width: 300px;
}
.modal-title {
  margin-bottom: 16px;
  font-size: 14px;
  letter-spacing: 0.05em;
  color: var(--cs-orange);
}
.join-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.join-form .input-cs {
  width: 100%;
}
.form-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
</style>
