<template>
  <div class="auth-view">
    <div class="auth-card panel-cs">
      <h1 class="auth-title">РЕГИСТРАЦИЯ ОТКЛЮЧЕНА</h1>
      <p class="auth-link">
        Используйте простой вход по `Имя`.
        <router-link to="/login">Перейти на вход</router-link>
      </p>
    </div>
  </div>
</template>

<style scoped>
.auth-view {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
.auth-card {
  padding: 32px;
  text-align: center;
  border: 1px solid var(--cs-panel-border);
  min-width: 320px;
}
.auth-title {
  margin-bottom: 24px;
  font-size: 18px;
  letter-spacing: 0.1em;
  color: var(--cs-orange);
}
.auth-link {
  margin-top: 20px;
  font-size: 13px;
  color: var(--cs-text-dim);
}
.auth-link a {
  color: var(--cs-orange);
}
.auth-link a:hover {
  color: var(--cs-orange-hover);
}
</style>
