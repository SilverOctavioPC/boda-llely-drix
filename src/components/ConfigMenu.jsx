import { useState } from 'react'
import { nuevoId } from '../lib/menu.js'

/** Lista editable de opciones (platos o bebidas). */
function EditorLista({ titulo, ayuda, opciones, onCambio }) {
  function agregar() {
    onCambio([...opciones, { id: nuevoId(), nombre: '' }])
  }

  function renombrar(id, nombre) {
    onCambio(opciones.map((o) => (o.id === id ? { ...o, nombre } : o)))
  }

  function quitar(id) {
    onCambio(opciones.filter((o) => o.id !== id))
  }

  return (
    <fieldset className="rounded-2xl border border-arena p-4">
      <legend className="px-2 text-sm font-medium">{titulo}</legend>
      {ayuda && <p className="mb-3 text-xs text-carbon/50">{ayuda}</p>}

      <div className="space-y-2">
        {opciones.map((o, i) => (
          <div key={o.id} className="flex items-center gap-2">
            <input
              value={o.nombre}
              onChange={(e) => renombrar(o.id, e.target.value)}
              maxLength={80}
              className="campo py-2"
              placeholder={`Opción ${i + 1}`}
              aria-label={`${titulo}, opción ${i + 1}`}
            />
            <button
              type="button"
              onClick={() => quitar(o.id)}
              className="shrink-0 rounded-xl px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              aria-label={`Quitar ${o.nombre || `opción ${i + 1}`}`}
            >
              Quitar
            </button>
          </div>
        ))}

        {opciones.length === 0 && (
          <p className="py-2 text-sm text-carbon/40">Sin opciones todavía.</p>
        )}
      </div>

      <button type="button" onClick={agregar} className="btn-secundario mt-3 w-full py-2 text-sm">
        + Agregar opción
      </button>
    </fieldset>
  )
}

export default function ConfigMenu({ config, onGuardar, onCancelar, guardando }) {
  const [platos, setPlatos] = useState(config.platos)
  const [platosNinos, setPlatosNinos] = useState(config.platosNinos)
  const [bebidas, setBebidas] = useState(config.bebidas)
  const [error, setError] = useState('')

  function enviar(e) {
    e.preventDefault()

    // Descartamos las opciones que quedaron sin nombre, en vez de guardarlas
    // vacías y que el invitado vea un botón en blanco.
    const limpiar = (lista) =>
      lista
        .map((o) => ({ id: o.id, nombre: o.nombre.trim() }))
        .filter((o) => o.nombre.length > 0)

    const datos = {
      platos: limpiar(platos),
      platosNinos: limpiar(platosNinos),
      bebidas: limpiar(bebidas),
    }

    const nombres = [...datos.platos, ...datos.platosNinos, ...datos.bebidas].map((o) =>
      o.nombre.toLowerCase()
    )
    if (new Set(nombres).size !== nombres.length) {
      setError('Hay dos opciones con el mismo nombre. Los invitados no podrían distinguirlas.')
      return
    }

    setError('')
    onGuardar(datos)
  }

  return (
    <form onSubmit={enviar}>
      <p className="mb-4 text-sm text-carbon/60">
        Lo que configures aquí es lo que verán los invitados al confirmar. Si
        dejas una lista vacía, esa pregunta no se les hace.
      </p>

      <div className="space-y-4">
        <EditorLista
          titulo="Platos de adulto"
          opciones={platos}
          onCambio={setPlatos}
        />
        <EditorLista
          titulo="Platos infantiles"
          ayuda="Se muestran solo a quien esté marcado como Niño. Los bebés no eligen."
          opciones={platosNinos}
          onCambio={setPlatosNinos}
        />
        <EditorLista titulo="Bebidas" opciones={bebidas} onCambio={setBebidas} />
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <p className="mt-4 rounded-xl bg-arena/50 px-4 py-3 text-xs text-carbon/60">
        Si borras una opción que alguien ya había elegido, su elección queda
        marcada como <em>“opción eliminada”</em> en el panel. Tendrás que
        preguntarle de nuevo.
      </p>

      <div className="mt-6 flex gap-3">
        <button type="button" onClick={onCancelar} className="btn-secundario flex-1">
          Cancelar
        </button>
        <button type="submit" disabled={guardando} className="btn-primario flex-1">
          {guardando ? 'Guardando…' : 'Guardar menú'}
        </button>
      </div>
    </form>
  )
}
