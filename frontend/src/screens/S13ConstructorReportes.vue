<script setup>
import { ref, computed, onMounted } from 'vue'
import { usePadep } from '@/stores/padep'
import { usaReporte } from '@/composables/usaReporte'
import AvisoError from '@/components/AvisoError.vue'
import Paginador from '@/components/Paginador.vue'
import Icono from '@/components/Icono.vue'
import { plural } from '@/utils/format'

/**
 * Constructor de reportes: se elige de qué (docentes, notas, asistencia),
 * cómo (listado fila a fila o resumen agrupado), qué columnas o medidas y qué
 * filtros; la vista previa se actualiza sola y se exporta a Excel o CSV.
 *
 * La pantalla solo arma una especificación: qué se puede cruzar, y cómo, lo
 * decide la API con su lista blanca (`api/reportes.py`). Por eso aquí no hay
 * ninguna regla de negocio repetida, salvo para no ofrecer lo que la API
 * rechazaría.
 */
const { state, goTo, nuevoReporte } = usePadep()
const r = usaReporte()
const {
  catalogo, errorCatalogo, fuente, campos, deRol, porGrupo,
  resultado, error, cargando, pagina, listo, pendientes, exportando, POR_PAGINA,
} = r

onMounted(() => { r.cargaCatalogo(); r.pideTrimestres() })

const rep = computed(() => state.reporte)
const esResumen = computed(() => rep.value.modo === 'resumen')

// --- Selección de campos: un clic pone o quita; el orden es el de elección.
function alterna(lista, id) {
  const l = rep.value[lista]
  const i = l.indexOf(id)
  if (i >= 0) l.splice(i, 1)
  else l.push(id)
}
/** Periodo de la fuente docentes: vacío = todo lo cargado. */
function alternaTrimestre(t) {
  const l = rep.value.trimestres ?? (rep.value.trimestres = [])
  const i = l.indexOf(t)
  if (i >= 0) l.splice(i, 1)
  else l.push(t)
  l.sort((a, b) => a - b)
}

function mueve(lista, i, paso) {
  const l = rep.value[lista]
  const j = i + paso
  if (j < 0 || j >= l.length) return
  ;[l[i], l[j]] = [l[j], l[i]]
}
const SECCIONES = computed(() => esResumen.value
  ? [
      { lista: 'agrupar', titulo: 'Agrupar por', ayuda: 'Una fila por cada combinación. Sin ninguno, un solo total.', roles: ['dim'] },
      { lista: 'medidas', titulo: 'Medidas', ayuda: 'Qué se cuenta o se promedia en cada grupo.', roles: ['medida'] },
    ]
  : [{ lista: 'columnas', titulo: 'Columnas', ayuda: 'Una fila por registro de la fuente, con estas columnas.', roles: ['dim', 'valor'] }])

// --- Filtros
const camposFiltro = computed(() => deRol('dim', 'valor', ...(esResumen.value ? ['medida'] : [])))
const operadores = id => catalogo.value?.operadores[campos.value[id]?.tipo] ?? []
const etiquetaOp = op => catalogo.value?.etiquetas_operador[op] ?? op
const tipoInput = id => ({ numero: 'number', fecha: 'date' }[campos.value[id]?.tipo] ?? 'text')
const borrador = ref({})
function agregaValor(f, i, texto) {
  const v = String(texto ?? '').trim()
  if (v && !f.valor.includes(v)) f.valor.push(v)
  borrador.value = { ...borrador.value, [i]: '' }
}

// --- Guardar como plantilla
const guardando = ref(false)
const formGuarda = ref(null)
const errorGuarda = ref('')
const avisoGuarda = ref('')
function abreGuardar(comoNueva) {
  const p = state.reportePlantilla
  formGuarda.value = {
    comoNueva,
    nombre: comoNueva ? '' : p?.nombre ?? '',
    descripcion: comoNueva ? '' : p?.descripcion ?? '',
    compartido: comoNueva ? false : !!p?.compartido,
  }
  errorGuarda.value = ''
}
async function guarda() {
  guardando.value = true
  errorGuarda.value = ''
  try {
    await r.guarda(formGuarda.value, formGuarda.value.comoNueva)
    avisoGuarda.value = `Guardado como «${formGuarda.value.nombre}».`
    formGuarda.value = null
    setTimeout(() => { avisoGuarda.value = '' }, 4000)
  } catch (e) {
    errorGuarda.value = e.message
  } finally {
    guardando.value = false
  }
}

