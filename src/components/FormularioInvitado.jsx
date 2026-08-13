import { useState } from 'react'
import { leerAcompanantes } from '../lib/acompanantes.js'

const SEXOS = ['Mujer', 'Hombre']
const CATEGORIAS = ['Adulto', 'Niño', 'Bebé']
const GRUPOS = ['Llely', 'Drix']
const CONFIRMACIONES = ['Pendiente', 'Si', 'No']

const MAX_ACOMPANANTES = 15

/** Contador con − y + , cómodo de tocar en el celular. */
function Contador({ id, valor, onCambio, min = 0, max = MAX_ACOMPANANTES }) {
  const boton =
    'flex h-11 w-11 items-center justify-center rounded-xl border border-arena ' +
    'text-xl leading-none transition active:scale-95 disabled:opacity-30'

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onCambio(Math.max(min, valor - 1))}
        disabled={valor <= min}
        className={boton}
        aria-label="Quitar uno"
        aria-controls={id}
      >
        −
      </button>
      <output id={id} className="w-10 text-center font-titulo text-2xl tabular-nums">
        {valor}
      </output>
      <button
        type="button"
        onClick={() => onCambio(Math.min(max, valor + 1))}
        disabled={valor >= max}
        className={boton}
        aria-label="Agregar uno"
        aria-controls={id}
      >
        +
      </button>
    </div>
  )
}

/**
 * Formulario de alta y edición de invitados.
 * `inicial` viene con datos al editar, o vacío al crear.
 */
