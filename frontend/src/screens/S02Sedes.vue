<script setup>
import { computed } from 'vue'
import { usePadep, GEO } from '@/stores/padep'
import ModuleStepper from '@/components/ModuleStepper.vue'
import CohorteContext from '@/components/CohorteContext.vue'

const { state, selectDepartamento, selectMunicipio, selectCentro, addSede, askRemoveSede } = usePadep()

const departamentos = Object.keys(GEO)
const municipios = computed(() => Object.keys(GEO[state.sedeSel.dep]))
const centros = computed(() => GEO[state.sedeSel.dep][state.sedeSel.mun] ?? [])
</script>

<template>
  <div>
    <ModuleStepper :active-id="2" />

    <p class="eyebrow">Configuración de Cohorte</p>
    <h1 class="page-title">Sedes y Centros Educativos</h1>
    <p class="page-sub">Seleccionar los departamentos, municipios y centros educativos de la cohorte.</p>

    <div class="grid-main">
      <div>
        <section class="card picker">
          <div class="grid-auto">
            <label class="field field--tight">
              <span class="picker__label">Departamento</span>
              <select
                class="select"
                :value="state.sedeSel.dep"
                @change="selectDepartamento($event.target.value)">
                <option v-for="d in departamentos" :key="d" :value="d">{{ d }}</option>
              </select>
            </label>

            <label class="field field--tight">
              <span class="picker__label">Municipio</span>
              <select
                class="select"
                :value="state.sedeSel.mun"
                @change="selectMunicipio($event.target.value)">
                <option v-for="m in municipios" :key="m" :value="m">{{ m }}</option>
              </select>
            </label>

            <label class="field field--tight">
              <span class="picker__label">Sede / centro educativo</span>
              <select
                class="select"
                :value="state.sedeSel.sede"
                @change="selectCentro($event.target.value)">
                <option v-for="c in centros" :key="c" :value="c">{{ c }}</option>
              </select>
            </label>
          </div>

          <button class="btn btn--outline" @click="addSede">+ Agregar sede</button>
        </section>

        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Departamento</th>
                <th>Municipio</th>
                <th>Sede</th>
                <th><span class="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="state.sedes.length === 0">
                <td colspan="4" class="empty">
                  <div class="empty-state__icon" aria-hidden="true">📍</div>
                  <p class="empty-state__title">Aún no hay sedes agregadas</p>
                  <p class="empty-state__hint">Usa el formulario de arriba para agregar la primera sede de esta cohorte.</p>
                </td>
              </tr>
              <tr v-for="row in state.sedes" :key="row.id">
                <td>{{ row.departamento }}</td>
                <td>{{ row.municipio }}</td>
                <td class="is-strong">{{ row.sede }}</td>
                <td class="is-right">
                  <button class="btn-link btn-link--danger" @click="askRemoveSede(row.id, row.sede)">Quitar</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="btn-row save-row">
          <button class="btn btn--brand">Guardar</button>
        </div>
      </div>

      <CohorteContext />
    </div>
  </div>
</template>

<style scoped>
.picker { padding: 22px; margin-bottom: 22px; }
.picker .grid-auto { margin-bottom: 16px; }
.picker__label { display: block; font-size: 12.5px; font-weight: 600; margin-bottom: 6px; color: var(--text); }
.field--tight { margin-bottom: 0; }
.picker .select { border-radius: 10px; padding: 9px 11px; font-size: 13.5px; }
.save-row { margin-top: 16px; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
</style>
