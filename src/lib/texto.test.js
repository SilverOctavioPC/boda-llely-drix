import { describe, it, expect } from 'vitest'
import { normalizar } from './texto.js'

describe('normalizar — buscar en la puerta con prisa', () => {
  it('quita los acentos', () => {
    expect(normalizar('Ordóñez')).toBe('ordonez')
    expect(normalizar('Lucía')).toBe('lucia')
    expect(normalizar('TOÑITA')).toBe('tonita')
  })

  it('hace que la forma con acento y sin acento se encuentren entre sí', () => {
    // Los nombres del Excel vienen con acentuación irregular.
    expect(normalizar('Lucía')).toBe(normalizar('Lucia'))
    expect(normalizar('Joaquín Pérez')).toBe(normalizar('JOAQUIN PEREZ'))
  })

  it('colapsa los espacios repetidos del Excel', () => {
    // Hay nombres como "JAVIER  C." con doble espacio; nadie teclea dos.
    expect(normalizar('JAVIER  C.')).toBe('javier c')
    expect(normalizar('  Ana   López  ')).toBe('ana lopez')
  })

  it('descarta signos de puntuación', () => {
    expect(normalizar('Tania / amiga')).toBe('tania amiga')
    expect(normalizar('Karen Flores +1')).toBe('karen flores 1')
  })

  it('conserva los dígitos', () => {
    expect(normalizar('Mesa 12')).toBe('mesa 12')
  })

  it('devuelve cadena vacía con valores ausentes', () => {
    expect(normalizar(null)).toBe('')
    expect(normalizar(undefined)).toBe('')
    expect(normalizar('')).toBe('')
  })

  it('acepta valores que no son texto', () => {
    expect(normalizar(42)).toBe('42')
  })
})
