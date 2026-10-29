<script setup>
import { ref, computed, watch } from 'vue'
import { usePadep } from '@/stores/padep'
import { usaFicha } from '@/composables/usaFicha'
import AvisoError from '@/components/AvisoError.vue'
import { iniciales, pillClass, estatusTone, estadoNotaTone, capital } from '@/utils/format'

/**
 * Ficha académica: una persona, con todo lo que la base sabe de ella.
 *
 * Todo sale del papel (`GET /docentes/{codigo}`) menos el estatus académico,
 * que es lo único que se escribe aquí (`POST /docentes/{codigo}/estatus`).
 * Antes era una maqueta con una línea de tiempo «Preinscrito → Evaluación
 * aprobada → Inscripción final» que ningún dato respaldaba —la admisión no se
 * carga—; el historial de ahora son los pagos en cuya nómina estuvo y los
 * cambios de estatus que alguien registró.
 *
 * Es un detalle, no una entrada del menú (`oculta` en el catálogo): se abre
 * con la persona ya elegida desde la búsqueda (S09), la comparación de nóminas
 * (S11) o el seguimiento de estatus (S10). «Volver» regresa allí y
 * «anterior / siguiente» recorre la lista de la que se vino.
 */
const { state, puede, fichaVecina, volverDeFicha, goTo } = usePadep()
const { ficha, error, cargando, guardando, carga, cambiaEstatus } = usaFicha()

// --- Anterior / siguiente en la lista de la que se vino -------------------
const posicion = computed(() => state.fichaLista.indexOf(state.fichaCodigo))
const anterior = computed(() => posicion.value > 0 ? state.fichaLista[posicion.value - 1] : null)
const siguiente = computed(() => posicion.value >= 0 && posicion.value < state.fichaLista.length - 1
  ? state.fichaLista[posicion.value + 1] : null)
const ORIGEN = { 9: 'Volver a la búsqueda', 10: 'Volver al seguimiento', 11: 'Volver a la comparación' }
const textoVolver = computed(() => ORIGEN[state.fichaOrigen] ?? 'Volver')

// --- La inscripción que se mira -----------------------------------------
// Una persona puede estar en dos carreras o dos cohortes; cada una tiene su
// propio estatus.
const indice = ref(0)
const ins = computed(() => ficha.value?.inscripciones[indice.value] ?? null)
const pestana = ref('resumen')

/** Lo que dijo la nómina de cada pago, solo de esta cohorte y carrera. */
const nomina = computed(() => (ficha.value?.nomina ?? [])
  .filter(n => n.cohorte === ins.value?.cohorte && String(n.carrera) === String(ins.value?.carrera)))

const pago = n => [
  `Trimestre ${n.trimestre}${n.corte > 1 ? ` · corte ${n.corte}` : ''}`,
  n.numero_pago ? `${n.numero_pago}.º pago${n.anio_pago ? ` ${n.anio_pago}` : ''}` : '',
].filter(Boolean).join(' · ')

const noCuadra = c => c === false || c === 0

// --- Estatus ---------------------------------------------------------------
const puedeCambiar = computed(() => puede('cohortes.gestionar'))
const ESTATUS = ['activo', 'retirado', 'graduado']
const hoy = new Date().toLocaleDateString('en-CA') // AAAA-MM-DD, hora local

const vacio = (estatus = '') => ({ estatus, fecha: hoy, motivo: '', referencia: '', acta: '' })
const form = ref(vacio())
const aviso = ref('')
const errorForm = ref('')
watch(ins, () => { form.value = vacio(); aviso.value = ''; errorForm.value = '' })

const opciones = computed(() => ESTATUS.filter(e => e !== ins.value?.estatus_academico))
const ultimaFecha = computed(() => ins.value?.historial.at(-1)?.fecha ?? '')
// Lo que la API exige, dicho antes de mandar.
const pideMotivo = computed(() => form.value.estatus === 'retirado' || form.value.estatus === 'activo')
const listo = computed(() => !!form.value.estatus
  && (!pideMotivo.value || form.value.motivo.trim())
  && (form.value.estatus !== 'graduado' || form.value.acta.trim()))

async function registra() {
  aviso.value = ''
  errorForm.value = ''
  const f = form.value
  try {
    await cambiaEstatus(ins.value, {
      estatus: f.estatus, fecha: f.fecha, motivo: f.motivo,
      referencia: f.estatus === 'retirado' ? f.referencia : '',
      acta: f.estatus === 'graduado' ? f.acta : '',
    })
    form.value = vacio()
    aviso.value = `Registrado: ${f.estatus}.`
  } catch (e) {
    errorForm.value = e.message
  }
}

