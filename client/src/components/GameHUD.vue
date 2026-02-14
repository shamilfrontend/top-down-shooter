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
  font-family: Tahoma, Arial, sans-serif;
}
.hud-top {
  padding: 12px 20px;
}
.score {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: 0.05em;
}
.team-ct {
  color: #6b9bd1;
}
.team-t {
  color: #d4a574;
}
.sep {
  margin: 0 6px;
  color: var(--cs-text-dim);
}
.credits-bar {
  margin-top: 4px;
  font-size: 14px;
  font-weight: 600;
  color: var(--cs-orange);
}
.round-info {
  margin-top: 6px;
  font-size: 13px;
  color: var(--cs-text-dim);
}
.round-timer {
  margin-left: 12px;
  font-weight: 600;
  color: var(--cs-orange);
}
.hud-bottom {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding: 12px 20px;
}
.hud-left {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.hp-bar {
  width: 200px;
  height: 22px;
  background: rgba(0, 0, 0, 0.7);
  border: 1px solid var(--cs-panel-border);
  overflow: hidden;
  position: relative;
}
.hp-fill {
  height: 100%;
  background: linear-gradient(90deg, #c0392b, #27ae60);
  transition: width 0.2s;
}
.hp-text {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  text-shadow: 0 1px 2px #000;
  color: #fff;
}
.weapon-slots {
  display: flex;
  gap: 6px;
}
.weapon-slot {
  width: 42px;
  height: 34px;
  background: rgba(0, 0, 0, 0.7);
  border: 1px solid var(--cs-panel-border);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 11px;
}
.weapon-slot.selected {
  border-color: var(--cs-orange);
  background: rgba(232, 146, 46, 0.15);
}
.weapon-slot.empty {
  opacity: 0.5;
}
.slot-key {
  font-size: 10px;
  color: var(--cs-text-dim);
}
.slot-icon-bar {
  display: block;
  height: 3px;
  background: var(--cs-orange);
}
.slot-icon-empty {
  font-size: 12px;
  color: #555;
}
.weapon-icon-bar {
  display: inline-block;
  vertical-align: middle;
  height: 3px;
  background: var(--cs-orange);
  margin-right: 4px;
}
.weapon-info {
  display: flex;
  flex-direction: column;
}
.weapon-name {
  font-weight: 600;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--cs-text);
}
.ammo {
  font-size: 12px;
  color: var(--cs-text-dim);
}
.hud-right .stats {
  display: flex;
  gap: 12px;
  font-size: 13px;
}
.stat {
  color: var(--cs-text-dim);
}
</style>
