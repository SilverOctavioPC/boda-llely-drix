/**
 * Acompañantes de un invitado.
 *
 * Forma actual en Firestore:
 *   acompanantes: {
 *     adultos: [{ nombre: 'Ana López', sexo: 'Mujer' }],
 *     ninos:   [{ nombre: 'Leo',       sexo: 'Hombre', edad: '6 años' }]
 *   }
 *
 * Los acompañantes no son documentos propios: no tienen link ni QR. El titular
 * recibe un único QR que vale por todo el grupo, y al escanearlo entran todos.
 * El nombre y el sexo son opcionales — se puede sumar gente sin conocerlos.
 *
 * `leerAcompanantes` acepta además dos formas que usó el proyecto antes:
 *   1. `acompanantes: []`                            (lista vacía suelta)
 *   2. `acompanantes: { adultos: 2, ninos: [...] }`  (adultos como número)
 *
 * Es tolerancia defensiva y cuesta cuatro líneas: cualquier documento que se
 * cuele con una de esas formas se lee sin romper la puerta el día del evento.
 */

const vacio = () => ({ nombre: null, sexo: null })

/** Convierte cualquiera de las formas conocidas en dos arrays. */
export function leerAcompanantes(invitado) {
  const a = invitado?.acompanantes

  // Forma 1: array vacío o campo ausente.
  if (!a || Array.isArray(a)) return { adultos: [], ninos: [] }

  // Forma 2: `adultos` era un número; lo expandimos a personas sin datos.
  let adultos
  if (Array.isArray(a.adultos)) {
    adultos = a.adultos
  } else {
    const n = Math.max(0, Number(a.adultos) || 0)
    adultos = Array.from({ length: n }, vacio)
  }

  return {
    adultos,
    ninos: Array.isArray(a.ninos) ? a.ninos : [],
  }
}

/** Total de personas del grupo, incluyendo al titular. */
export function totalPersonas(invitado) {
  const { adultos, ninos } = leerAcompanantes(invitado)
  return 1 + adultos.length + ninos.length
}

/** Texto corto tipo "1 adulto · 2 niños". Cadena vacía si va solo. */
export function resumenAcompanantes(invitado) {
  const { adultos, ninos } = leerAcompanantes(invitado)
  const partes = []
  if (adultos.length > 0) {
    partes.push(`${adultos.length} ${adultos.length === 1 ? 'adulto' : 'adultos'}`)
  }
  if (ninos.length > 0) {
    partes.push(`${ninos.length} ${ninos.length === 1 ? 'niño' : 'niños'}`)
  }
  return partes.join(' · ')
}

/**
 * Nombres de los acompañantes que sí los tengan.
 * Los que no, salen como "Acompañante" / "Niño (6 años)".
 */
export function nombresAcompanantes(invitado) {
  const { adultos, ninos } = leerAcompanantes(invitado)
  return [
    ...adultos.map((p) => p.nombre?.trim() || 'Acompañante'),
    ...ninos.map((p) => {
      const nombre = p.nombre?.trim()
      if (nombre) return p.edad ? `${nombre} (${p.edad})` : nombre
      return p.edad ? `Niño (${p.edad})` : 'Niño'
    }),
  ]
}

/**
 * Cuenta las personas de un grupo separadas por categoría, sumando al titular.
 * Es lo que necesita el banquete.
 */
export function desglosePorCategoria(invitado) {
  const { adultos, ninos } = leerAcompanantes(invitado)
  const d = { adultos: 0, ninos: 0, bebes: 0 }

  const cat = invitado.categoria || 'Adulto'
  if (cat === 'Niño') d.ninos++
  else if (cat === 'Bebé') d.bebes++
  else d.adultos++

  d.adultos += adultos.length
  d.ninos += ninos.length
  return d
}
