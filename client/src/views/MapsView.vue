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
    error.value = null;
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
        <div v-if="selectedMap" class="preview-header">
          <h2 class="preview-title">{{ selectedMap.name }}</h2>
          <router-link
            :to="{ name: 'game', params: { mapId: selectedMap.id } }"
            class="btn-cs btn-cs-primary"
          >
            Тренировка на этой карте
          </router-link>
        </div>
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
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-shrink: 0;
}
.preview-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--cs-text);
}
.preview-area .btn-cs-primary {
  flex-shrink: 0;
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
