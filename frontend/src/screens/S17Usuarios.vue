<script setup>
/**
 * Usuarios y Roles. Solo con `usuarios.gestionar`.
 *
 * Dos cosas en una pantalla:
 *
 * - **Usuarios**: alta, nombre y rol, activar/desactivar y restablecer la
 *   contraseña. No se borran: se desactivan, y su nombre sigue en lo que hizo.
 *   El correo no se edita —es con lo que la persona entra—.
 * - **Roles y permisos**: la matriz rol × permiso, que vive en la base
 *   (`RolPermiso`) y no en el código. Un cambio vale desde la siguiente
 *   petición de cada usuario de ese rol, sin que tenga que volver a entrar.
 *
 * Desactivar, cambiar el rol o restablecer la contraseña **cierra las sesiones
 * de esa persona** en el acto. Y la API no deja quedarse sin nadie que pueda
 * administrar: responde 409 con su motivo, que se enseña tal cual.
 */
import { ref, computed, onMounted } from 'vue'
import { usePadep } from '@/stores/padep'
import { usuarios as api } from '@/api/auth'
import AvisoError from '@/components/AvisoError.vue'

const { state, pideConfirmacion } = usePadep()

const lista = ref(null)          // null = sin leer o falló
const roles = ref([])            // [{ rol, usuarios, permisos }]
const catalogo = ref([])         // [{ codigo, descripcion }]
const errorLista = ref('')
const error = ref('')
const aviso = ref('')
const ocupado = ref(false)

const form = ref(null)           // alta o edición abierta; null = cerrado
const editando = ref(null)       // id del que se edita; null = alta
const clave = ref(null)          // { id, nombre, password } restableciendo

// La matriz que se está editando: rol -> Set de códigos. Se compara con la de
// la base para saber qué fila tiene cambios sin guardar.
const borrador = ref({})

async function carga() {
  try {
    const [u, r] = await Promise.all([api.lista(), api.roles()])
    lista.value = u
    roles.value = r.roles
    catalogo.value = r.permisos
    borrador.value = Object.fromEntries(r.roles.map(x => [x.rol, new Set(x.permisos)]))
    errorLista.value = ''
  } catch (e) {
    lista.value = null
    errorLista.value = e.message
  }
}
onMounted(carga)

const yo = computed(() => state.usuario?.id_usuario)
const nombresRol = computed(() => roles.value.map(r => r.rol))

async function escribe(fn, mensaje) {
  error.value = ''
  aviso.value = ''
  ocupado.value = true
  try {
    await fn()
    aviso.value = mensaje
    return true
  } catch (e) {
    error.value = e.message
    return false
  } finally {
    ocupado.value = false
    await carga()
  }
}

/* --- usuarios -------------------------------------------------------------- */

function abreAlta() {
  clave.value = null
  editando.value = null
  error.value = ''
  form.value = { nombre: '', email: '', password: '', rol: '' }
}

function abreEdicion(u) {
  clave.value = null
  editando.value = u.id_usuario
  error.value = ''
  form.value = { nombre: u.nombre, email: u.email, rol: u.rol }
}

const cierra = () => { form.value = null; editando.value = null }

async function guarda() {
  const f = form.value
  const id = editando.value
  const ok = await escribe(
    () => (id ? api.edita(id, f.nombre.trim(), f.rol)
              : api.crea({ nombre: f.nombre.trim(), email: f.email.trim(), password: f.password, rol: f.rol })),
    id ? `Se guardó a ${f.nombre.trim()}.` : `Se creó la cuenta de ${f.email.trim()}. Dale su contraseña por un canal seguro.`)
  if (ok) cierra()
}

const cambiaEstatus = (u) => {
  const desactiva = u.estatus === 'activo'
  pideConfirmacion(
    desactiva ? 'Desactivar usuario' : 'Activar usuario',
    desactiva
      ? `${u.nombre} no podrá entrar y sus sesiones abiertas se cierran ahora.`
      : `${u.nombre} podrá volver a entrar con su contraseña.`,
    desactiva ? 'Desactivar' : 'Activar',
    () => escribe(() => api.estatus(u.id_usuario, desactiva ? 'inactivo' : 'activo'),
                  `${u.nombre}: ${desactiva ? 'desactivado' : 'activado'}.`))
}

function abreClave(u) {
  form.value = null
  error.value = ''
  clave.value = { id: u.id_usuario, nombre: u.nombre, password: '' }
}

async function restablece() {
  const c = clave.value
  if (await escribe(() => api.restablece(c.id, c.password),
                    `Contraseña nueva para ${c.nombre}. Sus sesiones se cerraron.`)) {
    clave.value = null
  }
}

/* --- roles ----------------------------------------------------------------- */

const tiene = (rol, codigo) => borrador.value[rol]?.has(codigo)