const QUE_ES = {
  activo: 'Sigue en el programa. Volver a activo deshace un retiro o una graduación: di por qué.',
  retirado: 'Dejó el programa. Salir de la nómina no basta para decirlo: hay quien sigue en las actas.',
  graduado: 'Terminó el programa. El número de acta es único.',
}

watch(() => state.fichaCodigo, async codigo => {
  indice.value = 0
  pestana.value = 'resumen'
  await carga(codigo)
  // Abierta desde una baja: directo al formulario, si de verdad cambia algo.
  if (state.fichaEstatus && ins.value && ins.value.estatus_academico !== state.fichaEstatus) {
    pestana.value = 'estatus'
    form.value = vacio(state.fichaEstatus)
  }
  state.fichaEstatus = null
}, { immediate: true })
</script>

<template>
  <div>
    <p class="eyebrow eyebrow--plain">Ficha Académica / Seguimiento</p>
    <h1 class="page-title">Ficha Académica del Docente</h1>
    <p class="page-sub">
      Todo lo que la base sabe de una persona: notas, asistencia y lo que dijo la nómina de cada
      pago. Lo único que se escribe aquí es su estatus académico, que no está en ningún papel.
    </p>

    <nav class="navega" aria-label="Navegación de la ficha">
      <button class="btn btn--ghost btn--sm" @click="volverDeFicha">← {{ textoVolver }}</button>
      <span v-if="state.fichaLista.length > 1" class="navega__lista">
        <button class="btn btn--outline btn--sm" :disabled="!anterior" @click="fichaVecina(anterior)">‹ Anterior</button>
        <span class="sub">{{ posicion + 1 }} de {{ state.fichaLista.length }}</span>
        <button class="btn btn--outline btn--sm" :disabled="!siguiente" @click="fichaVecina(siguiente)">Siguiente ›</button>
      </span>
    </nav>

    <AvisoError :mensaje="error" />
    <p v-if="cargando" class="sub">Cargando ficha…</p>
    <div v-else-if="!state.fichaCodigo" class="card card--flat sin-persona">
      <p class="vacio">No hay ninguna persona elegida.</p>
      <button class="btn btn--primary" @click="goTo(9)">Ir a la búsqueda de docentes</button>
    </div>

    <template v-if="ficha && ins">
      <header class="ficha-head">
        <span class="ficha-head__avatar">{{ iniciales(ficha.docente.nombre) }}</span>
        <div class="ficha-head__meta">
          <p class="ficha-head__name">{{ ficha.docente.nombre }}</p>
          <p class="ficha-head__id mono">
            {{ ficha.docente.codigo_padep }}<template v-if="ficha.docente.cui"> · CUI {{ ficha.docente.cui }}</template>
            <template v-if="ficha.docente.municipio"> · {{ ficha.docente.municipio }}, {{ ficha.docente.departamento }}</template>
          </p>
        </div>
        <span :class="pillClass(estatusTone(ins.estatus_academico))">{{ capital(ins.estatus_academico) }}</span>
      </header>

      <label v-if="ficha.inscripciones.length > 1" class="field inscripcion">
        <span class="field__label">Inscripción</span>
        <select v-model="indice" class="select">
          <option v-for="(x, i) in ficha.inscripciones" :key="i" :value="i">
            Cohorte {{ x.cohorte }} · Carrera {{ x.carrera }} — {{ x.carrera_nombre }}
          </option>
        </select>
      </label>

      <div class="tabs" role="tablist">
        <button
          class="tabs__tab" :class="{ 'is-active': pestana === 'resumen' }"
          role="tab" :aria-selected="pestana === 'resumen'"
          @click="pestana = 'resumen'">Resumen</button>
        <button
          class="tabs__tab" :class="{ 'is-active': pestana === 'estatus' }"
          role="tab" :aria-selected="pestana === 'estatus'"
          @click="pestana = 'estatus'">Estatus</button>
      </div>

      <div class="ficha-grid">
        <div>
          <!-- Resumen: todo del papel, solo lectura -->
          <template v-if="pestana === 'resumen'">
            <section class="card card--flat bloque">
              <h2 class="card__head">Inscripción</h2>
              <dl class="expediente">
                <div><dt>Carrera</dt><dd>{{ ins.carrera }} — {{ ins.carrera_nombre }}</dd></div>
                <div><dt>Cohorte</dt><dd>{{ ins.cohorte_nombre || ins.cohorte }}</dd></div>
                <div><dt>Escuela</dt><dd>{{ ins.laboral?.escuela || '—' }}</dd></div>
                <div><dt>Escalafón</dt><dd>{{ ins.laboral?.escalafon || '—' }}</dd></div>
                <div><dt>Jornada</dt><dd>{{ ins.laboral?.jornada || '—' }}</dd></div>
                <div><dt>Partida</dt><dd class="mono">{{ ins.laboral?.partida || '—' }}</dd></div>
              </dl>
            </section>

            <section class="card card--flat bloque">
              <h2 class="card__head">Notas</h2>
              <p v-if="!ins.notas.length" class="card__body vacio">Sin notas cargadas.</p>
              <div v-else class="table-wrap table-wrap--scroll plano">
                <table class="table">
                  <thead>
                    <tr><th>Asignatura</th><th>Bimestre</th><th>Zona</th><th>Examen</th><th>Nota</th><th>Estado</th></tr>
                  </thead>
                  <tbody>
                    <tr v-for="n in ins.notas" :key="`${n.trimestre}-${n.corte}-${n.asignatura_codigo}`">
                      <td>
                        {{ n.asignatura }}
                        <div class="sub">
                          Secc. {{ n.seccion || '—' }}<template v-if="n.catedratico"> · {{ n.catedratico }}</template><template v-if="n.pagina_origen"> · pág. {{ n.pagina_origen }}</template>
                        </div>
                        <div v-if="noCuadra(n.cuadra)" class="aviso-celda">Zona + examen no cuadra con la nota del papel.</div>
                      </td>
                      <td>{{ n.bimestre }}</td>
                      <td class="mono">{{ n.zona ?? '—' }}</td>
                      <td class="mono">{{ n.examen_final ?? '—' }}</td>
                      <td class="mono is-strong">{{ n.nota_final ?? '—' }}</td>
                      <td><span :class="pillClass(estadoNotaTone(n.estado))">{{ n.estado }}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section class="card card--flat bloque">
              <h2 class="card__head">Asistencia</h2>
              <p v-if="!ins.asistencia.length" class="card__body vacio">Sin asistencia cargada.</p>
              <ul v-else class="lista">
                <li v-for="a in ins.asistencia" :key="`${a.trimestre}-${a.corte}`">
                  <span>
                    {{ a.bimestre }}
                    <span class="sub">{{ a.presentes }} de {{ a.total_declarado ?? a.sesiones.length }} sesiones</span>
                    <span v-if="noCuadra(a.cuadra)" class="aviso-celda">Las sesiones marcadas no cuadran con el total declarado.</span>
                  </span>
                  <span class="sesiones">
                    <span
                      v-for="s in a.sesiones" :key="s.numero"
                      class="sesion" :class="{ 'is-on': s.presente }"
                      :title="`Sesión ${s.numero}${s.fecha ? ` (${s.fecha})` : ''}: ${s.presente ? 'presente' : 'ausente'}`" />
                  </span>
                  <strong class="mono">{{ a.porcentaje == null ? '—' : `${Math.round(a.porcentaje)} %` }}</strong>
                </li>
              </ul>
            </section>

            <section v-if="ficha.incidencias.length" class="card card--flat bloque">
              <h2 class="card__head">Sin resolver al cargar ({{ ficha.incidencias.length }})</h2>
              <ul class="lista">
                <li v-for="(x, i) in ficha.incidencias" :key="i">
                  <span>
                    <span :class="pillClass('clay')">{{ x.tipo }}</span>
                    {{ x.detalle }}
                    <span class="sub">
                      trimestre {{ x.trimestre }}<template v-if="x.documento"> · {{ x.documento }}</template><template v-if="x.pagina"> · pág. {{ x.pagina }}</template>
                    </span>
                  </span>
                </li>
              </ul>
            </section>
          </template>

          <!-- Estatus: lo único que se escribe -->
          <section v-else class="card card--flat bloque">
            <h2 class="card__head">Registrar un cambio de estatus</h2>
            <div class="card__body">
              <p class="sub explica">
                Vigente: <strong>{{ capital(ins.estatus_academico) }}</strong><template v-if="ins.graduacion"> · acta {{ ins.graduacion.acta }}</template>.
                Cada cambio queda en el historial con quién lo registró; no se edita ni se borra.
                Para corregir uno, registra otro encima con el motivo.
              </p>

              <p v-if="!puedeCambiar" class="vacio">
                Tu rol puede ver el estatus pero no cambiarlo (hace falta «gestionar cohortes»).
              </p>
              <form v-else @submit.prevent="registra">
                <div class="sub-grid sub-grid--2">
                  <label class="field field--tight">
                    <span class="field__label">Nuevo estatus</span>
                    <select v-model="form.estatus" class="select">
                      <option value="" disabled>Elige…</option>
                      <option v-for="e in opciones" :key="e" :value="e">{{ capital(e) }}</option>
                    </select>
                  </label>
                  <label class="field field--tight">
                    <span class="field__label">Fecha</span>
                    <input v-model="form.fecha" class="input" type="date" :max="hoy" :min="ultimaFecha || undefined">
                  </label>
                </div>
                <p v-if="form.estatus" class="sub explica">{{ QUE_ES[form.estatus] }}</p>

                <div v-if="form.estatus" class="sub-grid sub-grid--2">
                  <label v-if="form.estatus !== 'graduado'" class="field field--tight">
                    <span class="field__label">Motivo</span>
                    <input
                      v-model="form.motivo" class="input" maxlength="255"
                      :placeholder="form.estatus === 'retirado' ? 'Por qué dejó el programa' : 'Por qué se deshace'">
                  </label>
                  <label v-if="form.estatus === 'retirado'" class="field field--tight">
                    <span class="field__label">Ref. carta convenio (opcional)</span>
                    <input v-model="form.referencia" class="input" maxlength="150" placeholder="N.° de referencia">
                  </label>
                  <label v-if="form.estatus === 'graduado'" class="field field--tight">
                    <span class="field__label">Número de acta</span>
                    <input v-model="form.acta" class="input" maxlength="80" placeholder="Acta N.°">
                  </label>
                  <label v-if="form.estatus === 'graduado'" class="field field--tight">
                    <span class="field__label">Nota (opcional)</span>
                    <input v-model="form.motivo" class="input" maxlength="255">
                  </label>
                </div>

                <AvisoError :mensaje="errorForm" />
                <p v-if="aviso" class="ok">{{ aviso }}</p>
                <button class="btn btn--primary enviar" :disabled="!listo || guardando">
                  {{ guardando ? 'Guardando…' : 'Registrar estatus' }}
                </button>
              </form>
            </div>
          </section>
        </div>

        <aside class="card card--flat historial">
          <p class="historial__title">Estatus</p>
          <ol class="historial__list">
            <li class="historial__item">
              <span class="historial__dot is-activo" aria-hidden="true" />
              <span class="historial__label">Inscrito · activo</span>
            </li>
            <li v-for="(h, i) in ins.historial" :key="i" class="historial__item">
              <span class="historial__dot" :class="`is-${h.estatus}`" aria-hidden="true" />
              <span class="historial__label">
                {{ capital(h.estatus) }} <span class="historial__fecha">· {{ h.fecha }}</span>
                <span v-if="h.motivo" class="historial__det">{{ h.motivo }}</span>
                <span v-if="h.referencia" class="historial__det">Carta convenio {{ h.referencia }}</span>
                <span v-if="h.usuario" class="historial__det">por {{ h.usuario }}</span>
              </span>
            </li>
          </ol>

          <p class="historial__title">En la nómina</p>
          <p v-if="!nomina.length" class="sub">No sale en ninguna nómina cargada.</p>
          <ul v-else class="pagos">
            <li v-for="n in nomina" :key="`${n.trimestre}-${n.corte}`">
              <span class="is-strong">{{ pago(n) }}</span>
              <span class="sub">{{ n.municipio }}<template v-if="n.escalafon"> · escalafón {{ n.escalafon }}</template></span>
              <span v-if="n.partida" class="sub mono">{{ n.partida }}</span>
            </li>
          </ul>
          <p class="sub">
            Solo los pagos cargados a la base. Quién salió de un pago al siguiente lo dice la
            comparación de nóminas.
          </p>
        </aside>
      </div>
    </template>
  </div>
