import { describe, it, expect } from 'vitest'
import {
  CURSOS,
  CONFIG_VACIA,
  leerConfig,
  hayMenuConfigurado,
  opcionesPara,
  personasDelGrupo,
  personasQueEligen,
  eleccionCompleta,
  eleccionDe,
  aMenuGuardable,
  nombreOpcion,
  textoEleccion,
  personasIncompletas,
  faltaElegir,
  resumenMenu,
} from './menu.js'

/**
 * Configuración de referencia. `entradasNinos` va vacía a propósito: es el caso
 * "a los niños no se les pregunta esa entrada", que debe quedar fuera tanto de
 * los conteos como de los faltantes.
 */
const config = leerConfig({
  entradas: [
    { id: 'e1', nombre: 'Crema de elote' },
    { id: 'e2', nombre: 'Ensalada' },
  ],
  entradasNinos: [],
  platos: [
    { id: 'p1', nombre: 'Pollo' },
    { id: 'p2', nombre: 'Res' },
  ],
  platosNinos: [{ id: 'pn', nombre: 'Nuggets' }],
  postres: [{ id: 'd1', nombre: 'Pastel' }],
  postresNinos: [{ id: 'dn', nombre: 'Helado' }],
  bebidas: [
    { id: 'b1', nombre: 'Vino tinto' },
    { id: 'b2', nombre: 'Agua' },
  ],
})

/** Convierte las filas de un curso en { id: cuántos } para comparar sin depender del orden. */
const porId = (filas) => Object.fromEntries(filas.map((f) => [f.id, f.n]))

describe('leerConfig', () => {
  it('normaliza cualquier documento a las listas conocidas', () => {
    expect(Object.keys(leerConfig(null)).sort()).toEqual(Object.keys(CONFIG_VACIA).sort())
    expect(leerConfig(null)).toEqual(CONFIG_VACIA)
  })

  it('descarta opciones sin id y campos que no son listas', () => {
    const c = leerConfig({ platos: [{ id: 'p1', nombre: 'Pollo' }, { nombre: 'Sin id' }, null] })
    expect(c.platos).toEqual([{ id: 'p1', nombre: 'Pollo' }])
    expect(leerConfig({ bebidas: 'no soy una lista' }).bebidas).toEqual([])
  })
})

describe('hayMenuConfigurado', () => {
  it('es falso con todas las listas vacías', () => {
    expect(hayMenuConfigurado(CONFIG_VACIA)).toBe(false)
  })

  it('basta una sola opción en cualquier lista', () => {
    expect(hayMenuConfigurado(leerConfig({ bebidas: [{ id: 'b1', nombre: 'Agua' }] }))).toBe(true)
  })
})

describe('opcionesPara', () => {
  it('los bebés no eligen nada', () => {
    for (const c of CURSOS) expect(opcionesPara(c.clave, 'bebe', config)).toEqual([])
  })

  it('los niños reciben la lista infantil', () => {
    expect(opcionesPara('plato', 'nino', config).map((o) => o.id)).toEqual(['pn'])
    expect(opcionesPara('plato', 'adulto', config).map((o) => o.id)).toEqual(['p1', 'p2'])
  })

  it('las bebidas son comunes a adultos y niños', () => {
    expect(opcionesPara('bebida', 'nino', config)).toEqual(opcionesPara('bebida', 'adulto', config))
  })

  it('una lista infantil vacía significa que no se pregunta', () => {
    expect(opcionesPara('entrada', 'nino', config)).toEqual([])
  })

  it('un curso inexistente devuelve lista vacía en vez de reventar', () => {
    expect(opcionesPara('sopa', 'adulto', config)).toEqual([])
  })
})

describe('personasDelGrupo — orden e índices', () => {
  const invitado = {
    nombre: 'Patricia Alcázar',
    categoria: 'Adulto',
    acompanantes: {
      adultos: [{ nombre: 'Héctor Alcázar' }],
      ninos: [{ nombre: 'Sofía' }, { nombre: 'Mateo' }],
    },
  }

  it('el titular va primero, con índice -1', () => {
    const [titular] = personasDelGrupo(invitado)
    expect(titular).toMatchObject({ indice: -1, nombre: 'Patricia Alcázar', esTitular: true })
  })

  it('primero los adultos y después los niños, con índices correlativos', () => {
    expect(personasDelGrupo(invitado).map((p) => [p.indice, p.tipo])).toEqual([
      [-1, 'adulto'],
      [0, 'adulto'],
      [1, 'nino'],
      [2, 'nino'],
    ])
  })

  it('los índices apuntan a la posición dentro de menuAcompanantes', () => {
    // Este es el acoplamiento que hace que el menú de cada persona sea el suyo:
    // si el orden cambiara, a Sofía le llegaría la comida de Héctor.
    const conMenu = {
      ...invitado,
      menuAcompanantes: [{ plato: 'p1' }, { plato: 'pn' }, { plato: 'pn' }],
    }
    const [, hector, sofia] = personasDelGrupo(conMenu)
    expect(eleccionDe(conMenu, hector.indice).plato).toBe('p1')
    expect(eleccionDe(conMenu, sofia.indice).plato).toBe('pn')
  })

  it('pone un marcador a quien no tenga nombre', () => {
    const anonimo = { nombre: 'Gerardo', acompanantes: { adultos: [{}], ninos: [{ nombre: ' ' }] } }
    expect(personasDelGrupo(anonimo).map((p) => p.nombre)).toEqual([
      'Gerardo',
      'Acompañante 1',
      'Niño 1',
    ])
  })

  it('la categoría del titular decide su tipo', () => {
    expect(personasDelGrupo({ nombre: 'Bruno', categoria: 'Bebé' })[0].tipo).toBe('bebe')
    expect(personasDelGrupo({ nombre: 'Renata', categoria: 'Niño' })[0].tipo).toBe('nino')
    expect(personasDelGrupo({ nombre: 'Sin categoría' })[0].tipo).toBe('adulto')
  })
})

