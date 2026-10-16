<script setup>
import { computed } from 'vue'
import { usePadep } from '@/stores/padep'
import { MOD1_STEPS } from '@/data/catalog'
import { etiquetaCarrera } from '@/data/carreras'
import Icono from '@/components/Icono.vue'

const { state, checklist, nextStepId, enlacesCount, goTo, navVisible } = usePadep()

// El corte no trae año: sus campos son cohorte, carrera, trimestre y corte. El
// año vive en `anio_pago`, que solo se sabe después de cargar a la base, así
// que aquí se enseña el trimestre, que sí viene siempre.

// «Continuar» es el paso siguiente del asistente (Cohorte → Sedes → Enlaces),
// no el primer paso pendiente: ese podía ser la pantalla actual y el botón no
// hacía nada. Antes salía de la lista del menú, y desde Enlaces mandaba al
// Catálogo de Carreras, que no es un paso. Después de Enlaces viene Extracción,
// si la sesión puede verla.
const puedeExtraccion = computed(() => navVisible.value.some(m => m.screens.some(s => s.id === 15)))
const siguiente = computed(() => {
  const paso = MOD1_STEPS.find(s => s.id === state.active + 1)
  if (paso) return { id: paso.id, title: { 2: 'Sedes y Centros Educativos', 3: 'Asignación de Enlaces' }[paso.id] ?? paso.label }
  return null
})
const sinEnlace = computed(() => state.sedes.length - enlacesCount.value)
const estado = computed(() =>
  nextStepId.value === null ? 'Módulo completo'
    : nextStepId.value === 3 ? `${sinEnlace.value} ${sinEnlace.value === 1 ? 'sede' : 'sedes'} sin enlace`
      : `Pendiente: ${checklist.value[nextStepId.value - 1].label.toLowerCase()}`)
</script>

<template>
  <div class="stack">
    <section class="card card--flat ctx">
      <!-- Es el corte EN USO (el marcado en Alta de Cohorte), no lo que esté
           escrito en el formulario de alta nueva: con «Resumen de cohorte» se
           leía como el resumen del formulario y el trimestre no cuadraba. -->
      <p class="ctx__eyebrow">Corte en uso</p>
      <p class="ctx__codigo mono">
        {{ state.cohorte.codigo ? `Cohorte ${state.cohorte.codigo}` : 'Sin alta' }}
      </p>
      <dl class="ctx__list">
        <template v-if="state.cohorte.codigo">
          <dt>Carrera</dt><dd>{{ etiquetaCarrera(state.cohorte.carrera) }}</dd>
          <dt>Trimestre</dt><dd>{{ state.cohorte.trimestre }}</dd>
        </template>
        <dt>Sedes</dt><dd>{{ state.sedes.length }}</dd>
        <dt>Enlaces asignados</dt>
        <dd>{{ state.sedes.length ? `${enlacesCount} de ${state.sedes.length}` : enlacesCount }}</dd>
      </dl>
    </section>

    <section class="card card--flat ctx">
      <p class="ctx__eyebrow ctx__eyebrow--muted">Progreso del módulo</p>
      <ul class="checklist">
        <li v-for="item in checklist" :key="item.label" class="checklist__item">
          <span class="checklist__dot" :class="{ 'is-done': item.done }">
            <Icono v-if="item.done" nombre="check" :tam="12" />
          </span>
          <span class="checklist__label" :class="{ 'is-done': item.done }">
            {{ item.label }}
            <!-- Mismo número que arriba: «1» arriba y el paso sin marcar abajo
                 parecían contradecirse. Se marca cuando TODAS tienen enlace. -->
            <span v-if="item.label === 'Enlaces asignados' && state.sedes.length && !item.done" class="checklist__cuenta">
              ({{ enlacesCount }} de {{ state.sedes.length }})
            </span>
          </span>
        </li>
      </ul>
    </section>

    <button v-if="siguiente" class="btn btn--primary ctx__next" @click="goTo(siguiente.id)">
      Continuar: {{ siguiente.title }} →
    </button>
    <template v-else>
      <p class="ctx__estado" :class="{ 'is-done': nextStepId === null }">{{ estado }}</p>
      <button v-if="puedeExtraccion" class="btn btn--outline ctx__next" @click="goTo(15)">
        Ir a Extracción de Documentos →
      </button>
    </template>
  </div>
</template>

<style scoped>
.ctx { padding: 18px; }
.ctx:first-child { background: var(--blue-bg); border-color: var(--border-3); }
.ctx__eyebrow {
  margin: 0 0 10px; font-size: 12px; font-weight: 600; letter-spacing: .06em;
  text-transform: uppercase; color: #1E40AF;
}
.ctx__eyebrow--muted { color: var(--muted-2); margin-bottom: 14px; }
.ctx__codigo { margin: 0 0 12px; font-size: 15px; font-weight: 700; color: var(--navy-ink); }
.ctx__list { display: grid; grid-template-columns: 1fr auto; row-gap: 8px; margin: 0; font-size: 13px; }
.ctx__list dt { color: var(--muted-2); }
.ctx__list dd { margin: 0; text-align: right; font-weight: 600; color: var(--ink); }

.checklist { list-style: none; margin: 0; padding: 0; }
.checklist__item { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.checklist__item:last-child { margin-bottom: 0; }
.checklist__dot {
  width: 18px; height: 18px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: #fff; border: 1.5px solid var(--border-2); color: #fff; font-size: 12px;
}
.checklist__dot.is-done { background: var(--success); border: none; }
.checklist__label { font-size: 13px; color: var(--muted); }
.checklist__cuenta { font-weight: 400; white-space: nowrap; }
.checklist__label.is-done { color: var(--text); font-weight: 600; }

/* `.btn` es nowrap con alto fijo, y «Continuar: Asignación de Enlaces DIDEDUC»
   no cabe en esta columna: se salía de la tarjeta por la izquierda. Aquí se le
   deja partir en dos líneas y crecer. */
.ctx__estado { margin: 0; text-align: center; font-size: 13px; font-weight: 600; color: var(--warning); }
.ctx__estado.is-done { color: var(--success); }
.ctx__next {
  width: 100%; height: auto; min-height: 40px; padding: 10px 16px;
  white-space: normal; text-align: center; line-height: 1.35;
}
</style>