</template>

<style scoped>
.navega { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; }
.navega__lista { display: flex; align-items: center; gap: 10px; }
.btn--sm { height: 36px; padding: 0 12px; font-size: 13px; }
.sin-persona { padding: 24px; display: flex; flex-direction: column; align-items: flex-start; gap: 12px; }

.ficha-head {
  display: flex; align-items: center; gap: 16px; margin: 4px 0 18px;
  background: var(--blue-bg); border: 1px solid var(--blue-br); border-radius: var(--r-md); padding: 18px 20px;
}
.ficha-head__avatar {
  width: 52px; height: 52px; border-radius: 50%; flex-shrink: 0;
  background: #fff; border: 1px solid var(--blue-br); color: var(--blue);
  display: flex; align-items: center; justify-content: center; font-size: 17px; font-weight: 700;
}
.ficha-head__meta { flex: 1; min-width: 0; }
.ficha-head__name { margin: 0; font-size: 17px; font-weight: 700; color: var(--ink); line-height: 1.2; }
.ficha-head__id { margin: 2px 0 0; font-size: 12px; color: var(--muted-2); }
.inscripcion { max-width: 520px; }

.tabs { display: flex; border-bottom: 1px solid var(--border-3); margin-bottom: 22px; }
.tabs__tab {
  padding: 10px 4px; margin-right: 20px; border: none; background: none; cursor: pointer;
  font-family: inherit; font-size: 14px; font-weight: 600; color: var(--muted-2);
  border-bottom: 2px solid transparent;
}
.tabs__tab.is-active { color: var(--ink); border-bottom-color: var(--blue); }