describe('personasQueEligen', () => {
  it('deja fuera a los bebés', () => {
    const inv = { nombre: 'Bruno', categoria: 'Bebé' }
    expect(personasQueEligen(inv, config)).toEqual([])
  })

  it('deja fuera a quien no tiene ninguna opción aplicable', () => {
    // Sin menú infantil de ningún tipo, a un niño no hay nada que preguntarle.
    const soloAdultos = leerConfig({ entradas: [{ id: 'e1', nombre: 'Crema' }] })
    const inv = { nombre: 'Renata', categoria: 'Niño' }
    expect(personasQueEligen(inv, soloAdultos)).toEqual([])
    expect(personasQueEligen({ nombre: 'Ana', categoria: 'Adulto' }, soloAdultos)).toHaveLength(1)
  })
})

describe('eleccionDe / aMenuGuardable', () => {
  it('el titular lee de `menu` y los acompañantes de `menuAcompanantes`', () => {
    const inv = { menu: { plato: 'p1' }, menuAcompanantes: [{ plato: 'p2' }] }
    expect(eleccionDe(inv, -1).plato).toBe('p1')
    expect(eleccionDe(inv, 0).plato).toBe('p2')
  })

  it('devuelve todos los cursos, con cadena vacía en lo que falte', () => {
    const e = eleccionDe({}, -1)
    expect(Object.keys(e).sort()).toEqual(CURSOS.map((c) => c.clave).sort())
    expect(Object.values(e).every((v) => v === '')).toBe(true)
  })

  it('tolera documentos guardados antes de que existiera el postre', () => {
    const antiguo = { menu: { entrada: 'e1', plato: 'p1', bebida: 'b1' } }
    expect(eleccionDe(antiguo, -1)).toEqual({
      entrada: 'e1',
      plato: 'p1',
      postre: '',
      bebida: 'b1',
    })
  })

  it('no se rompe si menuAcompanantes no es una lista', () => {
    expect(eleccionDe({ menuAcompanantes: 'nada' }, 0).plato).toBe('')
    expect(eleccionDe(null, 3).plato).toBe('')
  })

  it('aMenuGuardable convierte los huecos en null, no en cadena vacía', () => {
    expect(aMenuGuardable({ plato: 'p1' })).toEqual({
      entrada: null,
      plato: 'p1',
      postre: null,
      bebida: null,
    })
  })
})

describe('eleccionCompleta', () => {
  const adulto = { tipo: 'adulto' }
  const nino = { tipo: 'nino' }

  it('exige todos los cursos que sí tienen opciones', () => {
    expect(
      eleccionCompleta(adulto, { entrada: 'e1', plato: 'p1', postre: 'd1', bebida: 'b1' }, config)
    ).toBe(true)
    expect(eleccionCompleta(adulto, { entrada: 'e1', plato: 'p1', postre: 'd1' }, config)).toBe(
      false
    )
  })

  it('no exige un curso cuya lista está vacía para ese comensal', () => {
    // El niño no tiene entrada infantil configurada: está completo sin elegirla.
    expect(eleccionCompleta(nino, { plato: 'pn', postre: 'dn', bebida: 'b2' }, config)).toBe(true)
  })
})

describe('nombreOpcion / textoEleccion', () => {
  it('avisa cuando la opción ya no está en la configuración', () => {
    expect(nombreOpcion('borrada', config.platos)).toBe('(opción eliminada)')
    expect(nombreOpcion(null, config.platos)).toBe(null)
  })

  it('arma el texto en el orden en que se sirven los tiempos', () => {
    const texto = textoEleccion(
      { entrada: 'e1', plato: 'p2', postre: 'd1', bebida: 'b1' },
      'adulto',
      config
    )
    expect(texto).toBe('Crema de elote · Res · Pastel · Vino tinto')
  })

  it('omite los tiempos sin elegir en vez de dejar huecos', () => {
    expect(textoEleccion({ plato: 'p1' }, 'adulto', config)).toBe('Pollo')
  })
})

