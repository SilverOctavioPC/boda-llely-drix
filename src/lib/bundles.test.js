import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'

/**
 * Guarda de la separación de bundles.
 *
 * La página de RSVP se abre desde WhatsApp con datos móviles y es la única que
 * ven los ciento y pico invitados. Todo lo que entre en su bundle lo paga cada
 * uno de ellos. Por eso el SDK de Auth y el escáner viven en chunks aparte.
 *
 * El problema es que esa separación se rompe con UN import distraído —basta
 * que algo de la ruta pública importe `auth.js`— y el fallo es silencioso: la
 * página sigue funcionando, solo que pesa el doble. Hasta ahora solo se
 * detectaba mirando la salida de `npm run build` con atención.
 *
 * Este test recorre el grafo de imports ESTÁTICOS desde `main.jsx` y falla si
 * alcanza algo que debería quedarse fuera. Los `import()` dinámicos de
 * `lazy()` no cuentan: son precisamente el mecanismo que hace la separación.
 */

const RAIZ = resolve(import.meta.dirname, '..', '..')
const ENTRADA = 'src/main.jsx'

/** Lo que la página pública NO puede alcanzar, y por qué. */
const PROHIBIDOS = {
  'src/lib/auth.js': 'arrastra el SDK de Firebase Auth',
  'src/context/AuthContext.jsx': 'importa auth.js',
  'src/ZonaPrivada.jsx': 'debe cargarse con lazy()',
  'src/pages/Admin.jsx': 'es el panel entero',
  'src/pages/Login.jsx': 'vive en la zona privada',
  'src/pages/Scanner.jsx': 'arrastra html5-qrcode (~300 kB)',
}

/*
  Solo imports estáticos: `import x from './y'` e `import './y'`.

  `import\s` exige un espacio, así que no captura los `import('./x')`
  dinámicos —que van pegados al paréntesis— y son justo los que hacen el corte.
*/
const IMPORTS = /import\s(?:[^'"]*?from\s*)?['"]([^'"]+)['"]/g

/** Resuelve un import relativo a ruta del repo. Devuelve null si es un paquete. */
function resolverImport(desdeArchivo, especificador) {
  if (!especificador.startsWith('.')) return null
  const absoluto = resolve(RAIZ, dirname(desdeArchivo), especificador)
  return relative(RAIZ, absoluto).split('\\').join('/')
}

/** Recorre el grafo estático y devuelve todo lo alcanzable desde la entrada. */
function alcanzablesDesde(entrada) {
  const vistos = new Set()
  // Cada elemento guarda también por dónde se llegó, para poder señalar al
  // culpable en el mensaje de error en vez de decir solo "falla".
  const porVisitar = [{ archivo: entrada, camino: [entrada] }]
  const caminos = new Map()

  while (porVisitar.length > 0) {
    const { archivo, camino } = porVisitar.pop()
    if (vistos.has(archivo)) continue
    vistos.add(archivo)
    caminos.set(archivo, camino)

    let codigo
    try {
      codigo = readFileSync(join(RAIZ, archivo), 'utf8')
    } catch {
      // Un import que no resuelve a archivo real no es cosa de este test:
      // eso ya lo caza el build.
      continue
    }

    for (const [, especificador] of codigo.matchAll(IMPORTS)) {
      const destino = resolverImport(archivo, especificador)
      if (destino && !vistos.has(destino)) {
        porVisitar.push({ archivo: destino, camino: [...camino, destino] })
      }
    }
  }

  return caminos
}

describe('separación de bundles', () => {
  const alcanzables = alcanzablesDesde(ENTRADA)

  it('la entrada pública alcanza la página de RSVP', () => {
    // Si esto falla, el test de abajo pasaría por el motivo equivocado.
    expect([...alcanzables.keys()]).toContain('src/pages/Rsvp.jsx')
  })

  for (const [archivo, motivo] of Object.entries(PROHIBIDOS)) {
    it(`la página pública no importa ${archivo} — ${motivo}`, () => {
      const camino = alcanzables.get(archivo)
      expect(
        camino,
        camino && `Cadena de imports que lo mete en el bundle público:\n  ${camino.join('\n  → ')}`
      ).toBeUndefined()
    })
  }
})
