/**
 * Diagnóstico de la configuración de Firebase.
 *
 * Revisa, en orden, todo lo que suele salir mal al conectar el proyecto por
 * primera vez, y dice exactamente qué arreglar. No escribe nada.
 *
 * Uso:
 *   npm run verificar
 */
import fs from 'node:fs'
import path from 'node:path'
import { cargarEnv } from './lib/env.js'

cargarEnv()

let fallos = 0
let avisos = 0

const ok = (m) => console.log(`  ✓ ${m}`)
const mal = (m, pista) => {
  console.log(`  ✕ ${m}`)
  if (pista) console.log(`     → ${pista}`)
  fallos++
}
const aviso = (m, pista) => {
  console.log(`  ! ${m}`)
  if (pista) console.log(`     → ${pista}`)
  avisos++
}

const VARS_WEB = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
]

async function main() {
  console.log('\n═══ Diagnóstico de Firebase ═══\n')

  // ---------- 1. Archivo .env ----------
  console.log('1. Archivo .env')
  if (!fs.existsSync(path.resolve(process.cwd(), '.env'))) {
    mal('No existe el archivo .env', 'Copy-Item .env.example .env  y rellénalo')
    console.log('\nSin .env no se puede seguir. Créalo primero.\n')
    process.exit(1)
  }
  ok('.env encontrado')

  // ---------- 2. Variables de la app web ----------
  console.log('\n2. Configuración de la app web (VITE_*)')
  for (const v of VARS_WEB) {
    if (!process.env[v]) {
      mal(`Falta ${v}`, 'Firebase Console > Configuración del proyecto > Tus apps > Web')
    } else {
      ok(v)
    }
  }

  const projectIdWeb = process.env.VITE_FIREBASE_PROJECT_ID

  // Errores de dedo habituales al copiar del panel de Firebase.
  if (projectIdWeb) {
    if (projectIdWeb.includes('.') || projectIdWeb.includes('/')) {
      mal(
        `VITE_FIREBASE_PROJECT_ID parece mal: "${projectIdWeb}"`,
        'Debe ser solo el ID (ej. boda-llely-drix-1a2b3), sin dominio ni URL'
      )
    }
    const dominio = process.env.VITE_FIREBASE_AUTH_DOMAIN
    if (dominio && !dominio.includes(projectIdWeb)) {
      aviso(
        'VITE_FIREBASE_AUTH_DOMAIN no contiene el project ID',
        `authDomain="${dominio}" vs projectId="${projectIdWeb}". ¿Mezclaste dos proyectos?`
      )
    }
  }

  // ---------- 3. Cuenta de servicio ----------
  console.log('\n3. Cuenta de servicio (para los scripts de Node)')
  const rutaCuenta = process.env.FIREBASE_SERVICE_ACCOUNT
  let credenciales = null

  if (!rutaCuenta) {
    mal('Falta FIREBASE_SERVICE_ACCOUNT en el .env')
  } else if (!fs.existsSync(rutaCuenta)) {
    mal(
      `No existe el archivo: ${rutaCuenta}`,
      'Firebase Console > Configuración del proyecto > Cuentas de servicio > Generar nueva clave privada'
    )
  } else {
    try {
      credenciales = JSON.parse(fs.readFileSync(rutaCuenta, 'utf8'))
      if (!credenciales.project_id || !credenciales.private_key) {
        mal('El JSON no parece una cuenta de servicio válida')
        credenciales = null
      } else {
        ok(`Cuenta de servicio del proyecto "${credenciales.project_id}"`)

        // El error más común: la app web apunta a un proyecto y la cuenta
        // de servicio a otro. Todo "funciona" pero contra bases distintas.
        if (projectIdWeb && credenciales.project_id !== projectIdWeb) {
          mal(
            'La app web y la cuenta de servicio son de PROYECTOS DISTINTOS',
            `web="${projectIdWeb}" vs cuenta="${credenciales.project_id}". Usa el mismo proyecto en ambos.`
          )
        }
      }
    } catch {
      mal('El archivo de la cuenta de servicio no es un JSON válido')
    }
  }

  // ---------- 4. Conexión real a Firestore ----------
  console.log('\n4. Conexión a Firestore')
  if (!credenciales) {
    aviso('Se omite: hace falta una cuenta de servicio válida')
  } else {
    try {
      const { initializeApp, cert } = await import('firebase-admin/app')
      const { getFirestore } = await import('firebase-admin/firestore')

      initializeApp({ credential: cert(credenciales) })
      const db = getFirestore()

      const total = (await db.collection('invitados').count().get()).data().count
      ok(`Conectado. La colección "invitados" tiene ${total} documento(s)`)

      if (total > 0) {
        const prueba = (
          await db.collection('invitados').where('esPrueba', '==', true).count().get()
        ).data().count
        if (prueba > 0) console.log(`     (${prueba} son de prueba, ${total - prueba} reales)`)
      } else {
        console.log('     Aún no hay invitados. Siguiente paso:  npm run sembrar')
      }
    } catch (e) {
      if (e.code === 5 || /NOT_FOUND/i.test(e.message)) {
        mal(
          'Firestore no está creado en este proyecto',
          'Firebase Console > Firestore Database > Crear base de datos (modo producción)'
        )
      } else if (/PERMISSION_DENIED|403/i.test(e.message)) {
        mal(
          'Permiso denegado',
          'Revisa que la cuenta de servicio sea de este proyecto y no esté deshabilitada'
        )
      } else {
        mal(`No se pudo conectar: ${e.message}`)
      }
    }
  }

  // ---------- 5. Otros ----------
  console.log('\n5. Varios')
  if (!process.env.BASE_URL) {
    aviso('Falta BASE_URL', 'Se usará http://localhost:5173 al generar links')
  } else {
    ok(`BASE_URL = ${process.env.BASE_URL}`)
  }

  const excel = process.env.EXCEL_PATH
  if (!excel) aviso('Falta EXCEL_PATH', 'Solo hace falta para la migración real')
  else if (!fs.existsSync(excel)) mal(`No existe el Excel: ${excel}`)
  else ok('Excel encontrado')

  const rc = path.resolve(process.cwd(), '.firebaserc')
  if (fs.existsSync(rc)) {
    const contenido = fs.readFileSync(rc, 'utf8')
    if (contenido.includes('PON-AQUI-TU-PROJECT-ID')) {
      aviso(
        '.firebaserc todavía tiene el marcador de posición',
        `Cámbialo por "${projectIdWeb || 'tu-project-id'}" para poder desplegar las reglas`
      )
    } else {
      ok('.firebaserc configurado')
    }
  }

  // ---------- Resumen ----------
  console.log('\n═══════════════════════════════')
  if (fallos === 0 && avisos === 0) {
    console.log('✓ Todo listo.')
  } else {
    console.log(`${fallos} error(es), ${avisos} aviso(s).`)
  }
  console.log('')
  process.exit(fallos > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error('\n✕ Error inesperado en el diagnóstico:')
  console.error(e)
  process.exit(1)
})
