<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { usePadep } from '@/stores/padep'
import { usaCortes } from '@/composables/usaCortes'
import { usaComparacion } from '@/composables/usaComparacion'
import SelectorCorte from '@/components/SelectorCorte.vue'
import AvisoError from '@/components/AvisoError.vue'
import { pillClass, plural } from '@/utils/format'

const { puede, openFicha } = usePadep()

// El corte que se revisa se comparte con las otras pantallas (misma llave de
// localStorage): normalmente es el último que se entregó.
const { lista: cortes, elegido, carga: cargaCortes, elige } = usaCortes()
// '' = el anterior de la misma carrera, que decide la API.
const contra = ref('')
const { datos, error, cargando, guardando, carga, marca, clave, marcadas } =
  usaComparacion(elegido, contra)

// Marcar es escribir en la base: lo mismo que completar a mano.
const puedeMarcar = computed(() => puede('incidencias.resolver') && !!datos.value?.marcas_disponible)

// Solo se compara dentro de la misma unidad, cohorte y carrera: cada carrera
// tiene su nómina, y la «35» de otra unidad es otra. La API lo rechaza igual;
// esto es para no ofrecerlo.
const elegidoCorte = computed(() => cortes.value.find(c => c.id === elegido.value))
const otros = computed(() => cortes.value.filter(c => elegidoCorte.value
  && c.id !== elegido.value
  && c.unidad === elegidoCorte.value.unidad
  && c.cohorte === elegidoCorte.value.cohorte && c.carrera === elegidoCorte.value.carrera))
const nombreCorte = (c) => `trimestre ${c.trimestre}${c.corte === 1 ? '' : ` · corte ${c.corte}`}`
const nombreId = (id) => {
  const c = cortes.value.find(x => x.id === id)
  return c ? nombreCorte(c) : id
}

const pestana = ref('bajas')
const PESTANAS = [
  { id: 'bajas', label: 'Bajas', title: 'Estaban en la nómina anterior y ya no están' },
  { id: 'altas', label: 'Altas', title: 'Están en esta nómina y no estaban en la anterior' },
  { id: 'cambios', label: 'Cambios', title: 'Siguen, pero algún dato de la nómina cambió' },
]
const TIPO = { bajas: 'baja', altas: 'alta', cambios: 'cambio' }
const VACIO = { bajas: 'Nadie dejó la nómina.', altas: 'No entró nadie nuevo.', cambios: 'Ningún dato cambió.' }
const filas = computed(() => datos.value?.[pestana.value] ?? [])

/** «asistió 2 de 7 sesiones · curso 20: NO APROBADO · Matemática: 40» */
function comoIba(h) {
  if (!h) return ''
  const partes = []
  if (h.asistencia) partes.push(`asistió ${h.asistencia.asistio} de ${h.asistencia.sesiones} sesiones`)
  for (const [curso, d] of Object.entries(h.dictamen ?? {})) {
    partes.push(`${curso.replace('_', ' ').toLowerCase()}: ${d}`)
  }
  for (const n of h.notas ?? []) {
    partes.push(`${n.asignatura || 'asignatura'}: ${n.nota || '—'}${n.observaciones ? ` (${n.observaciones})` : ''}`)
  }
  return partes.join(' · ')
}

// La nota que se está escribiendo, por fila, hasta que se guarda al salir.
const notas = ref({})
const notaDe = (tipo, x) => notas.value[clave(tipo, x)] ?? x.marca?.nota ?? ''

async function alterna(x) {
  const tipo = TIPO[pestana.value]
  await marca(tipo, x, !x.marca, x.marca ? '' : notaDe(tipo, x))
}

// La nota de una fila ya marcada se guarda al salir del campo; la de una sin
// marcar se queda esperando a que se marque.
async function guardaNota(x, texto) {
  const tipo = TIPO[pestana.value]
  notas.value = { ...notas.value, [clave(tipo, x)]: texto }
  if (x.marca) await marca(tipo, x, true, texto)
}

// --- Exportar la pestaña que se ve ---
function detalleDe(x) {
  if (pestana.value === 'cambios') return x.campos.map(c => `${c.etiqueta}: ${c.antes} -> ${c.ahora}`).join('; ')
  if (pestana.value === 'bajas') {
    return [x.en_documentos_ahora.length ? `sigue en ${x.en_documentos_ahora.join(', ')}` : '',
      comoIba(x.historial)].filter(Boolean).join(' · ')
  }
  return x.en_documentos_antes.length ? `ya estaba en ${x.en_documentos_antes.join(', ')}` : ''
}

