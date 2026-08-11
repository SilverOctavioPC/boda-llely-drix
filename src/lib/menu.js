import { leerAcompanantes } from './acompanantes.js'

/**
 * Menú del banquete.
 *
 * La configuración vive en un único documento: configuracion/menu
 *   { platos: [{id, nombre}], platosNinos: [{id, nombre}], bebidas: [{id, nombre}] }
 *
 * Las elecciones se guardan en el documento del invitado:
 *   menu:             { plato: 'pollo', bebida: 'tinto' }        <- el titular
 *   menuAcompanantes: [{ plato: 'res', bebida: 'agua' }, ...]    <- sus acompañantes
 *
 * IMPORTANTE: las elecciones de los acompañantes van en una lista APARTE, no
 * dentro de `acompanantes`. Si estuvieran ahí, para que el invitado pudiera
 * elegir habría que darle permiso de escritura sobre `acompanantes`, y podría
 * editar su propio link para regalarse lugares de más. Separadas, puede elegir
 * su comida pero no cambiar cuánta gente lleva.
 *
 * El orden de `menuAcompanantes` es el mismo que devuelve `personasDelGrupo`:
 * primero los adultos y después los niños.
 */

export const DOC_CONFIG = 'menu'
export const COLECCION_CONFIG = 'configuracion'

export const CONFIG_VACIA = { platos: [], platosNinos: [], bebidas: [] }

/** Normaliza el documento de configuración venga como venga. */
export function leerConfig(datos) {
  const lista = (v) => (Array.isArray(v) ? v.filter((o) => o && o.id) : [])
  return {
    platos: lista(datos?.platos),
    platosNinos: lista(datos?.platosNinos),
    bebidas: lista(datos?.bebidas),
  }
}

export function hayMenuConfigurado(config) {
  return config.platos.length > 0 || config.platosNinos.length > 0 || config.bebidas.length > 0
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
 *
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

  adultos.forEach((p, i) => {
    lista.push({
      indice: i,
      nombre: p.nombre?.trim() || `Acompañante ${i + 1}`,
      tipo: 'adulto',
      esTitular: false,
    })
  })

  ninos.forEach((p, i) => {
    lista.push({
      indice: adultos.length + i,
      nombre: p.nombre?.trim() || `Niño ${i + 1}`,
      tipo: 'nino',
      esTitular: false,
    })
  })

  return lista
}

/** La elección guardada de una persona del grupo. */
export function eleccionDe(invitado, indice) {
  if (indice === -1) {
    const m = invitado?.menu
    return { plato: m?.plato || '', bebida: m?.bebida || '' }
  }
  const m = Array.isArray(invitado?.menuAcompanantes) ? invitado.menuAcompanantes[indice] : null
  return { plato: m?.plato || '', bebida: m?.bebida || '' }
}

/** Los platos que le tocan a alguien según su tipo. Los bebés no eligen. */
export function platosPara(tipo, config) {
  if (tipo === 'bebe') return []
  return tipo === 'nino' ? config.platosNinos : config.platos
}

/** Nombre legible de una opción; avisa si la borraron de la configuración. */
export function nombreOpcion(id, opciones) {
  if (!id) return null
  const o = opciones.find((x) => x.id === id)
  return o ? o.nombre : '(opción eliminada)'
}

/**
 * Conteo para el banquete: cuántos de cada plato y bebida, contando solo a
 * quienes confirmaron que sí. Incluye a los acompañantes.
 */
export function resumenMenu(invitados, config) {
  const platos = new Map()
  const bebidas = new Map()
  let sinPlato = 0
  let sinBebida = 0
  let bebes = 0

  const sumar = (mapa, id) => mapa.set(id, (mapa.get(id) || 0) + 1)

  for (const inv of invitados) {
    if (inv.confirmacion !== 'Si') continue

    for (const persona of personasDelGrupo(inv)) {
      if (persona.tipo === 'bebe') {
        bebes++
        continue
      }
      const eleccion = eleccionDe(inv, persona.indice)
      if (eleccion.plato) sumar(platos, eleccion.plato)
      else sinPlato++
      if (eleccion.bebida) sumar(bebidas, eleccion.bebida)
      else sinBebida++
    }
  }

  const aFilas = (mapa, opciones) =>
    [...mapa.entries()]
      .map(([id, n]) => ({ id, nombre: nombreOpcion(id, opciones), n }))
      .sort((a, b) => b.n - a.n)

  return {
    platos: aFilas(platos, [...config.platos, ...config.platosNinos]),
    bebidas: aFilas(bebidas, config.bebidas),
    sinPlato,
    sinBebida,
    bebes,
  }
}

/** ¿Falta que alguien de este grupo elija? Solo aplica a quien ya dijo que sí. */
export function faltaElegir(invitado, config) {
  if (invitado.confirmacion !== 'Si') return false
  if (!hayMenuConfigurado(config)) return false

  return personasDelGrupo(invitado).some((persona) => {
    if (persona.tipo === 'bebe') return false
    const opciones = platosPara(persona.tipo, config)
    if (opciones.length === 0) return false
    return !eleccionDe(invitado, persona.indice).plato
  })
}