const formato = (v, col) => {
  if (v == null || v === '') return '—'
  if (col.tipo === 'numero' && typeof v === 'number') return v.toLocaleString('es-GT')
  return v
}
</script>

<template>
  <div>
    <p class="eyebrow eyebrow--plain">Reportes Dinámicos</p>
    <h1 class="page-title">Constructor de Reportes</h1>
    <p class="page-sub">
      Arma cualquier cruce de lo cargado en la base: elige la fuente, cómo verlo, las columnas o
      medidas y los filtros. La vista previa se actualiza sola.
    </p>

    <AvisoError :mensaje="errorCatalogo" />

    <div v-if="state.reportePlantilla" class="plantilla">
      <span>
        Editando <strong>{{ state.reportePlantilla.nombre }}</strong>
        <template v-if="!state.reportePlantilla.editable"> (de otra persona: guarda una copia para cambiarla)</template>
      </span>
      <button class="btn-link" @click="nuevoReporte">Empezar uno nuevo</button>
    </div>

    <template v-if="catalogo">
      <!-- 1 y 2: fuente y modo -->
      <section class="card card--flat bloque">
        <div class="card__body pasos">
          <div>
            <p class="paso__titulo"><span class="paso__n">1</span> ¿De qué?</p>
            <div class="segmented" role="radiogroup" aria-label="Fuente">
              <button
                v-for="f in catalogo.fuentes" :key="f.id" role="radio"
                class="segmented__tab" :class="{ 'is-active': rep.fuente === f.id }"
                :aria-checked="rep.fuente === f.id" @click="rep.fuente = f.id">{{ f.etiqueta }}</button>
            </div>
            <p class="ayuda">{{ fuente?.descripcion }}</p>
            <div v-if="fuente?.periodo" class="periodo">
              <p class="periodo__titulo">Notas y asistencia de</p>
              <div class="chips">
                <button
                  class="chip" :class="{ 'is-on': !rep.trimestres?.length }"
                  :aria-pressed="!rep.trimestres?.length" @click="rep.trimestres = []">
                  <span class="chip__mark" aria-hidden="true">{{ !rep.trimestres?.length ? '✓' : '' }}</span>
                  Todo lo cargado
                </button>
                <button
                  v-for="t in r.trimestres.value" :key="t" class="chip"
                  :class="{ 'is-on': rep.trimestres?.includes(t) }"
                  :aria-pressed="!!rep.trimestres?.includes(t)" @click="alternaTrimestre(t)">
                  <span class="chip__mark" aria-hidden="true">{{ rep.trimestres?.includes(t) ? '✓' : '' }}</span>
                  Trimestre {{ t }}
                </button>
              </div>
            </div>
          </div>
          <div>
            <p class="paso__titulo"><span class="paso__n">2</span> ¿Cómo?</p>
            <div class="segmented" role="radiogroup" aria-label="Modo">
              <button
                role="radio" class="segmented__tab" :class="{ 'is-active': esResumen }"
                :aria-checked="esResumen" @click="rep.modo = 'resumen'">Resumen agrupado</button>
              <button
                role="radio" class="segmented__tab" :class="{ 'is-active': !esResumen }"
                :aria-checked="!esResumen" @click="rep.modo = 'listado'">Listado</button>
            </div>
            <p class="ayuda">
              {{ esResumen ? 'Totales, promedios y porcentajes por grupo: por sede, por asignatura…'
                : 'Fila a fila, como una hoja de cálculo.' }}
            </p>
          </div>
        </div>
      </section>

      <p v-if="r.quitados.value.etiquetas.length" class="quitados" role="status">
        {{ r.quitados.value.fuente }} no tiene {{ r.quitados.value.etiquetas.join(', ') }}: se
        {{ r.quitados.value.etiquetas.length === 1 ? 'quitó' : 'quitaron' }} del reporte.
        <button class="btn-link" @click="r.quitados.value = { fuente: '', etiquetas: [] }">Entendido</button>
      </p>

      <!-- 3: campos -->
      <section v-for="s in SECCIONES" :key="s.lista" class="card card--flat bloque">
        <header class="card__head cabeza">
          <span><span class="paso__n">3</span> {{ s.titulo }}</span>
          <span class="count-badge">{{ plural(rep[s.lista].length, 'elegida', 'elegidas') }}</span>
        </header>
        <div class="card__body">
          <p class="ayuda ayuda--arriba">{{ s.ayuda }}</p>
          <div v-if="rep[s.lista].length" class="elegidas">
            <span v-for="(id, i) in rep[s.lista]" :key="id" class="elegida">
              <button class="elegida__mover" :disabled="i === 0" :aria-label="`Mover ${campos[id]?.etiqueta} a la izquierda`" @click="mueve(s.lista, i, -1)">‹</button>
              {{ campos[id]?.etiqueta }}
              <button class="elegida__mover" :disabled="i === rep[s.lista].length - 1" :aria-label="`Mover ${campos[id]?.etiqueta} a la derecha`" @click="mueve(s.lista, i, 1)">›</button>
              <button class="elegida__quitar" :aria-label="`Quitar ${campos[id]?.etiqueta}`" @click="alterna(s.lista, id)">
                <Icono nombre="cerrar" :tam="12" />
              </button>
            </span>
          </div>
          <div v-for="g in porGrupo(deRol(...s.roles))" :key="g.grupo" class="grupo">
            <p class="grupo__titulo">{{ g.grupo }}</p>
            <div class="chips">
              <button
                v-for="c in g.campos" :key="c.id" class="chip"
                :class="{ 'is-on': rep[s.lista].includes(c.id) }" :title="c.ayuda || ''"
                :aria-pressed="rep[s.lista].includes(c.id)" @click="alterna(s.lista, c.id)">
                <span class="chip__mark" aria-hidden="true">{{ rep[s.lista].includes(c.id) ? '✓' : '' }}</span>
                {{ c.etiqueta }}
              </button>
            </div>
          </div>
        </div>
      </section>
      <p v-if="!catalogo.datos_personales" class="ayuda personales">
        Tu rol no tiene acceso a datos personales: nombre, CUI, DPI, fecha de nacimiento y partida no
        aparecen en la lista.
      </p>

      <!-- 4: filtros -->
      <section class="card card--flat bloque">
        <header class="card__head cabeza">
          <span><span class="paso__n">4</span> Filtros</span>
          <span v-if="pendientes" class="count-badge count-badge--aviso">
            {{ plural(pendientes, 'filtro sin completar', 'filtros sin completar') }}: no se aplica
          </span>
        </header>
        <div class="card__body">
          <p v-if="!rep.filtros.length" class="ayuda ayuda--arriba">Sin filtros: entra todo lo cargado.</p>
          <div v-for="(f, i) in rep.filtros" :key="i" class="filtro">
            <select class="select" :value="f.campo" aria-label="Campo" @change="r.cambiaCampoFiltro(f, $event.target.value)">
              <optgroup v-for="g in porGrupo(camposFiltro)" :key="g.grupo" :label="g.grupo">
                <option v-for="c in g.campos" :key="c.id" :value="c.id">{{ c.etiqueta }}</option>
              </optgroup>
            </select>
            <select class="select filtro__op" :value="f.op" aria-label="Operador" @change="r.cambiaOpFiltro(f, $event.target.value)">
              <option v-for="op in operadores(f.campo)" :key="op" :value="op">{{ etiquetaOp(op) }}</option>
            </select>

            <div class="filtro__valor">
              <template v-if="f.op === 'vacio' || f.op === 'no_vacio'" />
              <!-- varios valores -->
              <div v-else-if="f.op === 'en' || f.op === 'no_en'" class="multi">
                <span v-for="(v, k) in f.valor" :key="v" class="elegida elegida--chica">
                  {{ v }}
                  <button class="elegida__quitar" :aria-label="`Quitar ${v}`" @click="f.valor.splice(k, 1)">
                    <Icono nombre="cerrar" :tam="11" />
                  </button>
                </span>
                <select
                  v-if="campos[f.campo]?.tipo === 'enum'" class="select select--sm" value=""
                  aria-label="Añadir valor" @change="agregaValor(f, i, $event.target.value); $event.target.value = ''">
                  <option value="">Añadir…</option>
                  <option v-for="o in campos[f.campo].opciones.filter(o => !f.valor.includes(o))" :key="o" :value="o">{{ o }}</option>
                </select>
                <input
                  v-else class="input input--sm" :type="tipoInput(f.campo)" :list="`sug-${i}`"
                  :value="borrador[i] ?? ''" placeholder="Escribe y pulsa Enter"
                  @focus="r.pideValores(f.campo)"
                  @input="borrador = { ...borrador, [i]: $event.target.value }"
                  @keydown.enter.prevent="agregaValor(f, i, $event.target.value)"
                  @change="agregaValor(f, i, $event.target.value)">
              </div>
              <!-- entre -->
              <div v-else-if="f.op === 'entre'" class="par">
                <input v-model="f.valor[0]" class="input input--sm" :type="tipoInput(f.campo)" aria-label="Desde">
                <span>y</span>
                <input v-model="f.valor[1]" class="input input--sm" :type="tipoInput(f.campo)" aria-label="Hasta">
              </div>
              <select v-else-if="campos[f.campo]?.tipo === 'enum'" v-model="f.valor" class="select" aria-label="Valor">
                <option v-for="o in campos[f.campo].opciones" :key="o" :value="o">{{ o }}</option>
              </select>
              <input
                v-else v-model="f.valor" class="input" :type="tipoInput(f.campo)" :list="`sug-${i}`"
                aria-label="Valor" @focus="r.pideValores(f.campo)">
              <datalist :id="`sug-${i}`">
                <option v-for="v in r.sugerencias(f.campo)" :key="v" :value="v" />
              </datalist>
            </div>

            <button class="btn-link btn-link--danger" @click="rep.filtros.splice(i, 1)">Quitar</button>
          </div>
          <button class="btn btn--outline btn--sm" @click="r.agregaFiltro">+ Añadir filtro</button>
        </div>
      </section>

      <!-- Vista previa y acciones -->
      <section class="card card--flat bloque">
        <header class="card__head cabeza">
          <span>Vista previa</span>
          <span v-if="resultado" class="count-badge">{{ plural(resultado.total, 'fila', 'filas') }}</span>
          <span class="acciones">
            <button
              class="btn btn--outline btn--sm" :disabled="!listo || !resultado?.total || !!exportando"
              @click="r.exporta('csv')">{{ exportando === 'csv' ? 'Exportando…' : 'CSV' }}</button>
            <button
              class="btn btn--primary btn--sm" :disabled="!listo || !resultado?.total || !!exportando"
              @click="r.exporta('xlsx')">{{ exportando === 'xlsx' ? 'Exportando…' : 'Exportar a Excel' }}</button>
            <button
              v-if="state.reportePlantilla?.editable" class="btn btn--outline btn--sm"
              :disabled="!listo" @click="abreGuardar(false)">Guardar cambios</button>
            <button class="btn btn--ghost btn--sm" :disabled="!listo" @click="abreGuardar(true)">
              {{ state.reportePlantilla ? 'Guardar como nueva' : 'Guardar como plantilla' }}
            </button>
          </span>
        </header>

        <form v-if="formGuarda" class="guardar" @submit.prevent="guarda">
          <label class="field field--tight">
            <span class="field__label">Nombre</span>
            <input v-model="formGuarda.nombre" class="input" maxlength="120" required placeholder="Ej. Aprobados por sede, trimestre 2">
          </label>
          <label class="field field--tight">
            <span class="field__label">Descripción (opcional)</span>
            <input v-model="formGuarda.descripcion" class="input" maxlength="500">
          </label>
          <label class="check">
            <input v-model="formGuarda.compartido" type="checkbox">
            Compartir con los demás usuarios
          </label>
          <AvisoError :mensaje="errorGuarda" />
          <div class="btn-row">
            <button class="btn btn--primary btn--sm" :disabled="guardando || !formGuarda.nombre.trim()">
              {{ guardando ? 'Guardando…' : 'Guardar' }}
            </button>
            <button type="button" class="btn btn--ghost btn--sm" @click="formGuarda = null">Cancelar</button>
          </div>
        </form>
        <p v-if="avisoGuarda" class="ok">
          {{ avisoGuarda }} <button class="btn-link" @click="goTo(14)">Ver reportes guardados</button>
        </p>

        <AvisoError :mensaje="error" />
        <p v-if="!listo" class="card__body vacio">
          {{ esResumen ? 'Elige al menos una medida para ver el reporte.' : 'Elige al menos una columna para ver el reporte.' }}
        </p>
        <p v-else-if="cargando && !resultado" class="card__body vacio">Calculando…</p>
        <template v-else-if="resultado">
          <p v-if="!resultado.total" class="card__body vacio">Ninguna fila cumple los filtros.</p>
          <div v-else class="table-wrap table-wrap--scroll plano" :class="{ 'is-loading': cargando }">
            <table class="table">
              <thead>
                <tr>
                  <th
                    v-for="col in resultado.columnas" :key="col.id"
                    :class="{ 'is-right': col.tipo === 'numero' }"
                    :aria-sort="r.direccion(col.id) === 'asc' ? 'ascending' : r.direccion(col.id) === 'desc' ? 'descending' : 'none'">
                    <button class="orden" :title="'Ordenar por ' + col.etiqueta" @click="r.ordena(col.id)">
                      {{ col.etiqueta }}
                      <span aria-hidden="true">{{ r.direccion(col.id) === 'asc' ? '▲' : r.direccion(col.id) === 'desc' ? '▼' : '' }}</span>
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(fila, i) in resultado.filas" :key="i">
                  <td
                    v-for="(v, k) in fila" :key="k"
                    :class="{ 'is-right mono': resultado.columnas[k].tipo === 'numero' }">{{ formato(v, resultado.columnas[k]) }}</td>
                </tr>
              </tbody>
            </table>
            <Paginador
              v-model:pagina="pagina" :paginas="resultado.paginas" :total="resultado.total"
              :por-pagina="POR_PAGINA" :cargando="cargando" />
          </div>
        </template>
      </section>
    </template>
    <p v-else-if="!errorCatalogo" class="vacio">Cargando el catálogo…</p>
  </div>
