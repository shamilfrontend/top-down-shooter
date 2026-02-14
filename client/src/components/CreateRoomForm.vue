<script setup lang="ts">
import { ref } from 'vue';

const emit = defineEmits<{
  submit: [options: { name: string; password?: string; map: string; maxPlayers: number; roundsToWin: number }];
  cancel: [];
}>();

const name = ref('');
const password = ref('');
const map = ref('dust2');
const maxPlayers = ref(10);
const roundsToWin = ref(10);

const maps = [
  { value: 'dust2', label: 'Dust II' },
  { value: 'mansion', label: 'Mansion' },
];

function handleSubmit() {
  if (!name.value.trim()) return;
  emit('submit', {
    name: name.value.trim(),
    password: password.value.trim() || undefined,
    map: map.value,
    maxPlayers: maxPlayers.value,
    roundsToWin: roundsToWin.value,
  });
}
</script>

<template>
  <form class="create-form" @submit.prevent="handleSubmit">
    <input
      v-model="name"
      type="text"
      placeholder="Название комнаты"
      class="form-input"
      required
    />
    <input
      v-model="password"
      type="password"
      placeholder="Пароль (необязательно)"
      class="form-input"
    />
    <select v-model="map" class="form-input">
      <option v-for="m in maps" :key="m.value" :value="m.value">
        {{ m.label }}
      </option>
    </select>
    <div class="form-row">
      <label>Макс. игроков:</label>
      <input v-model.number="maxPlayers" type="number" min="2" max="20" class="form-input form-input-sm" />
    </div>
    <div class="form-row">
      <label>Побед для победы:</label>
      <input v-model.number="roundsToWin" type="number" min="1" max="24" class="form-input form-input-sm" />
    </div>
    <div class="form-actions">
      <button type="button" class="btn btn-secondary" @click="emit('cancel')">
        Отмена
      </button>
      <button type="submit" class="btn btn-primary">Создать</button>
    </div>
  </form>
</template>

<style scoped>
.create-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 280px;
}
.form-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.form-input {
  padding: 0.75rem 1rem;
  border: 1px solid #333;
  border-radius: 8px;
  background: #252540;
  color: #eee;
}
.form-input-sm {
  width: 80px;
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
