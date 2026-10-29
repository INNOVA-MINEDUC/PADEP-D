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
 *
 * **Unidades.** El administrador de una unidad ve y crea solo usuarios de la
 * suya (la API la pone sola). El global ve a todos, elige la unidad de cada
 * uno —sin unidad = otro global, que lo ve todo— y puede cambiársela, lo que
 * cierra sus sesiones.
 *
 * **Roles (v4.10).** Un rol es del sistema (lo ven todas las unidades, solo lo
 * cambia un global) o de una unidad (lo crea su administrador y nadie más lo
 * ve). El administrador de una unidad crea, renombra y borra los suyos, pero
 * **no da lo que no tiene**: no marca un permiso que su rol no lleva ni asigna
 * un rol que lo lleve. La pantalla no se lo ofrece; la API lo rechaza igual
 * (403). A un usuario se le da un rol del sistema o de su unidad, y a un
 * global solo del sistema.
 */
import { ref, computed, watch, onMounted } from 'vue'
import { usePadep } from '@/stores/padep'
import { usuarios as api, roles as apiRoles } from '@/api/auth'
import AvisoError from '@/components/AvisoError.vue'

const { state, esGlobal, pideConfirmacion } = usePadep()

const lista = ref(null)          // null = sin leer o falló
const roles = ref([])            // [{ id_rol, rol, unidad, editable, usuarios, permisos }]
const catalogo = ref([])         // [{ codigo, descripcion }]
// Encabezado corto y sin jerga («cargar a MySQL», «volcado») para cada
// permiso. La descripción de la API sigue en el tooltip; un código que no esté
// aquí se pinta con ella, como antes.
const ETIQUETAS = {
  // Mismo alcance que `PERMISOS` de api/auth.py, en palabras de la pantalla.
  'reportes.ver': 'Consultar cortes, docentes y configuración',
  'documentos.cargar': 'Crear cortes, subir la nómina y cargar a la base',
  'extraccion.ejecutar': 'Subir PDF, extraer y entregar',
  'incidencias.resolver': 'Completar a mano',
  'cohortes.gestionar': 'Editar cohortes, carreras, sedes y enlaces',
  'usuarios.gestionar': 'Administrar usuarios y roles',
  'reportes.datos_personales': 'Ver datos personales en reportes',
  'unidades.gestionar': 'Dar de alta y desactivar unidades (solo global)',
}
const etiquetaPermiso = p => ETIQUETAS[p.codigo] ?? p.descripcion
const errorLista = ref('')
const error = ref('')
const aviso = ref('')
const ocupado = ref(false)

const form = ref(null)           // alta o edición abierta; null = cerrado
const editando = ref(null)       // id del que se edita; null = alta
const clave = ref(null)          // { id, nombre, password } restableciendo

// La matriz que se está editando: id_rol -> Set de códigos. Por id y no por
// nombre: el global ve roles de varias unidades, y dos pueden llamarse igual.
// Se compara con la de la base para saber qué fila tiene cambios sin guardar.
const borrador = ref({})
const nuevoRol = ref(null)       // { nombre, unidad } creando; null = cerrado
const renombrando = ref(null)    // { id_rol, nombre }
// Filtro de la matriz del global: '' = todos, SISTEMA = solo del sistema, o
// el código de una unidad (los del sistema más los suyos, como los vería ella).
const SISTEMA = '(sistema)'
const filtroRoles = ref('')

async function carga() {
  try {
    const [u, r] = await Promise.all([api.lista(), apiRoles.lista()])
    lista.value = u
    roles.value = r.roles
    catalogo.value = r.permisos
    borrador.value = Object.fromEntries(r.roles.map(x => [x.id_rol, new Set(x.permisos)]))
    errorLista.value = ''
  } catch (e) {
    lista.value = null
    errorLista.value = e.message
  }
}
onMounted(carga)

const yo = computed(() => state.usuario?.id_usuario)