describe('personasIncompletas / faltaElegir', () => {
  const grupoIncompleto = {
    nombre: 'Patricia',
    categoria: 'Adulto',
    confirmacion: 'Si',
    menu: { entrada: 'e1', plato: 'p1', postre: 'd1', bebida: 'b1' },
    acompanantes: { adultos: [{ nombre: 'Héctor' }], ninos: [] },
    menuAcompanantes: [{ entrada: 'e2', plato: 'p2', postre: 'd1' }], // le falta la bebida
  }

  it('señala a la persona concreta que tiene algo pendiente', () => {
    const faltan = personasIncompletas(grupoIncompleto, config)
    expect(faltan.map((p) => p.nombre)).toEqual(['Héctor'])
  })

  it('un bebé nunca aparece como incompleto', () => {
    const inv = { nombre: 'Bruno', categoria: 'Bebé', confirmacion: 'Si' }
    expect(personasIncompletas(inv, config)).toEqual([])
    expect(faltaElegir(inv, config)).toBe(false)
  })

  it('solo aplica a quien ya confirmó que sí', () => {
    expect(faltaElegir({ ...grupoIncompleto, confirmacion: 'Pendiente' }, config)).toBe(false)
    expect(faltaElegir({ ...grupoIncompleto, confirmacion: 'No' }, config)).toBe(false)
    expect(faltaElegir(grupoIncompleto, config)).toBe(true)
  })

  it('sin menú configurado no falta nada por elegir', () => {
    expect(faltaElegir(grupoIncompleto, CONFIG_VACIA)).toBe(false)
  })
})

describe('resumenMenu — el conteo que se le entrega al banquete', () => {
  const invitados = [
    {
      nombre: 'Patricia',
      categoria: 'Adulto',
      confirmacion: 'Si',
      menu: { entrada: 'e1', plato: 'p1', postre: 'd1', bebida: 'b1' },
      acompanantes: { adultos: [{ nombre: 'Héctor' }], ninos: [{ nombre: 'Sofía' }] },
      menuAcompanantes: [
        { entrada: 'e2', plato: 'p2', postre: 'd1', bebida: 'b1' },
        { plato: 'pn', postre: 'dn', bebida: 'b2' },
      ],
    },
    // Confirmó pero no ha elegido nada: son los cuatro faltantes.
    { nombre: 'Esteban', categoria: 'Adulto', confirmacion: 'Si' },
    // Dijo que no: no come, aunque tenga menú guardado de antes.
    {
      nombre: 'Lucía',
      categoria: 'Adulto',
      confirmacion: 'No',
      menu: { entrada: 'e1', plato: 'p1', postre: 'd1', bebida: 'b1' },
    },
    // Pendiente: tampoco cuenta.
    { nombre: 'Valentina', categoria: 'Adulto', confirmacion: 'Pendiente' },
    { nombre: 'Bruno', categoria: 'Bebé', confirmacion: 'Si' },
  ]

  const r = resumenMenu(invitados, config)

  it('cuenta solo a quienes confirmaron que sí', () => {
    expect(porId(r.entrada)).toEqual({ e1: 1, e2: 1 })
    expect(porId(r.plato)).toEqual({ p1: 1, p2: 1, pn: 1 })
    expect(porId(r.bebida)).toEqual({ b1: 2, b2: 1 })
  })

  it('mezcla las opciones de adulto y de niño en el mismo curso', () => {
    expect(porId(r.postre)).toEqual({ d1: 2, dn: 1 })
  })

  it('ordena de más pedido a menos', () => {
    expect(r.postre.map((f) => f.id)).toEqual(['d1', 'dn'])
    expect(r.bebida[0]).toMatchObject({ id: 'b1', n: 2, nombre: 'Vino tinto' })
  })

  it('resuelve el nombre legible de cada opción', () => {
    expect(r.plato.find((f) => f.id === 'pn').nombre).toBe('Nuggets')
  })

  it('cuenta los bebés aparte y sin menú', () => {
    expect(r.bebes).toBe(1)
  })

  it('cuenta como faltante a quien confirmó y no eligió', () => {
    expect(r.faltantes).toEqual({ entrada: 1, plato: 1, postre: 1, bebida: 1 })
  })

  it('no cuenta como faltante un curso que a esa persona no se le pregunta', () => {
    // Sofía es niña y no hay entrada infantil: su entrada no falta, no existe.
    // Si esto se rompiera, el panel pediría perseguir a alguien que ya está listo.
    expect(r.faltantes.entrada).toBe(1) // solo Esteban
  })

  it('con la lista vacía devuelve ceros y no revienta', () => {
    const vacio = resumenMenu([], config)
    expect(vacio.bebes).toBe(0)
    expect(vacio.faltantes).toEqual({ entrada: 0, plato: 0, postre: 0, bebida: 0 })
    expect(vacio.plato).toEqual([])
  })
})
