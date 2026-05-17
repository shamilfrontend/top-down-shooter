import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Socket } from 'socket.io-client';
import type { RoomState, RoomListItem } from 'shootout-shared';

import { useSocket } from '@/composables/useSocket';

export const useRoomStore = defineStore('room', () => {
  const roomList = ref<RoomListItem[]>([]);
  const currentRoom = ref<RoomState | null>(null);
  const error = ref<string | null>(null);

  const { connect, socket } = useSocket();

  let listenersSocket: Socket | null = null;
  let removeListeners: (() => void) | null = null;

  const isInRoom = computed(() => !!currentRoom.value);

  function attachListeners(s: Socket) {
    removeListeners?.();
    removeListeners = null;
    listenersSocket = null;

    const onList = (list: RoomListItem[]) => {
      roomList.value = list;
    };
    const onCreated = (room: RoomState) => {
      currentRoom.value = room;
      fetchRoomList();
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

    removeListeners = () => {
      s.off('room:list', onList);
      s.off('room:created', onCreated);
      s.off('room:joined', onJoined);
      s.off('room:update', onUpdate);
      s.off('room:left', onLeft);
      s.off('room:error', onError);
      s.off('game:starting', onStarting);
    };
    listenersSocket = s;
  }

  function ensureListeners() {
    const s = connect();
    if (listenersSocket === s && removeListeners) return;
    attachListeners(s);
  }

  function teardownListeners() {
    removeListeners?.();
    removeListeners = null;
    listenersSocket = null;
  }

  function emitWhenConnected(event: string, payload?: unknown) {
    const s = connect();
    ensureListeners();
    const emit = () => {
      if (payload === undefined) s.emit(event);
      else s.emit(event, payload);
    };
    if (s.connected) emit();
    else s.once('connect', emit);
  }

  function fetchRoomList() {
    emitWhenConnected('room:list');
  }

  function createRoom(
      options: {
        name: string;
        password?: string;
        map?: string;
        maxPlayers?: number;
        roundsToWin?: number;
        team?: 'ct' | 't'
      }
    ) {
    error.value = null;
    emitWhenConnected('room:create', options);
  }

  function joinRoom(roomId: string, password?: string) {
    error.value = null;
    emitWhenConnected('room:join', { roomId, password });
  }

  function leaveRoom() {
    const s = socket.value;
    if (s) s.emit('room:leave');
    currentRoom.value = null;
  }

  function setReady(ready: boolean) {
    socket.value?.emit('room:ready', ready);
  }

  function takeSlot(slotIndex: number) {
    socket.value?.emit('room:takeSlot', slotIndex);
  }

  function addBot(slotIndex: number, difficulty: 'easy' | 'medium' | 'hard') {
    socket.value?.emit('room:addBot', { slotIndex, difficulty });
  }

  function removeBot(slotIndex: number) {
    socket.value?.emit('room:removeBot', { slotIndex });
  }

  function startGame() {
    socket.value?.emit('room:start');
  }

  function setupListeners() {
    ensureListeners();
    return () => teardownListeners();
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
    takeSlot,
    addBot,
    removeBot,
    startGame,
    setupListeners,
    ensureListeners,
    teardownListeners,
    clearError,
  };
});
