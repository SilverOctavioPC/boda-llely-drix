/**
 * Genera el archivo que usarán los novios para repartir invitaciones:
 * un CSV con  Nombre | Link RSVP  (más columnas de apoyo), leyendo el estado
 * real de Firestore. Se puede correr las veces que haga falta.
 *
 * Uso:
 *   npm run links
 */
import fs from 'node:fs'
import path from 'node:path'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { cargarEnv, requerido } from './lib/env.js'
import { resumenAcompanantes } from '../src/lib/acompanantes.js'

cargarEnv()

const COLECCION = 'invitados'
const DIR_SALIDA = path.resolve(process.cwd(), 'salida')

/** Escapa un valor para CSV (comillas dobles duplicadas). */
const esc = (v) => `"${(v ?? '').toString().replace(/"/g, '""')}"`

/** Mensaje listo para pegar en WhatsApp. */
function plantillaWhatsApp(nombre, link) {
  return (
    `¡Hola ${nombre}! Nos casamos y nos encantaría que nos acompañaras. ` +
    `Confirma tu asistencia aquí: ${link}`
  )
}

async function main() {
  const baseUrl = requerido('BASE_URL', 'Ej.: https://boda-llely-drix.vercel.app').replace(
    /\/+$/,
    ''
  )
  const rutaCuenta = requerido('FIREBASE_SERVICE_ACCOUNT')

  if (!fs.existsSync(rutaCuenta)) {
    console.error(`\n✕ No existe la cuenta de servicio en: ${rutaCuenta}`)
    process.exit(1)
  }

  initializeApp({ credential: cert(JSON.parse(fs.readFileSync(rutaCuenta, 'utf8'))) })
  const db = getFirestore()

  const snap = await db.collection(COLECCION).get()
  if (snap.empty) {
    console.error(
      '\n✕ No hay invitados en Firestore.' +
        '\n  Dalos de alta desde el panel, o corre  npm run sembrar  para los de prueba.'
    )
    process.exit(1)
  }

  const filas = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    // Por lista y, dentro de cada una, alfabéticamente: es el orden en que
    // resulta cómodo ir mandando los mensajes por WhatsApp.
    .sort((a, b) => {
      const ga = a.grupo || ''
      const gb = b.grupo || ''
      if (ga !== gb) return ga.localeCompare(gb, 'es')
      return (a.nombre || '').localeCompare(b.nombre || '', 'es')
    })

  const cabecera = [
    'Nombre',
    'Link RSVP',
    'Lista',
    'Sexo',
    'Edad',
    'Acompanantes',
    'Confirmacion',
    'Mensaje WhatsApp',
  ]

  const lineas = filas.map((f) => {
    const link = `${baseUrl}/rsvp/${f.id}`
    return [
      f.nombre,
      link,
      f.grupo,
      f.sexo,
      f.edad,
      resumenAcompanantes(f) || '',
      f.confirmacion,
      plantillaWhatsApp(f.nombre, link),
    ]
      .map(esc)
      .join(',')
  })

  fs.mkdirSync(DIR_SALIDA, { recursive: true })
  const destino = path.join(DIR_SALIDA, 'links-rsvp.csv')

  // El BOM (U+FEFF) hace que Excel abra el CSV con los acentos correctos.
  const csv = '\uFEFF' + [cabecera.map(esc).join(','), ...lineas].join('\r\n')
  fs.writeFileSync(destino, csv, 'utf8')

  console.log(`✓ ${filas.length} links generados en:\n  ${destino}`)
  console.log(`\n  Base usada: ${baseUrl}`)
  console.log(
    '  Si hay dos personas con el mismo nombre, usa las columnas "Lista" y\n' +
      '  "Acompanantes" para saber a cuál corresponde cada link.'
  )
}

main().catch((e) => {
  console.error('\n✕ Error generando los links:')
  console.error(e)
  process.exit(1)
})
