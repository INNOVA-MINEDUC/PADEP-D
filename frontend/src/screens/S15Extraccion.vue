<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { usePadep } from '@/stores/padep'
import { api } from '@/api/extraccion'
import { usaAjustes } from '@/composables/usaAjustes'
import { usaCortes } from '@/composables/usaCortes'
import { usaSubida } from '@/composables/usaSubida'
import { usaTrabajos } from '@/composables/usaTrabajos'
import { usaEstadoCarga } from '@/composables/usaEstadoCarga'
import SelectorCorte from '@/components/SelectorCorte.vue'
import BarraAvance from '@/components/BarraAvance.vue'
import AvisoError from '@/components/AvisoError.vue'
import { pillClass } from '@/utils/format'
import { etiquetaCarrera } from '@/data/carreras'

const { goTo, refrescaCohorte, registraCarrera } = usePadep()
const { puedeExtraer, trozo, tipos, carga: cargaAjustes } = usaAjustes()
const {
  lista: cortes, elegido, corte, puedeEntregar, puedeCargar, extraidos,
  carga: cargaCortes, elige,
} = usaCortes()
const { subiendo, avance, error: errorSubida, envia } = usaSubida(elegido, trozo)
const {
  lista: trabajos, registroDe, registro, soloDelCorte, filtrando, bloqueadaPorOtro,
  refresca, verRegistro, vivo,
} = usaTrabajos(elegido)
const { estado: estadoCarga, refresca: refrescaCarga } = usaEstadoCarga(elegido)

const error = ref('')
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

// El trabajo trae las cuatro partes sueltas, no el id armado. Se rearma igual
// que lo hace el servidor, y solo para comparar con el corte elegido y marcar
// los ajenos: no se manda a ninguna ruta.
const idCorteDe = t => `${t.cohorte}-car${t.carrera}-t${t.trimestre}-c${t.corte}`
const corteDe = (t) => {
  const base = `${etiquetaCarrera(t.carrera)} · t${t.trimestre}`
  return t.corte === 1 ? base : `${base} · c${t.corte}`
}

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
  refrescaCarga()
  refresca()
}

