import ExcelJS from 'exceljs'

/**
 * Estructura real del archivo "Invitados boda.xlsx" (verificada contra el XML
 * del propio archivo, no supuesta):
 *
 *   - Fila 6  : encabezados
 *   - Fila 8+ : datos
 *   - Columnas: B=N.  C=NOMBRE  D=NIÑO/EDAD  E=Sexo
 *               F=POSIBLE ASISTENCIA  G=SAVE THE DATE  H=MESA  I=CONFIRMACIÓN
 *
 * Debajo de los datos cada hoja tiene un bloque de estadísticas
 * (SEXO / CONFIRMACIONES). Ese bloque vive en la columna D en adelante y deja
 * la columna C vacía, así que filtrar por "C no vacía" lo descarta solo.
 */
const PRIMERA_FILA_DATOS = 8

const COL = {
  n: 2,
  nombre: 3,
  edad: 4,
  sexo: 5,
  posibleAsistencia: 6,
  saveTheDate: 7,
  mesa: 8,
  confirmacion: 9,
}

export const HOJAS = [
  { hoja: 'Lista Llely', grupo: 'Llely' },
  { hoja: 'Lista Drix', grupo: 'Drix' },
]

const texto = (fila, col) => (fila.getCell(col).text || '').trim()
const oNulo = (v) => (v === '' ? null : v)

/**
 * La columna "Sexo" del Excel mezcla dos conceptos: sexo (Hombre/Mujer) y
 * rango de edad (Niño/Niña/Bebé). Aquí los separamos en dos campos, para
 * poder contar menús de adulto, de niño y bebés sin perder el sexo.
 *
 *   Niña  ->  sexo: 'Mujer',  categoria: 'Niño'
 *   Bebé  ->  sexo:  null,    categoria: 'Bebé'
 */
export function separarSexoYCategoria(valorExcel) {
  // Se comparan las dos grafías (con y sin acento) en vez de normalizar,
  // porque el Excel las trae mezcladas y así no dependemos de la
  // codificación del archivo.
  const v = (valorExcel || '').toLowerCase().trim()

  if (v === 'hombre') return { sexo: 'Hombre', categoria: 'Adulto' }
  if (v === 'mujer') return { sexo: 'Mujer', categoria: 'Adulto' }
  if (v === 'niño' || v === 'nino') return { sexo: 'Hombre', categoria: 'Niño' }
  if (v === 'niña' || v === 'nina') return { sexo: 'Mujer', categoria: 'Niño' }
  if (v === 'bebé' || v === 'bebe') return { sexo: null, categoria: 'Bebé' }

  // Celda vacía o valor inesperado: adulto sin sexo definido.
  return { sexo: null, categoria: 'Adulto' }
}

/**
 * Devuelve un objeto por cada fila con nombre, en el orden del Excel.
 *
 * NO agrupa, NO deduplica y NO cambia mayúsculas: el nombre se respeta tal
 * como aparece en la columna NOMBRE (solo se recortan espacios sobrantes,
 * que son invisibles). Cada fila del Excel será un invitado con su link.
 */
export async function leerInvitados(rutaExcel) {
  const libro = new ExcelJS.Workbook()
  await libro.xlsx.readFile(rutaExcel)

  const invitados = []

  for (const { hoja, grupo } of HOJAS) {
    const ws = libro.getWorksheet(hoja)
    if (!ws) {
      throw new Error(
        `No se encontró la hoja "${hoja}" en el Excel. ` +
          `Hojas disponibles: ${libro.worksheets.map((w) => w.name).join(', ')}`
      )
    }

    for (let f = PRIMERA_FILA_DATOS; f <= ws.rowCount; f++) {
      const fila = ws.getRow(f)
      const nombreCrudo = fila.getCell(COL.nombre).text || ''
      const nombre = nombreCrudo.trim()

      // Filas sin nombre: numeradas pero vacías, separadores, y el bloque
      // de estadísticas del final.
      if (!nombre) continue

      const sexoCrudo = texto(fila, COL.sexo)
      const { sexo, categoria } = separarSexoYCategoria(sexoCrudo)

      invitados.push({
        grupo,
        hoja,
        fila: f,
        numeroExcel: texto(fila, COL.n),
        nombre,
        nombreOriginal: nombreCrudo,
        edad: oNulo(texto(fila, COL.edad)),
        sexo,
        categoria,
        sexoOriginalExcel: oNulo(sexoCrudo),
        posibleAsistencia: oNulo(texto(fila, COL.posibleAsistencia)),
        saveTheDate: oNulo(texto(fila, COL.saveTheDate)),
        mesa: oNulo(texto(fila, COL.mesa)),
        confirmacionExcel: oNulo(texto(fila, COL.confirmacion)),
      })
    }
  }

  return invitados
}

/** Resumen para verificar a simple vista que la lectura salió bien. */
export function resumir(invitados) {
  const porGrupo = {}
  const porCategoria = {}
  const porSexo = {}
  const nombresVistos = new Map()

  for (const i of invitados) {
    porGrupo[i.grupo] = (porGrupo[i.grupo] || 0) + 1
    porCategoria[i.categoria] = (porCategoria[i.categoria] || 0) + 1
    porSexo[i.sexo || 'Sin especificar'] = (porSexo[i.sexo || 'Sin especificar'] || 0) + 1
    const clave = i.nombre.toLocaleLowerCase('es')
    nombresVistos.set(clave, (nombresVistos.get(clave) || 0) + 1)
  }

  const repetidos = [...nombresVistos.entries()]
    .filter(([, n]) => n > 1)
    .map(([nombre, n]) => ({ nombre, veces: n }))
    .sort((a, b) => b.veces - a.veces)

  return { total: invitados.length, porGrupo, porCategoria, porSexo, repetidos }
}
