<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { usePadep } from '@/stores/padep'
import { api } from '@/api/extraccion'
import { usaCortes } from '@/composables/usaCortes'
import { usaCurador } from '@/composables/usaCurador'
import SelectorCorte from '@/components/SelectorCorte.vue'
import BarraAvance from '@/components/BarraAvance.vue'
import AvisoError from '@/components/AvisoError.vue'
import { pillClass, plural } from '@/utils/format'

const { goTo } = usePadep()
// El corte se comparte con la pantalla de extracción: es el mismo trabajo, y
// las dos leen la misma llave de localStorage.
const { lista: cortes, elegido, carga: cargaCortes, elige } = usaCortes()
const {
  datos, error, cargando, carga,
  hecha, escrita, confirmable, confirma, confirmada, desconfirma,
  guardaCelda, guardaAlta, anula,
  estadoCelda, idCelda,
  tablaDe, camposSueltos,
  puedeAplicar, textoAplicar, avisoAplicar, aplica,
  porcentaje,
} = usaCurador(elegido)

const filtro = ref('')
// Arranca escondiendo lo ya cerrado: con 26 fichas lo que importa es lo que
// falta, y las hechas ocupan lo mismo que las pendientes.
const soloPendientes = ref(true)
const avisoPdf = ref('')
// Qué tarjeta tiene el detalle abierto. Nombre del PDF, hoja y ubicación no le
// sirven a quien cura —el enlace ya abre la página correcta— pero hacen falta
// para dar soporte, así que quedan a un clic.
const detalle = ref(null)
const alterna = id => { detalle.value = detalle.value === id ? null : id }
const confirmando = ref(null)
// Fichas que se han cerrado en esta sesión. Se quedan a la vista aunque el
// filtro esconda las listas: si al confirmar la tarjeta desaparece de golpe, no
// queda constancia de lo que acabas de hacer ni forma de deshacerlo sin ir a
// buscarla. Se olvidan al recargar o al cambiar de corte.
const recientes = ref(new Set())
const recuerda = (t) => { if (hecha(t)) recientes.value = new Set(recientes.value).add(t.id) }

const todas = computed(() => (datos.value?.listo ? datos.value.tareas : []))

const tareas = computed(() => todas.value.filter((t) => {
  if (filtro.value && t.documento !== filtro.value) return false
  if (soloPendientes.value && hecha(t) && !recientes.value.has(t.id)) return false
  return true
}))

const pendientes = computed(() => todas.value.filter(t => !hecha(t)).length)

// «revisar» es jerga del extractor; quien cura entiende «comprobar».
const MOTIVOS = { revisar: 'comprobar', falta: 'falta' }
const TONO_MOTIVO = { revisar: 'clay', falta: 'danger' }

const estado = (t, campo, casilla) => estadoCelda.value[idCelda(t, campo, casilla)]
const esFallo = e => !!e && e !== 'ok' && e !== 'guardando'

async function abrePagina(pdf, pagina) {
  avisoPdf.value = ''
  try {
    await api.abrePagina(elegido.value, pdf, pagina)
  } catch (e) {
    avisoPdf.value = e.message
  }
}

/** Guarda una celda y, si con eso la ficha queda lista, la deja a la vista. */
async function guarda(t, campo, casilla, valor) {
  await guardaCelda(t, campo, casilla, valor)
  recuerda(t)
}

async function confirmaTarea(t) {
  confirmando.value = t.id
  await confirma(t)
  recuerda(t)
  confirmando.value = null
}

async function desconfirmaTarea(t) {
  confirmando.value = t.id
  await desconfirma(t)
  confirmando.value = null
}

async function vuelca() {
  if (await aplica()) {
    avisoPdf.value = 'Aplicando… el avance se ve en la pantalla de Extracción de Documentos.'
  }
}

watch(elegido, carga)

onMounted(async () => {
  try {
    await cargaCortes()
  } catch (e) { /* el error del corte lo enseña `carga` */ }
  await carga()
})
</script>

