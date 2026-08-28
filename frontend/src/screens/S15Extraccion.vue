<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { usePadep } from '@/stores/padep'
import { api } from '@/api/extraccion'
import { usaAjustes } from '@/composables/usaAjustes'
import { usaCortes } from '@/composables/usaCortes'
import { usaSubida } from '@/composables/usaSubida'
import { usaTrabajos } from '@/composables/usaTrabajos'
import SelectorCorte from '@/components/SelectorCorte.vue'
import BarraAvance from '@/components/BarraAvance.vue'
import AvisoError from '@/components/AvisoError.vue'
import { pillClass } from '@/utils/format'

const { goTo } = usePadep()
const { puedeExtraer, trozo, tipos, carga: cargaAjustes } = usaAjustes()
const {
  lista: cortes, elegido, corte, puedeEntregar, puedeCargar, extraidos,
  carga: cargaCortes, elige,
} = usaCortes()
const { subiendo, avance, error: errorSubida, envia } = usaSubida(elegido, trozo)
const { lista: trabajos, registroDe, registro, refresca, verRegistro, vivo } = usaTrabajos()

const error = ref('')
const nuevoAbierto = ref(false)
const nuevo = ref({ cohorte: '', semestre: 1, corte: 1 })
const tipo = ref('')
const archivos = ref([])
const nomina = ref(null)
const etiquetas = ref({ bimestre: '', pago: '', anio_pago: '', cohorte_nombre: '' })
const ocupado = ref(false)

const ranuras = computed(() => tipos.value[tipo.value]?.archivos ?? 1)
const pista = computed(() => {
  const d = tipos.value[tipo.value]
  if (!d) return ''
  return d.archivos > 1
    ? `Sube los ${d.archivos} listados en el orden en que vienen. El nombre del archivo da igual.`
    : `~${d.paginas_tipicas} páginas.`
})

const bonito = n => String(n).replace(/_/g, ' ')

// La entrega comparte estados con las extracciones, pero no extrae nada.
const estadoDe = t => (t.tipo === 'entrega' && t.estado === 'extrayendo' ? 'curando' : t.estado)
const TONOS = {
  terminado: 'success', extrayendo: 'clay', en_cola: 'teal',
  fallido: 'danger', cancelado: 'danger',
}
const tonoDe = t => TONOS[t.estado] ?? ''

// Cuánto lleva corriendo. Con fases que pasan minutos sin imprimir una página,
// el reloj es lo que distingue «trabajando» de «colgado».
const ahora = ref(Date.now())
const reloj = setInterval(() => { ahora.value = Date.now() }, 1000)
onUnmounted(() => clearInterval(reloj))

