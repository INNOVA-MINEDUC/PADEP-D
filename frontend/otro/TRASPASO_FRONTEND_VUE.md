[curador.html](../../../../PycharmProjects/PADEP/api/estatico/curador.html)# Apéndice Vue — el cliente ya montado

Complemento de `TRASPASO_FRONTEND.md`, que es el que manda. Aquí va el código
concreto para Vue 3 (Composition API, `<script setup>`) con Vite.

Escrito sin dependencias más allá de Vue: no hace falta axios ni react-query, y
Pinia solo si ya está en el proyecto. Si el proyecto es Vue 2 / Options API, la
lógica es la misma pero los composables pasan a `data()` + `methods` y `ref()` a
propiedades del `data`.

---

## 0. En desarrollo, el proxy de Vite ahorra el CORS

Antes de tocar el backend: con `server.proxy` el navegador ve un solo origen y
**no hace falta CORS en desarrollo**.

```js
// vite.config.js
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      // todo lo que sea de la API va al backend, sin cambiar de origen
      '^/(cortes|extracciones|tipos|ajustes|curador|docs|openapi.json)':
        {target: 'http://127.0.0.1:8000', changeOrigin: true},
    },
  },
});
```

Con esto `VITE_API_URL` se queda vacío y las llamadas siguen siendo relativas,
igual que hoy. **El CORS del backend sigue haciendo falta para producción**, si
el frontend acaba servido desde otro origen que la API — pero si lo despliegas
tras el mismo nginx (recomendado: es como corre hoy), tampoco lo necesitas allí.

Decide esto antes de escribir el cliente, porque cambia si `API` va vacío o no.

---

## 1. El cliente

```js
// src/api/cliente.js
const API = import.meta.env.VITE_API_URL ?? '';

export class ErrorApi extends Error {
  constructor(mensaje, estado) {
    super(mensaje);
    this.estado = estado;
  }
}

/**
 * Envoltorio de fetch para la API de PADEP.
 *
 * La API devuelve sus errores como {"detail": "..."}, ya en español y escritos
 * para quien opera: se propagan tal cual en vez de inventar un texto propio.
 *
 * `credentials: 'include'` va siempre porque en el servidor la API vive tras un
 * nginx con auth_basic; sin esto las credenciales no viajan al ser otro origen.
 */
async function pide(ruta, opciones = {}) {
  const r = await fetch(`${API}${ruta}`, {credentials: 'include', ...opciones});
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    throw new ErrorApi(d.detail || `Error ${r.status}`, r.status);
  }
  return r.status === 204 ? null : r.json();
}

const forma = campos => {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) f.append(k, v);
  return f;
};

export const api = {
  ajustes: () => pide('/ajustes'),
  tipos:   () => pide('/tipos'),

  cortes:      () => pide('/cortes'),
  corte:       id => pide(`/cortes/${id}`),
  creaCorte:   campos => pide('/cortes', {method: 'POST', body: forma(campos)}),
  subeNomina:  (id, archivo) =>
    pide(`/cortes/${id}/nomina`, {method: 'POST', body: forma({archivo})}),

  entrega: id => pide(`/cortes/${id}/entrega`, {method: 'POST'}),
  carga:   (id, campos = {}) =>
    pide(`/cortes/${id}/carga`, {method: 'POST', body: forma(campos)}),
  estadoCarga: id => pide(`/cortes/${id}/carga`),
  auditoria:   id => pide(`/cortes/${id}/auditoria`),

  pendientes:  id => pide(`/cortes/${id}/pendientes`),
  corrige:     (id, campos) =>
    pide(`/cortes/${id}/correcciones`, {method: 'PUT', body: forma(campos)}),
  daDeAlta:    (id, campos) =>
    pide(`/cortes/${id}/altas`, {method: 'PUT', body: forma(campos)}),
  aplica:      id =>
    pide(`/cortes/${id}/correcciones/aplicar`, {method: 'POST'}),

  trabajos:   () => pide('/extracciones'),
  trabajo:    id => pide(`/extracciones/${id}`),
  borra:      id => pide(`/extracciones/${id}`, {method: 'DELETE'}),
  registro:   async id => {
    const r = await fetch(`${API}/extracciones/${id}/registro`,
                          {credentials: 'include'});
    if (!r.ok) throw new ErrorApi(`Error ${r.status}`, r.status);
    return r.text();                       // texto plano, no JSON
  },

  // El PDF de UNA sola página. Nunca enlazar al PDF entero con #page=N:
  // Chrome aplica el fragmento antes de acabar de cargar y, tras bajar los
  // 40 MB, vuelve a la página 1. Comprobado.
  urlPagina: (id, pdf, n) =>
    `${API}/cortes/${id}/pagina/${encodeURIComponent(pdf)}/${n}`,
  urlArchivo: (id, capa, nombre) =>
    `${API}/cortes/${id}/archivos/${capa}/${encodeURIComponent(nombre)}`,
};
```

