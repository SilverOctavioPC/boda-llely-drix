import { CURSOS, eleccionCompleta, opcionesPara } from '../lib/menu.js'
import { MenuDePersona } from './SelectorMenu.jsx'

/** Puntitos de progreso: verde lo ya elegido, oscuro el paso actual. */
function Progreso({ personas, actual, elecciones, config }) {
  return (
    <div className="flex items-center justify-center gap-1.5" aria-hidden="true">
      {personas.map((p, i) => {
        const completa = eleccionCompleta(p, elecciones[p.indice], config)
        return (
          <span
            key={p.indice}
            className={`h-2 rounded-full transition-all ${
              i === actual ? 'w-6 bg-carbon' : completa ? 'w-2 bg-salvia' : 'w-2 bg-arena'
            }`}
          />
        )
      })}
    </div>
  )
}

/**
 * Selección del menú, una persona por pantalla.
 *
 * Con un grupo de 4 y cuatro tiempos, mostrarlo todo junto son varias
 * pantallas de scroll. Así cada paso cabe de un vistazo en el celular.
 */
export default function AsistenteMenu({
  personas,
  paso,
  config,
  elecciones,
  onCambio,
  onAplicarATodos,
  onPaso,
  error,
}) {
  const persona = personas[paso]
  if (!persona) return null

  const eleccion = elecciones[persona.indice] || {}
  const completa = eleccionCompleta(persona, eleccion, config)
  const esUltima = paso === personas.length - 1

  // "Lo mismo para todos" solo tiene sentido desde el primero, cuando ya
  // eligió algo y hay más gente a la que copiárselo.
  const puedeCopiar = paso === 0 && personas.length > 1 && CURSOS.some((c) => eleccion[c.clave])

  return (
    <div>
      <Progreso personas={personas} actual={paso} elecciones={elecciones} config={config} />

      <p className="mt-3 text-center text-xs uppercase tracking-wide text-carbon/40">
        Persona {paso + 1} de {personas.length}
      </p>

      <div className="mt-2 rounded-2xl border border-arena p-4">
        <p className="text-center font-titulo text-xl">
          {persona.nombre}
          {persona.tipo === 'nino' && (
            <span className="ml-2 align-middle rounded-full bg-oro/15 px-2 py-0.5 text-xs text-oro">
              menú infantil
            </span>
          )}
        </p>

        <div className="mt-4">
          <MenuDePersona
            persona={persona}
            config={config}
            eleccion={eleccion}
            onCambio={(curso, valor) => onCambio(persona.indice, curso, valor)}
            mostrarNombre={false}
            conMarco={false}
          />
        </div>

        {puedeCopiar && (
          <button
            type="button"
            onClick={onAplicarATodos}
            className="btn-secundario mt-4 w-full py-2 text-sm"
          >
            Lo mismo para los demás
          </button>
        )}
      </div>

      {error && <p className="mt-3 text-center text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex gap-3">
        {paso > 0 && (
          <button type="button" onClick={() => onPaso(paso - 1)} className="btn-secundario flex-1">
            ← Atrás
          </button>
        )}
        <button
          type="button"
          onClick={() => onPaso(paso + 1)}
          disabled={!completa}
          className="btn-primario flex-1"
        >
          {esUltima ? 'Continuar' : 'Siguiente →'}
        </button>
      </div>

      {!completa && (
        <p className="mt-2 text-center text-xs text-carbon/50">
          Elige{' '}
          {CURSOS.filter(
            (c) => opcionesPara(c.clave, persona.tipo, config).length > 0 && !eleccion[c.clave]
          )
            .map((c) => c.etiqueta.toLowerCase())
            .join(' y ')}{' '}
          para continuar.
        </p>
      )}
    </div>
  )
}
