/**
 * Migración inicial: Excel -> Firestore.
 *
 * Crea un documento por CADA FILA con nombre del Excel (sin agrupar ni
 * deduplicar), con un ID aleatorio generado por Firestore.
 *
 * Uso:
 *   npm run migrar -- --dry-run     Muestra lo que haría, sin escribir nada.
 *   npm run migrar                  Escribe en Firestore (solo si está vacío).
 *   npm run migrar -- --force       Escribe aunque ya existan invitados (¡duplica!).
 */
import fs from 'node:fs'
import path from 'node:path'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { cargarEnv, requerido } from './lib/env.js'
import { leerInvitados, resumir } from './lib/leerExcel.js'

cargarEnv()

const COLECCION = 'invitados'
const DIR_SALIDA = path.resolve(process.cwd(), 'salida')

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const force = args.includes('--force')

async function main() {
  const rutaExcel = requerido('EXCEL_PATH', 'Debe apuntar al archivo "Invitados boda.xlsx".')
  if (!fs.existsSync(rutaExcel)) {
    console.error(`\n✕ No existe el Excel en: ${rutaExcel}`)
    process.exit(1)
  }

  // --- 1. Leer y verificar ---
  console.log(`Leyendo ${rutaExcel} …`)
  const filas = await leerInvitados(rutaExcel)
  const resumen = resumir(filas)

  console.log(`\n  Total de invitados leídos: ${resumen.total}`)
  for (const [grupo, n] of Object.entries(resumen.porGrupo)) {
    console.log(`    ${grupo}: ${n}`)
  }

  console.log('\n  Por categoría (para el banquete):')
  for (const [cat, n] of Object.entries(resumen.porCategoria)) {
    console.log(`    ${cat}: ${n}`)
  }

  console.log('\n  Por sexo:')
  for (const [s, n] of Object.entries(resumen.porSexo)) {
    console.log(`    ${s}: ${n}`)
  }

  if (resumen.repetidos.length) {
    console.log(
      `\n  Nombres que aparecen más de una vez (${resumen.repetidos.length}).` +
        `\n  Se respetan tal cual: cada fila es un invitado distinto con su propio link.` +
        `\n  Usa la columna "Fila Excel" del CSV de links para saber cuál es cuál.`
    )
    for (const r of resumen.repetidos) {
      console.log(`    ${r.veces}×  ${r.nombre}`)
    }
  }

  if (dryRun) {
    console.log('\n--dry-run: no se escribió nada en Firestore.')
    console.log('Primeras 5 filas que se crearían:')
    console.table(
      filas.slice(0, 5).map((f) => ({
        grupo: f.grupo,
        fila: f.fila,
        nombre: f.nombre,
        sexo: f.sexo,
        categoria: f.categoria,
        edad: f.edad,
      }))
    )
    return
  }

  // --- 2. Conectar a Firestore ---
  const rutaCuenta = requerido(
    'FIREBASE_SERVICE_ACCOUNT',
    'Firebase Console > Configuración del proyecto > Cuentas de servicio > Generar nueva clave privada.'
  )
  if (!fs.existsSync(rutaCuenta)) {
    console.error(`\n✕ No existe la cuenta de servicio en: ${rutaCuenta}`)
    process.exit(1)
  }

  const credenciales = JSON.parse(fs.readFileSync(rutaCuenta, 'utf8'))
  initializeApp({ credential: cert(credenciales) })
  const db = getFirestore()

  // --- 3. Evitar duplicar si ya se corrió antes ---
  const existentes = await db.collection(COLECCION).limit(1).get()
  if (!existentes.empty && !force) {
    const dePrueba = await db.collection(COLECCION).where('esPrueba', '==', true).count().get()
    const totales = await db.collection(COLECCION).count().get()
    const nPrueba = dePrueba.data().count
    const nTotal = totales.data().count

    console.error(`\n✕ La colección "${COLECCION}" ya tiene ${nTotal} documentos.`)
    if (nPrueba === nTotal) {
      console.error(
        `  Todos son invitados de PRUEBA. Bórralos antes de migrar de verdad:\n` +
          `    npm run limpiar-prueba -- --si`
      )
    } else {
      console.error(
        `  ${nTotal - nPrueba} son invitados reales.` +
          `\n  Correr de nuevo crearía duplicados con links nuevos.` +
          `\n  Si de verdad quieres añadirlos igual, usa:  npm run migrar -- --force`
      )
    }
    process.exit(1)
  }

  // --- 4. Escribir por lotes (Firestore admite 500 operaciones por lote) ---
  console.log(`\nEscribiendo ${filas.length} invitados en Firestore…`)
  const creados = []
  const TAMANO_LOTE = 400

  for (let i = 0; i < filas.length; i += TAMANO_LOTE) {
    const lote = db.batch()
    for (const f of filas.slice(i, i + TAMANO_LOTE)) {
      const ref = db.collection(COLECCION).doc() // ID aleatorio, no secuencial
      lote.set(ref, {
        nombre: f.nombre,
        grupo: f.grupo,
        // El Excel mezclaba sexo y edad en una columna; aquí van separados.
        sexo: f.sexo,
        categoria: f.categoria,
        sexoOriginalExcel: f.sexoOriginalExcel,
        edad: f.edad,
        mesa: f.mesa,

        // Todos arrancan en Pendiente para que cada quien responda desde su
        // link. El valor que traía el Excel se guarda aparte como referencia.
        confirmacion: 'Pendiente',
        confirmacionExcel: f.confirmacionExcel,
        posibleAsistencia: f.posibleAsistencia,
        saveTheDate: f.saveTheDate,

        restricciones: null,
        mensaje: null,
        fechaConfirmacion: null,

        entradaRegistrada: false,
        fechaEntrada: null,

        // Todos arrancan sin acompañantes: cada fila del Excel es una persona
        // con su propio link. Los novios pueden sumarles acompañantes después
        // desde el panel, y entonces el QR pasa a valer por todo el grupo.
        acompanantes: { adultos: [], ninos: [] },

        // Trazabilidad hacia el Excel original.
        origen: { hoja: f.hoja, fila: f.fila, numero: f.numeroExcel },
      })
      creados.push({ id: ref.id, ...f })
    }
    await lote.commit()
    console.log(`  … ${Math.min(i + TAMANO_LOTE, filas.length)}/${filas.length}`)
  }

  // --- 5. Guardar el mapeo para generar los links ---
  fs.mkdirSync(DIR_SALIDA, { recursive: true })
  const destino = path.join(DIR_SALIDA, 'invitados.json')
  fs.writeFileSync(destino, JSON.stringify(creados, null, 2), 'utf8')

  console.log(`\n✓ Listo. ${creados.length} invitados creados.`)
  console.log(`  Mapeo guardado en: ${destino}`)
  console.log(`  Ahora genera los links con:  npm run links`)
}

main().catch((e) => {
  console.error('\n✕ Error durante la migración:')
  console.error(e)
  process.exit(1)
})