function transcurrido(desde) {
  if (!desde) return ''
  const s = Math.max(0, Math.round((ahora.value - new Date(desde)) / 1000))
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s`
}

async function conError(fn) {
  error.value = ''
  ocupado.value = true
  try {
    await fn()
  } catch (e) {
    error.value = e.message
  } finally {
    ocupado.value = false
  }
  await cargaCortes().catch(() => {})
  refresca()
}

const creaCorte = () => conError(async () => {
  const d = await api.creaCorte({ ...nuevo.value })
  elige(d.id)
  nuevoAbierto.value = false
  nuevo.value = { cohorte: '', semestre: 1, corte: 1 }
})

const subeNomina = () => conError(async () => {
  if (!nomina.value) throw new Error('Elige un archivo .xlsx.')
  await api.subeNomina(elegido.value, nomina.value)
  nomina.value = null
})

const lanzaEntrega = () => conError(() => api.entrega(elegido.value))

const lanzaCarga = () => conError(async () => {
  if (!await avisaPendientes()) return
  // Las cuatro etiquetas van siempre; las vacías el servidor no se las pasa al
  // cargador.
  await api.carga(elegido.value, { ...etiquetas.value })
})

/**
 * La carga lee de finales/, no de correcciones.csv. Lo escrito y no volcado lo
 * rechaza la API; lo que sigue sin completar no, porque puede que nunca llegue
 * a cero (actas que no están en el PDF, gente que no aparece) y un hueco entra
 * como Incidencia y no como dato inventado. Así que eso se avisa y se confirma.
 */
async function avisaPendientes() {
  let d
  try {
    d = await api.pendientes(elegido.value)
  } catch (e) {
    return true // si no se puede saber, que decida la API
  }
  if (!d.listo) return true
  const falta = []
  if (d.sin_completar) falta.push(`${d.sin_completar} tarea(s) sin completar`)
  if (d.sin_registro_abiertos) falta.push(`${d.sin_registro_abiertos} persona(s) sin registro`)
  if (!falta.length) return true
  return confirm([
    `Quedan ${falta.join(' y ')} en el curador.`,
    'La carga entra igual: lo que falte queda como incidencia en la base, no como dato. '
    + 'Puedes completar y volver a cargar (se rehace el corte entero, no duplica).',
    '¿Cargar de todas formas?',
  ].join('\n\n'))
}

async function extrae() {
  error.value = ''
  const elegidos = archivos.value.slice(0, ranuras.value).filter(Boolean)
  if (elegidos.length < ranuras.value) {
    // Se dice qué falta en vez de no hacer nada: un submit que se ignora en
    // silencio parece que la página está rota.
    error.value = ranuras.value > 1 ? 'Falta alguno de los listados.' : 'Elige un PDF.'
    return
  }
  if (await envia(elegidos, tipo.value)) {
    archivos.value = []
    document.querySelectorAll('.ranura input').forEach((i) => { i.value = '' })
  }
  await cargaCortes().catch(() => {})
  refresca()
}

// Borrar un trabajo cancela si corre y borra si terminó, pero NO borra sus
// archivos, que son del corte. Se dice, o parece más destructivo de lo que es.
const borra = t => conError(async () => {
  const verbo = vivo(t) ? 'Cancelar' : 'Borrar'
  const nota = vivo(t)
    ? 'El trabajo se detiene donde vaya.'
    : 'Solo se quita de la lista: los archivos que produjo son del corte y se quedan.'
  if (!confirm(`¿${verbo} «${bonito(t.tipo)}»?\n\n${nota}`)) return
  await api.borra(t.id)
})

const baja = (t, nombre) => conError(() => api.bajaSalida(t.id, nombre))

/**
 * El Excel que produjo ESTE trabajo.
 *
 * `salidas` no trae lo que generó el trabajo: trae todo lo que hay en el corte
 * en ese momento, acumulado. El trabajo de `docentes` lista también el
 * `asistencia_extraida.xlsx` que dejó una extracción anterior, así que quedarse
 * con el primer .xlsx apunta al archivo de otro documento. Se empareja por el
 * tipo del trabajo, que es como se nombran las salidas
 * (`asistencia` -> `asistencia_extraida.xlsx`), y la entrega y la carga caen en
 * el `PADEP_<cohorte>_final.xlsx`.
 */
function salidaFinal(t) {
  const xlsx = t.salidas.filter(n => n.toLowerCase().endsWith('.xlsx'))
  return xlsx.find(n => n.toLowerCase().startsWith(t.tipo.toLowerCase()))
    ?? xlsx.find(n => n.startsWith('PADEP_'))
    ?? xlsx[0]
    ?? null
}

// El resto —los CSV intermedios y los Excel de otros documentos del corte— son
// hasta diez por fila y solo sirven para diagnosticar: van al detalle.
const otrasSalidas = t => t.salidas.filter(n => n !== salidaFinal(t))

watch(tipos, (t) => { if (!tipo.value) tipo.value = Object.keys(t)[0] ?? '' })
watch(elegido, () => { archivos.value = [] })

onMounted(async () => {
  try {
    await cargaAjustes()
    await cargaCortes()
  } catch (e) {
    error.value = e.message
  }
  refresca()
})
</script>

<template>
  <div>
    <p class="eyebrow eyebrow--plain">Extracción y Carga</p>
    <h1 class="page-title">Extracción de Documentos</h1>
    <p class="page-sub">
      Sube los PDF escaneados del corte y descarga el Excel. Un trabajo a la vez:
      cada extracción ocupa todos los núcleos.
    </p>

    <AvisoError :mensaje="error" />

    <!-- ---------- Corte ---------- -->
    <section class="card card--flat bloque">
      <div class="card__head">Corte</div>
      <div class="card__body">
        <p class="nota">
          Todo lo que se sube y todo lo que sale vive en la carpeta de su corte.
          Hay que elegirlo antes de subir nada.
        </p>

        <div class="fila">
          <div class="fila__ancho">
            <SelectorCorte :lista="cortes" :elegido="elegido" @elige="elige" />
          </div>
          <button class="btn btn--outline" @click="nuevoAbierto = !nuevoAbierto">
            {{ nuevoAbierto ? 'Cancelar' : 'Nuevo corte…' }}
          </button>
        </div>

        <form v-if="nuevoAbierto" class="fila" @submit.prevent="creaCorte">
          <label class="field">
            <span class="field__label">Cohorte</span>
            <input v-model="nuevo.cohorte" class="input" required placeholder="36">
          </label>
          <label class="field">
            <span class="field__label">Semestre (1-4)</span>
            <input v-model.number="nuevo.semestre" class="input" type="number" min="1" max="4" required>
          </label>
          <label class="field">
            <span class="field__label">Corte</span>
            <input v-model.number="nuevo.corte" class="input" type="number" min="1" required>
          </label>
          <button class="btn btn--primary" type="submit" :disabled="ocupado">Crear</button>
        </form>

        <p v-if="!corte" class="nota">Crea un corte para empezar.</p>
        <template v-else>
          <p class="nota">
            <span class="mono">{{ corte.carpeta }}</span>
            · {{ extraidos }}/5 documentos extraídos ·
            <template v-if="corte.nomina">nómina: {{ corte.nomina }}</template>
            <strong v-else>sin nómina</strong>
          </p>
          <!-- `falta_para_entregar` se enseña tal cual: es la explicación de por
               qué el botón de entregar está deshabilitado. -->
          <ul v-if="corte.falta_para_entregar.length" class="falta">
            <li v-for="f in corte.falta_para_entregar" :key="f">{{ f }}</li>
          </ul>
          <p v-else class="nota nota--ok">Listo para entregar.</p>
        </template>
      </div>
    </section>

    <!-- ---------- Nueva extracción ---------- -->
    <section class="card card--flat bloque">
      <div class="card__head">Nueva extracción</div>
      <div class="card__body">
        <!-- Se avisa ANTES de que nadie elija un archivo: el PDF se sube entero
             —140 MB— antes de que el servidor pueda rechazarlo. -->
        <p v-if="!puedeExtraer" class="notice notice--clay">
          Esta instalación <strong>no extrae</strong>: la extracción se hace en la máquina
          de siempre y aquí se sincronizan <span class="mono">pdfs/</span> y
          <span class="mono">datos/</span>. El OCR de este servidor no da el mismo texto, y un
          corte tiene que leerse entero en una sola máquina o las correcciones dejan de
          cuadrar. Todo lo demás —entrega, curación y carga— sí se hace aquí.
        </p>

        <form v-else @submit.prevent="extrae">
          <div class="fila">
            <label class="field">
              <span class="field__label">Documento</span>
              <select v-model="tipo" class="select">
                <option v-for="n in Object.keys(tipos)" :key="n" :value="n">{{ bonito(n) }}</option>
              </select>
            </label>

            <!-- Una ranura por archivo, numeradas y sin nombrar asignatura: las
                 materias cambian de una cohorte a otra y el nombre del archivo
                 también. Lo único que cuenta es el orden. -->
            <label v-for="i in ranuras" :key="i" class="field ranura">
              <span class="field__label">{{ ranuras > 1 ? `Listado ${i}` : 'PDF' }}</span>
              <input
                class="input" type="file" accept="application/pdf,.pdf"
                @change="archivos[i - 1] = $event.target.files[0]">
            </label>

            <button class="btn btn--primary" type="submit" :disabled="!corte || subiendo">
              {{ subiendo ? 'Subiendo…' : 'Extraer' }}
            </button>
          </div>

          <p class="nota">{{ pista }}</p>
          <AvisoError :mensaje="errorSubida" />
          <BarraAvance v-if="subiendo" :valor="avance" />
        </form>
      </div>
    </section>

    <!-- ---------- Entrega ---------- -->
    <section class="card card--flat bloque">
      <div class="card__head">Entrega</div>
      <div class="card__body">
        <p class="nota">
          Con los cinco documentos extraídos y la nómina puesta: se curan y auditan juntos.
          Sale el Excel de entrega, quién falta y dónde buscarlo. Después, la carga a la base.
        </p>

        <div class="fila">
          <label class="field fila__ancho">
            <span class="field__label">Nómina del pago (.xlsx)</span>
            <input class="input" type="file" accept=".xlsx" @change="nomina = $event.target.files[0]">
          </label>
          <button class="btn btn--outline" :disabled="!corte || ocupado" @click="subeNomina">
            Subir nómina
          </button>
        </div>

        <div class="btn-row">
          <button
            class="btn btn--primary"
            :disabled="!puedeEntregar || ocupado"
            :title="puedeEntregar ? '' : 'Todavía falta algo'"
            @click="lanzaEntrega">
            Curar y auditar
          </button>
          <button class="btn-link" @click="goTo(16)">completar a mano →</button>
        </div>

        <h3 class="sub-titulo">Cargar a la base</h3>
        <p class="nota">
          Las cuatro etiquetas son opcionales: el papel dice «NOVENO BIMESTRE» y la nómina
          «6to pago», y con cuatro semestres esos números no cierran, así que no se deducen
          del corte. Lo que se deje en blanco entra vacío y se puede rellenar después.
        </p>
        <div class="fila">
          <label class="field">
            <span class="field__label">Bimestre</span>
            <input v-model="etiquetas.bimestre" class="input" placeholder="NOVENO BIMESTRE">
          </label>
          <label class="field">
            <span class="field__label">Pago n.º</span>
            <input v-model="etiquetas.pago" class="input" inputmode="numeric" placeholder="6">
          </label>
          <label class="field">
            <span class="field__label">Año del pago</span>
            <input v-model="etiquetas.anio_pago" class="input" inputmode="numeric" placeholder="2026">
          </label>
          <label class="field">
            <span class="field__label">Nombre de la cohorte</span>
            <input v-model="etiquetas.cohorte_nombre" class="input" placeholder="Onceava">
          </label>
          <button
            class="btn btn--outline"
            :disabled="!puedeCargar || ocupado"
            :title="puedeCargar ? '' : 'Primero hay que entregar'"
            @click="lanzaCarga">
            Cargar a la base
          </button>
        </div>
      </div>
    </section>

    <!-- ---------- Trabajos ---------- -->
    <h2 class="sub-titulo">Trabajos</h2>
    <div class="table-wrap table-wrap--scroll">
      <table class="table">
        <thead>
          <tr>
            <th>Documento</th><th>Estado</th><th>Avance</th><th>Resultado</th><th />
          </tr>
        </thead>
        <tbody>
          <tr v-if="!trabajos.length">
            <td colspan="5" class="empty">Todavía no hay ninguno.</td>
          </tr>

          <template v-for="t in trabajos" :key="t.id">
            <tr>
              <td class="is-strong">{{ bonito(t.tipo) }}</td>
              <td>
                <span :class="pillClass(tonoDe(t))">
                  {{ bonito(estadoDe(t)) }}{{ t.puesto_en_cola ? ` nº ${t.puesto_en_cola}` : '' }}
                </span>
              </td>
              <td class="celda-avance">
                <!-- Mientras corre: barra y reloj, que es lo que contesta «¿va
                     o está colgado?». El resto de contadores, en el detalle. -->
                <template v-if="t.estado === 'extrayendo'">
                  <BarraAvance :valor="t.paginas_totales ? (t.avance ?? 0) : null" />
                  <div class="mono">{{ transcurrido(t.iniciado) }}</div>
                </template>
                <span v-else class="mono">—</span>
              </td>
              <td>
                <button
                  v-if="salidaFinal(t)" class="descarga mono"
                  :title="`Descargar ${salidaFinal(t)}`"
                  @click="baja(t, salidaFinal(t))">
                  {{ salidaFinal(t) }}
                </button>
                <span v-else class="mono">—</span>
              </td>
              <td class="acciones">
                <button class="btn-link" @click="verRegistro(t.id)">
                  {{ registroDe === t.id ? 'ocultar detalle' : 'ver detalle' }}
                </button>
                <button class="btn-link btn-link--danger" @click="borra(t)">
                  {{ vivo(t) ? 'cancelar' : 'borrar' }}
                </button>
              </td>
            </tr>

            <!-- El detalle reúne todo lo técnico a un clic: nombres de archivo,
                 contador de páginas, la última línea del log, el error en crudo
                 y los CSV intermedios. Antes ocupaba la fila entera. -->
            <tr v-if="registroDe === t.id" class="detalle">
              <td colspan="5">
                <dl class="detalle__datos">
                  <div v-if="t.archivos.length">
                    <dt>Archivos</dt>
                    <dd class="mono">{{ t.archivos.join(', ') }}</dd>
                  </div>
                  <div v-if="t.paginas_totales">
                    <dt>Páginas</dt>
                    <dd class="mono">{{ t.paginas_hechas }} de {{ t.paginas_totales }}</dd>
                  </div>
                  <div v-if="t.ultima_linea">
                    <dt>Última línea</dt>
                    <dd class="mono">{{ t.ultima_linea }}</dd>
                  </div>
                  <div v-if="t.error">
                    <dt>Error</dt>
                    <dd class="mono es-mal">{{ t.error }}</dd>
                  </div>
                </dl>

                <template v-if="otrasSalidas(t).length">
                  <!-- «del corte» y no «de este trabajo»: la API acumula, asi
                       que aqui caen tambien los Excel de otros documentos. -->
                  <p class="detalle__titulo">Otros archivos del corte</p>
                  <button
                    v-for="n in otrasSalidas(t)" :key="n"
                    class="descarga mono" :title="`Descargar ${n}`"
                    @click="baja(t, n)">
                    {{ n }}
                  </button>
                </template>

                <p class="detalle__titulo">Registro</p>
                <pre class="registro">{{ registro || 'todavía no hay registro' }}</pre>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.bloque { margin-bottom: 20px; }
.nota { font-size: 13px; color: var(--muted); margin: 0 0 12px; line-height: 1.5; }
.nota--ok { color: var(--success); font-weight: 600; }
.sub-titulo { font-size: 16px; font-weight: 700; color: var(--navy); margin: 24px 0 8px; }

.fila { display: flex; gap: 16px; flex-wrap: wrap; align-items: flex-end; }
.fila > .field { flex: 1 1 14rem; min-width: 0; }
.fila__ancho { flex: 2 1 18rem; min-width: 0; }
.fila > .btn { margin-bottom: 18px; }

.falta { margin: 0 0 12px; padding-left: 20px; font-size: 13px; color: var(--warning); }
.recorta { max-width: 16rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11.5px; color: var(--muted); }
.es-mal { color: var(--danger); }
.es-curso { color: var(--warning); }

.celda-avance { min-width: 12rem; }
.celda-avance .barra { max-width: 11rem; margin: 6px 0; }

.descarga {
  display: inline-block; margin: 0 6px 6px 0; padding: 3px 8px; font-size: 11.5px;
  background: var(--blue-bg); border: 1px solid var(--blue-br); color: var(--blue);
  border-radius: var(--r-sm); cursor: pointer; font-family: var(--mono);
}
.descarga:hover { border-color: var(--blue); }

.acciones { white-space: nowrap; text-align: right; }
.acciones .btn-link { margin-left: 12px; }

.detalle > td { background: var(--bg-soft); padding: 16px; }
.detalle__datos { margin: 0; display: grid; gap: 8px; }
.detalle__datos > div { display: flex; gap: 10px; align-items: baseline; }
.detalle__datos dt { flex: 0 0 8rem; font-size: 11px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: var(--muted-2); }
.detalle__datos dd { margin: 0; font-size: 12px; color: var(--muted); overflow-wrap: anywhere; }
.detalle__titulo { margin: 16px 0 8px; font-size: 11px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: var(--muted-2); }

.registro {
  background: var(--bg-soft); border: 1px solid var(--border-2); border-radius: var(--r-sm);
  padding: 12px; margin-top: 16px; max-height: 16rem; overflow: auto;
  font-family: var(--mono); font-size: 12px; white-space: pre-wrap; color: var(--muted);
}
</style>
