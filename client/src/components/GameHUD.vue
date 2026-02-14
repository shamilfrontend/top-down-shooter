<script setup lang="ts">
const props = defineProps<{
  health: number;
  armor?: number;
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
        <div class="hp-armor-row">
          <div class="hp-armor-item">
            <span class="hp-armor-label">HP</span>
            <div class="hp-bar-cs">
              <div
                class="hp-fill-cs"
                :class="health > 66 ? 'high' : health > 33 ? 'mid' : 'low'"
                :style="{ width: `${health}%` }"
              />
              <span class="hp-armor-num">{{ health }}</span>
            </div>
          </div>
          <div class="hp-armor-item">
            <span class="hp-armor-label">AP</span>
            <div class="armor-bar-cs">
              <div
                class="armor-fill-cs"
                :style="{ width: `${Math.min(100, armor ?? 0)}%` }"
              />
              <span class="hp-armor-num">{{ armor ?? 0 }}</span>
            </div>
          </div>
        </div>
        <div class="stats-cs">
          <span class="stat-cs">K: {{ kills }}</span>
          <span class="stat-cs">D: {{ deaths }}</span>
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
  padding: 10px 20px;
}
.score {
  font-size: 1.55rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-shadow: 1px 1px 0 #000;
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
  font-size: 13px;
  font-weight: 700;
  color: var(--cs-orange);
  text-shadow: 1px 1px 0 #000;
}
.round-info {
  margin-top: 4px;
  font-size: 12px;
  color: var(--cs-text-dim);
}
.round-timer {
  margin-left: 10px;
  font-weight: 700;
  color: var(--cs-orange);
}
.hud-bottom {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding: 14px 24px;
}
.hud-left {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.weapon-slots {
  display: flex;
  gap: 4px;
}
.weapon-slot {
  width: 46px;
  height: 36px;
  background: #0a0a0a;
  border: 1px solid var(--cs-bevel-dark);
  border-top-color: var(--cs-bevel-light);
  border-left-color: var(--cs-bevel-light);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 11px;
}
.weapon-slot.selected {
  border-color: var(--cs-orange);
  background: rgba(200, 120, 30, 0.2);
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
  gap: 2px;
}
.weapon-name {
  font-weight: 700;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--cs-text);
  text-shadow: 1px 1px 0 #000;
}
.ammo {
  font-size: 13px;
  color: var(--cs-orange);
  font-weight: 600;
}
/* CS 1.6 style — HP/AP в правом нижнем углу */
.hud-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}
.hp-armor-row {
  display: flex;
  gap: 14px;
}
.hp-armor-item {
  display: flex;
  align-items: center;
  gap: 8px;
}
.hp-armor-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--cs-text-dim);
  width: 24px;
}
.hp-bar-cs,
.armor-bar-cs {
  width: 100px;
  height: 22px;
  background: #0a0a0a;
  border: 1px solid var(--cs-bevel-dark);
  border-top-color: var(--cs-bevel-light);
  border-left-color: var(--cs-bevel-light);
  overflow: hidden;
  position: relative;
}
.hp-fill-cs {
  height: 100%;
  transition: width 0.15s;
}
.hp-fill-cs.high { background: #4a9b3c; }
.hp-fill-cs.mid { background: #c4a420; }
.hp-fill-cs.low { background: #b03030; }
.armor-fill-cs {
  height: 100%;
  background: #4a6a8a;
  transition: width 0.15s;
}
.hp-armor-num {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  text-shadow: 1px 1px 0 #000;
}
.stats-cs {
  display: flex;
  gap: 12px;
  font-size: 13px;
  color: var(--cs-text-dim);
}
.stat-cs { font-weight: 600; }
</style>
