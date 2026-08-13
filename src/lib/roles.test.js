import { describe, it, expect } from 'vitest'
import { CORREO_ESCANER, esEscaner, inicioDe } from './roles.js'

describe('esEscaner', () => {
  it('reconoce la cuenta de la puerta', () => {
    expect(esEscaner({ email: CORREO_ESCANER })).toBe(true)
  })

  it('no depende de mayúsculas ni de espacios sobrantes', () => {
    // Firebase devuelve el correo tal como se tecleó al crear la cuenta.
    expect(esEscaner({ email: CORREO_ESCANER.toUpperCase() })).toBe(true)
    expect(esEscaner({ email: `  ${CORREO_ESCANER}  ` })).toBe(true)
  })

  it('cualquier otra cuenta son los novios', () => {
    expect(esEscaner({ email: 'novios@bodallelydrix.com' })).toBe(false)
  })

  it('no se rompe sin sesión ni sin correo', () => {
    expect(esEscaner(null)).toBe(false)
    expect(esEscaner(undefined)).toBe(false)
    expect(esEscaner({})).toBe(false)
  })

  it('no acepta un correo que solo se le parezca', () => {
    // Salvaguarda contra comparaciones laxas: quien no es exactamente esa
    // cuenta cae en el perfil de novios, así que un falso positivo aquí sería
    // al revés de lo esperado — encerraría a los novios en el escáner.
    expect(esEscaner({ email: 'escaner@bodallelydrix.com.attacker.test' })).toBe(false)
    expect(esEscaner({ email: 'otro-escaner@bodallelydrix.com' })).toBe(false)
  })
})

describe('inicioDe', () => {
  it('manda a la puerta directa al escáner', () => {
    expect(inicioDe({ email: CORREO_ESCANER })).toBe('/admin/scanner')
  })

  it('manda a los novios al panel', () => {
    expect(inicioDe({ email: 'novios@bodallelydrix.com' })).toBe('/admin')
  })
})
