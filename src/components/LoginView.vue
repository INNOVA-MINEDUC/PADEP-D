<script setup>
import { usePadep } from '@/stores/padep'

const { state, login, toggleShowPass } = usePadep()
</script>

<template>
  <div class="login">
    <!-- Panel de marca -->
    <section class="login__brand">
      <div class="login__blob login__blob--tr" aria-hidden="true" />
      <div class="login__blob login__blob--bl" aria-hidden="true" />

      <div class="login__logo">
        <div class="login__mark" aria-hidden="true">P</div>
        <div>
          <div class="login__wordmark">PADEP</div>
          <div class="login__tagline">Formación Docente</div>
        </div>
      </div>

      <h1 class="login__headline">Sistema de seguimiento<br>de cohortes de formación docente</h1>
      <div class="login__rule" aria-hidden="true" />
      <p class="login__blurb">
        Plataforma para el registro, seguimiento y análisis de cohortes de docentes
        en formación dentro del sistema educativo nacional.
      </p>
    </section>

    <!-- Formulario -->
    <section class="login__panel">
      <form class="login__card" @submit.prevent="login">
        <header class="login__head">
          <h2 class="login__title">Iniciar sesión</h2>
          <p class="login__hint">Ingresa tus credenciales institucionales</p>
        </header>

        <label class="field">
          <span class="field__label">Correo electrónico</span>
          <span class="login__input">
            <span class="login__icon" aria-hidden="true">✉</span>
            <input
              v-model="state.loginUser"
              type="email"
              autocomplete="username"
              placeholder="usuario@mineduc.edu.gt">
          </span>
        </label>

        <label class="field">
          <span class="field__label">Contraseña</span>
          <span class="login__input">
            <span class="login__icon" aria-hidden="true">🔒</span>
            <input
              v-model="state.loginPass"
              :type="state.showPass ? 'text' : 'password'"
              autocomplete="current-password"
              placeholder="••••••••">
            <button
              type="button"
              class="login__eye"
              :aria-label="state.showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'"
              @click="toggleShowPass">👁</button>
          </span>
        </label>

        <p v-if="state.loginError" class="login__error" role="alert">{{ state.loginError }}</p>

        <button type="submit" class="btn btn--brand login__submit"><span>→</span> Iniciar sesión</button>

        <p class="login__forgot"><a href="#">¿Olvidó su contraseña?</a></p>
        <p class="login__legal">Sistema de uso exclusivo para personal autorizado de MINEDUC</p>
      </form>
    </section>
  </div>
</template>

<style scoped>
.login { min-height: 100vh; display: flex; font-family: var(--font); }
@media (max-width: 860px) { .login { flex-direction: column; } }

.login__brand {
  flex: 1; min-width: 0; position: relative; overflow: hidden; color: #fff;
  background: linear-gradient(160deg, var(--navy-deep) 0%, var(--navy-mid) 55%, #13314F 100%);
  display: flex; flex-direction: column; justify-content: center; padding: 56px 64px;
}
.login__blob { position: absolute; border-radius: 50%; }
.login__blob--tr { top: -80px; right: -60px; width: 280px; height: 280px; background: rgba(255,255,255,.05); }
.login__blob--bl { bottom: -100px; left: -60px; width: 260px; height: 260px; background: rgba(255,255,255,.04); }

.login__logo { display: flex; align-items: center; gap: 16px; margin-bottom: 44px; position: relative; }
.login__mark {
  width: 52px; height: 52px; border-radius: 12px; background: #fff; color: var(--navy-deep);
  display: flex; align-items: center; justify-content: center; font-size: 26px; font-weight: 800;
}
.login__wordmark { font-size: 22px; font-weight: 800; letter-spacing: -.01em; }
.login__tagline { font-size: 11.5px; color: #C7D2D8; letter-spacing: .03em; white-space: nowrap; }
.login__headline {
  font-size: 36px; font-weight: 800; letter-spacing: -.02em; line-height: 1.2;
  margin: 0 0 24px; position: relative;
}
.login__rule { width: 32px; height: 1px; background: rgba(255,255,255,.3); margin-bottom: 24px; }
.login__blurb { font-size: 13.5px; color: #B7C4CA; max-width: 420px; line-height: 1.6; margin: 0; position: relative; }

.login__panel { flex: 1; min-width: 0; display: flex; align-items: center; justify-content: center; background: var(--bg); padding: 24px; }
.login__card { width: 100%; max-width: 380px; background: #fff; border-radius: var(--r-lg); box-shadow: 0 24px 60px rgba(0,0,0,.08); padding: 36px 32px; }
.login__head { text-align: center; margin-bottom: 22px; }
.login__title { font-size: 21px; font-weight: 800; color: var(--navy); letter-spacing: -.01em; margin: 0; }
.login__hint { font-size: 12.5px; color: var(--muted); margin: 8px 0 0; }

.login .field { margin-bottom: 14px; }
.login .field__label { font-size: 11px; letter-spacing: .03em; font-weight: 700; color: var(--text); margin-bottom: 7px; }
.login__input {
  display: flex; align-items: center; gap: 9px; border: 1px solid var(--border-2);
  border-radius: 10px; padding: 0 12px; background: var(--bg-soft);
}
.login__input:focus-within { border-color: var(--blue); }
.login__input input { flex: 1; min-width: 0; border: none; background: transparent; padding: 10px 0; font-size: 13.5px; font-family: inherit; outline: none; }
.login__icon { color: #8C9895; font-size: 14px; flex-shrink: 0; }
.login__eye { border: none; background: transparent; color: #8C9895; cursor: pointer; font-size: 13px; padding: 4px; }

.login__error { font-size: 12px; color: var(--danger); margin: 0 0 10px; }
.login__submit { width: 100%; margin-top: 10px; }
.login__forgot { text-align: center; margin: 16px 0 0; }
.login__forgot a { font-size: 12.5px; color: var(--teal); text-decoration: none; }
.login__legal {
  text-align: center; margin: 20px 0 0; padding-top: 16px;
  border-top: 1px solid #EEF1F0; font-size: 11px; color: #9AA6A3;
}
</style>
