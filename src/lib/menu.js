import { leerAcompanantes } from './acompanantes.js'

/**
 * Menú del banquete: tres tiempos — entrada, plato fuerte y bebida.
 *
 * Configuración (documento único configuracion/menu):
 *   {
 *     entradas: [{id, nombre}], entradasNinos: [...],
 *     platos:   [{id, nombre}], platosNinos:   [...],
 *     bebidas:  [{id, nombre}]
 *   }
 *
 * Elecciones, en el documento del invitado:
 *   menu:             { entrada, plato, bebida }        <- el titular
 *   menuAcompanantes: [{ entrada, plato, bebida }, ...] <- sus acompañantes
 *
 * IMPORTANTE: las elecciones de los acompañantes van en una lista APARTE, no
 * dentro de `acompanantes`. Si estuvieran ahí, para que el invitado pudiera
 * elegir habría que darle permiso de escritura sobre `acompanantes`, y podría
 * editar su propio link para regalarse lugares de más.
 *
 * El orden de `menuAcompanantes` es el que devuelve `personasDelGrupo`:
 * primero los adultos y después los niños.
 */

export const COLECCION_CONFIG = 'configuracion'
export const DOC_CONFIG = 'menu'

/**
 * Los tiempos del menú, en el orden en que se sirven y se preguntan.
 *
 * `campo` / `campoNinos` son las claves donde viven sus opciones en la
 * configuración. Las bebidas no distinguen entre adulto y niño.
 *
 * Añadir un tiempo nuevo se hace SOLO aquí: el editor, el selector del
 * invitado, los conteos y el CSV se generan a partir de esta lista.
 */
export const CURSOS = [
  { clave: 'entrada', etiqueta: 'Entrada', campo: 'entradas', campoNinos: 'entradasNinos' },
  { clave: 'plato', etiqueta: 'Plato fuerte', campo: 'platos', campoNinos: 'platosNinos' },
  { clave: 'postre', etiqueta: 'Postre', campo: 'postres', campoNinos: 'postresNinos' },
  { clave: 'bebida', etiqueta: 'Bebida', campo: 'bebidas', campoNinos: 'bebidas' },
]

/** Todas las claves de listas que existen en la configuración. */
const CAMPOS_CONFIG = [...new Set(CURSOS.flatMap((c) => [c.campo, c.campoNinos]))]

export const CONFIG_VACIA = Object.fromEntries(CAMPOS_CONFIG.map((c) => [c, []]))

/** Normaliza el documento de configuración venga como venga. */
export function leerConfig(datos) {
  const lista = (v) => (Array.isArray(v) ? v.filter((o) => o && o.id) : [])
  return Object.fromEntries(CAMPOS_CONFIG.map((c) => [c, lista(datos?.[c])]))
}

export function hayMenuConfigurado(config) {
  return CAMPOS_CONFIG.some((c) => (config[c] || []).length > 0)
}

/** Opciones de un tiempo según el tipo de comensal. Los bebés no eligen. */
export function opcionesPara(curso, tipo, config) {
  if (tipo === 'bebe') return []
  const def = CURSOS.find((c) => c.clave === curso)
  if (!def) return []
  return config[tipo === 'nino' ? def.campoNinos : def.campo] || []
}

/** Genera un id corto y estable para una opción nueva. */
export function nuevoId() {
  return Math.random().toString(36).slice(2, 10)
}

function tipoDeCategoria(categoria) {
  if (categoria === 'Niño') return 'nino'
  if (categoria === 'Bebé') return 'bebe'
  return 'adulto'
}

/**
 * Todas las personas del grupo, en el orden en que se muestran y se guardan.
 * `indice` es la posición dentro de `menuAcompanantes`; el titular usa -1
 * porque su elección va en el campo `menu`.
 */
