<script setup>
import { computed } from 'vue'
import { usePadep } from '@/stores/padep'
import FileDropzone from '@/components/FileDropzone.vue'
import FilePreview from '@/components/FilePreview.vue'
import { pillClass } from '@/utils/format'

const { state, inscritos, setUploaded, toggleMarcado } = usePadep()

/**
 * El prototipo marca como ausente al tercer inscrito para demostrar la
 * detección de retiros. Sustituir por el diff real contra la nómina cargada.
 */
const AUSENTE_INDEX = 2

const filas = computed(() => inscritos.value.map((d, i) => ({
  id: d.id,
  nombre: d.nombre,
  ausente: i === AUSENTE_INDEX,
  marcado: state.s11Marcados.includes(d.id),
})))
</script>

<template>
  <div>
    <p class="eyebrow eyebrow--plain">Ficha Académica / Seguimiento</p>
    <h1 class="page-title">Comparación de Nóminas</h1>
    <p class="page-sub">
      Importar la nómina reportada para compararla contra la nómina vigente y detectar posibles retiros.
    </p>

    <FileDropzone
      v-if="!state.s11Uploaded"
      title="Arrastre y suelte la nómina reportada aquí"
      @select="setUploaded('s11Uploaded', true)" />

    <template v-else>
      <FilePreview filename="nomina_reportada.xlsx" />

      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Docente</th><th>Nómina vigente</th><th>Nómina reportada</th>
              <th><span class="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in filas" :key="r.id" :class="{ 'is-flagged': r.ausente }">
              <td class="is-strong">{{ r.nombre }}</td>
              <td><span :class="pillClass('success')">Presente</span></td>
              <td><span :class="pillClass(r.ausente ? 'danger' : 'success')">{{ r.ausente ? 'Ausente' : 'Presente' }}</span></td>
              <td class="is-right">
                <button v-if="r.ausente" class="btn-link" @click="toggleMarcado(r.id)">
                  {{ r.marcado ? 'Marcado para revisión ✓' : 'Marcar para revisión' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="btn-row">
        <button class="btn btn--ghost btn--bordered" @click="setUploaded('s11Uploaded', false)">Subir otra nómina</button>
        <span class="hint">Las filas resaltadas indican docentes ausentes en la nómina reportada frente a la vigente.</span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.table-wrap { margin-bottom: 16px; }
.btn--bordered { background: #fff; border: 1px solid #D1D5DB; }
.hint { font-size: 12.5px; color: var(--muted-2); }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
</style>