<template>
  <div>
    <p class="eyebrow eyebrow--plain">Extracción y Carga</p>
    <h1 class="page-title">Completar a Mano</h1>
    <p class="page-sub">
      Aquí queda lo que la lectura automática no pudo resolver sola. En cada ficha: abre la
      página del PDF, mira lo que dice el papel y escríbelo. Si el papel ya está correcto,
      basta con confirmarlo.
    </p>

    <AvisoError :mensaje="error" />
    <AvisoError :mensaje="avisoPdf" tono="nota" />

    <!-- ---------- Cabecera ---------- -->
    <section class="card card--flat bloque">
      <div class="card__body">
        <div class="fila">
          <div class="fila__ancho">
            <SelectorCorte :lista="cortes" :elegido="elegido" @elige="elige" />
          </div>
          <label v-if="datos?.listo" class="field">
            <span class="field__label">Documento</span>
            <select v-model="filtro" class="select">
              <option value="">todos</option>
              <option v-for="d in datos.documentos" :key="d" :value="d">{{ d }}</option>
            </select>
          </label>
          <button
            class="btn btn--primary"
            :disabled="!puedeAplicar"
            :title="avisoAplicar"
            @click="vuelca">
            {{ textoAplicar }}
          </button>
        </div>

        <template v-if="datos?.listo">
          <BarraAvance :valor="porcentaje" />
          <div class="resumen">
            <p class="nota">
              Quedan <strong>{{ pendientes }}</strong> de {{ todas.length }} fichas ·
              {{ plural(datos.correcciones, 'casilla escrita', 'casillas escritas') }}
              <template v-if="datos.sin_registro.length">
                · {{ plural(datos.sin_registro.length, 'persona', 'personas') }} sin registro (abajo)
              </template>
            </p>
            <label class="conmutador">
              <input v-model="soloPendientes" type="checkbox">
              Ocultar las que ya están listas
            </label>
          </div>
          <!-- Sin decirlo, «aplicar» parece el botón de guardar y da miedo
               cerrar la pestaña sin pulsarlo. -->
          <p class="nota nota--pie">
            Lo que escribes se guarda al instante. «{{ textoAplicar }}» es lo que lo pasa
            al Excel de entrega, y puedes hacerlo cuando quieras.
          </p>
          <p v-if="avisoAplicar" class="nota nota--aviso">{{ avisoAplicar }}</p>
        </template>
        <p v-else-if="cargando" class="nota">Cargando…</p>
        <p v-else-if="datos" class="nota">{{ datos.motivo }}</p>
        <p v-else-if="!elegido" class="nota">No hay ningún corte.</p>
      </div>
    </section>

    <!-- ---------- Fichas ---------- -->
    <template v-if="datos?.listo">
      <div v-if="!tareas.length" class="card card--flat">
        <div class="empty-state">
          <div class="empty-state__icon" aria-hidden="true">✓</div>
          <p class="empty-state__title">
            {{ pendientes ? 'Nada pendiente con este filtro' : 'No queda nada por completar' }}
          </p>
          <p class="empty-state__hint">
            {{ pendientes
              ? 'Cambia el documento o desmarca «ocultar las que ya están listas».'
              : `Las ${todas.length} fichas están listas. Ya puedes aplicarlas a la entrega.` }}
          </p>
        </div>
      </div>

      <article
        v-for="t in tareas" :key="t.id"
        class="tarea card card--flat" :class="{ 'tarea--hecha': hecha(t) }">
        <div class="card__body">
          <div class="tarea__cabeza">
            <span class="tarea__quien">{{ t.quien }}</span>
            <span :class="pillClass()">{{ t.documento }}</span>
            <span :class="pillClass()">página {{ t.pagina }}</span>
            <span v-if="hecha(t)" :class="pillClass('success')">lista</span>
          </div>

          <p class="tarea__pdf">
            <!-- Nunca al PDF entero con #page=N: Chrome aplica el fragmento
                 antes de acabar de cargar y, tras bajar los 40 MB, vuelve a la
                 página 1. Esto abre una hoja suelta. -->
            <button
              v-if="t.pdf_url" class="btn-link"
              @click="abrePagina(t.pdf, t.pagina)">
              ver la página {{ t.pagina }} →
            </button>
            <span v-else class="tarea__vacio">Son dos PDF: la página no dice de cuál.</span>
            <button class="btn-link tarea__mas" @click="alterna(t.id)">
              {{ detalle === t.id ? 'menos' : 'detalle' }}
            </button>
          </p>

          <dl v-if="detalle === t.id" class="tarea__detalle">
            <div><dt>Ubicación</dt><dd>{{ t.donde }}</dd></div>
            <div><dt>PDF</dt><dd class="mono">{{ t.pdf }}</dd></div>
            <div><dt>Hoja</dt><dd class="mono">{{ t.archivo }}</dd></div>
          </dl>

          <p v-if="t.revisar" class="notice notice--clay">No cuadra: {{ t.revisar }}</p>

          <!-- No falta ningún dato: el papel se lee entero y solo hay que decir
               si está bien. Sin este botón habría que reescribir a mano valores
               que ya son correctos, y la ficha no se cerraría nunca. -->
          <div v-if="confirmable(t)" class="confirmar">
            <button
              class="btn btn--primary" :disabled="confirmando === t.id"
              @click="confirmaTarea(t)">
              {{ confirmando === t.id ? 'Confirmando…' : '✓ Revisado, el papel está correcto' }}
            </button>
            <span class="confirmar__nota">O corrige abajo lo que no coincida con el papel.</span>
          </div>

          <!-- Confirmar es un clic, y equivocarse tambien: el reverso solo
               aparece si la ficha son confirmaciones y nada mas, para no
               borrar correcciones escritas de verdad. -->
          <div v-else-if="confirmada(t)" class="confirmar">
            <span class="confirmar__hecho">✓ Confirmada como correcta</span>
            <!-- El nombre va en el boton: son decenas de fichas iguales y un
                 «deshacer» suelto no dice a cual pertenece. -->
            <button
              class="btn-link" :disabled="confirmando === t.id"
              :title="`Deshacer la confirmación de ${t.quien}`"
              @click="desconfirmaTarea(t)">
              {{ confirmando === t.id ? 'deshaciendo…' : `deshacer (${t.quien})` }}
            </button>
          </div>

          <!-- Varias personas en la misma página: tabla, con las personas en
               filas y los campos en columnas. La API las da al revés —un campo
               con una casilla por persona— y pintarlo así repite el mismo
               nombre bajo cada campo y estira a lo alto lo que cabe a lo ancho. -->
          <div v-if="tablaDe(t)" class="table-wrap table-wrap--scroll rejilla">
            <table class="table">
              <thead>
                <tr>
                  <th>Persona</th>
                  <th v-for="c in tablaDe(t).columnas" :key="c.nombre">
                    {{ c.nombre }}
                    <span :class="pillClass(TONO_MOTIVO[c.motivo])">
                      {{ MOTIVOS[c.motivo] ?? c.motivo }}
                    </span>
                    <!-- La ayuda va aquí y no de placeholder: en una casilla de
                         5rem se corta a la mitad y repetirla 16 veces tampoco
                         ayuda. -->
                    <span v-if="c.pista" class="rejilla__pista">{{ c.pista }}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="f in tablaDe(t).filas" :key="f.filas">
                  <td class="is-strong">{{ f.quien }}</td>
                  <td v-for="c in f.celdas" :key="c.campo.nombre" class="rejilla__celda">
                    <input
                      class="input input--corto"
                      :class="{
                        'input--ok': estado(t, c.campo, c.casilla) === 'ok',
                        'input--error': esFallo(estado(t, c.campo, c.casilla)),
                      }"
                      :value="c.casilla.escrito"
                      :title="c.campo.pista"
                      @change="guarda(t, c.campo, c.casilla, $event.target.value)">
                    <span v-if="estado(t, c.campo, c.casilla) === 'ok'" class="acuse acuse--ok">✓ guardado</span>
                    <span v-else-if="estado(t, c.campo, c.casilla) === 'guardando'" class="acuse">guardando…</span>
                    <span v-else class="papel mono">papel: {{ c.casilla.actual || '—' }}</span>
                    <span v-if="esFallo(estado(t, c.campo, c.casilla))" class="acuse acuse--mal">
                      {{ estado(t, c.campo, c.casilla) }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-if="camposSueltos(t).length" class="campos">
            <div
              v-for="c in camposSueltos(t)" :key="c.nombre"
              class="campo" :class="{ 'campo--ancho': c.por_fila }">
              <span class="field__label">
                {{ c.nombre }}
                <span :class="pillClass(TONO_MOTIVO[c.motivo])">
                  {{ MOTIVOS[c.motivo] ?? c.motivo }}
                </span>
              </span>

              <template v-for="k in c.casillas" :key="k.filas">
                <p v-if="k.quien" class="campo__dequien">{{ k.quien }}</p>
                <!-- `:value` + `@change`, nunca `v-model`: v-model reescribe en
                     cada pulsación y compite con la actualización que hace
                     `guardaCelda` tras la respuesta. La fuente de verdad es lo
                     que confirmó el backend. Y se guarda al SALIR del campo:
                     no hay botón «guardar», son decenas de celdas. -->
                <input
                  class="input"
                  :class="{
                    'input--ok': estado(t, c, k) === 'ok',
                    'input--error': esFallo(estado(t, c, k)),
                  }"
                  :value="k.escrito" :placeholder="c.pista"
                  @change="guarda(t, c, k, $event.target.value)">
                <!-- El acuse va pegado a su celda. Antes el único indicio de
                     que algo se guardaba era un contador en lo alto de la
                     página, fuera de pantalla desde la tercera ficha. -->
                <p class="campo__actual mono">
                  <span v-if="estado(t, c, k) === 'ok'" class="acuse acuse--ok">✓ guardado</span>
                  <span v-else-if="estado(t, c, k) === 'guardando'" class="acuse">guardando…</span>
                  <template v-else>
                    el papel dice:
                    <template v-if="k.actual">{{ k.actual }}</template>
                    <span v-else class="tarea__vacio">nada</span>
                  </template>
                </p>
                <p v-if="esFallo(estado(t, c, k))" class="acuse acuse--mal">{{ estado(t, c, k) }}</p>
              </template>

              <p v-if="c.nota" class="campo__actual mono">{{ c.nota }}</p>
            </div>
          </div>
        </div>
      </article>

      <!-- ---------- Sin registro ---------- -->
      <template v-if="datos.sin_registro.length">
        <h2 class="sub-titulo">Sin registro</h2>
        <p class="page-sub">
          Estas personas están en la nómina y no tienen <strong>ninguna</strong> fila en el
          documento. Hay que abrir la página que se indica: casi siempre el registro está y
          lo que falta es poder identificarlo. Si al mirarlo la fila está ahí, se escribe
          aquí y entra en la entrega. La identidad no se teclea —nombre, municipio y carrera
          salen de la nómina—, solo lo que trae el papel.
        </p>

        <article
          v-for="x in datos.sin_registro" :key="x.carne"
          class="tarea card card--flat" :class="{ 'tarea--hecha': escrita(x) }">
          <div class="card__body">
            <div class="tarea__cabeza">
              <span class="tarea__quien">{{ x.nombre }}</span>
              <span class="mono tarea__donde">{{ x.carne }}</span>
              <span :class="pillClass()">{{ x.documento }}</span>
              <span v-if="x.anulada" :class="pillClass()">anulada</span>
              <span v-else-if="escrita(x)" :class="pillClass('success')">fila escrita</span>
              <span v-else :class="pillClass('danger')">sin registro</span>
            </div>

            <p class="tarea__pdf">
              <button
                v-if="x.pdf_url" class="btn-link"
                @click="abrePagina(x.pdf, x.paginas)">
                ver la página {{ x.paginas }} →
              </button>
              <span v-else class="tarea__vacio">Páginas {{ x.paginas || '—' }}</span>
              <button class="btn-link tarea__mas" @click="alterna(x.carne)">
                {{ detalle === x.carne ? 'menos' : 'detalle' }}
              </button>
            </p>

            <dl v-if="detalle === x.carne" class="tarea__detalle">
              <div><dt>Ubicación</dt><dd>{{ x.donde }}</dd></div>
              <div><dt>PDF</dt><dd class="mono">{{ x.pdf }}</dd></div>
              <div><dt>Hoja</dt><dd class="mono">{{ x.archivo }}</dd></div>
            </dl>

            <p v-if="x.que_hacer" class="notice notice--clay">
              {{ x.que_hacer }}<template v-if="x.posible"> — {{ x.posible }}</template>
            </p>

            <template v-if="x.campos.length">
              <div class="campos">
                <div v-for="c in x.campos" :key="c.nombre" class="campo">
                  <span class="field__label">{{ c.nombre }}</span>
                  <input
                    class="input" :value="c.escrito" :placeholder="c.pista"
                    :disabled="x.anulada"
                    @change="guardaAlta(x, c.nombre, $event.target.value)">
                </div>
              </div>
              <!-- Un alta equivocada se ANULA, no se borra: quitar la línea
                   correría las filas de detrás y las correcciones caerían sobre
                   la fila equivocada. -->
              <div class="btn-row">
                <button class="btn btn--outline" @click="anula(x, !x.anulada)">
                  {{ x.anulada ? 'deshacer la anulación' : 'anular esta alta' }}
                </button>
              </div>
            </template>
            <p v-else class="notice notice--clay">{{ x.motivo }}</p>
          </div>
        </article>
      </template>

      <p class="volver">
        <button class="btn-link" @click="goTo(15)">← volver a Extracción de Documentos</button>
      </p>
    </template>
  </div>
