<script setup>
import { computed } from 'vue'
import { usePadep, SEED } from '@/stores/padep'
import StatBar from '@/components/StatBar.vue'
import FileDropzone from '@/components/FileDropzone.vue'
import FilePreview from '@/components/FilePreview.vue'
import { pillClass, resultadoTone, plural } from '@/utils/format'

const { state, setUploaded } = usePadep()

const sinDatos = computed(() => SEED.filter(d => d.resultado === '-').length)
const aviso = computed(() =>
  `${plural(sinDatos.value, 'docente no reconocido', 'docentes no reconocidos')} en el archivo cargado.`)
</script>

<template>
  <div>
    <p class="eyebrow">Registro Inicial (Docente)</p>
    <h1 class="page-title">Carga de Resultados de Admisión</h1>
    <p class="page-sub">Importar el archivo con los resultados de la prueba de admisión.</p>

    <StatBar />

    <FileDropzone
      v-if="!state.s7Uploaded"
      variant="plain"
      title="Resultados de admisión"
      hint="Formato aceptado: PDF o Excel"
      @select="setUploaded('s7Uploaded', true)" />

    <template v-else>
      <FilePreview filename="resultados_admision.pdf" accent="#B3261E" badge="" />

      <p v-if="sinDatos" class="notice notice--clay">{{ aviso }}</p>

      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Docente</th><th>Sede</th><th>Resultado</th></tr></thead>
          <tbody>
            <tr v-for="c in SEED" :key="c.id">
              <td class="is-strong">{{ c.nombre }}</td>
              <td>{{ c.sede }}</td>
              <td>
                <span :class="pillClass(resultadoTone(c.resultado))">
                  {{ c.resultado === '-' ? 'Sin datos' : c.resultado }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="btn-row">
        <button class="btn btn--brand">Confirmar carga</button>
        <button class="btn btn--outline" @click="setUploaded('s7Uploaded', false)">Subir otro archivo</button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.table-wrap { margin-bottom: 16px; }
</style>
