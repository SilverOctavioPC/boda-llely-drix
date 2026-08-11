/**
 * Siembra invitados FICTICIOS en Firestore para desarrollo.
 *
 * Los nombres son inventados a propósito: ninguno sale del Excel real, para
 * que no se confundan con invitados de verdad.
 *
 * Cada documento lleva  esPrueba: true , así que se pueden borrar todos de
 * golpe con:  npm run limpiar-prueba
 *
 * Uso:
 *   npm run sembrar
 */
import fs from 'node:fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { cargarEnv, requerido } from './lib/env.js'

cargarEnv()

const COLECCION = 'invitados'

/** Base de un invitado, para no repetir los campos nulos en cada caso. */
function invitado(datos) {
  return {
    nombre: '',
    grupo: 'Llely',
    sexo: null,
    categoria: 'Adulto',
    sexoOriginalExcel: null,
    edad: null,
    mesa: null,
    confirmacion: 'Pendiente',
    confirmacionExcel: null,
    posibleAsistencia: null,
    saveTheDate: null,
    restricciones: null,
    mensaje: null,
    fechaConfirmacion: null,
    entradaRegistrada: false,
    fechaEntrada: null,
    acompanantes: { adultos: [], ninos: [] },
    origen: { hoja: 'PRUEBA', fila: 0, numero: '0' },
    esPrueba: true,
    ...datos,
  }
}

const ahora = Timestamp.now()

// Cada caso cubre un estado distinto de la interfaz, para poder probar
// las tres pantallas sin tener que ir cambiando datos a mano.
const PRUEBAS = [
  invitado({
    nombre: 'Valentina Ruiz',
    grupo: 'Llely',
    sexo: 'Mujer',
    _caso: 'Pendiente — muestra el formulario de confirmación',
  }),
  invitado({
    nombre: 'Rodrigo Salas',
    grupo: 'Drix',
    sexo: 'Hombre',
    _caso: 'Pendiente — para probar el flujo completo de "No podré"',
  }),
  invitado({
    nombre: 'Camila Ferrer',
    grupo: 'Llely',
    sexo: 'Mujer',
    mesa: '4',
    confirmacion: 'Si',
    fechaConfirmacion: ahora,
    restricciones: 'Vegetariana, sin lácteos',
    mensaje: '¡Qué emoción! Ahí estaremos sin falta.',
    _caso: 'Ya confirmó SÍ — muestra su QR y las restricciones',
  }),
  invitado({
    nombre: 'Tomás Iriarte',
    grupo: 'Drix',
    sexo: 'Hombre',
    mesa: '7',
    confirmacion: 'Si',
    fechaConfirmacion: ahora,
    _caso: 'Ya confirmó SÍ — QR válido, escanéalo para ver el verde',
  }),
  invitado({
    nombre: 'Renata Ocampo',
    grupo: 'Llely',
    sexo: 'Mujer',
    categoria: 'Niño',
    edad: '6 años',
    confirmacion: 'Si',
    fechaConfirmacion: ahora,
    _caso: 'Niña (sexo Mujer + categoría Niño) — cuenta como menú infantil',
  }),
  invitado({
    nombre: 'Bruno Sepúlveda',
    grupo: 'Drix',
    sexo: 'Hombre',
    categoria: 'Bebé',
    edad: '8 meses',
    confirmacion: 'Si',
    fechaConfirmacion: ahora,
    _caso: 'Bebé — debe contar aparte, sin menú',
  }),
  invitado({
    nombre: 'Ignacio Bustos',
    grupo: 'Drix',
    sexo: 'Hombre',
    mesa: '2',
    confirmacion: 'Si',
    fechaConfirmacion: ahora,
    entradaRegistrada: true,
    fechaEntrada: ahora,
    _caso: 'YA ENTRÓ — al escanear debe salir ÁMBAR "Ya registrado"',
  }),
  invitado({
    nombre: 'Patricia Alcázar',
    grupo: 'Drix',
    sexo: 'Mujer',
    mesa: '5',
    confirmacion: 'Si',
    fechaConfirmacion: ahora,
    acompanantes: {
      adultos: [{ nombre: 'Héctor Alcázar', sexo: 'Hombre' }],
      ninos: [
        { nombre: 'Sofía', sexo: 'Mujer', edad: '7 años' },
        { nombre: 'Mateo', sexo: 'Hombre', edad: '4 años' },
      ],
    },
    _caso: 'GRUPO de 4 con nombres — al escanear debe listar a los 3 acompañantes',
  }),
  invitado({
    nombre: 'Gerardo Pineda',
    grupo: 'Llely',
    sexo: 'Hombre',
    confirmacion: 'Pendiente',
    // Acompañante sin nombre: el caso de "voy con alguien" sin más detalle.
    acompanantes: { adultos: [{ nombre: null, sexo: null }], ninos: [] },
    _caso: 'Pareja sin confirmar, acompañante SIN nombre — debe decir "2 lugares"',
  }),
  invitado({
    nombre: 'Lucía Ordóñez',
    grupo: 'Llely',
    sexo: 'Mujer',
    confirmacion: 'No',
    fechaConfirmacion: ahora,
    mensaje: 'No podremos llegar, pero les deseamos lo mejor.',
    _caso: 'Dijo NO — al escanear debe salir ROJO "No confirmó"',
  }),
  invitado({
    nombre: 'Esteban Quiroga',
    grupo: 'Drix',
    sexo: 'Hombre',
    _caso: 'Pendiente — al escanear debe salir ROJO "No confirmó"',
  }),
]

async function main() {
  const rutaCuenta = requerido(
    'FIREBASE_SERVICE_ACCOUNT',
    'Firebase Console > Configuración del proyecto > Cuentas de servicio > Generar nueva clave privada.'
  )
  if (!fs.existsSync(rutaCuenta)) {
    console.error(`\n✕ No existe la cuenta de servicio en: ${rutaCuenta}`)
    process.exit(1)
  }

  const baseUrl = (process.env.BASE_URL || 'http://localhost:5173').replace(/\/+$/, '')

  initializeApp({ credential: cert(JSON.parse(fs.readFileSync(rutaCuenta, 'utf8'))) })
  const db = getFirestore()

  // Si ya se sembró antes, limpiamos primero para no acumular duplicados.
  const previos = await db.collection(COLECCION).where('esPrueba', '==', true).get()
  if (!previos.empty) {
    const lote = db.batch()
    previos.docs.forEach((d) => lote.delete(d.ref))
    await lote.commit()
    console.log(`Se borraron ${previos.size} invitados de prueba anteriores.`)
  }

  const lote = db.batch()
  const creados = []
  for (const p of PRUEBAS) {
    const { _caso, ...datos } = p
    const ref = db.collection(COLECCION).doc()
    lote.set(ref, datos)
    creados.push({ id: ref.id, nombre: datos.nombre, caso: _caso })
  }
  await lote.commit()

  console.log(`\n✓ ${creados.length} invitados de prueba creados.\n`)
  for (const c of creados) {
    console.log(`  ${c.nombre}`)
    console.log(`    ${c.caso}`)
    console.log(`    ${baseUrl}/rsvp/${c.id}\n`)
  }
  console.log('Para borrarlos:  npm run limpiar-prueba')
}

main().catch((e) => {
  console.error('\n✕ Error sembrando datos de prueba:')
  console.error(e)
  process.exit(1)
})
