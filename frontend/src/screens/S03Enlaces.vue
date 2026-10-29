<script setup>
import { ref, watch, onMounted } from 'vue'
import { usePadep } from '@/stores/padep'
import { usaCohorte } from '@/composables/usaCohorte'
import ModuleStepper from '@/components/ModuleStepper.vue'
import CohorteContext from '@/components/CohorteContext.vue'
import AvisoError from '@/components/AvisoError.vue'
import Icono from '@/components/Icono.vue'

const { state, goTo } = usePadep()
const { error, aviso, ocupado, carga, asigna, desasigna, guardaEnlace, borraEnlace } = usaCohorte()

const VACIA = { nombre: '', cargo: '', telefono: '', email: '' }
const sedeElegida = ref(null)    // id_cohorte_sede
const enlaceElegido = ref(null)  // id_enlace
const persona = ref(null)        // formulario de persona abierto; null = cerrado

onMounted(carga)

// Cada relectura trae un array nuevo. Si la sede elegida ya tiene enlace (se
// acaba de asignar) o ya no está, se pasa a la siguiente sin asignar: así se
// asignan seguidas sin tocar el desplegable.
watch(() => state.sedes, (ss) => {
  const s = ss.find(x => x.id_cohorte_sede === sedeElegida.value)
  if (!s || s.enlace) sedeElegida.value = ss.find(x => !x.enlace)?.id_cohorte_sede ?? null
}, { immediate: true })

const contacto = (p) => [p.email, p.telefono].filter(Boolean).join(' · ') || '—'

function asignar() {
  const s = state.sedes.find(x => x.id_cohorte_sede === sedeElegida.value)
  if (s) asigna(s, enlaceElegido.value)
}

// El PUT no es un PATCH: se precarga entero. Los null de la API pasan a '',
// que FormData mandaría como el texto «null».
const edita = (e) => {
  persona.value = { id: e.id_enlace, ...Object.fromEntries(Object.keys(VACIA).map(k => [k, e[k] ?? ''])) }
}

async function guardaPersona() {
  const { id, ...campos } = persona.value
  const e = await guardaEnlace(campos, id)
  if (!e) return
  if (!id) enlaceElegido.value = e.id_enlace   // la nueva queda lista para asignar
  persona.value = null
}
</script>