function exporta() {
  const d = datos.value
  const celda = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const col = ['tipo', 'carne', 'nombre', 'departamento', 'municipio', 'detalle', 'revisar', 'nota']
  const csv = [col.join(','), ...filas.value.map(x => [TIPO[pestana.value], x.carne, x.nombre,
    x.departamento, x.municipio, detalleDe(x), x.marca ? 'si' : '', x.marca?.nota ?? '']
    .map(celda).join(','))].join('\r\n')
  // BOM para que Excel lea bien las tildes.
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `${pestana.value}_${d.antes.id}_vs_${d.ahora.id}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}

// Al cambiar de corte, «contra» vuelve a «el anterior»: el elegido antes puede
// ser de otra carrera. Si ya estaba vacío, el watch de `contra` no salta y hay
// que cargar aquí.
watch(elegido, () => {
  notas.value = {}
  if (contra.value) contra.value = ''
  else carga()
})
watch(contra, () => { notas.value = {}; carga() })
onMounted(async () => {
  try {
    await cargaCortes()
  } catch (e) { /* el error lo enseña `carga` */ }
  await carga()
})
</script>

<template>
  <div>
    <p class="eyebrow eyebrow--plain">Ficha Académica / Seguimiento</p>
    <h1 class="page-title">Comparación de Nóminas</h1>
    <p class="page-sub">
      Qué cambió en la nómina de un pago al siguiente: quién ya no está, quién entró y a
      quién le cambió algún dato. Se compara por carné con la nómina que cada corte ya tiene
      subida; no hace falta subir nada.
    </p>

    <AvisoError :mensaje="error" />

    <section class="card card--flat bloque">
      <div class="card__body">
        <div class="fila">
          <div class="fila__ancho">
            <SelectorCorte :lista="cortes" :elegido="elegido" @elige="elige" />
          </div>
          <label class="field">
            <span class="field__label">Comparar contra</span>
            <select v-model="contra" class="select">
              <option value="">el corte anterior</option>
              <option v-for="c in otros" :key="c.id" :value="c.id">{{ nombreCorte(c) }}</option>
            </select>
          </label>
        </div>

        <p v-if="cargando" class="nota">Comparando…</p>
        <template v-else-if="datos">
          <p class="nota">
            <strong>{{ nombreId(datos.antes.id) }}</strong>
            ({{ datos.antes.personas.toLocaleString('es-GT') }} en la nómina)
            → <strong>{{ nombreId(datos.ahora.id) }}</strong>
            ({{ datos.ahora.personas.toLocaleString('es-GT') }})
          </p>
          <div class="resumen">
            <span :class="pillClass(datos.resumen.bajas ? 'danger' : 'success')">
              {{ plural(datos.resumen.bajas, 'baja', 'bajas') }}</span>
            <span :class="pillClass(datos.resumen.altas ? 'clay' : 'success')">
              {{ plural(datos.resumen.altas, 'alta', 'altas') }}</span>
            <span :class="pillClass(datos.resumen.cambios ? 'clay' : 'success')">
              {{ plural(datos.resumen.cambios, 'cambio', 'cambios') }}</span>
            <span :class="pillClass()">{{ datos.resumen.sin_cambio.toLocaleString('es-GT') }} sin cambio</span>
            <span v-if="marcadas" :class="pillClass('teal')">
              {{ plural(marcadas, 'marcada', 'marcadas') }} para revisar</span>
          </div>
        </template>
      </div>
    </section>

    <!-- Sin base, la comparación sale igual: lo único que falta son las marcas. -->
    <AvisoError
      v-if="datos && !datos.marcas_disponible"
      :mensaje="`Las marcas de revisión no están disponibles: ${datos.marcas_motivo}. La comparación sí está al día.`"
      tono="nota" />

    <template v-if="datos">
      <div class="cabeza-tabla">
        <div class="segmented" role="tablist">
          <button
            v-for="p in PESTANAS" :key="p.id"
            class="segmented__tab" :class="{ 'is-active': pestana === p.id }"
            role="tab" :aria-selected="pestana === p.id" :title="p.title"
            @click="pestana = p.id">
            {{ p.label }} ({{ datos.resumen[p.id] }})
          </button>
        </div>
        <button v-if="filas.length" class="btn btn--outline" @click="exporta">Exportar CSV</button>
      </div>

      <p v-if="!filas.length" class="vacio">{{ VACIO[pestana] }}</p>

      <div v-else class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Docente</th>
              <th>Ubicación</th>
              <th>{{ pestana === 'cambios' ? 'Qué cambió' : 'Qué indica' }}</th>
              <th>Revisión</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="x in filas" :key="x.carne" :class="{ 'is-flagged': x.marca }">
              <td>
                <div class="is-strong">{{ x.nombre }}</div>
                <div class="mono sub">{{ x.carne }}</div>
              </td>
              <td>{{ x.municipio }}<div class="sub">{{ x.departamento }}</div></td>

              <!-- Bajas: si sigue en los documentos del pago nuevo no se
                   retiró, falta en la nómina. Es lo primero que hay que ver. -->
              <td v-if="pestana === 'bajas'">
                <span
                  v-if="x.en_documentos_ahora.length" :class="pillClass('teal')"
                  title="Aparece en los documentos del pago nuevo aunque no en su nómina">
                  sigue en {{ x.en_documentos_ahora.join(', ').toLowerCase() }}
                </span>
                <span v-else :class="pillClass('danger')">sin rastro en el pago nuevo</span>
                <div v-if="comoIba(x.historial)" class="sub">Antes: {{ comoIba(x.historial) }}</div>
                <!-- La marca dice «hay que mirarlo»; la decisión —se retiró o
                     no— se registra en su ficha, con motivo y fecha. -->
                <button
                  v-if="puede('cohortes.gestionar')" class="btn-link"
                  @click="openFicha(x.carne, { estatus: 'retirado', lista: filas.map(f => f.carne) })">Registrar retiro en su ficha</button>
              </td>
              <td v-else-if="pestana === 'altas'">
                <span
                  v-if="x.en_documentos_antes.length" :class="pillClass('clay')"
                  title="Ya salía en los documentos del pago anterior sin estar en su nómina">
                  ya estaba en {{ x.en_documentos_antes.join(', ').toLowerCase() }}
                </span>
                <span v-else :class="pillClass('success')">nueva</span>
              </td>
              <td v-else>
                <div v-for="c in x.campos" :key="c.campo" class="cambio">
                  <span class="cambio__campo">{{ c.etiqueta }}</span>
                  <span class="mono">{{ c.antes || '—' }}</span>
                  <span class="cambio__flecha">→</span>
                  <span class="mono">{{ c.ahora || '—' }}</span>
                </div>
              </td>

              <td class="revision">
                <template v-if="puedeMarcar">
                  <button
                    class="btn-link" :disabled="guardando === clave(TIPO[pestana], x)"
                    @click="alterna(x)">
                    {{ x.marca ? 'Marcada para revisar ✓' : 'Marcar para revisar' }}
                  </button>
                  <input
                    class="input input--sm" :value="notaDe(TIPO[pestana], x)"
                    placeholder="nota (opcional)"
                    @change="guardaNota(x, $event.target.value)">
                  <div v-if="x.marca?.usuario" class="sub">por {{ x.marca.usuario }}</div>
                </template>
                <template v-else>
                  <span v-if="x.marca" :class="pillClass('clay')">marcada</span>
                  <div v-if="x.marca?.nota" class="sub">{{ x.marca.nota }}</div>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<style scoped>
.bloque { margin-bottom: 16px; }
.fila { display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-end; }
.fila__ancho { flex: 1 1 320px; }
.nota { margin: 14px 0 8px; font-size: 14px; color: var(--text); }
.resumen { display: flex; flex-wrap: wrap; gap: 8px; }
.cabeza-tabla { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between; }
.segmented {
  display: inline-flex; flex-wrap: wrap; gap: 2px; padding: 4px; border-radius: 9px;
  background: var(--teal-bg); margin-bottom: 18px;
}
.segmented__tab {
  padding: 7px 16px; border-radius: 7px; border: none; cursor: pointer;
  font-family: inherit; font-size: 14px; font-weight: 600;
  background: transparent; color: var(--teal);
}
.segmented__tab.is-active { background: #fff; color: var(--navy); }
.table-wrap { margin-bottom: 18px; }
.sub { font-size: 12px; color: var(--muted-2); margin-top: 2px; }
.vacio { font-size: 14px; color: var(--muted-2); }
.cambio { display: flex; flex-wrap: wrap; gap: 6px; align-items: baseline; font-size: 13px; }
.cambio + .cambio { margin-top: 4px; }
.cambio__campo { font-weight: 600; }
.cambio__flecha { color: var(--muted-2); }
.revision { min-width: 200px; }
.revision .input { margin-top: 6px; }
.input--sm { padding: 5px 8px; font-size: 13px; }
</style>
