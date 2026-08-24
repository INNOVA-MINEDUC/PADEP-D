<script setup>
import { computed } from 'vue'
import { usePadep, SEED } from '@/stores/padep'
import StatBar from '@/components/StatBar.vue'
import FileDropzone from '@/components/FileDropzone.vue'
import FilePreview from '@/components/FilePreview.vue'
import { pillClass, plural } from '@/utils/format'

const { state, setUploaded, goTo } = usePadep()

const incompletos = computed(() => SEED.filter(d => d.incompleto).length)
const aviso = computed(() =>
  `${plural(incompletos.value, 'registro', 'registros')} con datos incompletos — revísalos antes de confirmar.`)
</script>

<template>
  <div>
    <p class="eyebrow eyebrow--plain">Registro Inicial (Docente)</p>
    <h1 class="page-title">Carga Inicial de Candidatos</h1>
    <p class="page-sub">Importar el listado inicial de docentes candidatos a partir de un archivo.</p>

    <StatBar />

    <FileDropzone v-if="!state.s5Uploaded" @select="setUploaded('s5Uploaded', true)" />

    <template v-else>
      <FilePreview filename="candidatos_preinscritos.xlsx" />

      <p v-if="incompletos" class="notice notice--warn">⚠ {{ aviso }}</p>

      <div class="table-wrap table-wrap--scroll">
        <table class="table table--wide">
          <thead>
            <tr>
              <th>Nombre</th><th>Idioma</th><th>Etnia</th><th>Sede</th>
              <th>Escalafón</th><th>DPI</th><th>Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in SEED" :key="c.id">
              <td class="is-strong">{{ c.nombre }}</td>
              <td>{{ c.idioma }}</td>
              <td>{{ c.etnia }}</td>
              <td>{{ c.sede }}</td>
              <td>{{ c.escalafon }}</td>
              <td class="mono">{{ c.dpi }}</td>
              <td>
                <span :class="pillClass(c.incompleto ? 'clay' : 'success')">
                  {{ c.incompleto ? 'Incompleto' : 'Completo' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <label class="field cohorte-field">
        <span class="field__label">Cohorte</span>
        <select class="select"><option>{{ state.cohorte.codigo }} (preseleccionada)</option></select>
      </label>

      <div class="btn-row">
        <button class="btn btn--primary" @click="goTo(8)">Confirmar carga</button>
        <button class="btn btn--ghost" @click="setUploaded('s5Uploaded', false)">Subir otro archivo</button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.table--wide { min-width: 960px; }
.table-wrap { margin-bottom: 20px; }
.cohorte-field { max-width: 320px; margin-bottom: 20px; }
</style>
