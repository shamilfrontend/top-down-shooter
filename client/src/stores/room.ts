import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { BotsConfig, RoomState, RoomListItem } from 'top-down-cs-shared';
import { useSocket } from '@/composables/useSocket';

export const useRoomStore = defineStore('room', () => {
  const roomList = ref<RoomListItem[]>([]);
  const currentRoom = ref<RoomState | null>(null);
  const error = ref<string | null>(null);

  const { connect, socket } = useSocket();

  const isInRoom = computed(() => !!currentRoom.value);

  function fetchRoomList() {
    const s = connect();
    s.emit('room:list');
  }

  function createRoom(options: { name: string; password?: string; map?: string; maxPlayers?: number; roundsToWin?: number }) {
    error.value = null;
    const s = connect();
    s.emit('room:create', options);
  }

  function joinRoom(roomId: string, password?: string) {
    error.value = null;
    const s = connect();
    s.emit('room:join', { roomId, password });
  }

  function leaveRoom() {
    const s = socket.value;
    if (s) s.emit('room:leave');
    currentRoom.value = null;
  }

  function setReady(ready: boolean) {
    socket.value?.emit('room:ready', ready);
  }

  function changeTeam(team: 'ct' | 't') {
    socket.value?.emit('room:changeTeam', team);
  }

  function changeBots(bots: Partial<BotsConfig>) {
    socket.value?.emit('room:changeBots', bots);
  }

  function startGame() {
    socket.value?.emit('room:start');
  }

  function setupListeners() {
    const s = socket.value;
    if (!s) return;

    const onList = (list: RoomListItem[]) => {
      roomList.value = list;
    };
    const onCreated = (room: RoomState) => {
      currentRoom.value = room;
    };
    const onJoined = (room: RoomState) => {
      currentRoom.value = room;
    };
    const onUpdate = (room: RoomState) => {
      currentRoom.value = room;
    };
    const onLeft = () => {
      currentRoom.value = null;
    };
    const onError = (msg: string) => {
      error.value = msg;
    };
    const onStarting = (data: { room: RoomState; mapId: string }) => {
      currentRoom.value = data.room;
    };

    s.on('room:list', onList);
    s.on('room:created', onCreated);
    s.on('room:joined', onJoined);
    s.on('room:update', onUpdate);
    s.on('room:left', onLeft);
    s.on('room:error', onError);
    s.on('game:starting', onStarting);

    return () => {
      s.off('room:list', onList);
      s.off('room:created', onCreated);
      s.off('room:joined', onJoined);
      s.off('room:update', onUpdate);
      s.off('room:left', onLeft);
      s.off('room:error', onError);
      s.off('game:starting', onStarting);
    };
  }

  function clearError() {
    error.value = null;
  }

  return {
    roomList,
    currentRoom,
    error,
    isInRoom,
    fetchRoomList,
    createRoom,
    joinRoom,
    leaveRoom,
    setReady,
    changeTeam,
    changeBots,
    startGame,
    setupListeners,
    clearError,
  };
});
