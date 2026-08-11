import { CURSOS, opcionesPara, personasDelGrupo } from '../lib/menu.js'

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
            onClick={() => onCambio(o.id)}
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
 * Selección de entrada, plato fuerte y bebida para cada persona del grupo.
 *
 * `elecciones` está indexado por el `indice` de cada persona (-1 el titular),
 * y `onCambio(indice, curso, valor)` lo actualiza.
 * `incompletas` marca en rojo a quien le falte algo tras intentar enviar.
 */
export default function SelectorMenu({
  invitado,
  config,
  elecciones,
  onCambio,
  incompletas = [],
}) {
  const personas = personasDelGrupo(invitado)
  const marcados = new Set(incompletas.map((p) => p.indice))

  return (
    <div className="space-y-4">
      {personas.map((persona) => {
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

        const cursosVisibles = CURSOS.filter(
          (c) => opcionesPara(c.clave, persona.tipo, config).length > 0
        )
        if (cursosVisibles.length === 0) return null

        const eleccion = elecciones[persona.indice] || {}
        const incompleta = marcados.has(persona.indice)

        return (
          <div
            key={persona.indice}
            className={`rounded-2xl border p-4 ${
              incompleta ? 'border-red-400 bg-red-50/50' : 'border-arena'
            }`}
          >
            <p className="font-medium">
              {persona.nombre}
              {persona.tipo === 'nino' && (
                <span className="ml-2 rounded-full bg-oro/15 px-2 py-0.5 text-xs text-oro">
                  menú infantil
                </span>
              )}
            </p>

            {cursosVisibles.map((curso) => (
              <div key={curso.clave} className="mt-4">
                <p className="mb-2 text-sm text-carbon/60">
                  {curso.etiqueta}
                  {!eleccion[curso.clave] && <span className="ml-1 text-red-600">*</span>}
                </p>
                <Opciones
                  opciones={opcionesPara(curso.clave, persona.tipo, config)}
                  valor={eleccion[curso.clave] || ''}
                  onCambio={(v) => onCambio(persona.indice, curso.clave, v)}
                  etiquetaGrupo={`${curso.etiqueta} de ${persona.nombre}`}
                />
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