function alterna(rol, codigo) {
  const s = new Set(borrador.value[rol])
  s.has(codigo) ? s.delete(codigo) : s.add(codigo)
  borrador.value = { ...borrador.value, [rol]: s }
}

function cambiado(r) {
  const b = borrador.value[r.rol]
  return !!b && (b.size !== r.permisos.length || r.permisos.some(p => !b.has(p)))
}

const deshace = (r) => { borrador.value = { ...borrador.value, [r.rol]: new Set(r.permisos) } }

const guardaRol = (r) => escribe(
  () => api.fijaPermisos(r.rol, [...borrador.value[r.rol]]),
  `Permisos de ${r.rol} guardados. Valen desde la siguiente acción de cada usuario.`)

// La API la manda en UTC con `Z`; Date la pasa a la hora de quien mira.
const fecha = (x) => (x ? new Date(x).toLocaleString('es-GT',
  { dateStyle: 'medium', timeStyle: 'short' }) : 'Nunca')
</script>

<template>
  <div>
    <p class="eyebrow eyebrow--plain">Administración</p>
    <h1 class="page-title">Usuarios y Roles</h1>
    <p class="page-sub">
      Quién entra y qué puede hacer. Desactivar a alguien, cambiarle el rol o la
      contraseña cierra sus sesiones en el acto.
    </p>

    <AvisoError v-if="!form && !clave" :mensaje="error" />
    <AvisoError :mensaje="aviso" tono="nota" />
    <AvisoError :mensaje="errorLista" />

    <!-- ===================== Usuarios ===================== -->
    <div class="section-head">
      <h2 class="section-title">Usuarios</h2>
      <button type="button" class="btn btn--outline" :disabled="!lista" @click="abreAlta">Crear usuario</button>
    </div>

    <form v-if="form" class="card formulario" @submit.prevent="guarda">
      <p class="formulario__titulo">{{ editando ? `Editar a ${form.nombre}` : 'Usuario nuevo' }}</p>
      <AvisoError :mensaje="error" class="formulario__ancho" />
      <label class="field field--tight formulario__doble">
        <span class="formulario__label">Nombre completo</span>
        <input v-model="form.nombre" class="input" required>
      </label>
      <label class="field field--tight formulario__doble">
        <span class="formulario__label">Correo</span>
        <input v-model="form.email" class="input" type="email" required :readonly="!!editando" autocomplete="off">
        <span v-if="editando" class="formulario__ayuda">
          No se cambia: es con lo que entra. Si está mal, desactiva la cuenta y crea otra.
        </span>
      </label>
      <label class="field field--tight">
        <span class="formulario__label">Rol</span>
        <select v-model="form.rol" class="select" required>
          <option value="" disabled>Elegir…</option>
          <option v-for="r in nombresRol" :key="r" :value="r">{{ r }}</option>
        </select>
        <span v-if="editando" class="formulario__ayuda">Cambiarlo cierra sus sesiones.</span>
      </label>
      <label v-if="!editando" class="field field--tight">
        <span class="formulario__label">Contraseña inicial</span>
        <input v-model="form.password" class="input" type="password" minlength="8" required autocomplete="new-password">
        <span class="formulario__ayuda">8 o más, distinta del correo. Que la cambie al entrar.</span>
      </label>
      <div class="btn-row">
        <button class="btn btn--brand" :disabled="ocupado">{{ editando ? 'Guardar cambios' : 'Crear usuario' }}</button>
        <button type="button" class="btn btn--outline" @click="cierra">Cancelar</button>
      </div>
    </form>

    <form v-if="clave" class="card formulario" @submit.prevent="restablece">
      <p class="formulario__titulo">Contraseña nueva para {{ clave.nombre }}</p>
      <AvisoError :mensaje="error" class="formulario__ancho" />
      <label class="field field--tight formulario__doble">
        <span class="formulario__label">Contraseña</span>
        <input v-model="clave.password" class="input" type="password" minlength="8" required autocomplete="new-password">
        <span class="formulario__ayuda">Sus sesiones abiertas se cierran. Dásela por un canal seguro.</span>
      </label>
      <div class="btn-row">
        <button class="btn btn--brand" :disabled="ocupado">Poner contraseña</button>
        <button type="button" class="btn btn--outline" @click="clave = null">Cancelar</button>
      </div>
    </form>

    <div class="table-wrap table-wrap--scroll seccion">
      <table class="table">
        <thead>
          <tr>
            <th>Nombre</th><th>Correo</th><th>Rol</th><th>Estado</th><th>Último acceso</th>
            <th><span class="sr-only">Acciones</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="lista === null"><td colspan="6" class="empty">{{ errorLista ? '—' : 'Consultando…' }}</td></tr>
          <tr v-for="u in lista ?? []" :key="u.id_usuario"
              :class="{ 'is-editando': editando === u.id_usuario, 'is-inactivo': u.estatus !== 'activo' }">
            <td class="is-strong">{{ u.nombre }} <span v-if="u.id_usuario === yo" class="tu">(tú)</span></td>
            <td class="mono">{{ u.email }}</td>
            <td>{{ u.rol }}</td>
            <td>
              <span class="pill" :class="u.estatus === 'activo' ? 'pill--success' : 'pill--danger'">{{ u.estatus }}</span>
            </td>
            <td>{{ fecha(u.ultimo_acceso) }}</td>
            <td class="is-right">
              <span class="acciones">
                <button class="btn-link" :disabled="ocupado" @click="abreEdicion(u)">Editar</button>
                <button class="btn-link" :disabled="ocupado" @click="abreClave(u)">Contraseña</button>
                <!-- Desactivarse a uno mismo se rechazaría si es el último
                     admin; y si no lo es, sería echarse fuera sin querer. -->
                <span :title="u.id_usuario === yo ? 'Es tu propia cuenta' : ''">
                  <button class="btn-link" :class="{ 'btn-link--danger': u.estatus === 'activo' }"
                          :disabled="ocupado || u.id_usuario === yo" @click="cambiaEstatus(u)">
                    {{ u.estatus === 'activo' ? 'Desactivar' : 'Activar' }}
                  </button>
                </span>
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ===================== Roles ===================== -->
    <div class="section-head">
      <h2 class="section-title">Roles y permisos</h2>
    </div>
    <p class="nota">
      Marca lo que puede hacer cada rol y guarda la fila. Vale desde la siguiente
      acción de cada usuario de ese rol, sin que tenga que volver a entrar.
    </p>

    <div class="table-wrap table-wrap--scroll">
      <table class="table matriz">
        <thead>
          <tr>
            <th>Rol</th>
            <th v-for="p in catalogo" :key="p.codigo" class="is-center" :title="p.descripcion">
              {{ p.descripcion }}
            </th>
            <th><span class="sr-only">Guardar</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in roles" :key="r.rol" :class="{ 'is-editando': cambiado(r) }">
            <td class="is-strong">
              {{ r.rol }}
              <span class="cuenta">{{ r.usuarios }} {{ r.usuarios === 1 ? 'usuario' : 'usuarios' }}</span>
            </td>
            <td v-for="p in catalogo" :key="p.codigo" class="is-center">
              <input type="checkbox" :checked="tiene(r.rol, p.codigo)" :disabled="ocupado"
                     :aria-label="`${r.rol}: ${p.descripcion}`" @change="alterna(r.rol, p.codigo)">
            </td>
            <td class="is-right">
              <span v-if="cambiado(r)" class="acciones">
                <button class="btn-link" :disabled="ocupado" @click="guardaRol(r)">Guardar</button>
                <button class="btn-link" :disabled="ocupado" @click="deshace(r)">Deshacer</button>
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.section-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.section-title { margin: 0; font-size: 15px; font-weight: 700; color: var(--navy-ink); }
.seccion { margin-bottom: 34px; }
.nota { margin: -6px 0 14px; font-size: 12.5px; color: var(--muted); }

