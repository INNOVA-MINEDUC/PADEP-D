<script setup>
/**
 * Cambiar la contraseña propia, desde el menú del perfil.
 *
 * Pide la actual aunque haya sesión: un token robado no basta para quedarse con
 * la cuenta. La API cierra las demás sesiones de la persona y devuelve un token
 * nuevo para esta, que el cliente guarda solo (`api/auth.js`).
 *
 * Las reglas (8+ caracteres, distinta del correo) las comprueba la API y su
 * mensaje se enseña tal cual; aquí solo se mira que las dos nuevas coincidan,
 * que es lo único que la API no puede saber.
 */
import { ref, watch } from 'vue'
import { usePadep } from '@/stores/padep'
import { useEscape } from '@/utils/useEscape'
import AvisoError from '@/components/AvisoError.vue'

const { state, cambiaMiPassword, cierraCambioPassword } = usePadep()

const actual = ref('')
const nueva = ref('')
const repite = ref('')
const error = ref('')
const hecho = ref(false)
const ocupado = ref(false)

// Cada vez que se abre, limpio: no se queda una contraseña escrita en memoria.
watch(() => state.cambioPassword, abierto => {
  if (!abierto) return
  actual.value = nueva.value = repite.value = error.value = ''
  hecho.value = false
})

useEscape(() => { if (state.cambioPassword && !ocupado.value) cierraCambioPassword() })

async function guarda() {
  error.value = ''
  if (nueva.value !== repite.value) {
    error.value = 'Las dos contraseñas nuevas no coinciden.'
    return
  }
  ocupado.value = true
  try {
    await cambiaMiPassword(actual.value, nueva.value)
    actual.value = nueva.value = repite.value = ''
    hecho.value = true
  } catch (e) {
    error.value = e.message
  } finally {
    ocupado.value = false
  }
}
</script>

<template>
  <div v-if="state.cambioPassword" class="overlay" @click.self="!ocupado && cierraCambioPassword()">
    <form class="dialog" role="dialog" aria-modal="true" aria-labelledby="pw-title" @submit.prevent="guarda">
      <h2 id="pw-title" class="dialog__title">Cambiar contraseña</h2>

      <template v-if="hecho">
        <p class="dialog__body">
          Listo. Tus otras sesiones —en otros equipos o navegadores— se cerraron;
          esta sigue abierta.
        </p>
        <div class="dialog__actions">
          <button type="button" class="btn btn--brand" @click="cierraCambioPassword">Cerrar</button>
        </div>
      </template>

      <template v-else>
        <AvisoError :mensaje="error" />
        <label class="campo">
          <span>Contraseña actual</span>
          <input v-model="actual" class="input" type="password" autocomplete="current-password" required>
        </label>
        <label class="campo">
          <span>Contraseña nueva</span>
          <input v-model="nueva" class="input" type="password" autocomplete="new-password" minlength="8" required>
          <small>8 caracteres o más, distinta de tu correo.</small>
        </label>
        <label class="campo">
          <span>Repite la nueva</span>
          <input v-model="repite" class="input" type="password" autocomplete="new-password" minlength="8" required>
        </label>
        <div class="dialog__actions">
          <button type="button" class="btn btn--outline" :disabled="ocupado" @click="cierraCambioPassword">Cancelar</button>
          <button class="btn btn--brand" :disabled="ocupado">{{ ocupado ? 'Guardando…' : 'Cambiar' }}</button>
        </div>
      </template>
    </form>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed; inset: 0; z-index: 50; background: rgba(11,20,35,.45);
  display: flex; align-items: center; justify-content: center; padding: 16px;
}
.dialog { background: #fff; border-radius: var(--r-lg); box-shadow: 0 24px 60px rgba(0,0,0,.25); padding: 26px; width: 100%; max-width: 400px; }
.dialog__title { margin: 0 0 14px; font-size: 15px; font-weight: 700; color: var(--navy); }
.dialog__body { margin: 0 0 20px; font-size: 13px; color: var(--muted); line-height: 1.5; }
.dialog__actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 6px; }
.dialog__actions .btn { height: 38px; border-radius: 10px; font-size: 13px; }
.campo { display: block; margin-bottom: 14px; }
.campo span { display: block; font-size: 12.5px; font-weight: 600; margin-bottom: 6px; color: var(--text); }
.campo small { display: block; margin-top: 5px; font-size: 12px; color: var(--muted); }
.campo .input { width: 100%; border-radius: 10px; padding: 9px 11px; font-size: 13.5px; }
</style>
