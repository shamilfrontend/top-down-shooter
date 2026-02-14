<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useMaps } from '@/composables/useMaps';
import MapPreview from '@/components/MapPreview.vue';
import type { MapConfig } from 'top-down-cs-shared';

const { mapsList, fetchMapsList, fetchMap } = useMaps();
const selectedMap = ref<MapConfig | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

onMounted(async () => {
  loading.value = true;
  try {
    await fetchMapsList();
    if (mapsList.value.length > 0) {
      selectedMap.value = await fetchMap(mapsList.value[0].id);
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Ошибка загрузки';
  } finally {
    loading.value = false;
  }
});

async function selectMap(id: string) {
  try {
    selectedMap.value = await fetchMap(id);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Ошибка';
  }
}
</script>

<template>
  <div class="maps-view">
    <header class="header">
      <div class="header-orange"></div>
      <h1 class="title">КАРТЫ</h1>
      <router-link to="/" class="btn-cs">← Назад</router-link>
    </header>
    <div v-if="loading" class="loading">Загрузка...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else class="content">
      <aside class="sidebar panel-cs">
        <div
          v-for="m in mapsList"
          :key="m.id"
          class="map-item"
          :class="{ active: selectedMap?.id === m.id }"
          @click="selectMap(m.id)"
        >
          {{ m.name }}
        </div>
      </aside>
      <main class="preview-area">
        <MapPreview v-if="selectedMap" :map="selectedMap" />
      </main>
    </div>
  </div>
</template>

<style scoped>
.maps-view {
  min-height: 100vh;
}
.header {
  position: relative;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 24px;
  background: var(--cs-bg-secondary);
  border-bottom: 1px solid var(--cs-panel-border);
}
.header-orange {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: var(--cs-orange);
}
.title {
  font-size: 18px;
  letter-spacing: 0.1em;
  margin: 0;
}
.content {
  display: flex;
  height: calc(100vh - 52px);
}
.sidebar {
  width: 200px;
  padding: 12px;
  border-right: 1px solid var(--cs-panel-border);
}
.map-item {
  padding: 8px 12px;
  cursor: pointer;
  font-size: 13px;
  border: 1px solid transparent;
  margin-bottom: 2px;
}
.map-item:hover {
  background: #2a2a2a;
  border-left: 3px solid var(--cs-orange);
  padding-left: 9px;
}
.map-item.active {
  background: var(--cs-orange-dark);
  color: #fff;
  border-left: 3px solid var(--cs-orange);
  padding-left: 9px;
}
.preview-area {
  flex: 1;
  padding: 12px;
  background: var(--cs-bg);
}
.loading,
.error {
  padding: 24px;
  text-align: center;
  color: var(--cs-text-dim);
}
.error {
  color: var(--cs-orange);
}
</style>
