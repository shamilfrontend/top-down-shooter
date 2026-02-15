<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    show: boolean;
    credits: number;
    weapons: [string | null, string];
    armor?: number;
    /** Покупка только при 'ended'. Если не передано — считаем что можно покупать. */
    roundPhase?: 'playing' | 'ended';
    /** Контейнер для телепорта (например, fullscreen-элемент); если не передан — body */
    teleportTo?: HTMLElement | null;
  }>(),
  { teleportTo: null, armor: 0 }
);

const canBuy = computed(() => props.roundPhase !== 'playing');

const teleportTarget = computed(() => props.teleportTo ?? 'body');

const emit = defineEmits<{
  close: [];
  buy: [itemId: string];
}>();

interface ShopItem {
  id: string;
  name: string;
  price: number;
  type: 'weapon' | 'armor';
  slot?: number;
}

const weaponItems: ShopItem[] = [
  { id: 'm4', name: 'M4A1', price: 3500, type: 'weapon', slot: 0 },
  { id: 'ak47', name: 'AK-47', price: 5000, type: 'weapon', slot: 0 },
  { id: 'awp', name: 'AWP', price: 4750, type: 'weapon', slot: 0 },
];

const armorItem: ShopItem = { id: 'armor', name: 'Броня', price: 650, type: 'armor' };

const ARMOR_MAX = 100;

const visibleItems = computed(() => {
  const ownedPrimary = props.weapons?.[0] ?? null;
  const weapons = weaponItems.filter((item) => item.id !== ownedPrimary);
  const armorVisible = (props.armor ?? 0) < ARMOR_MAX;
  return armorVisible ? [armorItem, ...weapons] : weapons;
});

function weaponImageSrc(id: string): string {
  const filename = id === 'usp' ? 'gun' : id;
  return `/images/weapons/${filename}.png`;
}
</script>

<template>
  <Teleport :to="teleportTarget">
    <div v-if="show" class="shop-overlay" @click.self="emit('close')">
      <div class="shop-modal panel-cs">
        <div class="shop-header">
          <h3 class="shop-title">МАГАЗИН</h3>
          <span class="credits">{{ credits }} ₽</span>
        </div>
        <p v-if="!canBuy" class="shop-phase-hint">Покупка только в время закупа</p>
        <div class="shop-items">
          <div
            v-for="item in visibleItems"
            :key="item.id"
            class="shop-item"
            :class="{ disabled: credits < item.price }"
          >
            <img
              v-if="item.type === 'weapon'"
              :src="weaponImageSrc(item.id)"
              :alt="item.name"
              class="shop-item-icon"
            >
            <div v-else class="shop-item-icon shop-item-armor-icon" aria-hidden="true">
              🛡
            </div>
            <div class="item-name">{{ item.name }}</div>
            <div class="item-price">{{ item.price }} ₽</div>
            <button
              type="button"
              class="btn-cs btn-cs-primary btn-buy"
              :disabled="!canBuy || credits < item.price"
              @click="emit('buy', item.id)"
            >
              {{ !canBuy ? 'Время закупа' : credits < item.price ? 'Недостаточно' : 'Купить' }}
            </button>
          </div>
        </div>
        <p class="shop-hint">B — закрыть</p>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.shop-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  pointer-events: auto;
}
.shop-modal {
  padding: 24px 28px;
  border: 1px solid var(--cs-panel-border);
  min-width: 280px;
  font-family: Tahoma, Arial, sans-serif;
}
.shop-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.shop-title {
  margin: 0;
  font-size: 16px;
  letter-spacing: 0.1em;
  color: var(--cs-orange);
}
.credits {
  font-weight: 700;
  color: var(--cs-orange);
  font-size: 14px;
}
.shop-phase-hint {
  margin: 0 0 12px;
  font-size: 12px;
  color: #b8860b;
}
.shop-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.shop-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--cs-panel-border);
}
.shop-item-icon {
  width: 96px;
  height: 64px;
  object-fit: contain;
  flex-shrink: 0;
}
.shop-item-armor-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 4px;
}
.shop-item.disabled {
  opacity: 0.6;
}
.item-name {
  flex: 1;
  font-weight: 600;
  font-size: 13px;
}
.item-price {
  color: var(--cs-text-dim);
  font-size: 13px;
}
.btn-buy {
  font-size: 12px;
}
.btn-buy:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.shop-hint {
  margin: 16px 0 0;
  font-size: 11px;
  color: var(--cs-text-dim);
  text-align: center;
}
</style>
