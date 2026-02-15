<script setup lang="ts">
import { ref, watch, computed, onUnmounted } from 'vue';

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
  roundPhase?: 'playing' | 'ended';
  roundsToWin?: number;
  reloadEndTime?: number;
}>();

const RELOAD_MS: Record<string, number> = { usp: 2200, m4: 3100, ak47: 2500 };
const MAGAZINE_SIZE: Record<string, number> = { usp: 12, m4: 30, ak47: 30 };

const weaponNames: Record<string, string> = {
  usp: 'USP-S',
  ak47: 'AK-47',
  m4: 'M4A1',
};

const currentWeaponImgFailed = ref(false);
watch(() => props.weapon, () => { currentWeaponImgFailed.value = false; });

// Плавная полоска HP (интерполяция за ~0.3 с)
const displayedHealth = ref(props.health);
let healthRafId: number | null = null;
watch(() => props.health, (newVal) => {
  const start = displayedHealth.value;
  const startTime = performance.now();
  const duration = 280;
  if (healthRafId) cancelAnimationFrame(healthRafId);
  function step() {
    const t = Math.min(1, (performance.now() - startTime) / duration);
    displayedHealth.value = Math.round(start + (newVal - start) * t);
    if (t < 1) healthRafId = requestAnimationFrame(step);
  }
  healthRafId = requestAnimationFrame(step);
});
onUnmounted(() => { if (healthRafId) cancelAnimationFrame(healthRafId); });

// Индикатор перезарядки (тик каждые 50 ms)
const reloadTick = ref(0);
let reloadInterval: ReturnType<typeof setInterval> | null = null;
watch([() => props.reloadEndTime, () => props.weapon], ([end]) => {
  if (reloadInterval) clearInterval(reloadInterval);
  reloadInterval = null;
  if (!end || Date.now() >= end) { reloadTick.value = 0; return; }
  reloadInterval = setInterval(() => {
    reloadTick.value = Date.now();
    if (Date.now() >= (end as number)) {
      if (reloadInterval) clearInterval(reloadInterval);
      reloadInterval = null;
    }
  }, 50);
});
onUnmounted(() => { if (reloadInterval) clearInterval(reloadInterval); });
const reloadProgress = computed(() => {
  reloadTick.value;
  if (!props.reloadEndTime || Date.now() > props.reloadEndTime) return null;
  const ms = RELOAD_MS[props.weapon] ?? 2000;
  return Math.min(1, 1 - (props.reloadEndTime - Date.now()) / ms);
});

const magazineSize = computed(() => MAGAZINE_SIZE[props.weapon] ?? 12);
const lowAmmo = computed(() => props.ammo > 0 && props.ammo < magazineSize.value * 0.25);

function weaponImageSrc(id: string): string {
  const filename = id === 'usp' ? 'gun' : id;
  return `/images/weapons/${filename}.png`;
}

function onWeaponImgError(e: Event) {
  (e.target as HTMLImageElement).style.display = 'none';
}

function onCurrentWeaponImgError(e: Event) {
  (e.target as HTMLImageElement).style.display = 'none';
  currentWeaponImgFailed.value = true;
}

// Размер иконки (ширина в px) для визуального отличия
const weaponIconWidth: Record<string, number> = {
  usp: 20,
  ak47: 28,
  m4: 26,
};