`urlPagina` y `urlArchivo` devuelven texto, no piden nada: son para `<a href>` y
`<iframe src>`.

---

## 2. Ajustes y tipos

```js
// src/composables/usaAjustes.js
import {ref} from 'vue';
import {api} from '../api/cliente';

const TROZO_POR_DEFECTO = 8 * 1024 * 1024;

export function usaAjustes() {
  const puedeExtraer = ref(true);
  const trozo = ref(TROZO_POR_DEFECTO);
  const tipos = ref({});

  async function carga() {
    try {
      const a = await api.ajustes();
      // Si la instalación no extrae hay que OCULTAR el formulario, no solo
      // deshabilitarlo: FastAPI recibe los 140 MB enteros antes de poder
      // rechazarlos con 409.
      puedeExtraer.value = a.extraccion !== false;
      if (a.trozo_bytes) trozo.value = a.trozo_bytes;
    } catch (e) { /* instalación vieja sin /ajustes: se deja como estaba */ }
    tipos.value = await api.tipos();
  }

  return {puedeExtraer, trozo, tipos, carga};
}
```

En la plantilla, las ranuras de archivo salen de `tipos[elegido].archivos`:

```vue
<div v-for="i in (tipos[elegido]?.archivos ?? 1)" :key="i">
  <label :for="`archivo${i}`">
    {{ (tipos[elegido]?.archivos ?? 1) > 1 ? `Listado ${i}` : 'PDF' }}
  </label>
  <input :id="`archivo${i}`" type="file" accept="application/pdf,.pdf" required
         @change="archivos[i - 1] = $event.target.files[0]">
</div>
```

Sin nombrar asignatura: las materias cambian de una cohorte a otra y el nombre
del archivo da igual. **Lo único que cuenta es el orden**, que es como el
extractor aplica su rango de páginas — así que `archivos` es un array indexado,
no un objeto por nombre.

---

## 3. Cortes

```js
// src/composables/usaCortes.js
import {ref, computed} from 'vue';
import {api} from '../api/cliente';

export function usaCortes() {
  const lista = ref([]);
  // Se recuerda el elegido o se pierde en cada refresco de 2 s.
  const elegido = ref(localStorage.getItem('padep.corte') || '');

  const corte = computed(() => lista.value.find(c => c.id === elegido.value));
  const puedeEntregar = computed(() =>
    !!corte.value && !corte.value.falta_para_entregar.length);
  const puedeCargar = computed(() => !!corte.value?.entregado);

  async function carga() {
    lista.value = await api.cortes();
    if (!lista.value.some(c => c.id === elegido.value))
      elige(lista.value.length ? lista.value[0].id : '');
  }

  function elige(id) {
    elegido.value = id;
    localStorage.setItem('padep.corte', id);
  }

  return {lista, elegido, corte, puedeEntregar, puedeCargar, carga, elige};
}
```

`falta_para_entregar` es una lista de textos: **vacía significa que se puede
entregar**. No recalcules la condición mirando `documentos` y `nomina` — el
backend ya la resuelve y puede cambiar de criterio.

Enséñala tal cual cuando el botón esté deshabilitado, que es la explicación de
por qué no se puede entregar todavía:

```vue
<button :disabled="!puedeEntregar" @click="entrega">Entregar</button>
<ul v-if="corte?.falta_para_entregar.length">
  <li v-for="f in corte.falta_para_entregar" :key="f">{{ f }}</li>
</ul>
```

---

## 4. Subida troceada

**Lo más delicado del port.** Léete la sección 1 de «Comportamientos que hay que
conservar» en el documento principal antes de tocar esto. Resumen del porqué:
Cloudflare limita el cuerpo de **cada petición**, no el del archivo, así que un
POST único de 140 MB muere con 413 antes de llegar a nginx.

