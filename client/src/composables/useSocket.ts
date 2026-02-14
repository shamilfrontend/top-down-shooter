import { io, type Socket } from 'socket.io-client';
import { ref, onUnmounted } from 'vue';
import { useAuthStore } from '@/stores/auth';

const socket = ref<Socket | null>(null);

export function useSocket() {
  const auth = useAuthStore();

  function connect() {
    if (socket.value?.connected) return socket.value;

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

    return socket.value;
  }

  function disconnect() {
    socket.value?.disconnect();
  }

  return { socket, connect, disconnect };
}
