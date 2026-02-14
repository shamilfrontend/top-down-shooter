<script setup lang="ts">
import { ref } from 'vue';

const emit = defineEmits<{
  submit: [options: { name: string; password?: string; map: string; maxPlayers: number; roundsToWin: number; team: 'ct' | 't' }];
  cancel: [];
}>();

const name = ref('');
const password = ref('');
const map = ref('dust2');
const team = ref<'ct' | 't'>('ct');
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
    team: team.value,
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
    <div class="form-row form-row-team">
      <label>Команда:</label>
      <div class="team-choices">
        <label class="team-choice" :class="{ active: team === 'ct' }">
          <input v-model="team" type="radio" value="ct" />
          <span>Спецназ</span>
        </label>
        <label class="team-choice" :class="{ active: team === 't' }">
          <input v-model="team" type="radio" value="t" />
          <span>Террористы</span>
        </label>
      </div>
    </div>
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
.form-row-team .team-choices {
  display: flex;
  gap: 12px;
}
.team-choice {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid var(--cs-panel-border);
  cursor: pointer;
  font-size: 13px;
}
.team-choice input {
  display: none;
}
.team-choice.active {
  border-color: var(--cs-orange);
  background: rgba(232, 146, 46, 0.1);
  color: var(--cs-orange);
}
.team-choice:first-child.active { color: #6b9bd1; border-color: #6b9bd1; background: rgba(107, 155, 209, 0.1); }
.team-choice:last-child.active { color: #d4a574; border-color: #d4a574; background: rgba(212, 165, 116, 0.1); }
.form-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 4px;
}
</style>
