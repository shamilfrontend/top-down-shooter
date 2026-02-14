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
  { id: 'ak47', name: 'AK-47', price: 2700, slot: 0 },
  { id: 'm4', name: 'M4A1', price: 3100, slot: 0 },
];
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="shop-overlay" @click.self="emit('close')">
      <div class="shop-modal">
        <div class="shop-header">
          <h3>Магазин</h3>
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
              class="btn-buy"
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
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  pointer-events: auto;
}
.shop-modal {
  background: #1e1e32;
  border: 1px solid #444;
  border-radius: 12px;
  padding: 1.5rem 2rem;
  min-width: 280px;
}
.shop-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
}
.shop-header h3 {
  margin: 0;
  font-size: 1.25rem;
}
.credits {
  font-weight: 700;
  color: #4ade80;
  font-size: 1.1rem;
}
.shop-items {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.shop-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  background: #252540;
  border-radius: 8px;
}
.shop-item.disabled {
  opacity: 0.7;
}
.item-name {
  flex: 1;
  font-weight: 600;
}
.item-price {
  color: #888;
}
.btn-buy {
  padding: 0.5rem 1rem;
  background: #3b82f6;
  border: none;
  border-radius: 6px;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}
.btn-buy:disabled {
  background: #333;
  color: #666;
  cursor: not-allowed;
}
.shop-hint {
  margin: 1rem 0 0;
  font-size: 0.8rem;
  color: #666;
  text-align: center;
}
</style>
