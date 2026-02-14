import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/lobby',
      name: 'lobby',
      component: () => import('@/views/LobbyView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/room',
      name: 'room',
      component: () => import('@/views/RoomView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/maps',
      name: 'maps',
      component: () => import('@/views/MapsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/game/:mapId?',
      name: 'game',
      component: () => import('@/views/GameView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/game/room/:roomId',
      name: 'networked-game',
      component: () => import('@/views/NetworkedGameView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { guest: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/RegisterView.vue'),
      meta: { guest: true },
    },
  ],
});

router.beforeEach(async (to, _from, next) => {
  const auth = useAuthStore();
  if (auth.token && !auth.user) {
    await auth.fetchMe();
  }
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    next({ name: 'login' });
  } else if (to.meta.guest && auth.isAuthenticated) {
    next({ name: 'home' });
  } else {
    next();
  }
});

export default router;
