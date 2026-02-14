<script setup lang="ts">
const props = defineProps<{
  health: number;
  weapon: string;
  ammo: number;
  ammoReserve: number;
  kills: number;
  deaths: number;
  scoreCt: number;
  scoreT: number;
  credits?: number;
  weapons?: [string | null, string];
  currentSlot?: number;
  round?: number;
  roundTimeLeft?: number;
}>();

const weaponNames: Record<string, string> = {
  usp: 'USP-S',
  ak47: 'AK-47',
  m4: 'M4A1',
};

// Размер иконки (ширина в px) для визуального отличия
const weaponIconWidth: Record<string, number> = {
  usp: 20,
  ak47: 28,
  m4: 26,
};

const slots = [
  { key: 0, label: '1', weapon: props.weapons?.[0] ?? null },
  { key: 1, label: '2', weapon: props.weapons?.[1] ?? 'usp' },
];

function getSlotWeapon(key: number): string | null {
  const w = props.weapons?.[key];
  return w ?? null;
}

function isSelected(key: number): boolean {
  return (props.currentSlot ?? 1) === key;
}
</script>

<template>
  <div class="hud">
    <div class="hud-top">
      <div class="score">
        <span class="team-ct">{{ scoreCt }}</span>
        <span class="sep">:</span>
        <span class="team-t">{{ scoreT }}</span>
      </div>
      <div v-if="credits != null" class="credits-bar">
        ${{ credits }}
      </div>
      <div v-if="round != null" class="round-info">
        <span>Раунд {{ round }}</span>
        <span v-if="roundTimeLeft != null" class="round-timer">
          {{ Math.floor((roundTimeLeft ?? 0) / 60) }}:{{ String((roundTimeLeft ?? 0) % 60).padStart(2, '0') }}
        </span>
      </div>
    </div>

    <div class="hud-bottom">
      <div class="hud-left">
        <div class="hp-bar">
          <div class="hp-fill" :style="{ width: `${health}%` }" />
          <span class="hp-text">{{ health }} HP</span>
        </div>
        <div class="weapon-slots">
          <div
            v-for="slot in slots"
            :key="slot.key"
            class="weapon-slot"
            :class="{ selected: isSelected(slot.key), empty: !getSlotWeapon(slot.key) }"
          >
            <span class="slot-key">{{ slot.label }}</span>
            <span
              v-if="getSlotWeapon(slot.key)"
              class="slot-icon-bar"
              :style="{ width: (weaponIconWidth[getSlotWeapon(slot.key)!] ?? 18) + 'px' }"
            />
            <span v-else class="slot-icon-empty">—</span>
          </div>
        </div>
        <div class="weapon-info">
          <span class="weapon-name">
            <span
              class="weapon-icon-bar"
              :style="{ width: (weaponIconWidth[weapon] ?? 18) + 'px' }"
            />
            {{ weaponNames[weapon] ?? weapon }}
          </span>
          <span class="ammo">{{ ammo }} / {{ ammoReserve }}</span>
        </div>
      </div>
      <div class="hud-right">
        <div class="stats">
          <span class="stat">K: {{ kills }}</span>
          <span class="stat">D: {{ deaths }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hud {
  position: absolute;
  inset: 0;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.hud-top {
  padding: 1rem 2rem;
}
.score {
  font-size: 1.5rem;
  font-weight: 700;
}
.team-ct {
  color: #6b9bd1;
}
.team-t {
  color: #d4a574;
}
.sep {
  margin: 0 0.5rem;
  color: #888;
}
.credits-bar {
  margin-top: 0.25rem;
  font-size: 1rem;
  font-weight: 600;
  color: #4ade80;
}
.round-info {
  margin-top: 0.5rem;
  font-size: 0.9rem;
  color: #aaa;
}
.round-timer {
  margin-left: 1rem;
  font-weight: 600;
}
.hud-bottom {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding: 1rem 1.5rem;
}
.hud-left {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.hp-bar {
  width: 200px;
  height: 24px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}
.hp-fill {
  height: 100%;
  background: linear-gradient(90deg, #e74c3c, #2ecc71);
  transition: width 0.2s;
}
.hp-text {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  font-weight: 600;
  text-shadow: 0 1px 2px #000;
}
.weapon-slots {
  display: flex;
  gap: 0.5rem;
}
.weapon-slot {
  width: 44px;
  height: 36px;
  background: rgba(0, 0, 0, 0.5);
  border: 2px solid #444;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
}
.weapon-slot.selected {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.2);
  box-shadow: 0 0 8px rgba(59, 130, 246, 0.4);
}
.weapon-slot.empty {
  opacity: 0.5;
}
.slot-key {
  font-size: 0.65rem;
  color: #888;
}
.slot-icon-bar {
  display: block;
  height: 4px;
  background: #aaa;
  border-radius: 1px;
}
.slot-icon-empty {
  font-size: 0.8rem;
  color: #555;
}
.weapon-icon-bar {
  display: inline-block;
  vertical-align: middle;
  height: 4px;
  background: #fff;
  border-radius: 1px;
  margin-right: 0.35rem;
}
.weapon-info {
  display: flex;
  flex-direction: column;
}
.weapon-name {
  font-weight: 600;
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 0.35rem;
}
.weapon-icon {
  font-size: 1.1rem;
}
.ammo {
  font-size: 0.9rem;
  color: #aaa;
}
.hud-right .stats {
  display: flex;
  gap: 1rem;
  font-size: 0.95rem;
}
.stat {
  color: #ccc;
}
</style>