</template>

<style scoped>
.bloque { margin-bottom: 20px; }
.nota { font-size: 13px; color: var(--muted); margin: 10px 0 0; line-height: 1.5; }
.nota--aviso { color: var(--warning); }
.nota--pie { font-size: 12px; }
.sub-titulo { font-size: 16px; font-weight: 700; color: var(--navy); margin: 28px 0 8px; }

.fila { display: flex; gap: 16px; flex-wrap: wrap; align-items: flex-end; }
.fila > .field { flex: 1 1 12rem; min-width: 0; }
.fila__ancho { flex: 2 1 18rem; min-width: 0; }
.fila > .btn { margin-bottom: 18px; }

.resumen { display: flex; gap: 16px; align-items: baseline; flex-wrap: wrap; justify-content: space-between; }
.conmutador { display: flex; align-items: center; gap: 7px; font-size: 12.5px; color: var(--muted); cursor: pointer; }

.tarea { margin-bottom: 12px; }
.tarea--hecha { border-color: #BFDFCC; background: #FCFEFD; }
.tarea__cabeza { display: flex; gap: 8px; align-items: baseline; flex-wrap: wrap; margin-bottom: 8px; }
.tarea__quien { font-size: 14px; font-weight: 700; color: var(--ink); }
.tarea__donde { font-size: 11.5px; color: var(--muted); }
.tarea__pdf { display: flex; gap: 12px; align-items: baseline; flex-wrap: wrap; font-size: 12.5px; margin: 0 0 10px; }
.tarea__vacio { color: var(--muted-2); font-style: italic; }
.tarea__mas { color: var(--muted); font-weight: 600; }
.tarea__detalle {
  margin: 0 0 10px; padding: 10px 12px; display: grid; gap: 6px;
  background: var(--bg-soft); border-radius: var(--r-sm);
}
.tarea__detalle > div { display: flex; gap: 10px; align-items: baseline; }
.tarea__detalle dt {
  flex: 0 0 6rem; font-size: 10.5px; font-weight: 700; letter-spacing: .04em;
  text-transform: uppercase; color: var(--muted-2);
}
.tarea__detalle dd { margin: 0; font-size: 12px; color: var(--muted); overflow-wrap: anywhere; }

.confirmar { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-bottom: 14px; }
.confirmar__nota { font-size: 12.5px; color: var(--muted); }
.confirmar__hecho { font-size: 13px; font-weight: 600; color: var(--success); }

.rejilla { margin-bottom: 14px; }
.rejilla .table th { white-space: nowrap; vertical-align: bottom; }
.rejilla__pista { display: block; margin-top: 4px; font-size: 10px; font-weight: 500; text-transform: none; letter-spacing: 0; color: var(--muted-2); }
.rejilla__celda { vertical-align: top; }
.input--corto { width: 5.5rem; padding: 6px 8px; text-align: center; }
.papel { display: block; font-size: 11px; color: var(--muted-2); margin-top: 3px; }

.acuse { display: block; font-size: 11px; font-weight: 600; color: var(--muted-2); margin-top: 3px; }
.acuse--ok { color: var(--success); }
.acuse--mal { color: var(--danger); }

.campos { display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr)); }
.campo--ancho { grid-column: 1 / -1; }
.campo .field__label { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; text-transform: none; }
.campo__dequien { font-size: 12px; font-weight: 600; color: var(--muted); margin: 8px 0 3px; }
.campo__actual { font-size: 11.5px; color: var(--muted-2); margin: 4px 0 0; overflow-wrap: anywhere; }
.campo .input + .campo__actual { margin-bottom: 8px; }
.input--ok { border-color: var(--success); }
.input--error { border-color: var(--danger); }

.volver { margin-top: 24px; }
</style>