</template>

<style scoped>
.bloque { margin-bottom: 18px; }
.plantilla {
  display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;
  margin-bottom: 16px; padding: 10px 14px; border-radius: var(--r-md);
  background: var(--blue-bg); border: 1px solid var(--blue-br); font-size: 13px; color: var(--ink);
}
.pasos { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 22px; }
@media (max-width: 820px) { .pasos { grid-template-columns: 1fr; } }
.paso__titulo { margin: 0 0 10px; font-size: 14px; font-weight: 600; color: var(--ink); }
.paso__n {
  display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px;
  margin-right: 6px; border-radius: 50%; background: var(--navy); color: #fff; font-size: 12px; font-weight: 700;
}
.segmented {
  display: inline-flex; flex-wrap: wrap; gap: 2px; padding: 4px; border-radius: 9px; background: var(--teal-bg);
}
.segmented__tab {
  padding: 7px 16px; border-radius: 7px; border: none; cursor: pointer;
  font-family: inherit; font-size: 14px; font-weight: 600; background: transparent; color: var(--teal);
}
.segmented__tab.is-active { background: #fff; color: var(--navy); }
.ayuda { margin: 8px 0 0; font-size: 13px; color: var(--muted-2); line-height: 1.45; }
.ayuda--arriba { margin: 0 0 14px; }
.periodo { margin-top: 14px; }
.quitados {
  margin: 0 0 18px; padding: 10px 14px; border-radius: var(--r-md); font-size: 13px;
  background: var(--warning-bg); color: var(--warning);
}
.periodo__titulo { margin: 0 0 8px; font-size: 12px; font-weight: 600; letter-spacing: .05em; text-transform: uppercase; color: var(--muted-2); }
.personales { margin: -6px 0 18px; }
.cabeza { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.count-badge--aviso { background: var(--warning-bg); color: var(--warning); }

.elegidas { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px dashed var(--border-3); }
.elegida {
  display: inline-flex; align-items: center; gap: 4px; padding: 5px 6px 5px 4px;
  border-radius: var(--r-pill); background: var(--navy); color: #fff; font-size: 13px; font-weight: 600;
}
.elegida--chica { padding: 3px 6px 3px 10px; font-size: 12px; background: var(--blue-bg); color: #1E40AF; }
.elegida__mover, .elegida__quitar {
  display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px;
  border: none; border-radius: 50%; background: transparent; color: inherit; cursor: pointer; font-size: 15px;
}
.elegida__mover:disabled { opacity: .3; cursor: default; }
.elegida__mover:not(:disabled):hover, .elegida__quitar:hover { background: rgba(255,255,255,.18); }
.elegida--chica .elegida__quitar:hover { background: var(--blue-br); }

.grupo + .grupo { margin-top: 14px; }
.grupo__titulo { margin: 0 0 8px; font-size: 12px; font-weight: 600; letter-spacing: .05em; text-transform: uppercase; color: var(--muted-2); }
.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chip {
  display: inline-flex; align-items: center; gap: 8px; padding: 7px 14px;
  border-radius: var(--r-pill); border: 1px solid var(--border-3); background: #fff;
  font-family: inherit; font-size: 13px; font-weight: 600; color: #374151; cursor: pointer;
}
.chip.is-on { border-color: var(--blue); background: var(--blue-bg); color: #1E40AF; }
.chip__mark {
  width: 15px; height: 15px; border-radius: 50%; flex-shrink: 0;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700; color: #fff; border: 1.5px solid #C7CDD6;
}
.chip.is-on .chip__mark { border: none; background: var(--blue); }

.filtro {
  display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, .8fr) minmax(0, 2fr) auto;
  gap: 10px; align-items: center; margin-bottom: 10px;
}
@media (max-width: 820px) { .filtro { grid-template-columns: 1fr; padding-bottom: 12px; border-bottom: 1px solid var(--border-3); } }
.filtro__valor { min-width: 0; }
.multi { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.multi .input, .multi .select { flex: 1; min-width: 140px; }
.par { display: flex; align-items: center; gap: 8px; }
.par .input { flex: 1; min-width: 0; }
.input--sm, .select--sm { height: 36px; padding-top: 0; padding-bottom: 0; }
.btn--sm { height: 36px; padding: 0 12px; font-size: 13px; }

.acciones { display: flex; gap: 8px; flex-wrap: wrap; margin-left: auto; }
.guardar { display: grid; gap: 12px; padding: 16px 20px; border-bottom: 1px solid var(--border-3); background: #F9FAFB; }
.check { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--ink); }
.field--tight { margin-bottom: 0; }
.ok { margin: 0; padding: 12px 20px; font-size: 13px; color: var(--success); }
.vacio { margin: 0; font-size: 14px; color: var(--muted-2); }
.plano { border: none; border-radius: 0; box-shadow: none; }
.is-loading tbody { opacity: .5; }
.orden {
  display: inline-flex; align-items: center; gap: 4px; border: none; background: none; padding: 0;
  font: inherit; color: inherit; text-transform: inherit; letter-spacing: inherit; cursor: pointer;
}
.table th.is-right .orden { justify-content: flex-end; width: 100%; }
.table td { white-space: nowrap; }
</style>
