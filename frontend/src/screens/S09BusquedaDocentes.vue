<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { usePadep } from '@/stores/padep'
import { api } from '@/api/extraccion'
import { usaDocentes } from '@/composables/usaDocentes'
import { CARRERAS } from '@/data/carreras'
import { pillClass, estadoNotaTone, plural } from '@/utils/format'
import AvisoError from '@/components/AvisoError.vue'
import Paginador from '@/components/Paginador.vue'
import Icono from '@/components/Icono.vue'

/**
 * Búsqueda sobre MySQL (`GET /docentes`). Filtra el servidor, no el
 * navegador: son más de mil inscripciones y llegan de 50 en 50.
 *
 * Busca en todas las cohortes —la columna Cohorte lo dice—. El texto vale para
 * nombre (sin tildes ni mayúsculas), principio del código PADEP o CUI exacto.
 */
const POR_PAGINA = 50
const ESTADOS = ['APROBADO', 'CDR', 'REPROBADO', 'PENDIENTE']
const { state, openDrawer, clearFiltrosDocentes } = usePadep()

const filtros = () => ({
  q: state.s9Query.trim(),
  id_departamento: state.s9Dep,
  id_municipio: state.s9Mun,
  carrera: state.s9Carrera,
  estado: state.s9Estado,
})
const { filas, total, paginas, pagina, cargando, error } = usaDocentes(filtros, POR_PAGINA)

// Geografía de la base, en cascada como en Sedes.
const departamentos = ref([])
const municipios = ref([])
const lee = (p) => p.catch(e => { error.value = e.message; return [] })
onMounted(async () => {
  departamentos.value = await lee(api.departamentos())
  if (state.s9Dep) municipios.value = await lee(api.municipios(state.s9Dep))
})
watch(() => state.s9Dep, async d => {
  state.s9Mun = null
  municipios.value = d ? await lee(api.municipios(d)) : []
})

const hayFiltros = computed(() => !!(state.s9Query || state.s9Dep || state.s9Carrera || state.s9Estado))

const pct = (v) => v == null ? '—' : `${Math.round(v)} %`
</script>

<template>
  <div>
    <p class="eyebrow eyebrow--plain">Registro Inicial (Docente)</p>
    <h1 class="page-title">Búsqueda y Consulta de Docentes</h1>
    <p class="page-sub">Buscar y filtrar los docentes cargados en la base.</p>

    <AvisoError :mensaje="error" />

    <section class="card card--flat filtros">
      <header class="filtros__head">
        <Icono nombre="filtro" />
        <h2 class="filtros__title">Filtrar información</h2>
        <span class="count-badge">{{ cargando ? '…' : plural(total, 'inscripción', 'inscripciones') }}</span>
      </header>

      <div class="filtros__grid">
        <label class="field field--tight filtros__q">
          <span class="field__label">Nombre, código PADEP o CUI</span>
          <input v-model="state.s9Query" class="input" type="search" placeholder="Buscar…">
        </label>
        <label class="field field--tight">
          <span class="field__label">Departamento</span>
          <select v-model="state.s9Dep" class="select">
            <option :value="null">Todos</option>
            <option v-for="d in departamentos" :key="d.id_departamento" :value="d.id_departamento">{{ d.nombre }}</option>
          </select>
        </label>
        <label class="field field--tight">
          <span class="field__label">Municipio</span>
          <select v-model="state.s9Mun" class="select" :disabled="!state.s9Dep">
            <option :value="null">Todos</option>
            <option v-for="m in municipios" :key="m.id_municipio" :value="m.id_municipio">{{ m.nombre }}</option>
          </select>
        </label>
        <label class="field field--tight">
          <span class="field__label">Carrera</span>
          <select v-model="state.s9Carrera" class="select">
            <option value="">Todas</option>
            <option v-for="(n, c) in CARRERAS" :key="c" :value="c">{{ c }} — {{ n }}</option>
          </select>
        </label>
        <label class="field field--tight">
          <span class="field__label">Con alguna nota</span>
          <select v-model="state.s9Estado" class="select">
            <option value="">Cualquiera</option>
            <option v-for="e in ESTADOS" :key="e" :value="e">{{ e }}</option>
          </select>
        </label>
      </div>

      <footer v-if="hayFiltros" class="filtros__foot">
        <button class="btn btn--ghost btn--sm" @click="clearFiltrosDocentes">Limpiar filtros</button>
      </footer>
    </section>

    <div class="table-wrap table-wrap--scroll card--flat" :class="{ 'is-loading': cargando }">
      <table class="table">
        <thead>
          <tr>
            <th>Docente</th><th>Cohorte</th><th>Carrera</th><th>Municipio</th>
            <th>Notas</th><th class="is-right">Promedio</th><th class="is-right">Asistencia</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!cargando && filas.length === 0">
            <td colspan="7" class="empty">{{ error ? 'No se pudo leer la lista.' : 'Sin resultados para esta búsqueda.' }}</td>
          </tr>
          <tr v-for="d in filas" :key="`${d.codigo_padep}-${d.cohorte}-${d.carrera}`"
            class="is-clickable" tabindex="0"
            @click="openDrawer(d.codigo_padep)" @keydown.enter="openDrawer(d.codigo_padep)">
            <td>
              <div class="cell-name">{{ d.nombre }}</div>
              <div class="cell-dpi mono">{{ d.codigo_padep }} · CUI {{ d.cui }}</div>
            </td>
            <td class="mono">{{ d.cohorte }}</td>
            <td class="mono" :title="d.carrera_nombre">{{ d.carrera }}</td>
            <td>
              <div>{{ d.municipio || '—' }}</div>
              <div class="cell-dpi">{{ d.departamento }}</div>
            </td>
            <td>
              <span v-if="d.notas === 0" class="cell-dpi">Sin notas</span>
              <div v-else class="notas">
                <span v-if="d.aprobadas" :class="pillClass(estadoNotaTone('APROBADO'))">{{ d.aprobadas }} aprob.</span>
                <span v-if="d.cdr" :class="pillClass(estadoNotaTone('CDR'))">{{ d.cdr }} CDR</span>
                <span v-if="d.reprobadas" :class="pillClass(estadoNotaTone('REPROBADO'))">{{ d.reprobadas }} reprob.</span>
              </div>
            </td>
            <td class="is-right mono">{{ d.promedio ?? '—' }}</td>
            <td class="is-right mono" :title="`${d.presentes} de ${d.sesiones} sesiones`">{{ pct(d.asistencia_porcentaje) }}</td>
          </tr>
        </tbody>
      </table>
      <Paginador v-model:pagina="pagina" :paginas="paginas" :total="total" :por-pagina="POR_PAGINA" :cargando="cargando" />
    </div>
  </div>
</template>

<style scoped>
.filtros { padding: 18px; margin-bottom: 20px; }
.filtros__head { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; color: var(--muted-2); }
.filtros__title { margin: 0; font-size: 15px; font-weight: 600; color: var(--ink); }
.filtros__grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
.filtros__q { grid-column: 1 / -1; }
@media (max-width: 720px) { .filtros__grid { grid-template-columns: 1fr; } }
.field--tight { margin-bottom: 0; }
.filtros__foot { display: flex; justify-content: flex-end; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--border-3); }
.btn--sm { height: 36px; padding: 0 12px; font-size: 13px; }

.is-clickable { cursor: pointer; }
.is-loading tbody { opacity: .5; }
.cell-name { font-size: 13px; font-weight: 600; color: var(--ink); }
.cell-dpi { font-size: 12px; color: var(--muted-2); }
.notas { display: flex; gap: 4px; flex-wrap: wrap; }
</style>