export default function FormularioInvitado({ inicial, onGuardar, onCancelar, guardando }) {
  const editando = Boolean(inicial)
  const acomp = leerAcompanantes(inicial)

  const [nombre, setNombre] = useState(inicial?.nombre || '')
  const [grupo, setGrupo] = useState(inicial?.grupo || 'Llely')
  const [sexo, setSexo] = useState(inicial?.sexo || '')
  const [categoria, setCategoria] = useState(inicial?.categoria || 'Adulto')
  const [edad, setEdad] = useState(inicial?.edad || '')
  const [mesa, setMesa] = useState(inicial?.mesa || '')
  const [confirmacion, setConfirmacion] = useState(inicial?.confirmacion || 'Pendiente')

  const [adultos, setAdultos] = useState(acomp.adultos)
  const [ninos, setNinos] = useState(acomp.ninos)
  const [error, setError] = useState('')

  /**
   * Ajusta el número de acompañantes conservando los datos ya escritos:
   * bajar el contador y volver a subirlo no debe borrar los nombres previos.
   */
  function ajustarLista(setter, plantilla) {
    return (n) =>
      setter((previos) => {
        if (n <= previos.length) return previos.slice(0, n)
        const faltan = n - previos.length
        return [...previos, ...Array.from({ length: faltan }, plantilla)]
      })
  }

  const cambiarNumAdultos = ajustarLista(setAdultos, () => ({ nombre: '', sexo: '' }))
  const cambiarNumNinos = ajustarLista(setNinos, () => ({ nombre: '', sexo: '', edad: '' }))

  function editarAdulto(indice, campo, valor) {
    setAdultos((prev) => prev.map((p, i) => (i === indice ? { ...p, [campo]: valor } : p)))
  }

  function editarNino(indice, campo, valor) {
    setNinos((prev) => prev.map((p, i) => (i === indice ? { ...p, [campo]: valor } : p)))
  }

  const total = 1 + adultos.length + ninos.length

  function enviar(e) {
    e.preventDefault()
    const limpio = nombre.trim()
    if (!limpio) {
      setError('El nombre es obligatorio.')
      return
    }
    setError('')
    onGuardar({
      nombre: limpio,
      grupo,
      sexo: sexo || null,
      categoria,
      edad: edad.trim() || null,
      mesa: mesa.trim() || null,
      confirmacion,
      // Nombre, sexo y edad son opcionales: se puede sumar gente sin conocerlos.
      acompanantes: {
        adultos: adultos.map((p) => ({
          nombre: (p.nombre || '').trim() || null,
          sexo: p.sexo || null,
        })),
        ninos: ninos.map((p) => ({
          nombre: (p.nombre || '').trim() || null,
          sexo: p.sexo || null,
          edad: (p.edad || '').trim() || null,
        })),
      },
    })
  }

  return (
    <form onSubmit={enviar}>
      <label htmlFor="f-nombre" className="mb-2 block text-sm font-medium">
        Nombre <span className="text-red-600">*</span>
      </label>
      <input
        id="f-nombre"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        maxLength={120}
        autoFocus={!editando}
        className="campo"
        placeholder="Ej. María Fernanda López"
      />

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="f-grupo" className="mb-2 block text-sm font-medium">
            Lista
          </label>
          <select
            id="f-grupo"
            value={grupo}
            onChange={(e) => setGrupo(e.target.value)}
            className="campo"
          >
            {GRUPOS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="f-sexo" className="mb-2 block text-sm font-medium">
            Sexo
          </label>
          <select
            id="f-sexo"
            value={sexo}
            onChange={(e) => setSexo(e.target.value)}
            className="campo"
          >
            <option value="">Sin especificar</option>
            {SEXOS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/*
        Al dar de alta, el titular siempre es un adulto: los niños se suman
        abajo como acompañantes, que es como encaja en el modelo. El campo solo
        aparece al EDITAR, para poder corregir el caso raro en que un niño sí
        tenga que figurar como titular (por ejemplo, si le mandas el link a él).
      */}
      {editando && (
        <div className="mt-4">
          <label className="mb-2 block text-sm font-medium">Categoría</label>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIAS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategoria(c)}
                aria-pressed={categoria === c}
                className={`btn border py-2 text-sm ${
                  categoria === c
                    ? 'border-salvia bg-salvia text-white'
                    : 'border-arena bg-white text-carbon'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3">
        {/* La edad solo tiene sentido si no es un adulto. */}
        {editando && categoria !== 'Adulto' && (
          <div>
            <label htmlFor="f-edad" className="mb-2 block text-sm font-medium">
              Edad <span className="font-normal text-carbon/50">(opcional)</span>
            </label>
            <input
              id="f-edad"
              value={edad}
              onChange={(e) => setEdad(e.target.value)}
              maxLength={20}
              className="campo"
              placeholder="3 años"
            />
          </div>
        )}

        <div>
          <label htmlFor="f-mesa" className="mb-2 block text-sm font-medium">
            Mesa <span className="font-normal text-carbon/50">(opcional)</span>
          </label>
          <input
            id="f-mesa"
            value={mesa}
            onChange={(e) => setMesa(e.target.value)}
            maxLength={20}
            className="campo"
            placeholder="7"
          />
        </div>
      </div>

      {/* ---------- Acompañantes ---------- */}
      <fieldset className="mt-6 rounded-2xl border border-arena p-4">
        <legend className="px-2 text-sm font-medium">Acompañantes</legend>

        <div className="flex items-center justify-between gap-4">
          <label htmlFor="c-adultos" className="text-sm">
            Adultos
          </label>
          <Contador id="c-adultos" valor={adultos.length} onCambio={cambiarNumAdultos} />
        </div>

        {adultos.length > 0 && (
          <div className="mt-3 space-y-3">
            {adultos.map((p, i) => (
              <div key={i} className="rounded-xl bg-arena/30 p-3">
                <p className="mb-2 text-xs font-medium text-carbon/60">
                  Adulto {i + 1} <span className="font-normal text-carbon/40">(opcional)</span>
                </p>
                <input
                  value={p.nombre || ''}
                  onChange={(e) => editarAdulto(i, 'nombre', e.target.value)}
                  maxLength={120}
                  className="campo py-2"
                  placeholder="Nombre"
                  aria-label={`Nombre del adulto ${i + 1}`}
                />
                <select
                  value={p.sexo || ''}
                  onChange={(e) => editarAdulto(i, 'sexo', e.target.value)}
                  className="campo mt-2 py-2"
                  aria-label={`Sexo del adulto ${i + 1}`}
                >
                  <option value="">Sexo sin especificar</option>
                  {SEXOS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between gap-4 border-t border-arena pt-4">
          <label htmlFor="c-ninos" className="text-sm">
            Niños
          </label>
          <Contador id="c-ninos" valor={ninos.length} onCambio={cambiarNumNinos} />
        </div>

        {ninos.length > 0 && (
          <div className="mt-3 space-y-3">
            {ninos.map((p, i) => (
              <div key={i} className="rounded-xl bg-arena/30 p-3">
                <p className="mb-2 text-xs font-medium text-carbon/60">
                  Niño {i + 1} <span className="font-normal text-carbon/40">(opcional)</span>
                </p>
                <input
                  value={p.nombre || ''}
                  onChange={(e) => editarNino(i, 'nombre', e.target.value)}
                  maxLength={120}
                  className="campo py-2"
                  placeholder="Nombre"
                  aria-label={`Nombre del niño ${i + 1}`}
                />
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <select
                    value={p.sexo || ''}
                    onChange={(e) => editarNino(i, 'sexo', e.target.value)}
                    className="campo py-2"
                    aria-label={`Sexo del niño ${i + 1}`}
                  >
                    <option value="">Sexo</option>
                    {SEXOS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <input
                    value={p.edad || ''}
                    onChange={(e) => editarNino(i, 'edad', e.target.value)}
                    maxLength={20}
                    className="campo py-2"
                    placeholder="Edad"
                    aria-label={`Edad del niño ${i + 1}`}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="mt-4 rounded-xl bg-arena/50 px-3 py-2 text-center text-sm">
          Este grupo entra con <strong>{total}</strong> {total === 1 ? 'persona' : 'personas'} y{' '}
          <strong>un solo QR</strong>.
        </p>
      </fieldset>

      <div className="mt-4">
        <label htmlFor="f-confirmacion" className="mb-2 block text-sm font-medium">
          Confirmación
        </label>
        <select
          id="f-confirmacion"
          value={confirmacion}
          onChange={(e) => setConfirmacion(e.target.value)}
          className="campo"
        >
          {CONFIRMACIONES.map((c) => (
            <option key={c} value={c}>
              {c === 'Si' ? 'Sí asistirá' : c === 'No' ? 'No asistirá' : 'Pendiente'}
            </option>
          ))}
        </select>
        <p className="mt-2 text-xs text-carbon/50">
          Útil cuando alguien te confirma por teléfono o en persona y no va a abrir su link.
        </p>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 flex gap-3">
        <button type="button" onClick={onCancelar} className="btn-secundario flex-1">
          Cancelar
        </button>
        <button type="submit" disabled={guardando} className="btn-primario flex-1">
          {guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Agregar'}
        </button>
      </div>
    </form>
  )
}
