import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { CORREO_ESCANER, CORREO_NOVIOS, CORREOS_STAFF } from './roles.js'

/**
 * Guardas sobre firestore.rules.
 *
 * Esto NO sustituye a probar las reglas contra Firestore: es un cortafuegos
 * barato contra los cambios que abrirían un agujero sin que nadie lo note al
 * revisar un diff. Lee el archivo como texto a propósito — no hay intérprete
 * de reglas aquí.
 *
 * Recuerda que editar firestore.rules no cambia nada hasta republicarlo:
 *   npx firebase-tools deploy --only firestore:rules
 */
const reglas = readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8')

/** El archivo sin comentarios: lo que de verdad evalúa Firestore. */
const codigo = reglas.replace(/\/\/.*$/gm, '')

describe('los correos del staff están sincronizados con roles.js', () => {
  const correosEnReglas = [...codigo.matchAll(/'([^']*@[^']*)'/g)].map((m) => m[1])

  it('las reglas no mencionan ningún correo fuera de la lista blanca', () => {
    // El rol se decide por correo en dos sitios acoplados a propósito: roles.js
    // (lo que ve el navegador) y firestore.rules (quien manda de verdad).
    // Cambiar uno solo deja una cuenta con permisos que la interfaz no refleja.
    expect(correosEnReglas.length).toBeGreaterThan(0)
    for (const correo of correosEnReglas) expect(CORREOS_STAFF).toContain(correo)
  })

  it('los dos correos aparecen en las reglas', () => {
    // Si alguien renombra una cuenta en roles.js y olvida las reglas, esa cuenta
    // se queda sin permisos —o peor, el correo viejo los conserva.
    expect(correosEnReglas).toContain(CORREO_NOVIOS)
    expect(correosEnReglas).toContain(CORREO_ESCANER)
  })

  it('son cuentas distintas', () => {
    expect(CORREO_NOVIOS).not.toBe(CORREO_ESCANER)
  })
})

describe('solo las dos cuentas conocidas tienen permisos', () => {
  it('esNovios exige el correo exacto, no "cualquiera que no sea el escáner"', () => {
    // Esta era la versión anterior: `esStaff() && !esEscaner()`. Con ella,
    // cualquier cuenta que llegara a existir en el proyecto —creada por error o
    // por alguien más— tenía control total sobre la lista de invitados.
    const bloque = codigo.match(/function esNovios\(\)[\s\S]*?\n {6}\}/)[0]
    expect(bloque).toMatch(/token\.email ==/)
    expect(bloque).not.toMatch(/!esEscaner\(\)/)
  })

  it('esStaff son exactamente esas dos y ninguna más', () => {
    const bloque = codigo.match(/function esStaff\(\)[\s\S]*?\n {6}\}/)[0]
    expect(bloque).toMatch(/esNovios\(\)\s*\|\|\s*esEscaner\(\)/)
    // `request.auth != null` a secas volvería a abrir la puerta a cualquiera.
    expect(bloque).not.toMatch(/request\.auth != null/)
  })
})

describe('la lista de invitados no es pública', () => {
  it('`allow list` exige sesión', () => {
    // Sin esto, el `allow get: if true` que necesita el invitado para abrir su
    // link permitiría descargar la colección entera: la lista de invitados.
    expect(codigo).toMatch(/allow list:\s*if\s+esStaff\(\)/)
    expect(codigo).not.toMatch(/allow list:\s*if\s+true/)
  })

  it('nada más queda abierto de par en par', () => {
    const abiertos = [...codigo.matchAll(/allow\s+([a-z, ]+):\s*if\s+true\s*;/g)].map((m) =>
      m[1].trim()
    )
    // Solo dos lecturas puntuales por ID: el invitado y el menú del banquete.
    expect(abiertos).toEqual(['get', 'get'])
  })

  it('el resto de la base está cerrado', () => {
    expect(codigo).toMatch(/match \/\{document=\*\*\}[\s\S]*allow read, write: if false;/)
  })
})

