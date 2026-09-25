<script setup>
import { ref, watch, onMounted } from 'vue'
import { usePadep } from '@/stores/padep'
import { api } from '@/api/extraccion'
import { usaCohorte } from '@/composables/usaCohorte'
import ModuleStepper from '@/components/ModuleStepper.vue'
import CohorteContext from '@/components/CohorteContext.vue'
import AvisoError from '@/components/AvisoError.vue'

const { state } = usePadep()
const { error, aviso, ocupado, carga, agregaSede, quitaSede } = usaCohorte()

const departamentos = ref([])
const municipios = ref([])
const escuelas = ref([])
const idDep = ref(null)
const idMun = ref(null)
const escuela = ref('')

// Los catálogos fallan igual que el resto (503): el error va al mismo sitio.
const lee = (p) => p.catch(e => { error.value = e.message; return [] })

onMounted(async () => { departamentos.value = await lee(api.departamentos()); carga() })

// Cascada: cambiar el departamento vacía municipio y escuela, y así sucesivamente.
watch(idDep, async d => { idMun.value = null; municipios.value = d ? await lee(api.municipios(d)) : [] })
watch(idMun, async m => { escuela.value = ''; escuelas.value = m ? await lee(api.escuelas(m)) : [] })

async function agrega() {
  if (await agregaSede({ id_municipio: idMun.value, escuela: escuela.value.trim() })) escuela.value = ''
}
</script>

<template>
  <div>
    <ModuleStepper :active-id="2" />

    <p class="eyebrow">Configuración de Cohorte</p>
    <h1 class="page-title">Sedes y Centros Educativos</h1>
    <p class="page-sub">Seleccionar los departamentos, municipios y centros educativos de la cohorte.</p>

    <AvisoError :mensaje="error" />
    <AvisoError :mensaje="aviso" tono="nota" />

    <div class="grid-main">
      <div>
        <form class="card picker" @submit.prevent="agrega">
          <div class="grid-auto">
            <label class="field field--tight">
              <span class="picker__label">Departamento</span>
              <select v-model="idDep" class="select" required>
                <option :value="null" disabled>Elegir…</option>
                <option v-for="d in departamentos" :key="d.id_departamento" :value="d.id_departamento">{{ d.nombre }}</option>
              </select>
            </label>

            <!-- Municipios y escuelas son los que la base ha visto, no el
                 listado oficial. Un municipio que falte no se crea desde aquí. -->
            <label class="field field--tight">
              <span class="picker__label">Municipio</span>
              <select v-model="idMun" class="select" required :disabled="!idDep">
                <option :value="null" disabled>Elegir…</option>
                <option v-for="m in municipios" :key="m.id_municipio" :value="m.id_municipio">{{ m.nombre }}</option>
              </select>
            </label>

            <!-- Las conocidas como sugerencia y texto libre para una nueva: la
                 API busca por nombre y reutiliza si existe; el POST es el mismo. -->
            <label class="field field--tight">
              <span class="picker__label">Sede / centro educativo</span>
              <input v-model="escuela" class="input" list="escuelas" required :disabled="!idMun"
                     placeholder="Elegir o escribir una nueva">
              <datalist id="escuelas">
                <option v-for="e in escuelas" :key="e.id_escuela" :value="e.nombre" />
              </datalist>
            </label>
          </div>

          <button class="btn btn--outline" :disabled="ocupado || !state.cohorte.codigo">+ Agregar sede</button>
        </form>

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
              <!-- «Quitar» no se oculta en las sedes con datos cargados: no hay
                   campo que lo diga de antemano. El 409 lo explica. -->
              <tr v-for="s in state.sedes" :key="s.id_cohorte_sede">
                <td>{{ s.departamento }}</td>
                <td>{{ s.municipio }}</td>
                <td class="is-strong">{{ s.escuela }}</td>
                <td class="is-right">
                  <button class="btn-link btn-link--danger" :disabled="ocupado" @click="quitaSede(s)">Quitar</button>
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
.picker { padding: 22px; margin-bottom: 22px; }
.picker .grid-auto { margin-bottom: 16px; }
.picker__label { display: block; font-size: 12.5px; font-weight: 600; margin-bottom: 6px; color: var(--text); }
.field--tight { margin-bottom: 0; }
.picker .select, .picker .input { border-radius: 10px; padding: 9px 11px; font-size: 13.5px; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
</style>