.ficha-grid { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); gap: 22px; align-items: start; }
@media (max-width: 900px) { .ficha-grid { grid-template-columns: 1fr; } }
.bloque { margin-bottom: 20px; }
.plano { border: none; border-radius: 0; box-shadow: none; }

.expediente {
  margin: 0; padding: 20px; display: grid; grid-template-columns: 1fr 1fr;
  row-gap: 16px; column-gap: 20px; font-size: 13px;
}
.expediente dt { font-size: 12px; color: var(--muted-2); text-transform: uppercase; letter-spacing: .04em; font-weight: 600; margin-bottom: 4px; }
.expediente dd { margin: 0; color: var(--ink); overflow-wrap: anywhere; }

.lista { list-style: none; margin: 0; padding: 0; }
.lista li {
  display: flex; align-items: center; justify-content: space-between; gap: 14px;
  padding: 12px 20px; font-size: 13px; color: var(--ink);
}
.lista li + li { border-top: 1px solid var(--border-3); }
.lista .sub { display: block; }
.sesiones { display: flex; gap: 3px; flex-wrap: wrap; margin-left: auto; }
.sesion { width: 10px; height: 10px; border-radius: 2px; background: var(--border-2); }
.sesion.is-on { background: var(--success); }

.sub { font-size: 12px; color: var(--muted-2); margin: 2px 0 0; }
.vacio { font-size: 14px; color: var(--muted-2); }
.aviso-celda { display: block; font-size: 12px; color: var(--warning); }
.ok { font-size: 13px; color: var(--success); margin: 10px 0 0; }
.explica { margin: 0 0 16px; font-size: 13px; line-height: 1.5; }
.is-strong { font-weight: 600; color: var(--ink); }

