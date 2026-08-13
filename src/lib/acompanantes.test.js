import { describe, it, expect } from 'vitest'
import {
  leerAcompanantes,
  totalPersonas,
  resumenAcompanantes,
  nombresAcompanantes,
  desglosePorCategoria,
} from './acompanantes.js'

describe('leerAcompanantes — formatos que conviven en Firestore', () => {
  it('sin el campo devuelve dos listas vacías', () => {
    expect(leerAcompanantes({})).toEqual({ adultos: [], ninos: [] })
    expect(leerAcompanantes(undefined)).toEqual({ adultos: [], ninos: [] })
  })

  it('acepta la forma 1: array vacío de la migración inicial', () => {
    expect(leerAcompanantes({ acompanantes: [] })).toEqual({ adultos: [], ninos: [] })
  })

  it('acepta la forma 2: `adultos` como número, y lo expande a personas sin datos', () => {
    const { adultos, ninos } = leerAcompanantes({ acompanantes: { adultos: 2, ninos: [] } })
    expect(adultos).toEqual([
      { nombre: null, sexo: null },
      { nombre: null, sexo: null },
    ])
    expect(ninos).toEqual([])
  })

  it('acepta la forma actual: dos arrays de personas', () => {
    const datos = {
      acompanantes: {
        adultos: [{ nombre: 'Ana López', sexo: 'Mujer' }],
        ninos: [{ nombre: 'Leo', sexo: 'Hombre', edad: '6 años' }],
      },
    }
    expect(leerAcompanantes(datos).adultos).toHaveLength(1)
    expect(leerAcompanantes(datos).ninos[0].nombre).toBe('Leo')
  })

  it('no se rompe con basura en los campos', () => {
    expect(leerAcompanantes({ acompanantes: { adultos: 'dos', ninos: null } })).toEqual({
      adultos: [],
      ninos: [],
    })
    expect(leerAcompanantes({ acompanantes: { adultos: -3, ninos: [] } }).adultos).toEqual([])
  })
})

describe('totalPersonas', () => {
  it('cuenta al titular aunque vaya solo', () => {
    expect(totalPersonas({ nombre: 'Camila' })).toBe(1)
  })

  it('suma titular + acompañantes', () => {
    const inv = {
      acompanantes: { adultos: [{ nombre: 'Héctor' }], ninos: [{ nombre: 'Sofía' }, {}] },
    }
    expect(totalPersonas(inv)).toBe(4)
  })
})

describe('resumenAcompanantes', () => {
  it('devuelve cadena vacía si va solo', () => {
    expect(resumenAcompanantes({})).toBe('')
  })

  it('usa singular y plural correctamente', () => {
    expect(resumenAcompanantes({ acompanantes: { adultos: [{}], ninos: [] } })).toBe('1 adulto')
    expect(resumenAcompanantes({ acompanantes: { adultos: [{}, {}], ninos: [{}] } })).toBe(
      '2 adultos · 1 niño'
    )
    expect(resumenAcompanantes({ acompanantes: { adultos: [], ninos: [{}, {}] } })).toBe('2 niños')
  })
})

describe('nombresAcompanantes — lo que ve el personal en la puerta', () => {
  it('muestra los nombres que sí se conocen', () => {
    const inv = {
      acompanantes: {
        adultos: [{ nombre: 'Héctor Alcázar' }],
        ninos: [{ nombre: 'Sofía', edad: '7 años' }],
      },
    }
    expect(nombresAcompanantes(inv)).toEqual(['Héctor Alcázar', 'Sofía (7 años)'])
  })

  it('pone marcadores genéricos cuando no hay nombre', () => {
    const inv = {
      acompanantes: {
        adultos: [{}, { nombre: '   ' }],
        ninos: [{ edad: '4 años' }, {}],
      },
    }
    expect(nombresAcompanantes(inv)).toEqual([
      'Acompañante',
      'Acompañante',
      'Niño (4 años)',
      'Niño',
    ])
  })
})

describe('desglosePorCategoria — el número que se le pasa al salón', () => {
  it('clasifica al titular según su categoría', () => {
    expect(desglosePorCategoria({ categoria: 'Adulto' })).toEqual({
      adultos: 1,
      ninos: 0,
      bebes: 0,
    })
    expect(desglosePorCategoria({ categoria: 'Niño' })).toEqual({ adultos: 0, ninos: 1, bebes: 0 })
    expect(desglosePorCategoria({ categoria: 'Bebé' })).toEqual({ adultos: 0, ninos: 0, bebes: 1 })
  })

  it('sin categoría lo cuenta como adulto', () => {
    expect(desglosePorCategoria({})).toEqual({ adultos: 1, ninos: 0, bebes: 0 })
  })

  it('suma los acompañantes al bloque que les toca', () => {
    const inv = {
      categoria: 'Adulto',
      acompanantes: { adultos: [{}], ninos: [{}, {}] },
    }
    expect(desglosePorCategoria(inv)).toEqual({ adultos: 2, ninos: 2, bebes: 0 })
  })

  it('un titular niño con acompañantes adultos no se cuenta como adulto', () => {
    const inv = { categoria: 'Niño', acompanantes: { adultos: [{}, {}], ninos: [] } }
    expect(desglosePorCategoria(inv)).toEqual({ adultos: 2, ninos: 1, bebes: 0 })
  })
})
