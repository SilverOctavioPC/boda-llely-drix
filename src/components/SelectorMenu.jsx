import { personasDelGrupo, platosPara } from '../lib/menu.js'

/** Botones de opción; más cómodos que un desplegable en el celular. */
function Opciones({ opciones, valor, onCambio, etiquetaGrupo }) {
  return (
    <div role="radiogroup" aria-label={etiquetaGrupo} className="grid gap-2">
      {opciones.map((o) => {
        const elegida = valor === o.id
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={elegida}
            // Volver a tocar la opción elegida la desmarca: elegir es opcional.
            onClick={() => onCambio(elegida ? '' : o.id)}
            className={`rounded-xl border px-4 py-3 text-left text-sm transition active:scale-[.99] ${
              elegida
                ? 'border-salvia bg-salvia text-white'
                : 'border-arena bg-white text-carbon hover:bg-arena/40'
            }`}
          >
            {o.nombre}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Selección de plato y bebida para cada persona del grupo.
 *
 * `elecciones` es un objeto indexado por el `indice` de cada persona
 * (-1 para el titular), y `onCambio(indice, campo, valor)` lo actualiza.
 */
export default function SelectorMenu({ invitado, config, elecciones, onCambio }) {
  const personas = personasDelGrupo(invitado)
  const hayBebidas = config.bebidas.length > 0

  return (
    <div className="space-y-4">
      {personas.map((persona) => {
        const platos = platosPara(persona.tipo, config)

        // Los bebés no comen ni beben del banquete.
        if (persona.tipo === 'bebe') {
          return (
            <div key={persona.indice} className="rounded-2xl border border-arena p-4">
              <p className="font-medium">{persona.nombre}</p>
              <p className="mt-1 text-sm text-carbon/50">
                Al ser bebé, no necesita elegir menú.
              </p>
            </div>
          )
        }

        if (platos.length === 0 && !hayBebidas) return null

        const eleccion = elecciones[persona.indice] || { plato: '', bebida: '' }

        return (
          <div key={persona.indice} className="rounded-2xl border border-arena p-4">
            <p className="font-medium">
              {persona.nombre}
              {persona.tipo === 'nino' && (
                <span className="ml-2 rounded-full bg-oro/15 px-2 py-0.5 text-xs text-oro">
                  menú infantil
                </span>
              )}
            </p>

            {platos.length > 0 && (
              <div className="mt-3">
                <p className="mb-2 text-sm text-carbon/60">Plato</p>
                <Opciones
                  opciones={platos}
                  valor={eleccion.plato}
                  onCambio={(v) => onCambio(persona.indice, 'plato', v)}
                  etiquetaGrupo={`Plato de ${persona.nombre}`}
                />
              </div>
            )}

            {hayBebidas && (
              <div className="mt-4">
                <p className="mb-2 text-sm text-carbon/60">Bebida</p>
                <Opciones
                  opciones={config.bebidas}
                  valor={eleccion.bebida}
                  onCambio={(v) => onCambio(persona.indice, 'bebida', v)}
                  etiquetaGrupo={`Bebida de ${persona.nombre}`}
                />
              </div>
            )}
          </div>
        )
      })}

      <p className="text-center text-xs text-carbon/50">
        Puedes confirmar sin elegir y decírnoslo después. Toca de nuevo una
        opción para desmarcarla.
      </p>
    </div>
  )
}