export function personasDelGrupo(invitado) {
  const { adultos, ninos } = leerAcompanantes(invitado)

  const lista = [
    {
      indice: -1,
      nombre: invitado.nombre,
      tipo: tipoDeCategoria(invitado.categoria),
      esTitular: true,
    },
  ]

  adultos.forEach((p, i) =>
    lista.push({
      indice: i,
      nombre: p.nombre?.trim() || `Acompañante ${i + 1}`,
      tipo: 'adulto',
      esTitular: false,
    })
  )

  ninos.forEach((p, i) =>
    lista.push({
      indice: adultos.length + i,
      nombre: p.nombre?.trim() || `Niño ${i + 1}`,
      tipo: 'nino',
      esTitular: false,
    })
  )

  return lista
}

/** La elección guardada de una persona del grupo. */
export function eleccionDe(invitado, indice) {
  const m =
    indice === -1
      ? invitado?.menu
      : Array.isArray(invitado?.menuAcompanantes)
        ? invitado.menuAcompanantes[indice]
        : null

  return Object.fromEntries(CURSOS.map((c) => [c.clave, m?.[c.clave] || '']))
}

/** Convierte las elecciones de pantalla al objeto que se guarda en Firestore. */
export function aMenuGuardable(eleccion = {}) {
  return Object.fromEntries(CURSOS.map((c) => [c.clave, eleccion[c.clave] || null]))
}

/** Nombre legible de una opción; avisa si la borraron de la configuración. */
export function nombreOpcion(id, opciones) {
  if (!id) return null
  const o = opciones.find((x) => x.id === id)
  return o ? o.nombre : '(opción eliminada)'
}

/** Texto tipo "Crema de elote · Pollo · Vino tinto" para una persona. */
export function resumenEleccion(invitado, persona, config) {
  const eleccion = eleccionDe(invitado, persona.indice)
  return CURSOS.map((c) =>
    nombreOpcion(eleccion[c.clave], opcionesPara(c.clave, persona.tipo, config))
  )
    .filter(Boolean)
    .join(' · ')
}

/**
 * Qué le falta por elegir a un grupo. Devuelve la lista de personas
 * incompletas, para poder decírselo con nombre y apellido.
 */
export function personasIncompletas(invitado, config) {
  return personasDelGrupo(invitado).filter((persona) => {
    if (persona.tipo === 'bebe') return false
    const eleccion = eleccionDe(invitado, persona.indice)
    return CURSOS.some((c) => {
      const opciones = opcionesPara(c.clave, persona.tipo, config)
      return opciones.length > 0 && !eleccion[c.clave]
    })
  })
}

/** ¿Falta que alguien de este grupo elija? Solo aplica a quien ya dijo que sí. */
export function faltaElegir(invitado, config) {
  if (invitado.confirmacion !== 'Si') return false
  if (!hayMenuConfigurado(config)) return false
  return personasIncompletas(invitado, config).length > 0
}

/**
 * Conteo para el banquete: cuántos de cada opción, contando solo a quienes
 * confirmaron que sí. Incluye a los acompañantes.
 */
export function resumenMenu(invitados, config) {
  const conteos = Object.fromEntries(CURSOS.map((c) => [c.clave, new Map()]))
  const faltantes = Object.fromEntries(CURSOS.map((c) => [c.clave, 0]))
  let bebes = 0

  for (const inv of invitados) {
    if (inv.confirmacion !== 'Si') continue

    for (const persona of personasDelGrupo(inv)) {
      if (persona.tipo === 'bebe') {
        bebes++
        continue
      }
      const eleccion = eleccionDe(inv, persona.indice)
      for (const c of CURSOS) {
        if (opcionesPara(c.clave, persona.tipo, config).length === 0) continue
        const id = eleccion[c.clave]
        if (id) conteos[c.clave].set(id, (conteos[c.clave].get(id) || 0) + 1)
        else faltantes[c.clave]++
      }
    }
  }

  const aFilas = (curso) => {
    const opciones = [
      ...opcionesPara(curso, 'adulto', config),
      ...opcionesPara(curso, 'nino', config),
    ]
    return [...conteos[curso].entries()]
      .map(([id, n]) => ({ id, nombre: nombreOpcion(id, opciones), n }))
      .sort((a, b) => b.n - a.n)
  }

  return {
    ...Object.fromEntries(CURSOS.map((c) => [c.clave, aFilas(c.clave)])),
    faltantes,
    bebes,
  }
}