.sub-grid { display: grid; gap: 14px; margin-bottom: 14px; }
.sub-grid--2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
@media (max-width: 720px) { .sub-grid--2 { grid-template-columns: 1fr; } }
.field--tight { margin-bottom: 0; }
.enviar { margin-top: 8px; }

.historial { padding: 20px; }
.historial__title {
  margin: 0 0 14px; font-size: 12px; font-weight: 600; letter-spacing: .06em;
  text-transform: uppercase; color: var(--muted-2);
}
.historial__list { list-style: none; margin: 0 0 22px; padding: 0 0 0 6px; position: relative; }
.historial__list::before {
  content: ''; position: absolute; left: 13px; top: 6px; bottom: 12px;
  width: 2px; background: var(--border-3);
}
.historial__item { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px; position: relative; }
.historial__dot { width: 16px; height: 16px; border-radius: 50%; flex-shrink: 0; margin-top: 2px; }
.historial__dot.is-activo { background: var(--teal); }
.historial__dot.is-retirado { background: var(--danger); }
.historial__dot.is-graduado { background: var(--success); }
.historial__label { font-size: 13px; line-height: 1.4; color: var(--text); font-weight: 600; }
.historial__fecha { font-weight: 400; color: var(--muted-2); }
.historial__det { display: block; font-weight: 400; font-size: 12px; color: var(--muted); }

.pagos { list-style: none; margin: 0 0 12px; padding: 0; }
.pagos li { display: flex; flex-direction: column; padding: 8px 0; font-size: 13px; }
.pagos li + li { border-top: 1px solid var(--border-3); }
</style>