// Mismo criterio que `auth._sin_escalar`: lo que solo vale en un global no
// cuenta, porque en un usuario de unidad no abre nada.
const SOLO_GLOBAL = ['unidades.gestionar']
const misPermisos = computed(() => new Set(state.usuario?.permisos ?? []))
const loTengo = p => esGlobal.value || SOLO_GLOBAL.includes(p) || misPermisos.value.has(p)
const asignable = r => r.permisos.every(loTengo)

// Los roles que se le pueden dar a alguien de la unidad `u` ('' = global):
// los del sistema y los de esa unidad. En la edición se conserva el que ya
// tiene aunque quien edita no pudiera darlo: guardarle el nombre no le da nada.
const opcionesRol = computed(() => {
  const f = form.value
  if (!f) return []
  const ops = roles.value.filter(r => (r.unidad == null || r.unidad === (f.unidad || null)) && asignable(r))
  const actual = editando.value && f.unidad === f.unidadAntes && roles.value.find(r =>
    r.rol === f.rolAntes && (r.unidad == null || r.unidad === (f.unidad || null)))
  return actual && !ops.includes(actual) ? [actual, ...ops] : ops
})
// Al cambiar de unidad, un rol de la anterior deja de valer: se vacía para
// que se elija otro en vez de recibir un 400.
watch(() => form.value?.unidad, () => {
  const f = form.value
  if (f && f.rol && !opcionesRol.value.some(r => r.rol === f.rol)) f.rol = ''
})

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
  // El global crea por defecto en la unidad de trabajo: crear otro global
  // tiene que ser una elección, no lo que sale por no tocar el desplegable.
  form.value = { nombre: '', email: '', password: '', rol: '', unidad: state.unidad }
}

function abreEdicion(u) {
  clave.value = null
  editando.value = u.id_usuario
  error.value = ''
  form.value = { nombre: u.nombre, email: u.email, rol: u.rol, rolAntes: u.rol,
                 unidad: u.unidad ?? '', unidadAntes: u.unidad ?? '' }
}

const cierra = () => { form.value = null; editando.value = null }

