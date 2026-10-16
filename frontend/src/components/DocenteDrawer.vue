<script setup>
import { ref, watch } from 'vue'
import { usePadep } from '@/stores/padep'
import { api } from '@/api/extraccion'
import { iniciales, pillClass, estatusTone, estadoNotaTone, capital } from '@/utils/format'
import { useEscape } from '@/utils/useEscape'
import AvisoError from '@/components/AvisoError.vue'
import Icono from '@/components/Icono.vue'

/**
 * Consulta rápida de un docente: `GET /docentes/{codigo}`, pedido al abrir.
 *
 * Una ficha por PERSONA con todas sus inscripciones. Se pinta `estado` y no
 * `observaciones` (solo `estado` distingue CDR de REPROBADO), y `cuadra` falso
 * es un aviso, no un error: el dato es el del papel.
 */
const { state, closeDrawer } = usePadep()

/** @type {import('vue').Ref<import('@/api/tipos').FichaDocente | null>} */
const ficha = ref(null)
const error = ref('')
const cargando = ref(false)

watch(() => state.drawerDocenteId, async codigo => {
  ficha.value = null
  error.value = ''
  if (!codigo) return
  cargando.value = true
  try {
    const f = await api.docente(codigo)
    if (state.drawerDocenteId === codigo) ficha.value = f
  } catch (e) {
    if (state.drawerDocenteId === codigo) error.value = e.message
  } finally {
    if (state.drawerDocenteId === codigo) cargando.value = false
  }
}, { immediate: true })

// `cuadra`: 1/true cuadra, 0/false no, null = falta algún dato.
const noCuadra = (c) => c === false || c === 0

useEscape(() => { if (state.drawerDocenteId) closeDrawer() })
</script>

<template>
  <div v-if="state.drawerDocenteId" class="drawer-root">
    <div class="drawer__scrim" @click="closeDrawer" />
    <aside class="drawer" role="dialog" aria-modal="true" aria-label="Consulta rápida de docente">
      <header class="drawer__head">
        <span class="drawer__eyebrow">Consulta rápida</span>
        <button class="drawer__close" aria-label="Cerrar" @click="closeDrawer"><Icono nombre="cerrar" :tam="18" /></button>
      </header>

      <div class="drawer__body">
        <p v-if="cargando" class="drawer__muted">Cargando ficha…</p>
        <AvisoError :mensaje="error" />

        <template v-if="ficha">
          <div class="drawer__identity">
            <span class="drawer__avatar">{{ iniciales(ficha.docente.nombre) }}</span>
            <span>
              <span class="drawer__name">{{ ficha.docente.nombre }}</span>
              <span class="drawer__dpi mono">{{ ficha.docente.codigo_padep }} · CUI {{ ficha.docente.cui }}</span>
            </span>
          </div>

          <dl class="drawer__rows">
            <div class="drawer__row">
              <dt>Residencia</dt>
              <dd>{{ [ficha.docente.municipio, ficha.docente.departamento].filter(Boolean).join(', ') || '—' }}</dd>
            </div>
            <div v-if="ficha.docente.sexo" class="drawer__row"><dt>Sexo</dt><dd>{{ ficha.docente.sexo }}</dd></div>
          </dl>

          <section v-for="ins in ficha.inscripciones" :key="`${ins.cohorte}-${ins.carrera}`" class="drawer__ins">
            <h3 class="drawer__h">
              Cohorte {{ ins.cohorte }} · Carrera {{ ins.carrera }}
              <span :class="pillClass(estatusTone(ins.estatus_academico))">{{ capital(ins.estatus_academico) }}</span>
            </h3>
            <p class="drawer__muted drawer__carrera">{{ ins.carrera_nombre }}</p>

            <dl class="drawer__rows">
              <div class="drawer__row"><dt>Registro</dt><dd>{{ capital(ins.estatus_registro) || '—' }}</dd></div>
              <div class="drawer__row"><dt>Admisión</dt><dd>{{ capital(ins.resultado_admision) || '—' }}</dd></div>
              <div class="drawer__row"><dt>Escalafón</dt><dd>{{ ins.laboral?.escalafon || '—' }}</dd></div>
              <div class="drawer__row"><dt>Jornada</dt><dd>{{ ins.laboral?.jornada || '—' }}</dd></div>
            </dl>

            <h4 class="drawer__sub">Notas</h4>
            <p v-if="!ins.notas.length" class="drawer__muted">Sin notas cargadas.</p>
            <ul v-else class="drawer__list">
              <li v-for="n in ins.notas" :key="`${n.trimestre}-${n.corte}-${n.asignatura_codigo}`">
                <span class="drawer__item">
                  <span class="drawer__item-title">{{ n.asignatura }}</span>
                  <span class="drawer__muted">
                    {{ n.bimestre }} · Secc. {{ n.seccion || '—' }} · zona {{ n.zona ?? '—' }} + examen {{ n.examen_final ?? '—' }}
                  </span>
                  <span v-if="noCuadra(n.cuadra)" class="drawer__warn">Zona + examen no cuadra con la nota del papel.</span>
                </span>
                <span class="drawer__score">
                  <strong class="mono">{{ n.nota_final ?? '—' }}</strong>
                  <span :class="pillClass(estadoNotaTone(n.estado))">{{ n.estado }}</span>
                </span>
              </li>
            </ul>

            <h4 class="drawer__sub">Asistencia</h4>
            <p v-if="!ins.asistencia.length" class="drawer__muted">Sin asistencia cargada.</p>
            <ul v-else class="drawer__list">
              <li v-for="a in ins.asistencia" :key="`${a.trimestre}-${a.corte}`">
                <span class="drawer__item">
                  <span class="drawer__item-title">{{ a.bimestre }}</span>
                  <span class="drawer__muted">{{ a.presentes }} de {{ a.total_declarado ?? a.sesiones.length }} sesiones</span>
                  <span v-if="noCuadra(a.cuadra)" class="drawer__warn">Las sesiones marcadas no cuadran con el total declarado.</span>
                </span>
                <strong class="mono">{{ a.porcentaje == null ? '—' : `${Math.round(a.porcentaje)} %` }}</strong>
              </li>
            </ul>
          </section>

          <AvisoError v-if="ficha.incidencias.length" tono="nota"
            :mensaje="`Quedaron ${ficha.incidencias.length} incidencias sin resolver al cargar a esta persona.`" />
        </template>
      </div>

      <footer class="drawer__foot">
        <button class="btn btn--ghost drawer__cta" @click="closeDrawer">Cerrar</button>
      </footer>
    </aside>
  </div>