const slots = [
  { key: 1, label: '1', weapon: props.weapons?.[1] ?? 'usp' },
  { key: 0, label: '2', weapon: props.weapons?.[0] ?? null },
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
        <span v-if="roundsToWin != null" class="score-to-win"> (до {{ roundsToWin }})</span>
      </div>
      <div v-if="credits != null" class="credits-bar">
        ${{ credits }}
      </div>
      <div v-if="round != null" class="round-info">
        <span>Раунд {{ round }}</span>
        <span v-if="roundPhase === 'ended'" class="round-phase-buy">Время закупа</span>
        <span v-else-if="roundTimeLeft != null" class="round-timer">
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
            <template v-if="getSlotWeapon(slot.key)">
              <span class="slot-icon-wrap">
                <span
                  class="slot-icon-bar slot-fallback"
                  :style="{ width: (weaponIconWidth[getSlotWeapon(slot.key)!] ?? 18) + 'px' }"
                />
                <img
                  :src="weaponImageSrc(getSlotWeapon(slot.key)!)"
                  :alt="weaponNames[getSlotWeapon(slot.key)!] ?? ''"
                  class="slot-weapon-img"
                  @error="onWeaponImgError"
                >
              </span>
            </template>
            <span v-else class="slot-icon-empty">—</span>
          </div>
        </div>
        <div class="weapon-info">
          <div class="weapon-current-row">
            <img
              :src="weaponImageSrc(weapon)"
              :alt="weaponNames[weapon] ?? ''"
              class="weapon-current-img"
              @error="onCurrentWeaponImgError"
            >
            <div class="weapon-text">
              <span class="weapon-name">
                <span
                  v-show="currentWeaponImgFailed"
                  class="weapon-icon-bar weapon-fallback"
                  :style="{ width: (weaponIconWidth[weapon] ?? 18) + 'px' }"
                />
                {{ weaponNames[weapon] ?? weapon }}
              </span>
              <span class="ammo" :class="{ empty: ammo === 0, lowAmmo }">{{ ammo }} / {{ ammoReserve }}</span>
              <span v-if="reloadProgress != null" class="reload-indicator">
                <span class="reload-bar-wrap">
                  <span class="reload-bar-fill" :style="{ width: `${(reloadProgress ?? 0) * 100}%` }" />
                </span>
                <span class="reload-text">Перезарядка...</span>
              </span>
              <span v-else-if="ammo === 0 && ammoReserve > 0" class="ammo-hint">R — перезарядка</span>
            </div>
          </div>
        </div>
      </div>
      <div class="hud-right">
        <div class="hp-armor-row">
          <div class="hp-armor-item">
            <span class="hp-armor-label">HP</span>
            <div class="hp-bar-cs">
              <div
                class="hp-fill-cs"
                :class="displayedHealth > 66 ? 'high' : displayedHealth > 33 ? 'mid' : 'low'"
                :style="{ width: `${Math.min(100, displayedHealth)}%` }"
              />
              <span class="hp-armor-num">{{ displayedHealth }}</span>
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
.score-to-win {
  margin-left: 6px;
  font-size: 0.85em;
  font-weight: 500;
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
.round-phase-buy {
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
  gap: 14px;
}
.weapon-slot {
  min-width: 58px;
  height: 52px;
  background: #0a0a0a;
  border: 1px solid var(--cs-bevel-dark);
  border-top-color: var(--cs-bevel-light);
  border-left-color: var(--cs-bevel-light);
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 6px;
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
  font-size: 12px;
  font-weight: 700;
  color: var(--cs-text-dim);
  flex-shrink: 0;
}
.slot-icon-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  min-width: 64px;
}
.slot-icon-bar.slot-fallback {
  position: absolute;
  display: block;
  height: 3px;
  background: var(--cs-orange);
}
.slot-weapon-img {
  position: relative;
  max-width: 76px;
  max-height: 44px;
  object-fit: contain;
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
.weapon-current-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.weapon-current-img {
  width: 146px;
  height: 94px;
  object-fit: contain;
  flex-shrink: 0;
}
.weapon-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.weapon-name {
  font-weight: 700;
  font-size: 22px;
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--cs-text);
  text-shadow: 1px 1px 0 #000;
}
.ammo {
  font-size: 21px;
  color: var(--cs-orange);
  font-weight: 600;
}
.ammo.empty {
  color: #c03030;
}
.ammo.lowAmmo {
  color: #e8a030;
  animation: ammo-pulse 1s ease-in-out infinite;
}
@keyframes ammo-pulse {
  50% { opacity: 0.85; }
}
.reload-indicator {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: var(--cs-text-dim);
  margin-top: 2px;
}
.reload-bar-wrap {
  width: 60px;
  height: 4px;
  background: rgba(255,255,255,0.2);
  border-radius: 2px;
  overflow: hidden;
}
.reload-bar-fill {
  display: block;
  height: 100%;
  background: var(--cs-orange);
  border-radius: 2px;
  transition: width 0.05s linear;
}
.reload-text {
  font-size: 10px;
}
.ammo-hint {
  font-size: 11px;
  color: var(--cs-text-dim);
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
  font-size: 15px;
  font-weight: 700;
  color: var(--cs-text-dim);
  width: 28px;
}
.hp-bar-cs,
.armor-bar-cs {
  width: 100px;
  height: 26px;
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
  font-size: 16px;
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
