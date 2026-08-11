import fs from 'node:fs'
import path from 'node:path'

/**
 * Cargador mínimo de .env, para no depender de `dotenv`.
 * Soporta  CLAVE=valor , comentarios con # y comillas opcionales.
 * No sobrescribe variables que ya existan en el entorno.
 */
export function cargarEnv(archivo = '.env') {
  const ruta = path.resolve(process.cwd(), archivo)
  if (!fs.existsSync(ruta)) return

  for (const linea of fs.readFileSync(ruta, 'utf8').split(/\r?\n/)) {
    const limpia = linea.trim()
    if (!limpia || limpia.startsWith('#')) continue

    const sep = limpia.indexOf('=')
    if (sep === -1) continue

    const clave = limpia.slice(0, sep).trim()
    let valor = limpia.slice(sep + 1).trim()

    if (
      (valor.startsWith('"') && valor.endsWith('"')) ||
      (valor.startsWith("'") && valor.endsWith("'"))
    ) {
      valor = valor.slice(1, -1)
    }

    if (!(clave in process.env)) process.env[clave] = valor
  }
}

/** Lee una variable obligatoria o aborta con un mensaje entendible. */
export function requerido(clave, pista = '') {
  const v = process.env[clave]
  if (!v) {
    console.error(`\n✕ Falta la variable ${clave} en tu archivo .env`)
    if (pista) console.error(`  ${pista}`)
    process.exit(1)
  }
  return v
}