```js
// src/composables/usaSubida.js
import {ref} from 'vue';
import {api, ErrorApi} from '../api/cliente';

const hex = n => [...crypto.getRandomValues(new Uint8Array(n))]
  .map(b => b.toString(16).padStart(2, '0')).join('');

export function usaSubida(idCorte, trozo) {
  const subiendo = ref(false);
  const avance = ref(0);            // 0..100
  const error = ref('');

  /**
   * Sube un archivo en trozos y devuelve {id, llave}.
   *
   * El id se guarda en sessionStorage por archivo: si la subida se corta, al
   * reintentar el mismo archivo se retoma donde iba en vez de empezar de cero.
   */
  async function subeUno(f, avisa) {
    const llave = `subida:${idCorte.value}:${f.name}:${f.size}:${f.lastModified}`;
    let id = sessionStorage.getItem(llave);
    if (!id) {
      // Solo hexadecimal: la API lo rechaza si no, porque acaba siendo un
      // nombre de carpeta.
      id = hex(16);
      sessionStorage.setItem(llave, id);
    }

    const n = Math.max(1, Math.ceil(f.size / trozo.value));

    // Lo que ya esté en el servidor no se vuelve a mandar. Se compara el
    // TAMAÑO y no solo la presencia: un trozo a medio escribir no vale por
    // bueno. Y solo se reutiliza si el total coincide, por si cambió el tamaño
    // de trozo entre intentos.
    let hay = {};
    try {
      const d = await api.trozosDe(idCorte.value, id);
      if (d.total === n) hay = d.trozos || {};
    } catch (e) { /* sin estado previo se sube entero, que es lo de siempre */ }

    let subido = 0;
    for (let i = 0; i < n; i++) {
      const pedazo = f.slice(i * trozo.value,
                             Math.min((i + 1) * trozo.value, f.size));
      if (hay[i] === pedazo.size) { subido += pedazo.size; avisa(subido); continue; }

      const cuerpo = new FormData();
      cuerpo.append('subida', id);
      cuerpo.append('indice', i);
      cuerpo.append('total', n);
      cuerpo.append('trozo', pedazo, f.name);
      const r = await fetch(`${import.meta.env.VITE_API_URL ?? ''}` +
                            `/cortes/${idCorte.value}/extracciones/parte`,
                            {method: 'POST', body: cuerpo, credentials: 'include'});
      if (r.status !== 202) {
        const d = await r.json().catch(() => ({}));
        throw new ErrorApi(d.detail || `falló el trozo ${i + 1} de ${n}`, r.status);
      }
      subido += pedazo.size;
      avisa(subido);
    }

    // La llave NO se borra aquí sino cuando el ensamblado ha ido bien: si
    // fallara justo tras subir el último trozo, borrarla ahora obligaría a
    // mandar los 140 MB otra vez teniéndolos ya todos en el servidor.
    return {id, llave};
  }

  /** Sube todos los archivos EN ORDEN y encola la extracción. */
  async function envia(archivos, tipo) {
    subiendo.value = true; error.value = ''; avance.value = 0;
    const total = archivos.reduce((s, f) => s + f.size, 0) || 1;
    let hechos = 0;
    const pinta = n => avance.value = Math.round(100 * Math.min(n, total) / total);

    try {
      const subidas = [];
      // En serie y en orden: el orden de las ranuras empareja cada archivo con
      // su parte. Nada de Promise.all aquí.
      for (const f of archivos) {
        subidas.push(await subeUno(f, n => pinta(hechos + n)));
        hechos += f.size; pinta(hechos);
      }

      const cuerpo = new FormData();
      cuerpo.append('tipo', tipo);
      for (let i = 0; i < archivos.length; i++) {
        cuerpo.append('subidas', subidas[i].id);
        cuerpo.append('nombres', archivos[i].name);
      }
      const r = await fetch(`${import.meta.env.VITE_API_URL ?? ''}` +
                            `/cortes/${idCorte.value}/extracciones/ensamblar`,
                            {method: 'POST', body: cuerpo, credentials: 'include'});
      if (r.status !== 202) {
        const d = await r.json().catch(() => ({}));
        throw new ErrorApi(d.detail || 'no se pudo encolar', r.status);
      }
      // Ahora sí: el servidor ya tiene el PDF armado.
      for (const s of subidas) sessionStorage.removeItem(s.llave);
      return true;
    } catch (e) {
      error.value = e.message || 'no se pudo contactar con el servidor';
      return false;
    } finally {
      subiendo.value = false; avance.value = 0;
    }
  }

  return {subiendo, avance, error, envia};
}
```

