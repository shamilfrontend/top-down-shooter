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
      <h1>Карты</h1>
    </header>
    <div v-if="loading" class="loading">Загрузка...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else class="content">
      <aside class="sidebar">
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
  padding: 1rem 2rem;
  background: #1e1e32;
}
.content {
  display: flex;
  height: calc(100vh - 60px);
}
.sidebar {
  width: 200px;
  padding: 1rem;
  background: #252540;
}
.map-item {
  padding: 0.75rem;
  cursor: pointer;
  border-radius: 6px;
}
.map-item:hover {
  background: #333;
}
.map-item.active {
  background: #4a90d9;
}
.preview-area {
  flex: 1;
  padding: 1rem;
}
.loading,
.error {
  padding: 2rem;
  text-align: center;
}
.error {
  color: #ff6b6b;
}
</style>
