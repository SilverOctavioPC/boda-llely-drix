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
 * El menú de UNA persona. Es la pieza que comparten el asistente paso a paso
 * de la página del invitado y la vista completa del panel.
 */
export function MenuDePersona({
  persona,
  config,
  eleccion = {},
  onCambio,
  incompleta = false,
  mostrarNombre = true,
  conMarco = true,
}) {
  const cursos = CURSOS.filter((c) => opcionesPara(c.clave, persona.tipo, config).length > 0)
  if (cursos.length === 0) return null

  const marco = conMarco
    ? `rounded-2xl border p-4 ${incompleta ? 'border-red-400 bg-red-50/50' : 'border-arena'}`
    : ''

  return (
    <div className={marco}>
      {mostrarNombre && (
        <p className="font-medium">
          {persona.nombre}
          {persona.tipo === 'nino' && (
            <span className="ml-2 rounded-full bg-oro/15 px-2 py-0.5 text-xs text-oro">
              menú infantil
            </span>
          )}
        </p>
      )}

      {cursos.map((curso) => (
        <div key={curso.clave} className={mostrarNombre ? 'mt-4' : 'mt-4 first:mt-0'}>
          <p className="mb-2 text-sm text-carbon/60">
            {curso.etiqueta}
            {!eleccion[curso.clave] && <span className="ml-1 text-red-600">*</span>}
          </p>
          <Opciones
            opciones={opcionesPara(curso.clave, persona.tipo, config)}
            valor={eleccion[curso.clave] || ''}
            onCambio={(v) => onCambio(curso.clave, v)}
            etiquetaGrupo={`${curso.etiqueta} de ${persona.nombre}`}
          />
        </div>
      ))}
    </div>
  )
}

/**
 * Todas las personas del grupo de una vez. Lo usa el panel, donde los novios
 * quieren ver y ajustar el grupo completo sin navegar.
 */
export default function SelectorMenu({
  invitado,
  config,
  elecciones,
  onCambio,
  incompletas = [],
}) {
  const marcados = new Set(incompletas.map((p) => p.indice))

  return (
    <div className="space-y-4">
      {personasDelGrupo(invitado).map((persona) => {
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

        return (
          <MenuDePersona
            key={persona.indice}
            persona={persona}
            config={config}
            eleccion={elecciones[persona.indice]}
            onCambio={(curso, valor) => onCambio(persona.indice, curso, valor)}
            incompleta={marcados.has(persona.indice)}
          />
        )
      })}
    </div>
  )
}
