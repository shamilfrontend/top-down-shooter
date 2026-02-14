<script setup lang="ts">
const props = defineProps<{
  show: boolean;
  credits: number;
  weapons: [string | null, string];
}>();

const emit = defineEmits<{
  close: [];
  buy: [weaponId: string];
}>();

const items = [
  { id: 'm4', name: 'M4A1', price: 3500, slot: 0 },
  { id: 'ak47', name: 'AK-47', price: 5000, slot: 0 },
];
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="shop-overlay" @click.self="emit('close')">
      <div class="shop-modal panel-cs">
        <div class="shop-header">
          <h3 class="shop-title">МАГАЗИН</h3>
          <span class="credits">${{ credits }}</span>
        </div>
        <div class="shop-items">
          <div
            v-for="item in items"
            :key="item.id"
            class="shop-item"
            :class="{ disabled: credits < item.price || weapons[0] }"
          >
            <div class="item-name">{{ item.name }}</div>
            <div class="item-price">${{ item.price }}</div>
            <button
              type="button"
              class="btn-cs btn-cs-primary btn-buy"
              :disabled="credits < item.price || !!weapons[0]"
              @click="emit('buy', item.id)"
            >
              {{ weapons[0] ? 'Куплено' : credits < item.price ? 'Недостаточно' : 'Купить' }}
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
