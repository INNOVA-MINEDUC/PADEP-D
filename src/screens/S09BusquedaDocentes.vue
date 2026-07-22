<script setup>
import { computed } from 'vue'
import { usePadep, SEED } from '@/stores/padep'
import { pillClass, estatusTone, plural } from '@/utils/format'

const { state, docentes, openDrawer, openFicha, clearFiltrosDocentes } = usePadep()

const sedeOptions = ['Todas', ...new Set(SEED.map(d => d.sede))]
const estatusOptions = ['Todos', ...new Set(SEED.map(d => d.estatus))]

const filtrados = computed(() => docentes.value.filter(d =>
  d.nombre.toLowerCase().includes(state.s9Query.toLowerCase()) &&
  (state.s9Sede === 'Todas' || d.sede === state.s9Sede) &&
  (state.s9Estatus === 'Todos' || d.estatus === state.s9Estatus)
))

const hayFiltros = computed(() =>
  !!state.s9Query || state.s9Sede !== 'Todas' || state.s9Estatus !== 'Todos')
</script>

<template>
  <div>
    <p class="eyebrow eyebrow--plain">Registro Inicial (Docente)</p>
    <h1 class="page-title">Búsqueda y Consulta de Docentes</h1>
    <p class="page-sub">Buscar y filtrar docentes registrados.</p>

    <section class="card card--flat filtros">
      <header class="filtros__head">
        <span aria-hidden="true">⛃</span>
        <h2 class="filtros__title">Filtrar información</h2>
        <span class="count-badge">{{ plural(filtrados.length, 'docente', 'docentes') }}</span>
      </header>

      <div class="filtros__grid">
        <label class="field field--tight">
          <span class="field__label">Nombre</span>
          <input v-model="state.s9Query" class="input" type="search" placeholder="Buscar por nombre...">
        </label>
        <label class="field field--tight">
          <span class="field__label">Sede</span>
          <select v-model="state.s9Sede" class="select">
            <option v-for="o in sedeOptions" :key="o" :value="o">{{ o }}</option>
          </select>
        </label>
        <label class="field field--tight">
          <span class="field__label">Estatus</span>
          <select v-model="state.s9Estatus" class="select">
            <option v-for="o in estatusOptions" :key="o" :value="o">{{ o }}</option>
          </select>
        </label>
      </div>

      <footer v-if="hayFiltros" class="filtros__foot">
        <button class="btn btn--ghost btn--sm" @click="clearFiltrosDocentes">Limpiar filtros</button>
      </footer>
    </section>

    <div class="table-wrap card--flat">
      <table class="table">
        <thead>
          <tr>
            <th>Docente</th><th>Sede</th><th>Cohorte</th><th>Estatus</th>
            <th><span class="sr-only">Acciones</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="filtrados.length === 0">
            <td colspan="5" class="empty">Sin resultados para esta búsqueda.</td>
          </tr>
          <tr v-for="d in filtrados" :key="d.id" class="is-clickable" @click="openDrawer(d.id)">
            <td>
              <div class="cell-name">{{ d.nombre }}</div>
              <div class="cell-dpi mono">{{ d.dpi }}</div>
            </td>
            <td>{{ d.sede }}</td>
            <td class="mono">{{ state.cohorte.codigo }}</td>
            <td><span :class="pillClass(estatusTone(d.estatus))">{{ d.estatus }}</span></td>
            <td class="is-right">
              <button class="btn-link" @click.stop="openFicha(d.id)">Ver ficha →</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.filtros { padding: 18px; margin-bottom: 20px; }
.filtros__head { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; color: var(--muted-2); }
.filtros__title { margin: 0; font-size: 15px; font-weight: 600; color: var(--ink); }
.filtros__grid { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr); gap: 14px; }
@media (max-width: 720px) { .filtros__grid { grid-template-columns: 1fr; } }
.field--tight { margin-bottom: 0; }
.filtros__foot { display: flex; justify-content: flex-end; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--border-3); }
.btn--sm { height: 36px; padding: 0 12px; font-size: 13px; }

.is-clickable { cursor: pointer; }
.cell-name { font-size: 13px; font-weight: 600; color: var(--ink); }
.cell-dpi { font-size: 11px; color: var(--muted-2); }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
</style>
