<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { MapRenderer } from '@/game/MapRenderer';
import type { MapConfig } from 'top-down-cs-shared';

const props = defineProps<{
  map: MapConfig | null;
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
let renderer: MapRenderer | null = null;
let animationId: number | null = null;
let resizeHandler: (() => void) | null = null;

function startRender() {
  const canvas = canvasRef.value;
  const map = props.map;
  if (!canvas || !map) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const doResize = () => {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width;
    const h = rect.height;
    if (renderer) {
      renderer.setSize(w, h);
    } else {
      renderer = new MapRenderer(ctx, map, w, h);
    }
    const scale = Math.min(w / map.width, h / map.height) * 0.9;
    renderer.setCamera(map.width / 2, map.height / 2, scale);
  };

  resizeHandler = doResize;
  doResize();
  window.addEventListener('resize', doResize);

  const tick = () => {
    renderer?.render();
    animationId = requestAnimationFrame(tick);
  };
  tick();
}

function stopRender() {
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler);
    resizeHandler = null;
  }
  if (animationId !== null) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
  renderer = null;
}

watch(
  () => props.map,
  (map) => {
    stopRender();
    if (map) startRender();
  }
);

onMounted(() => {
  if (props.map) startRender();
});

onUnmounted(stopRender);
</script>

<template>
  <canvas
    ref="canvasRef"
    class="map-preview"
  />
</template>

<style scoped>
.map-preview {
  width: 100%;
  height: 100%;
  min-height: 300px;
  background: #1a1a2e;
  border-radius: 8px;
}
</style>