// El sidebar y las pantallas de consulta enseñan la cohorte del corte elegido,
// y no piden cortes por su cuenta: hay que avisarlas al cambiar.
const cambia = (id) => { elige(id); refrescaCohorte() }

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
            <SelectorCorte :lista="cortes" :elegido="elegido" @elige="cambia" />
          </div>
          <!-- El alta vive en el módulo 1: aquí solo se elige sobre cuál
               trabajar. Antes el formulario estaba en esta pantalla, y era el
               único sitio de la aplicación donde se creaba algo de verdad. -->
          <button class="btn btn--outline" @click="goTo(1)">Nueva alta…</button>
        </div>

        <p v-if="!corte" class="nota">
          No hay ninguno.
          <button type="button" class="btn-link" @click="goTo(1)">
            Crea el primero en Alta de Cohorte →
          </button>
        </p>
        <template v-else>
          <p class="nota">
            {{ etiquetaCarrera(corte.carrera) }} · trimestre {{ corte.trimestre }}
            <template v-if="corte.corte !== 1"> · corte {{ corte.corte }}</template>
          </p>
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

        <!-- Las tres formas de GET /cortes/{id}/carga. `disponible: false` no es
             un error —lo normal es que la base no esté levantada—: se pinta el
             motivo y el resto de la pantalla sigue funcionando. -->
        <p v-if="estadoCarga && !estadoCarga.disponible" class="notice notice--clay">
          <strong>La base no está disponible.</strong> {{ estadoCarga.motivo }}
          <template v-if="estadoCarga.pista"><br><span class="mono">{{ estadoCarga.pista }}</span></template>
        </p>
        <p v-else-if="estadoCarga && !estadoCarga.cargado" class="nota">
          {{ estadoCarga.motivo || 'Este corte todavía no se ha cargado a la base.' }}
        </p>
        <p v-else-if="estadoCarga" class="nota nota--ok">
          Cargado a la base.
          <span v-for="(n, que) in estadoCarga.cuentas" :key="que" class="cuenta mono">
            {{ bonito(que) }}: {{ n }}
          </span>
        </p>

        <p class="nota">
          Las cuatro etiquetas están escritas en los papeles que estás subiendo: el bimestre
          en la portada del PDF, el pago y el año en el nombre de la nómina, y el nombre de
          la cohorte en su columna <span class="mono">COHORTE</span>. Ninguna se deduce del
          corte con una fórmula. <strong>Lo que no sepas, déjalo en blanco</strong>: entra
          vacío a propósito y una carga posterior que sí lo traiga lo rellena.
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
    <div class="trabajos__cabecera">
      <h2 class="sub-titulo sub-titulo--pegado">Trabajos</h2>
      <!-- Filtrado de entrada, pero nunca a la fuerza: la cola es una y global,
           y sin poder mirar los de fuera un trabajo «en cola» que no arranca no
           tiene explicación en pantalla. -->
      <label class="interruptor">
        <input v-model="soloDelCorte" type="checkbox" :disabled="!elegido">
        Solo los de este corte
      </label>
    </div>

    <!-- El que corre no es de este corte: se deduce de la propia lista
         filtrada —algo nuestro esperando y nada nuestro extrayendo— sin pedir
         el histórico entero. -->
    <p v-if="bloqueadaPorOtro" class="nota nota--cola">
      Hay una extracción de otro corte en marcha. La cola es una sola y va de una
      en una, así que lo de aquí espera su turno.
      <button type="button" class="btn-link" @click="soloDelCorte = false">
        Ver todos los trabajos →
      </button>
    </p>

    <div class="table-wrap table-wrap--scroll">
      <table class="table">
        <thead>
          <tr>
            <th>Documento</th>
            <th v-if="!filtrando">Corte</th>
            <th>Estado</th><th>Avance</th><th>Resultado</th><th />
          </tr>
        </thead>
        <tbody>
          <tr v-if="!trabajos.length">
            <td :colspan="filtrando ? 5 : 6" class="empty">
              {{ filtrando ? 'Este corte todavía no tiene ninguno.' : 'Todavía no hay ninguno.' }}
            </td>
          </tr>

          <template v-for="t in trabajos" :key="t.id">
            <tr>
              <td class="is-strong">{{ bonito(t.tipo) }}</td>
              <!-- Solo sin filtro: con filtro todas las filas son del mismo
                   corte y la columna repetiría el mismo valor. -->
              <td v-if="!filtrando" class="celda-corte">
                <span :class="{ 'es-otro': idCorteDe(t) !== elegido }">{{ corteDe(t) }}</span>
              </td>
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
              <td :colspan="filtrando ? 5 : 6">
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
                    <dd>
                      <span class="mono es-mal">{{ t.error }}</span>
                      <!-- La carga ya no crea carreras: falla si no esta en el
                           catalogo, y el `error` lo dice nombrando la ruta. -->
                      <button
                        v-if="t.error.includes('POST /carreras')"
                        type="button" class="btn-link detalle__accion"
                        @click="registraCarrera(t.carrera)">
                        Registrar la carrera →
                      </button>
                    </dd>
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
.nota--suelta { margin-top: 8px; }
.cuenta { margin-left: 10px; font-weight: 400; color: var(--muted); }
.nota { font-size: 13px; color: var(--muted); margin: 0 0 12px; line-height: 1.5; }
.nota--ok { color: var(--success); font-weight: 600; }
.sub-titulo { font-size: 16px; font-weight: 700; color: var(--navy); margin: 24px 0 8px; }
.sub-titulo--pegado { margin: 0; }

.trabajos__cabecera {
  display: flex; align-items: baseline; justify-content: space-between;
  flex-wrap: wrap; gap: 8px; margin: 24px 0 8px;
}
.interruptor {
  display: flex; align-items: center; gap: 7px;
  font-size: 13px; color: var(--muted); cursor: pointer; user-select: none;
}
.interruptor input { cursor: pointer; }
.interruptor:has(input:disabled) { opacity: .5; cursor: default; }

.nota--cola {
  background: var(--teal-bg); border: 1px solid var(--border-2);
  border-radius: var(--r-sm); padding: 10px 14px; margin-bottom: 12px;
}

.celda-corte { font-size: 12.5px; color: var(--muted); }
/* Los de otro corte se apagan: en la vista sin filtro hay que poder localizar
   los propios de un vistazo. */
.celda-corte .es-otro { opacity: .65; font-style: italic; }

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
.detalle__accion { display: block; margin-top: 6px; font-size: 12px; }
.detalle__titulo { margin: 16px 0 8px; font-size: 11px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: var(--muted-2); }

.registro {
  background: var(--bg-soft); border: 1px solid var(--border-2); border-radius: var(--r-sm);
  padding: 12px; margin-top: 16px; max-height: 16rem; overflow: auto;
  font-family: var(--mono); font-size: 12px; white-space: pre-wrap; color: var(--muted);
}
</style>
