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
      class="input-cs"
      required
    />
    <input
      v-model="password"
      type="password"
      placeholder="Пароль (необязательно)"
      class="input-cs"
    />
    <select v-model="map" class="select-cs">
      <option v-for="m in maps" :key="m.value" :value="m.value">
        {{ m.label }}
      </option>
    </select>
    <div class="form-row">
      <label>Макс. игроков:</label>
      <input v-model.number="maxPlayers" type="number" min="2" max="20" class="input-cs form-input-sm" />
    </div>
    <div class="form-row">
      <label>Побед для победы:</label>
      <input v-model.number="roundsToWin" type="number" min="1" max="24" class="input-cs form-input-sm" />
    </div>
    <div class="form-actions">
      <button type="button" class="btn-cs" @click="emit('cancel')">Отмена</button>
      <button type="submit" class="btn-cs btn-cs-primary">Создать</button>
    </div>
  </form>
</template>

<style scoped>
.create-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 280px;
}
.create-form .input-cs,
.create-form .select-cs {
  width: 100%;
}
.form-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}
.form-row label {
  min-width: 120px;
  color: var(--cs-text-dim);
}
.form-input-sm {
  width: 80px;
}
.form-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 4px;
}
</style>