</template>

<style scoped>
.drawer-root { position: fixed; inset: 0; z-index: 60; }
.drawer__scrim { position: absolute; inset: 0; background: rgba(15,36,64,.45); }
.drawer {
  position: absolute; top: 0; right: 0; height: 100%; width: 460px; max-width: 90vw;
  background: #fff; box-shadow: 0 12px 32px rgba(16,24,40,.16); display: flex; flex-direction: column;
}
.drawer__head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 22px; border-bottom: 1px solid var(--border-3); flex-shrink: 0;
}
.drawer__eyebrow { font-size: 12px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: var(--muted-2); }
.drawer__close {
  width: 32px; height: 32px; border: none; background: transparent; border-radius: var(--r-sm);
  color: var(--muted-2); font-size: 18px; cursor: pointer;
}
.drawer__close:hover { background: #F3F4F6; }

.drawer__body { flex: 1; overflow-y: auto; padding: 22px; }
.drawer__identity { display: flex; align-items: center; gap: 14px; margin-bottom: 22px; }
.drawer__avatar {
  width: 48px; height: 48px; border-radius: 50%; flex-shrink: 0;
  background: var(--blue-bg); color: var(--blue);
  display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 700;
}
.drawer__name { display: block; font-size: 16px; font-weight: 700; color: var(--ink); line-height: 1.2; }
.drawer__dpi { display: block; font-size: 12px; color: var(--muted-2); margin-top: 3px; }

.drawer__rows {
  margin: 0; display: flex; flex-direction: column; gap: 1px;
  background: var(--border-3); border: 1px solid var(--border-3); border-radius: 10px; overflow: hidden;
}
.drawer__row { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 12px 14px; background: #fff; }
.drawer__row dt { font-size: 12px; color: var(--muted-2); text-transform: uppercase; letter-spacing: .04em; font-weight: 600; }
.drawer__row dd { margin: 0; font-size: 13px; color: var(--ink); text-align: right; }

.drawer__muted { display: block; margin: 0; font-size: 12px; color: var(--muted-2); }
.drawer__ins { margin-top: 24px; }
.drawer__h {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  margin: 0 0 2px; font-size: 14px; font-weight: 700; color: var(--ink);
}
.drawer__carrera { margin-bottom: 12px; }
.drawer__sub {
  margin: 18px 0 8px; font-size: 12px; font-weight: 600; letter-spacing: .04em;
  text-transform: uppercase; color: var(--muted-2);
}
.drawer__list {
  list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 1px;
  background: var(--border-3); border: 1px solid var(--border-3); border-radius: 10px; overflow: hidden;
}
.drawer__list li { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 10px 14px; background: #fff; }
.drawer__item { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.drawer__item-title { font-size: 13px; color: var(--ink); }
.drawer__score { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }
.drawer__warn { font-size: 12px; color: var(--warning); }

.drawer__foot { display: flex; gap: 10px; padding: 16px 22px; border-top: 1px solid var(--border-3); flex-shrink: 0; }
.drawer__cta { flex: 1; height: 42px; }
</style>
