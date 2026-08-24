<script setup>
import { computed } from 'vue'
import { usePadep } from '@/stores/padep'
import ModuleStepper from '@/components/ModuleStepper.vue'
import CohorteContext from '@/components/CohorteContext.vue'

const { state, asignarEnlace } = usePadep()

/** Cada sede con su enlace asignado (o marcador de pendiente). */
const filas = computed(() => state.sedes.map(sede => {
  const enlace = state.enlaces.find(e => e.sedeId === sede.id)
  return {
    id: sede.id,
    sedeName: sede.sede,
    nombre: enlace?.nombre ?? 'Sin asignar',
    asignado: !!enlace,
    cargo: enlace?.cargo || '—',
    contacto: enlace?.contacto || '—',
  }
}))
</script>

<template>
  <div>
    <ModuleStepper :active-id="3" />

    <p class="eyebrow">Configuración de Cohorte</p>
    <h1 class="page-title">Asignación de Enlaces DIDEDUC</h1>
    <p class="page-sub">Asignar el profesional enlace responsable de cada sede de la cohorte.</p>

    <div class="grid-main">
      <div>
        <template v-if="state.sedes.length > 0">
          <form class="card asignar" @submit.prevent="asignarEnlace">
            <label class="field field--tight">
              <span class="asignar__label">Sede</span>
              <select v-model="state.enlaceForm.sedeId" class="select">
                <option v-for="s in state.sedes" :key="s.id" :value="s.id">{{ s.sede }}</option>
              </select>
            </label>
            <label class="field field--tight">
              <span class="asignar__label">Nombre del enlace</span>
              <input v-model="state.enlaceForm.nombre" class="input" placeholder="Nombre completo">
            </label>
            <label class="field field--tight">
              <span class="asignar__label">Cargo</span>
              <input v-model="state.enlaceForm.cargo" class="input" placeholder="Ej. Supervisor educativo">
            </label>
            <label class="field field--tight">
              <span class="asignar__label">Contacto</span>
              <input v-model="state.enlaceForm.contacto" class="input" placeholder="Teléfono o correo">
            </label>
          </form>

          <div class="btn-row asignar__actions">
            <button class="btn btn--brand" @click="asignarEnlace">Asignar</button>
            <button class="btn btn--outline">Registrar enlace nuevo</button>
          </div>

          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr><th>Sede</th><th>Enlace</th><th>Cargo</th><th>Contacto</th></tr>
              </thead>
              <tbody>
                <tr v-for="row in filas" :key="row.id">
                  <td class="is-strong">{{ row.sedeName }}</td>
                  <td :class="{ 'is-pending': !row.asignado }">{{ row.nombre }}</td>
                  <td>{{ row.cargo }}</td>
                  <td>{{ row.contacto }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="btn-row save-row"><button class="btn btn--brand">Guardar</button></div>
        </template>

        <div v-else class="card empty-state">
          <div class="empty-state__icon" aria-hidden="true">👤</div>
          <p class="empty-state__title">Sin sedes disponibles</p>
          <p class="empty-state__hint">Primero agrega sedes en la pantalla anterior para poder asignarles un enlace.</p>
        </div>
      </div>

      <CohorteContext />
    </div>
  </div>
</template>

<style scoped>
.asignar {
  padding: 22px; margin-bottom: 18px;
  display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 14px; align-items: end;
}
.asignar__label { display: block; font-size: 12.5px; font-weight: 600; margin-bottom: 6px; color: var(--text); }
.asignar .input, .asignar .select { border-radius: 10px; padding: 9px 11px; font-size: 13.5px; }
.field--tight { margin-bottom: 0; }
.asignar__actions { margin-bottom: 22px; }
.save-row { margin-top: 16px; }
.is-pending { color: var(--warning); }
</style>
