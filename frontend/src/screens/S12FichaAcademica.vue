<script setup>
import { computed } from 'vue'
import { usePadep } from '@/stores/padep'
import { iniciales, pillClass, estatusTone } from '@/utils/format'

const { state, getDocente, setEstatus } = usePadep()

const docente = computed(() => getDocente(state.fichaId))

/** Línea de tiempo derivada del avance real del expediente. */
const timeline = computed(() => {
  const d = docente.value
  const final = d.estatus === 'Retirado' ? 'Retirado'
    : d.estatus === 'Graduado' ? 'Graduado'
    : 'En seguimiento'
  return [
    { label: 'Preinscrito', done: true },
    { label: 'Evaluación aprobada', done: d.resultado === 'Aprobado' },
    { label: 'Inscripción final', done: d.inscripcionFinal },
    { label: final, done: true },
  ]
})
</script>

<template>
  <div>
    <p class="eyebrow eyebrow--plain">Ficha Académica / Seguimiento</p>
    <h1 class="page-title">Ficha Académica del Docente</h1>
    <p class="page-sub">Ver y actualizar el estatus del docente durante la cohorte.</p>

    <header class="ficha-head">
      <span class="ficha-head__avatar">{{ iniciales(docente.nombre) }}</span>
      <div class="ficha-head__meta">
        <p class="ficha-head__name">{{ docente.nombre }}</p>
        <p class="ficha-head__id mono">{{ docente.id }} · {{ docente.sede }}</p>
      </div>
      <span :class="pillClass(estatusTone(docente.estatus))">{{ docente.estatus }}</span>
    </header>

    <div class="tabs" role="tablist">
      <button
        class="tabs__tab" :class="{ 'is-active': state.s12Tab === 'resumen' }"
        role="tab" :aria-selected="state.s12Tab === 'resumen'"
        @click="state.s12Tab = 'resumen'">Resumen</button>
      <button
        class="tabs__tab" :class="{ 'is-active': state.s12Tab === 'estatus' }"
        role="tab" :aria-selected="state.s12Tab === 'estatus'"
        @click="state.s12Tab = 'estatus'">Actualizar estatus</button>
    </div>

    <div class="ficha-grid">
      <div>
        <!-- Pestaña: resumen -->
        <section v-if="state.s12Tab === 'resumen'" class="card card--flat">
          <h2 class="card__head">Datos del expediente</h2>
          <dl class="expediente">
            <div><dt>Sede</dt><dd>{{ docente.sede }}</dd></div>
            <div><dt>Departamento</dt><dd>{{ docente.departamento }}</dd></div>
            <div><dt>Escalafón</dt><dd>{{ docente.escalafon }}</dd></div>
            <div><dt>Nota actual</dt><dd>{{ docente.notas }}</dd></div>
            <div><dt>Asistencia</dt><dd>{{ docente.asistencia }}</dd></div>
          </dl>
        </section>

        <!-- Pestaña: actualizar estatus -->
        <section v-else class="card card--flat">
          <h2 class="card__head">Actualizar estatus</h2>
          <div class="card__body">
            <label class="field estatus-field">
              <span class="field__label">Estatus</span>
              <select
                class="select"
                :value="docente.estatus"
                @change="setEstatus(docente.id, $event.target.value)">
                <option>Activo</option><option>Retirado</option><option>Graduado</option>
              </select>
            </label>

            <div v-if="docente.estatus === 'Retirado'" class="sub-grid sub-grid--3">
              <label class="field field--tight">
                <span class="field__label">Motivo (opcional)</span>
                <input class="input" placeholder="Motivo del retiro">
              </label>
              <label class="field field--tight">
                <span class="field__label">Fecha (opcional)</span>
                <input class="input" type="date">
              </label>
              <label class="field field--tight">
                <span class="field__label">Ref. carta convenio</span>
                <input class="input" placeholder="N.° de referencia">
              </label>
            </div>

            <div v-else-if="docente.estatus === 'Graduado'" class="sub-grid sub-grid--2">
              <label class="field field--tight">
                <span class="field__label">Número de acta</span>
                <input class="input" placeholder="Acta N.°">
              </label>
              <label class="field field--tight">
                <span class="field__label">Fecha</span>
                <input class="input" type="date">
              </label>
              <label class="field field--tight">
                <span class="field__label">Cohorte</span>
                <input class="input" :value="state.cohorte.codigo" readonly>
              </label>
              <label class="field field--tight">
                <span class="field__label">Título obtenido</span>
                <input class="input" placeholder="Ej. Profesorado de Enseñanza Media">
              </label>
            </div>

            <button class="btn btn--primary estatus-submit">Actualizar estatus</button>
          </div>
        </section>
      </div>

      <!-- Historial -->
      <aside class="card card--flat historial">
        <p class="historial__title">Historial de estatus</p>
        <ol class="historial__list">
          <li v-for="t in timeline" :key="t.label" class="historial__item">
            <span class="historial__dot" :class="{ 'is-done': t.done }" aria-hidden="true" />
            <span class="historial__label" :class="{ 'is-done': t.done }">{{ t.label }}</span>
          </li>
        </ol>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.ficha-head {
  display: flex; align-items: center; gap: 16px; margin-bottom: 22px;
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

.tabs { display: flex; border-bottom: 1px solid var(--border-3); margin-bottom: 22px; }
.tabs__tab {
  padding: 10px 4px; margin-right: 20px; border: none; background: none; cursor: pointer;
  font-family: inherit; font-size: 14px; font-weight: 600; color: var(--muted-2);
  border-bottom: 2px solid transparent;
}
.tabs__tab.is-active { color: var(--ink); border-bottom-color: var(--blue); }

.ficha-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 22px; align-items: start; }
@media (max-width: 900px) { .ficha-grid { grid-template-columns: 1fr; } }

.expediente {
  margin: 0; padding: 20px; display: grid; grid-template-columns: 1fr 1fr;
  row-gap: 16px; column-gap: 20px; font-size: 13px;
}
.expediente dt { font-size: 11px; color: var(--muted-2); text-transform: uppercase; letter-spacing: .04em; font-weight: 600; margin-bottom: 4px; }
.expediente dd { margin: 0; color: var(--ink); }

.estatus-field { max-width: 260px; }
.sub-grid { display: grid; gap: 14px; }
.sub-grid--3 { grid-template-columns: repeat(3, 1fr); }
.sub-grid--2 { grid-template-columns: repeat(2, 1fr); }
@media (max-width: 720px) { .sub-grid { grid-template-columns: 1fr; } }
.field--tight { margin-bottom: 0; }
.estatus-submit { margin-top: 18px; }

.historial { padding: 20px; }
.historial__title {
  margin: 0 0 16px; font-size: 11px; font-weight: 600; letter-spacing: .06em;
  text-transform: uppercase; color: var(--muted-2);
}
.historial__list { list-style: none; margin: 0; padding: 0 0 0 6px; position: relative; }
.historial__list::before {
  content: ''; position: absolute; left: 13px; top: 6px; bottom: 12px;
  width: 2px; background: var(--border-3);
}
.historial__item { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 18px; position: relative; }
.historial__dot {
  width: 16px; height: 16px; border-radius: 50%; flex-shrink: 0; margin-top: 2px;
  background: #fff; border: 2px solid var(--border-2);
}
.historial__dot.is-done { background: var(--success); border: none; }
.historial__label { font-size: 13px; line-height: 1.4; color: var(--muted); }
.historial__label.is-done { color: var(--text); font-weight: 600; }
</style>
