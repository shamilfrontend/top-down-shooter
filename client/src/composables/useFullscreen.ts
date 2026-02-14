import { ref, onUnmounted } from 'vue';
import type { Ref } from 'vue';

export function useFullscreen(target: Ref<HTMLElement | null>) {
  const isFullscreen = ref(false);

  function enter() {
    const el = target.value;
    if (!el) return;
    const doc = document as Document & { fullscreenElement?: Element; webkitFullscreenElement?: Element };
    if (doc.fullscreenElement ?? doc.webkitFullscreenElement) return;
    const req = el.requestFullscreen?.() ?? (el as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen?.();
    if (req) req.then(() => { isFullscreen.value = true; }).catch(() => {});
  }

  function exit() {
    const doc = document as Document & { exitFullscreen?: () => Promise<void>; webkitExitFullscreen?: () => Promise<void> };
    if (!(doc.fullscreenElement ?? (doc as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement)) return;
    const req = doc.exitFullscreen?.() ?? doc.webkitExitFullscreen?.();
    if (req) req.then(() => { isFullscreen.value = false; }).catch(() => {});
  }

  function toggle() {
    if (isFullscreen.value) exit();
    else enter();
  }

  function onChange() {
    const doc = document as Document & { fullscreenElement?: Element; webkitFullscreenElement?: Element };
    isFullscreen.value = !!(doc.fullscreenElement ?? doc.webkitFullscreenElement);
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    onUnmounted(() => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
    });
  }

  return { isFullscreen, enter, exit, toggle };
}
