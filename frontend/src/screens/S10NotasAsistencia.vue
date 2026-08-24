<script setup>
import { usePadep } from '@/stores/padep'
import FileDropzone from '@/components/FileDropzone.vue'
import FilePreview from '@/components/FilePreview.vue'

const { state, inscritos, setUploaded, goTo } = usePadep()
</script>

<template>
  <div>
    <p class="eyebrow eyebrow--plain">Ficha Académica / Seguimiento</p>
    <h1 class="page-title">Carga de Notas y Asistencia</h1>
    <p class="page-sub">Importar el archivo de notas y asistencia por docente, curso/módulo y periodo.</p>

    <label class="field cohorte-field">
      <span class="field__label">Cohorte</span>
      <select class="select"><option>{{ state.cohorte.codigo }} (preseleccionada)</option></select>
    </label>

    <FileDropzone v-if="!state.s10Uploaded" @select="setUploaded('s10Uploaded', true)" />

    <template v-else>
      <FilePreview filename="notas_asistencia.xlsx" />

      <div class="table-wrap table-wrap--scroll">
        <table class="table">
          <thead>
            <tr><th>Docente</th><th>Sede</th><th class="col-num">Nota</th><th class="col-num">Asistencia</th></tr>
          </thead>
          <tbody>
            <tr v-for="d in inscritos" :key="d.id">
              <td class="is-strong">{{ d.nombre }}</td>
              <td>{{ d.sede }}</td>
              <td>{{ d.notas }}</td>
              <td>{{ d.asistencia }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="btn-row">
        <button class="btn btn--primary" @click="goTo(12)">Confirmar carga</button>
        <button class="btn btn--ghost" @click="setUploaded('s10Uploaded', false)">Subir otro archivo</button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.cohorte-field { max-width: 320px; margin-bottom: 24px; }
.table-wrap { margin-bottom: 20px; }
.col-num { width: 110px; }
</style>