.formulario {
  padding: 22px; margin-bottom: 18px;
  display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; align-items: start;
}
.formulario__titulo { grid-column: 1 / -1; margin: 0; font-size: 14px; font-weight: 700; color: var(--navy-ink); }
.formulario__ancho { grid-column: 1 / -1; margin: 0; }
.formulario__doble { grid-column: span 2; }
@media (max-width: 640px) { .formulario__doble { grid-column: 1 / -1; } }
.formulario__label { display: block; font-size: 12.5px; font-weight: 600; margin-bottom: 6px; color: var(--text); }
.formulario__ayuda { display: block; margin-top: 6px; font-size: 12px; line-height: 1.45; color: var(--muted); }
.formulario .input, .formulario .select { border-radius: 10px; padding: 9px 11px; font-size: 13.5px; }
.formulario .btn-row { grid-column: 1 / -1; }
.field--tight { margin-bottom: 0; }

.acciones { display: inline-flex; gap: 14px; }
.btn-link:disabled { color: var(--muted-2); cursor: not-allowed; }
.table tr.is-editando { background: var(--blue-bg); }
.table tr.is-inactivo td { color: var(--muted); }
.tu { font-weight: 400; color: var(--muted); font-size: 12px; }
.cuenta { display: block; font-weight: 400; font-size: 11.5px; color: var(--muted); }
.matriz th.is-center { font-size: 11.5px; font-weight: 600; line-height: 1.3; max-width: 130px; white-space: normal; }
.is-center { text-align: center; }
.matriz input[type="checkbox"] { width: 16px; height: 16px; cursor: pointer; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
</style>