async function guarda() {
  const f = form.value
  const id = editando.value
  // La unidad solo la manda el global, y en la edición solo si cambió:
  // mandarla igual no haría nada, pero así ni se intenta.
  const unidadEdicion = esGlobal.value && f.unidad !== f.unidadAntes ? f.unidad : undefined
  const alta = { nombre: f.nombre.trim(), email: f.email.trim(), password: f.password, rol: f.rol }
  if (esGlobal.value && f.unidad) alta.unidad = f.unidad
  const ok = await escribe(
    () => (id ? api.edita(id, f.nombre.trim(), f.rol, unidadEdicion) : api.crea(alta)),
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

const rolesVisibles = computed(() => {
  const f = filtroRoles.value
  if (!esGlobal.value || !f) return roles.value
  if (f === SISTEMA) return roles.value.filter(r => r.unidad == null)
  return roles.value.filter(r => r.unidad == null || r.unidad === f)
})

const tiene = (r, codigo) => borrador.value[r.id_rol]?.has(codigo)

// Qué casilla se puede tocar. Un rol de unidad no lleva lo que solo vale en
// un global (422). El de unidad solo AÑADE lo que tiene, pero puede quitar
// cualquiera, y volver a marcar lo que el rol ya traía de la base.
function puedeMarcar(r, codigo) {
  if (!r.editable) return false
  if (r.unidad && SOLO_GLOBAL.includes(codigo)) return false
  return loTengo(codigo) || r.permisos.includes(codigo)
}

function titulo(r, p) {
  if (!r.editable) return 'Es del sistema: solo un administrador global lo cambia'
  if (r.unidad && SOLO_GLOBAL.includes(p.codigo)) return 'Solo vale en un usuario global'
  if (!puedeMarcar(r, p.codigo)) return 'Tu rol no tiene este permiso: no puedes darlo'
  return p.descripcion
}

function alterna(r, codigo) {
  const s = new Set(borrador.value[r.id_rol])
  s.has(codigo) ? s.delete(codigo) : s.add(codigo)
  borrador.value = { ...borrador.value, [r.id_rol]: s }
}

function cambiado(r) {
  const b = borrador.value[r.id_rol]
  return !!b && (b.size !== r.permisos.length || r.permisos.some(p => !b.has(p)))
}

const deshace = (r) => { borrador.value = { ...borrador.value, [r.id_rol]: new Set(r.permisos) } }

const guardaRol = (r) => escribe(
  () => apiRoles.fijaPermisos(r, [...borrador.value[r.id_rol]]),
  `Permisos de ${r.rol} guardados. Valen desde la siguiente acción de cada usuario.`)

const dondeRol = r => (r.unidad == null ? 'Sistema' : r.unidad)

function abreNuevoRol() {
  renombrando.value = null
  error.value = ''
  // Como en el alta de usuarios: el global crea por defecto en la unidad de
  // trabajo, y uno del sistema —que verán todas— tiene que ser una elección.
  nuevoRol.value = { nombre: '', unidad: esGlobal.value ? state.unidad : '' }
}

async function creaRol() {
  const n = nuevoRol.value
  const nombre = n.nombre.trim()
  const ok = await escribe(() => apiRoles.crea(nombre, esGlobal.value ? n.unidad : ''),
    `Se creó el rol ${nombre}. Marca sus permisos en la tabla y guarda la fila.`)
  if (ok) nuevoRol.value = null
}

function abreRenombrar(r) {
  nuevoRol.value = null
  error.value = ''
  renombrando.value = { id_rol: r.id_rol, nombre: r.rol }
}

async function renombra(r) {
  const nombre = renombrando.value.nombre.trim()
  if (nombre === r.rol) { renombrando.value = null; return }
  if (await escribe(() => apiRoles.renombra(r, nombre), `${r.rol} se llama ahora ${nombre}.`)) {
    renombrando.value = null
  }
}

const borraRol = (r) => pideConfirmacion(
  'Borrar rol',
  `El rol ${r.rol} desaparece${r.unidad ? '' : ' para todas las unidades'}. Nadie lo tiene ahora mismo.`,
  'Borrar',
  () => escribe(() => apiRoles.borra(r), `Se borró el rol ${r.rol}.`))

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

    <AvisoError v-if="!form && !clave && !nuevoRol" :mensaje="error" />
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
          <option v-for="r in opcionesRol" :key="r.id_rol" :value="r.rol">
            {{ r.rol }}{{ r.unidad == null ? ' (sistema)' : '' }}
          </option>
        </select>
        <span v-if="esGlobal && !form.unidad" class="formulario__ayuda">Un global solo lleva roles del sistema.</span>
        <span v-else-if="editando" class="formulario__ayuda">Cambiarlo cierra sus sesiones.</span>
      </label>
      <label v-if="esGlobal" class="field field--tight">
        <span class="formulario__label">Unidad</span>
        <select v-model="form.unidad" class="select">
          <option v-for="u in state.unidades" :key="u.codigo" :value="u.codigo">{{ u.nombre || u.codigo }}</option>
          <option value="">Global (todas las unidades)</option>
        </select>
        <span v-if="!form.unidad" class="formulario__ayuda formulario__ayuda--aviso">
          Un global ve los datos de todas las unidades.
        </span>
        <span v-else-if="editando && form.unidad !== form.unidadAntes" class="formulario__ayuda">
          Cambiarla cierra sus sesiones.
        </span>
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
            <th>Nombre</th><th>Correo</th><th v-if="esGlobal">Unidad</th><th>Rol</th><th>Estado</th><th>Último acceso</th>
            <th><span class="sr-only">Acciones</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="lista === null"><td :colspan="esGlobal ? 7 : 6" class="empty">{{ errorLista ? '—' : 'Consultando…' }}</td></tr>
          <tr v-for="u in lista ?? []" :key="u.id_usuario"
              :class="{ 'is-editando': editando === u.id_usuario, 'is-inactivo': u.estatus !== 'activo' }">
            <td class="is-strong">{{ u.nombre }} <span v-if="u.id_usuario === yo" class="tu">(tú)</span></td>
            <td class="mono">{{ u.email }}</td>
            <td v-if="esGlobal" :class="{ 'is-strong': !u.unidad }">{{ u.unidad ?? 'Global' }}</td>
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
      <span class="acciones">
        <select v-if="esGlobal" v-model="filtroRoles" class="select select--chico" aria-label="Qué roles ver">
          <option value="">Todos los roles</option>
          <option :value="SISTEMA">Solo los del sistema</option>
          <option v-for="u in state.unidades" :key="u.codigo" :value="u.codigo">
            Los que ve {{ u.nombre || u.codigo }}
          </option>
        </select>
        <button type="button" class="btn btn--outline" :disabled="!lista" @click="abreNuevoRol">Crear rol</button>
      </span>
    </div>
    <p class="nota">
      <template v-if="esGlobal">
        Los roles del sistema los ven y los asignan todas las unidades; los de
        una unidad, solo ella.
      </template>
      <template v-else>
        Los roles de tu unidad los creas y los cambias tú; los del sistema los
        puedes asignar, pero solo un administrador global los cambia. No puedes
        dar permisos que tu rol no tiene.
      </template>
      Marca lo que puede hacer cada rol y guarda la fila: vale desde la siguiente
      acción de cada usuario, sin que tenga que volver a entrar.
    </p>

    <form v-if="nuevoRol" class="card formulario" @submit.prevent="creaRol">
      <p class="formulario__titulo">Rol nuevo</p>
      <AvisoError :mensaje="error" class="formulario__ancho" />
      <label class="field field--tight formulario__doble">
        <span class="formulario__label">Nombre</span>
        <input v-model="nuevoRol.nombre" class="input" maxlength="60" required>
        <span class="formulario__ayuda">
          No puede repetir el de otro rol que vea {{ esGlobal ? 'esa unidad' : 'tu unidad' }}, ni los del sistema.
        </span>
      </label>
      <label v-if="esGlobal" class="field field--tight formulario__doble">
        <span class="formulario__label">De qué unidad</span>
        <select v-model="nuevoRol.unidad" class="select">
          <option v-for="u in state.unidades" :key="u.codigo" :value="u.codigo">{{ u.nombre || u.codigo }}</option>
          <option value="">Del sistema (todas las unidades)</option>
        </select>
        <span v-if="!nuevoRol.unidad" class="formulario__ayuda formulario__ayuda--aviso">
          Lo verán y podrán asignarlo todas las unidades.
        </span>
      </label>
      <p class="formulario__ayuda formulario__ancho">
        Nace sin permisos: márcalos después en la tabla.
      </p>
      <div class="btn-row">
        <button class="btn btn--brand" :disabled="ocupado">Crear rol</button>
        <button type="button" class="btn btn--outline" @click="nuevoRol = null">Cancelar</button>
      </div>
    </form>

    <div class="table-wrap table-wrap--scroll">
      <table class="table matriz">
        <thead>
          <tr>
            <th>Rol</th>
            <th v-for="p in catalogo" :key="p.codigo" class="is-center" :title="p.descripcion">
              {{ etiquetaPermiso(p) }}
            </th>
            <th><span class="sr-only">Acciones</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!rolesVisibles.length">
            <td :colspan="catalogo.length + 2" class="empty">{{ errorLista ? '—' : 'Sin roles' }}</td>
          </tr>
          <tr v-for="r in rolesVisibles" :key="r.id_rol"
              :class="{ 'is-editando': cambiado(r), 'is-ajeno': !r.editable }">
            <td class="is-strong">
              <form v-if="renombrando?.id_rol === r.id_rol" class="renombre" @submit.prevent="renombra(r)">
                <input v-model="renombrando.nombre" class="input input--chico" maxlength="60" required
                       :aria-label="`Nombre nuevo de ${r.rol}`">
                <button class="btn-link" :disabled="ocupado">Guardar</button>
                <button type="button" class="btn-link" @click="renombrando = null">Cancelar</button>
              </form>
              <template v-else>{{ r.rol }}</template>
              <span class="cuenta">
                <span class="pill" :class="r.unidad == null ? 'pill--teal' : 'pill--clay'">{{ dondeRol(r) }}</span>
                {{ r.usuarios }} {{ r.usuarios === 1 ? 'usuario' : 'usuarios' }}
              </span>
            </td>
            <td v-for="p in catalogo" :key="p.codigo" class="is-center" :title="titulo(r, p)">
              <input type="checkbox" :checked="tiene(r, p.codigo)"
                     :disabled="ocupado || !puedeMarcar(r, p.codigo)"
                     :aria-label="`${r.rol}: ${etiquetaPermiso(p)}`" @change="alterna(r, p.codigo)">
            </td>
            <td class="is-right">
              <span v-if="cambiado(r)" class="acciones">
                <button class="btn-link" :disabled="ocupado" @click="guardaRol(r)">Guardar</button>
                <button class="btn-link" :disabled="ocupado" @click="deshace(r)">Deshacer</button>
              </span>
              <span v-else-if="r.editable && renombrando?.id_rol !== r.id_rol" class="acciones">
                <button class="btn-link" :disabled="ocupado" @click="abreRenombrar(r)">Renombrar</button>
                <!-- Con usuarios la API da 409: hay que cambiarles el rol antes. -->
                <span :title="r.usuarios ? 'Lo tiene alguien: cámbiale el rol antes de borrarlo' : ''">
                  <button class="btn-link btn-link--danger" :disabled="ocupado || r.usuarios > 0"
                          @click="borraRol(r)">Borrar</button>
                </span>
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
.nota { margin: -6px 0 14px; font-size: 13px; color: var(--muted); }

.formulario {
  padding: 22px; margin-bottom: 18px;
  display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; align-items: start;
}
.formulario__titulo { grid-column: 1 / -1; margin: 0; font-size: 14px; font-weight: 700; color: var(--navy-ink); }
.formulario__ancho { grid-column: 1 / -1; margin: 0; }
.formulario__doble { grid-column: span 2; }
@media (max-width: 640px) { .formulario__doble { grid-column: 1 / -1; } }
.formulario__label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; color: var(--text); }
.formulario__ayuda { display: block; margin-top: 6px; font-size: 12px; line-height: 1.45; color: var(--muted); }
.formulario__ayuda--aviso { color: #B45309; font-weight: 600; }
.formulario .input, .formulario .select { border-radius: 10px; padding: 9px 11px; font-size: 14px; }
.formulario .btn-row { grid-column: 1 / -1; }
.field--tight { margin-bottom: 0; }

.acciones { display: inline-flex; gap: 14px; }
.btn-link:disabled { color: var(--muted-2); cursor: not-allowed; }
.table tr.is-editando { background: var(--blue-bg); }
.table tr.is-inactivo td { color: var(--muted); }
.tu { font-weight: 400; color: var(--muted); font-size: 12px; }
.cuenta { display: block; font-weight: 400; font-size: 12px; color: var(--muted); }
.matriz th.is-center { font-size: 12px; font-weight: 600; line-height: 1.3; max-width: 130px; white-space: normal; }
.is-center { text-align: center; }
.matriz input[type="checkbox"] { width: 16px; height: 16px; cursor: pointer; }
.matriz input[type="checkbox"]:disabled { cursor: not-allowed; }
.matriz .cuenta .pill { margin-right: 6px; }
/* Un rol que quien mira no puede cambiar (del sistema, para el de unidad). */
.table tr.is-ajeno td.is-strong { color: var(--muted); }
.renombre { display: inline-flex; align-items: center; gap: 10px; }
.input--chico, .select--chico { border-radius: 8px; padding: 6px 9px; font-size: 13px; }
.input--chico { width: 200px; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
</style>