describe('el invitado solo puede escribir sus propios campos', () => {
  const permitidos = [
    'confirmacion',
    'restricciones',
    'mensaje',
    'fechaConfirmacion',
    'menu',
    'menuAcompanantes',
  ]

  it('la lista blanca son exactamente esos seis campos', () => {
    // Añadir uno aquí es dar permiso de escritura pública sobre él. Si este
    // test falla al añadir una pregunta nueva al formulario, es la señal de
    // que hay que republicar las reglas.
    const bloque = codigo.match(/function soloCamposDeConfirmacion\(\)[\s\S]*?\}/)[0]
    const campos = [...bloque.matchAll(/'([^']+)'/g)].map((m) => m[1])
    expect(campos.sort()).toEqual([...permitidos].sort())
  })

  it('ni el nombre ni el registro de acceso son escribibles por el público', () => {
    expect(permitidos).not.toContain('nombre')
    expect(permitidos).not.toContain('acompanantes')
    expect(permitidos).not.toContain('entradaRegistrada')
  })

  it('no puede regalarse lugares de más', () => {
    // menuValido() es lo que impide que alguien edite su link para mandar una
    // lista de menús más larga que sus acompañantes reales.
    expect(codigo).toMatch(/ma\.size\(\)\s*<=\s*numAcompanantes\(\)/)
    expect(codigo).toMatch(/confirmacionValida\(\)[\s\S]*menuValido\(\)/)
  })
})

describe('la cuenta de la puerta tiene el mínimo privilegio', () => {
  it('solo puede tocar el registro de acceso', () => {
    const bloque = codigo.match(/function soloRegistroDeAcceso\(\)[\s\S]*?\}/)[0]
    const campos = [...bloque.matchAll(/'([^']+)'/g)].map((m) => m[1])
    expect(campos.sort()).toEqual(['entradaRegistrada', 'fechaEntrada'])
  })

  it('no puede crear ni borrar invitados', () => {
    expect(codigo).toMatch(/allow create:\s*if\s+esNovios\(\)/)
    expect(codigo).toMatch(/allow delete:\s*if\s+esNovios\(\)/)
  })

  it('no puede cambiar el menú del banquete', () => {
    // Escribir el menú es exclusivo de los novios. Se comprueba con el correo
    // exacto y no con un "!= escáner": así una cuenta de más tampoco podría.
    const bloque = codigo.match(/match \/configuracion\/\{[\s\S]*?\n {4}\}/)[0]
    expect(bloque).toMatch(new RegExp(`allow write:[\\s\\S]*==\\s*'${CORREO_NOVIOS}'`))
    // Ojo: `request.auth != null` también lleva "!=", así que se busca
    // concretamente una comparación de CORREO por desigualdad.
    expect(bloque).not.toMatch(/email\s*!=/)
  })

  it('sí puede leer la lista del menú, para mostrarla en la puerta', () => {
    const bloque = codigo.match(/match \/configuracion\/\{[\s\S]*?\n {4}\}/)[0]
    expect(bloque).toMatch(new RegExp(`allow list:[\\s\\S]*${CORREO_ESCANER}`))
  })
})

describe('los valores cerrados siguen cerrados', () => {
  it('grupo y categoría solo aceptan lo previsto', () => {
    expect(codigo).toMatch(/d\.grupo in \['Llely', 'Drix'\]/)
    expect(codigo).toMatch(/d\.categoria in \['Adulto', 'Niño', 'Bebé'\]/)
    expect(codigo).toMatch(/d\.confirmacion in \['Si', 'No', 'Pendiente'\]/)
  })

  it('el invitado solo puede confirmar Sí o No, nunca volver a Pendiente', () => {
    const bloque = codigo.match(/function confirmacionValida\(\)[\s\S]*?\n {6}\}/)[0]
    expect(bloque).toMatch(/d\.confirmacion in \['Si', 'No'\]/)
  })
})