Falta añadir al cliente el GET de trozos que usa `subeUno`:

```js
// en src/api/cliente.js, dentro de `api`
trozosDe: (id, subida) => pide(`/cortes/${id}/extracciones/parte/${subida}`),
```

Los dos `fetch` crudos de arriba no pasan por `pide` a propósito: esperan **202**
concreto, no un `ok` genérico.

**Cómo probarlo**: un PDF de más de 8 MB, y cortar la red a mitad de la subida.
Al reintentar el mismo archivo debe saltarse los trozos que ya subieron. Si
vuelve a empezar de cero, el `sessionStorage` o la comparación de tamaños está
mal.

---

## 5. Trabajos, con sondeo de 2 s

```js
// src/composables/usaTrabajos.js
import {ref, onUnmounted} from 'vue';
import {api} from '../api/cliente';

// Los cinco estados, de api/trabajos.py:48 — 'en_cola', 'extrayendo',
// 'terminado', 'fallido', 'cancelado'. Solo los dos primeros siguen vivos.
const VIVOS = ['en_cola', 'extrayendo'];

export function usaTrabajos() {
  const lista = ref([]);
  let timer = null;

  async function refresca() {
    try { lista.value = await api.trabajos(); } catch (e) { /* se reintenta */ }
    programa();
  }

  // Se reprograma tras cada respuesta, no con setInterval: si el servidor va
  // lento, un interval fijo apila peticiones sobre un backend de un solo worker.
  function programa() {
    clearTimeout(timer);
    const hayVivos = lista.value.some(t => VIVOS.includes(t.estado));
    timer = setTimeout(refresca, hayVivos ? 2000 : 15000);
  }

  onUnmounted(() => clearTimeout(timer));
  return {lista, refresca};
}
```

Sin websockets ni SSE: la API no los ofrece. El sondeo se afloja a 15 s cuando no
hay nada corriendo — el backend es **un solo worker** y no conviene apretarlo.

Dimensiona la espera en la interfaz: el reporte de resultados (351 págs) tarda
~21 min en la máquina de desarrollo y bastante más en el servidor (4 vCPU). Los
demás, entre 40 s y 4 min. Esto son minutos, no segundos: barra de avance y
tiempo transcurrido, nada de spinner sin más.

Forma real de un trabajo (de `ejemplos_respuestas.json`):

```json
{
  "id": "2ff0b54eda4d", "tipo": "entrega",
  "cohorte": "36", "semestre": 3, "corte": 1,
  "estado": "terminado",
  "creado": "…", "iniciado": "…", "terminado": "…",
  "paginas_hechas": 0, "paginas_totales": 0,
  "archivos": [], "salidas": ["PADEP_36_final.xlsx", "…"],
  "origen": [], "etiquetas": {},
  "ultima_linea": "revisar: 267 indicios",
  "error": "", "puesto_en_cola": 0
}
```

Tres detalles de esa forma:

- El avance sale de `paginas_hechas` / `paginas_totales`, pero **una entrega no
  cuenta páginas** y los dos van a 0. Cae a barra indeterminada cuando
  `paginas_totales` es 0, en vez de pintar 0 %.
- `ultima_linea` es lo último del registro. Enséñala en la fila del trabajo: es
  lo que dice si algo va raro sin abrir el log entero.
- `puesto_en_cola` es el puesto si está esperando. **Un trabajo a la vez**: una
  extracción ya ocupa todos los núcleos.

Borrar un trabajo (`DELETE /extracciones/{id}`) cancela si corre y borra si
terminó — **no borra sus archivos**, que son del corte. Dilo en el diálogo de
confirmación, o parece más destructivo de lo que es.

---

## 6. Curador

Las dos reglas que no se pueden perder: **cada celda se guarda al salir del
campo** (`@change`, no `@input`, y sin botón «guardar»), y **el modelo local se
actualiza sin recargar la lista**, o se pierde el foco a media captura.

