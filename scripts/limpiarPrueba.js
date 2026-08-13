/**
 * Borra ÚNICAMENTE los invitados marcados con  esPrueba: true .
 *
 * Los invitados reales NO llevan ese campo, así que este script no los toca.
 * Aun así, muestra qué va a borrar y pide confirmar con --si antes de hacerlo.
 *
 * OJO: los que des de alta desde el panel tampoco llevan la marca, así que
 * tampoco se borran aquí. Si diste a alguien de alta a mano mientras probabas,
 * bórralo tú desde el panel.
 *
 * Uso:
 *   npm run limpiar-prueba          Lista lo que borraría.
 *   npm run limpiar-prueba -- --si  Borra de verdad.
 */
import fs from 'node:fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { cargarEnv, requerido } from './lib/env.js'

cargarEnv()

const COLECCION = 'invitados'
const confirmado = process.argv.slice(2).includes('--si')

async function main() {
  const rutaCuenta = requerido('FIREBASE_SERVICE_ACCOUNT')
  if (!fs.existsSync(rutaCuenta)) {
    console.error(`\n✕ No existe la cuenta de servicio en: ${rutaCuenta}`)
    process.exit(1)
  }

  initializeApp({ credential: cert(JSON.parse(fs.readFileSync(rutaCuenta, 'utf8'))) })
  const db = getFirestore()

  const snap = await db.collection(COLECCION).where('esPrueba', '==', true).get()

  if (snap.empty) {
    console.log('No hay invitados de prueba que borrar.')
    return
  }

  console.log(`\nInvitados de prueba encontrados (${snap.size}):`)
  snap.docs.forEach((d) => console.log(`  · ${d.data().nombre}`))

  if (!confirmado) {
    console.log('\nNada se borró. Para borrarlos de verdad:')
    console.log('  npm run limpiar-prueba -- --si')
    return
  }

  const lote = db.batch()
  snap.docs.forEach((d) => lote.delete(d.ref))
  await lote.commit()

  console.log(`\n✓ ${snap.size} invitados de prueba borrados.`)
}

main().catch((e) => {
  console.error('\n✕ Error limpiando datos de prueba:')
  console.error(e)
  process.exit(1)
})
