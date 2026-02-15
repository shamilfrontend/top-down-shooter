import { io, type Socket } from 'socket.io-client';
import { ref } from 'vue';
import { useAuthStore } from '@/stores/auth';

const socket = ref<Socket | null>(null);
const pingMs = ref<number | null>(null);
const isConnected = ref(false);
let pingInterval: ReturnType<typeof setInterval> | null = null;

export function useSocket() {
  const auth = useAuthStore();

  function connect() {
    if (socket.value?.connected) {
      isConnected.value = true;
      return socket.value;
    }

    const url = import.meta.env.DEV ? window.location.origin : '';
    socket.value = io(url, {
      path: '/socket.io',
      auth: {
        token: auth.token,
      },
    });

    socket.value.on('connect_error', (err) => {
      console.error('Socket connect error:', err.message);
    });

    socket.value.on('connect', () => {
      isConnected.value = true;
      pingMs.value = null;
      pingInterval = setInterval(() => {
        if (socket.value?.connected) socket.value.emit('ping', { t: Date.now() });
      }, 2000);
    });

    socket.value.on('disconnect', () => {
      isConnected.value = false;
      if (pingInterval) {
        clearInterval(pingInterval);
        pingInterval = null;
      }
      pingMs.value = null;
    });

    socket.value.on('pong', (data: { t?: number }) => {
      if (typeof data?.t === 'number') pingMs.value = Math.round(Date.now() - data.t);
    });

    return socket.value;
  }

  function disconnect() {
    socket.value?.disconnect();
  }

  return { socket, connect, disconnect, pingMs, isConnected };
}