```js
// src/composables/usaCurador.js
import {ref, computed} from 'vue';
import {api} from '../api/cliente';

export function usaCurador(idCorte) {
  const datos = ref(null);
  const error = ref('');

  const carga = async () => datos.value = await api.pendientes(idCorte.value);

  // Correcciones: la llave es archivo + filas + campo.
  async function guardaCelda(tarea, campo, casilla, valor) {
    error.value = '';
    try {
      const d = await api.corrige(idCorte.value, {
        archivo: tarea.archivo, filas: casilla.filas,
        campo: campo.nombre, valor,
      });
      // Se refleja en el modelo SIN recargar, para no perder el foco.
      casilla.escrito = valor.trim();
      datos.value.correcciones = d.correcciones;
    } catch (e) { error.value = e.message; }
  }

  // Altas: la llave es el CARNÉ, no el número de fila. Quien el OCR nunca
  // extrajo no tiene fila a la que apuntar, y el carné de la nómina no se mueve.
  async function guardaAlta(persona, nombreCampo, valor) {
    error.value = '';
    try {
      await api.daDeAlta(idCorte.value, {
        archivo: persona.archivo, carne: persona.carne,
        campo: nombreCampo, valor,
      });
      // Un alta solo entra en la entrega rehaciéndola entera: el botón lo dice
      // desde ya.
      datos.value.altas_sin_reflejar = true;
      if (nombreCampo !== 'ANULADA') {
        const c = persona.campos.find(x => x.nombre === nombreCampo);
        if (c) c.escrito = valor.trim();
      }
    } catch (e) { error.value = e.message; }
  }

  // Un alta equivocada se ANULA, no se borra: quitar la línea correría las
  // filas de detrás y las correcciones caerían sobre la fila equivocada.
  const anula = (persona, si) => guardaAlta(persona, 'ANULADA', si ? 'si' : '');

  const rehace = computed(() => !!datos.value?.altas_sin_reflejar);
  const puedeAplicar = computed(() =>
    !!(datos.value?.correcciones || rehace.value));
  const avisoAplicar = computed(() => rehace.value
    ? 'Hay filas dadas de alta: la entrega se rehace entera (tarda unos minutos)'
    : datos.value?.correcciones ? '' : 'Todavía no se ha escrito ninguna corrección');

  async function aplica() {
    error.value = '';
    try {
      await api.aplica(idCorte.value);
      setTimeout(carga, 4000);      // vuelve en 202: el avance va por trabajos
      return true;
    } catch (e) { error.value = e.message; return false; }
  }

  return {datos, error, carga, guardaCelda, guardaAlta, anula,
          puedeAplicar, avisoAplicar, aplica};
}
```

En la plantilla, `@change` con el valor del evento:

```vue
<input :value="casilla.escrito"
       @change="guardaCelda(tarea, campo, casilla, $event.target.value)">
```

**No uses `v-model` aquí.** `v-model` reescribe la propiedad en cada pulsación y
compite con la actualización que hace `guardaCelda` tras la respuesta del
servidor; con `:value` + `@change` el flujo es en un solo sentido y la fuente de
verdad es lo que confirmó el backend.

Y el enlace al PDF, una sola página:

```vue
<a :href="api.urlPagina(elegido, tarea.archivo_pdf, tarea.pagina)" target="_blank">
  ver página {{ tarea.pagina }}
</a>
```

---

## 7. Estructura sugerida

```
src/
  api/cliente.js              el envoltorio de fetch
  composables/
    usaAjustes.js  usaCortes.js  usaSubida.js
    usaTrabajos.js  usaCurador.js
  vistas/
    Extraccion.vue            crear corte, nómina, subir, lista de trabajos
    Curador.vue               tareas, altas, aplicar
  componentes/
    SelectorCorte.vue  BarraAvance.vue  AvisoError.vue
```

Pinia solo si ya está en el proyecto. Lo único que de verdad se comparte entre
las dos vistas es el corte elegido, y eso ya vive en `localStorage`.

---

## 8. Lo que no cambia por ser Vue

Del documento principal, sigue vigente entero:

- **Tema claro fijo.** El modo oscuro se probó y se descartó por petición
  explícita. No lo añadas ni con `prefers-color-scheme`.
- Textos en español, sin tecnicismos: quien usa esto cura datos, no despliega
  software.
- Los errores de la API (`detail`) se enseñan tal cual.
- `202` en todo lo que encola; `409` si la instalación no extrae o falta volcar
  antes de cargar; `422` si un alta trae un campo fuera de `ALTA_CAMPOS`.
- Y **después de tocar el backend hay que reiniciarlo**: no corre con `--reload`.
