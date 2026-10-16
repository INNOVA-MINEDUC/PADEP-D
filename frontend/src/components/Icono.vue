<script setup>
/**
 * Íconos de línea, todos del mismo trazo, en vez de emoji: un 🔒 naranja junto
 * a un sobre gris se veía de dos sistemas distintos, y cada sistema operativo
 * pinta los emoji a su manera. Trazos de Lucide (licencia ISC), en línea para
 * no sumar una dependencia por quince dibujos.
 *
 * Toman el color del texto (`currentColor`) y son decorativos: quien los usa
 * pone el texto o el `aria-label` en el botón.
 */
defineProps({
  nombre: { type: String, required: true },
  tam: { type: [Number, String], default: 16 },
})

const TRAZOS = {
  candado: ['M5 11h14v10H5z', 'M7 11V7a5 5 0 0 1 10 0v4'],
  correo: ['M3 5h18v14H3z', 'm3 7 9 6 9-6'],
  ojo: ['M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z', 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z'],
  'ojo-tachado': ['M9.9 4.24A9 9 0 0 1 12 4c6.5 0 10 7 10 7a17 17 0 0 1-2.16 3.19', 'M6.6 6.6C3.9 8.4 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6', 'M9.9 9.9a3 3 0 0 0 4.2 4.2', 'm2 2 20 20'],
  inicio: ['m3 10 9-7 9 7', 'M5 9v11h14V9', 'M10 20v-6h4v6'],
  llave: ['M15 7a4 4 0 1 1-3.87 5H3v3h3v3h3v-3h2.13A4 4 0 0 1 15 7z'],
  salir: ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'm16 17 5-5-5-5', 'M21 12H9'],
  cerrar: ['M18 6 6 18', 'm6 6 12 12'],
  check: ['M20 6 9 17l-5-5'],
  subir: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'm17 8-5-5-5 5', 'M12 3v12'],
  bajar: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'm7 10 5 5 5-5', 'M12 15V3'],
  filtro: ['M22 3H2l8 9.46V19l4 2v-8.54z'],
  lugar: ['M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z', 'M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6z'],
  persona: ['M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2', 'M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z'],
  aviso: ['m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3z', 'M12 9v4', 'M12 17h.01'],
  menu: ['M4 6h16', 'M4 12h16', 'M4 18h16'],
  bandera: ['M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z', 'M4 22v-7'],
}
</script>

<template>
  <svg
    class="icono" :width="tam" :height="tam" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
    aria-hidden="true" focusable="false">
    <path v-for="d in TRAZOS[nombre] ?? []" :key="d" :d="d" />
  </svg>
</template>

<style scoped>
.icono { display: inline-block; flex-shrink: 0; vertical-align: middle; }
</style>