<template>
  <div>
    <ModuleStepper :active-id="3" />

    <p class="eyebrow">Configuración de Cohorte</p>
    <h1 class="page-title">Asignación de Enlaces DIDEDUC</h1>
    <p class="page-sub">Asignar el profesional enlace responsable de cada sede de la cohorte.</p>

    <AvisoError :mensaje="error" />
    <AvisoError :mensaje="aviso" tono="nota" />

    <div class="grid-main">
      <div>
        <template v-if="state.sedes.length > 0">
          <form class="card asignar" @submit.prevent="asignar">
            <label class="field field--tight">
              <span class="asignar__label">Sede</span>
              <select v-model="sedeElegida" class="select" required>
                <option :value="null" disabled>Elegir…</option>
                <option v-for="s in state.sedes" :key="s.id_cohorte_sede" :value="s.id_cohorte_sede">
                  {{ s.escuela }} — {{ s.municipio }}{{ s.enlace ? '' : ' (sin asignar)' }}
                </option>
              </select>
            </label>
            <label class="field field--tight">
              <span class="asignar__label">Nombre del enlace</span>
              <select v-model="enlaceElegido" class="select" required>
                <option :value="null" disabled>Elegir…</option>
                <option v-for="e in state.enlaces" :key="e.id_enlace" :value="e.id_enlace">
                  {{ e.nombre }}{{ e.cargo ? ` · ${e.cargo}` : '' }}
                </option>
              </select>
            </label>
            <div class="btn-row">
              <button class="btn btn--brand" :disabled="ocupado">Asignar</button>
            </div>
          </form>

          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr><th>Sede</th><th>Enlace</th><th>Cargo</th><th>Contacto</th><th><span class="sr-only">Acciones</span></th></tr>
              </thead>
              <tbody>
                <!-- Todas, también las sin enlace: son justo la fila que hay
                     que rellenar. «Asignar» aquí solo la deja elegida arriba. -->
                <tr v-for="s in state.sedes" :key="s.id_cohorte_sede">
                  <td class="is-strong">{{ s.escuela }}<span class="sub">{{ s.municipio }}, {{ s.departamento }}</span></td>
                  <template v-if="s.enlace">
                    <td>{{ s.enlace.nombre }}</td>
                    <td>{{ s.enlace.cargo || '—' }}</td>
                    <td>{{ contacto(s.enlace) }}</td>
                    <td class="is-right">
                      <button class="btn-link btn-link--danger" :disabled="ocupado" @click="desasigna(s)">Quitar</button>
                    </td>
                  </template>
                  <template v-else>
                    <td class="is-pending">Sin asignar</td><td>—</td><td>—</td>
                    <td class="is-right">
                      <button class="btn-link" @click="sedeElegida = s.id_cohorte_sede">Asignar</button>
                    </td>
                  </template>
                </tr>
              </tbody>
            </table>
          </div>
        </template>

        <div v-else class="card empty-state">
          <div class="empty-state__icon"><Icono nombre="persona" /></div>
          <p class="empty-state__title">Sin sedes disponibles</p>
          <p class="empty-state__hint">
            Primero agrega sedes en la pantalla anterior para poder asignarles un enlace.
            <button type="button" class="btn-link" @click="goTo(2)">Ir a Sedes →</button>
          </p>
        </div>

        <!-- La persona es global —no lleva sede ni cohorte— y puede quedarse
             sin asignar: es un estado normal, no un formulario a medias. -->
        <div class="section-head">
          <h2 class="section-title">Personas enlace</h2>
          <button type="button" class="btn btn--outline" @click="persona = { ...VACIA }">Registrar enlace nuevo</button>
        </div>

        <form v-if="persona" class="card asignar" @submit.prevent="guardaPersona">
          <label class="field field--tight">
            <span class="asignar__label">Nombre completo</span>
            <input v-model="persona.nombre" class="input" required>
          </label>
          <label class="field field--tight">
            <span class="asignar__label">Cargo</span>
            <input v-model="persona.cargo" class="input" placeholder="Ej. Supervisor educativo">
          </label>
          <label class="field field--tight">
            <span class="asignar__label">Teléfono</span>
            <input v-model="persona.telefono" class="input">
          </label>
          <label class="field field--tight">
            <span class="asignar__label">Correo</span>
            <input v-model="persona.email" class="input" type="email">
          </label>
          <div class="btn-row">
            <button class="btn btn--brand" :disabled="ocupado">{{ persona.id ? 'Guardar cambios' : 'Guardar enlace' }}</button>
            <button type="button" class="btn btn--outline" @click="persona = null">Cancelar</button>
          </div>
        </form>

        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr><th>Nombre</th><th>Cargo</th><th>Contacto</th><th>Sedes</th><th><span class="sr-only">Acciones</span></th></tr>
            </thead>
            <tbody>
              <tr v-if="state.enlaces.length === 0">
                <td colspan="5" class="empty">Todavía no hay personas registradas.</td>
              </tr>
              <!-- «Sedes» cuenta las de TODAS las cohortes: borrar a alguien
                   que lleva alguna da 409, y el `detail` dice cuáles. -->
              <tr v-for="e in state.enlaces" :key="e.id_enlace">
                <td class="is-strong">{{ e.nombre }}</td>
                <td>{{ e.cargo || '—' }}</td>
                <td>{{ contacto(e) }}</td>
                <td>{{ e.asignaciones.length }}</td>
                <td class="is-right">
                  <span class="acciones">
                    <button class="btn-link" @click="edita(e)">Editar</button>
                    <button class="btn-link btn-link--danger" :disabled="ocupado" @click="borraEnlace(e)">Borrar</button>
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <CohorteContext />
    </div>
  </div>
</template>

<style scoped>
.asignar {
  padding: 22px; margin-bottom: 18px;
  display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 14px; align-items: end;
}
.asignar__label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; color: var(--text); }
.asignar .input, .asignar .select { border-radius: 10px; padding: 9px 11px; font-size: 14px; }
.asignar .btn-row { grid-column: 1 / -1; }
.field--tight { margin-bottom: 0; }
.table-wrap, .empty-state { margin-bottom: 26px; }
.section-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.section-title { margin: 0; font-size: 15px; font-weight: 700; color: var(--navy-ink); }
.sub { display: block; font-size: 12px; font-weight: 400; color: var(--muted-2); }
.acciones { display: inline-flex; gap: 14px; }
.is-pending { color: var(--warning); }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
</style>
