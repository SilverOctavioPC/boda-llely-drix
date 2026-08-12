import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { db, COLECCION } from '../lib/firebase.js'
import { normalizar } from '../lib/texto.js'
import { useAuth } from '../context/AuthContext.jsx'
import Cargando from '../components/Cargando.jsx'
import Modal from '../components/Modal.jsx'
import FormularioInvitado from '../components/FormularioInvitado.jsx'
import ConfigMenu from '../components/ConfigMenu.jsx'
import SelectorMenu from '../components/SelectorMenu.jsx'
import {
  aMenuGuardable,
  COLECCION_CONFIG,
  CONFIG_VACIA,
  CURSOS,
  DOC_CONFIG,
  eleccionDe,
  faltaElegir,
  hayMenuConfigurado,
  leerConfig,
  personasDelGrupo,
  resumenEleccion,
  resumenMenu,
} from '../lib/menu.js'
import {
  desglosePorCategoria,
  leerAcompanantes,
  nombresAcompanantes,
  resumenAcompanantes,
  totalPersonas,
} from '../lib/acompanantes.js'

const linkDe = (id) => `${window.location.origin}/rsvp/${id}`

function Metrica({ etiqueta, valor, tono = 'neutro' }) {
  const tonos = {
    neutro: 'text-carbon',
    verde: 'text-salviaOscuro',
    rojo: 'text-red-600',
    ambar: 'text-oro',
  }
  return (
    <div className="tarjeta p-4 text-center">
      <p className={`font-titulo text-4xl tabular-nums ${tonos[tono]}`}>{valor}</p>
      <p className="mt-1 text-xs uppercase tracking-wide text-carbon/50">{etiqueta}</p>
    </div>
  )
}

function Etiqueta({ children, tono }) {
  const tonos = {
    Si: 'bg-salvia/15 text-salviaOscuro',
    No: 'bg-red-100 text-red-700',
    Pendiente: 'bg-arena text-carbon/60',
  }
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${tonos[tono]}`}>
      {children}
    </span>
  )
}

/** Campo de solo lectura con botón de copiar. */
function CampoLink({ valor }) {
  const [copiado, setCopiado] = useState(false)

  async function copiar() {
    try {
      await navigator.clipboard.writeText(valor)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      // Sin permiso de portapapeles: al menos seleccionamos el texto.
      const input = document.getElementById('link-generado')
      input?.select()
    }
  }

  return (
    <div className="flex gap-2">
      <input
        id="link-generado"
        readOnly
        value={valor}
        onFocus={(e) => e.target.select()}
        className="campo flex-1 text-xs"
      />
      <button onClick={copiar} className="btn-secundario shrink-0 px-4">
        {copiado ? '✓' : 'Copiar'}
      </button>
    </div>
  )
}

export default function Admin() {
  const { usuario, salir } = useAuth()

  const [invitados, setInvitados] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [busqueda, setBusqueda] = useState('')
  const [filtroGrupo, setFiltroGrupo] = useState('Todos')
  const [filtroConfirmacion, setFiltroConfirmacion] = useState('Todos')
  const [filtroCategoria, setFiltroCategoria] = useState('Todos')
  const [filtroMenu, setFiltroMenu] = useState('Todos')
  const [pagina, setPagina] = useState(1)

  // Estado de los diálogos.
  const [creando, setCreando] = useState(false)
  const [editando, setEditando] = useState(null)
  const [borrando, setBorrando] = useState(null)
  const [recienCreado, setRecienCreado] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [textoBorrado, setTextoBorrado] = useState('')
  const [copiadoId, setCopiadoId] = useState(null)

  const [config, setConfig] = useState(CONFIG_VACIA)
  const [editandoMenu, setEditandoMenu] = useState(false)
  // Invitado al que le estamos cambiando el menú a mano.
  const [menuDe, setMenuDe] = useState(null)
  const [eleccionesEdit, setEleccionesEdit] = useState({})

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, COLECCION),
      (snap) => {
        setInvitados(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
        setCargando(false)
      },
      (e) => {
        console.error(e)
        setError('No pudimos cargar la lista. Revisa las reglas de Firestore y tu conexión.')
        setCargando(false)
      }
    )
    return unsub
  }, [])

  // Configuración del menú, también en tiempo real.
  useEffect(() => {
    return onSnapshot(
      doc(db, COLECCION_CONFIG, DOC_CONFIG),
      (snap) => setConfig(snap.exists() ? leerConfig(snap.data()) : CONFIG_VACIA),
      (e) => console.error('No se pudo leer la configuración del menú:', e)
    )
  }, [])

  async function guardarMenu(datos) {
    setGuardando(true)
    setError('')
    try {
      await setDoc(doc(db, COLECCION_CONFIG, DOC_CONFIG), datos)
      setEditandoMenu(false)
    } catch (e) {
      console.error(e)
      setError('No se pudo guardar el menú. ¿Publicaste las reglas actualizadas?')
    } finally {
      setGuardando(false)
    }
  }

  // Los contadores cuentan PERSONAS, no documentos: un invitado con 3
  // acompañantes son 4 lugares en el banquete y 4 sillas.
  const resumen = useMemo(() => {
    const r = {
      grupos: invitados.length,
      personas: 0,
      si: 0,
      no: 0,
      pendiente: 0,
      entradas: 0,
      // Desglose de quienes SÍ asisten: es lo que necesita el banquete.
      adultos: 0,
      ninos: 0,
      bebes: 0,
    }
    for (const i of invitados) {
      const personas = totalPersonas(i)
      r.personas += personas

      if (i.confirmacion === 'Si') {
        r.si += personas
        const d = desglosePorCategoria(i)
        r.adultos += d.adultos
        r.ninos += d.ninos
        r.bebes += d.bebes
      } else if (i.confirmacion === 'No') {
        r.no += personas
      } else {
        r.pendiente += personas
      }

      if (i.entradaRegistrada) r.entradas += personas
    }
    return r
  }, [invitados])

  const filtrados = useMemo(() => {
    const q = normalizar(busqueda)
    return invitados
      .filter((i) => filtroGrupo === 'Todos' || i.grupo === filtroGrupo)
      .filter((i) => {
        if (filtroConfirmacion === 'Todos') return true
        return (i.confirmacion || 'Pendiente') === filtroConfirmacion
      })
      .filter((i) => filtroCategoria === 'Todos' || (i.categoria || 'Adulto') === filtroCategoria)
      .filter((i) => filtroMenu !== 'faltan' || faltaElegir(i, config))
      .filter((i) => !q || normalizar(i.nombre).includes(q))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  }, [invitados, busqueda, filtroGrupo, filtroConfirmacion, filtroCategoria, filtroMenu, config])

  const menu = useMemo(() => resumenMenu(invitados, config), [invitados, config])

  // ---------- Paginación ----------
  const POR_PAGINA = 25
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA))

  // Si al filtrar quedan menos páginas de las que había, volvemos a la primera
  // en vez de dejar al usuario mirando una página vacía.
  const paginaSegura = Math.min(pagina, totalPaginas)
  const desde = (paginaSegura - 1) * POR_PAGINA
  const paginados = filtrados.slice(desde, desde + POR_PAGINA)

  useEffect(() => {
    setPagina(1)
  }, [busqueda, filtroGrupo, filtroConfirmacion, filtroCategoria, filtroMenu])

  // ---------- Acciones ----------

  async function crear(datos) {
    setGuardando(true)
    setError('')
    try {
      const ref = await addDoc(collection(db, COLECCION), {
        ...datos,
        confirmacionExcel: null,
        posibleAsistencia: null,
        saveTheDate: null,
        restricciones: null,
        mensaje: null,
        // Si el alta ya viene confirmada, dejamos constancia de cuándo.
        fechaConfirmacion: datos.confirmacion === 'Pendiente' ? null : serverTimestamp(),
        entradaRegistrada: false,
        fechaEntrada: null,
        // `acompanantes` ya viene dentro de `datos`, desde el formulario.
        origen: { hoja: 'MANUAL', fila: 0, numero: '' },
      })
      setCreando(false)
      setRecienCreado({ id: ref.id, nombre: datos.nombre })
    } catch (e) {
      console.error(e)
      setError('No se pudo crear el invitado. ¿Publicaste las reglas actualizadas?')
    } finally {
      setGuardando(false)
    }
  }

  async function guardarEdicion(datos) {
    setGuardando(true)
    setError('')
    try {
      const cambios = { ...datos }
      // Si pasa de Pendiente a una respuesta y no tenía fecha, la anotamos.
      if (datos.confirmacion !== 'Pendiente' && !editando.fechaConfirmacion) {
        cambios.fechaConfirmacion = serverTimestamp()
      }
      await updateDoc(doc(db, COLECCION, editando.id), cambios)
      setEditando(null)
    } catch (e) {
      console.error(e)
      setError('No se pudieron guardar los cambios.')
    } finally {
      setGuardando(false)
    }
  }

  async function confirmarBorrado() {
    setGuardando(true)
    setError('')
    try {
      await deleteDoc(doc(db, COLECCION, borrando.id))
      setBorrando(null)
      setTextoBorrado('')
    } catch (e) {
      console.error(e)
      setError('No se pudo borrar el invitado.')
    } finally {
      setGuardando(false)
    }
  }

  /** Abre el editor de menú de un invitado, precargado con lo que ya eligió. */
  function abrirMenuDe(invitado) {
    const previas = {}
    for (const p of personasDelGrupo(invitado)) {
      previas[p.indice] = eleccionDe(invitado, p.indice)
    }
    setEleccionesEdit(previas)
    setMenuDe(invitado)
  }

  /**
   * Guarda el menú que los novios ajustaron a mano.
   * A diferencia del invitado, aquí NO se exige completarlo: puede que solo
   * sepan lo que cambió una persona del grupo.
   */
  async function guardarMenuDeInvitado() {
    setGuardando(true)
    setError('')
    try {
      await updateDoc(doc(db, COLECCION, menuDe.id), {
        menu: aMenuGuardable(eleccionesEdit[-1]),
        menuAcompanantes: personasDelGrupo(menuDe)
          .filter((p) => !p.esTitular)
          .sort((a, b) => a.indice - b.indice)
          .map((p) => aMenuGuardable(eleccionesEdit[p.indice])),
      })
      setMenuDe(null)
    } catch (e) {
      console.error(e)
      setError('No se pudo guardar el menú de este invitado.')
    } finally {
      setGuardando(false)
    }
  }

  async function copiarLink(id) {
    try {
      await navigator.clipboard.writeText(linkDe(id))
      setCopiadoId(id)
      setTimeout(() => setCopiadoId(null), 2000)
    } catch {
      window.prompt('Copia el link:', linkDe(id))
    }
  }

  function descargarCsv() {
    const cabecera = [
      'Nombre',
      'Grupo',
      'Sexo',
      'Categoria',
      'Edad',
      'Personas del grupo',
      'Acompanantes adultos',
      'Acompanantes ninos',
      'Nombres de acompanantes',
      'Menu por persona',
      'Mesa',
      'Confirmacion',
      'Restricciones',
      'Mensaje',
      'Acceso registrado',
      'Link RSVP',
    ]
    const escapar = (v) => `"${(v ?? '').toString().replace(/"/g, '""')}"`
    const lineas = filtrados.map((i) => {
      const ac = leerAcompanantes(i)
      return [
        i.nombre,
        i.grupo,
        i.sexo,
        i.categoria || 'Adulto',
        i.edad,
        totalPersonas(i),
        ac.adultos.length,
        ac.ninos.length,
        nombresAcompanantes(i).join(' / '),
        // "Ana: Pollo + Tinto / Leo: Nuggets" — una linea por persona.
        // "Ana: Crema · Pollo · Tinto / Leo: Nuggets" — una entrada por persona.
        personasDelGrupo(i)
          .filter((p) => p.tipo !== 'bebe')
          .map((p) => `${p.nombre}: ${resumenEleccion(i, p, config) || 'sin elegir'}`)
          .join(' / '),
        i.mesa,
        i.confirmacion || 'Pendiente',
        i.restricciones,
        i.mensaje,
        i.entradaRegistrada ? 'Si' : 'No',
        linkDe(i.id),
      ]
        .map(escapar)
        .join(',')
    })
    // El BOM (U+FEFF) hace que Excel abra los acentos correctamente.
    const csv = '\uFEFF' + [cabecera.map(escapar).join(','), ...lineas].join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'invitados.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (cargando) return <Cargando texto="Cargando invitados…" />

  // Al borrar a alguien que ya confirmó o que ya entró, exigimos escribir el
  // nombre. Es el caso en el que un clic por error duele de verdad.
  const borradoDelicado =
    borrando && (borrando.confirmacion === 'Si' || borrando.entradaRegistrada)
  const puedeBorrar = !borradoDelicado || textoBorrado.trim() === borrando?.nombre

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-titulo text-3xl">Panel de novios</h1>
          <p className="text-sm text-carbon/50">{usuario?.email}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setCreando(true)} className="btn-primario">
            + Agregar invitado
          </button>
          <button onClick={() => setEditandoMenu(true)} className="btn-secundario">
            Menú
          </button>
          <Link to="/admin/scanner" className="btn-secundario">
            Escáner
          </Link>
          <button onClick={salir} className="btn-secundario">
            Salir
          </button>
        </div>
      </div>

      {error && (
        <p className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Metrica etiqueta="Personas" valor={resumen.personas} />
        <Metrica etiqueta="Asistirán" valor={resumen.si} tono="verde" />
        <Metrica etiqueta="No podrán" valor={resumen.no} tono="rojo" />
        <Metrica etiqueta="Sin responder" valor={resumen.pendiente} tono="ambar" />
        <Metrica etiqueta="Ya entraron" valor={resumen.entradas} />
      </section>

      {/* Lo que le pasas al banquete: solo cuenta a quienes confirmaron. */}
      <section className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border border-arena bg-white px-5 py-4 text-sm">
        <span className="text-carbon/50">De los que asistirán:</span>
        <span>
          <strong className="tabular-nums">{resumen.adultos}</strong> adultos
        </span>
        <span>
          <strong className="tabular-nums">{resumen.ninos}</strong> niños
        </span>
        <span>
          <strong className="tabular-nums">{resumen.bebes}</strong> bebés
        </span>
        <span className="ml-auto text-xs text-carbon/40">
          Todo en personas. {resumen.grupos} grupos con link propio.
        </span>
      </section>

      {/* Conteo de platos y bebidas, solo de quienes ya confirmaron. */}
      {hayMenuConfigurado(config) && (
        <section className="mt-3 rounded-2xl border border-arena bg-white px-5 py-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-medium">Menú elegido</h2>
            {(menu.faltantes.entrada > 0 ||
              menu.faltantes.plato > 0 ||
              menu.faltantes.bebida > 0) && (
              <button
                onClick={() => setFiltroMenu(filtroMenu === 'faltan' ? 'Todos' : 'faltan')}
                className="text-xs text-oro underline"
              >
                Hay elecciones pendientes —{' '}
                {filtroMenu === 'faltan' ? 'ver todos' : 'ver quiénes'}
              </button>
            )}
          </div>

          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            {CURSOS.map((curso) => (
              <div key={curso.clave}>
                <p className="mb-1 text-xs uppercase tracking-wide text-carbon/40">
                  {curso.etiqueta}
                </p>
                {menu[curso.clave].length === 0 ? (
                  <p className="text-sm text-carbon/40">Nadie ha elegido todavía.</p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {menu[curso.clave].map((o) => (
                      <li key={o.id} className="flex justify-between gap-4">
                        <span className="text-carbon/70">{o.nombre}</span>
                        <strong className="tabular-nums">{o.n}</strong>
                      </li>
                    ))}
                  </ul>
                )}
                {menu.faltantes[curso.clave] > 0 && (
                  <p className="mt-1 text-xs text-oro">
                    {menu.faltantes[curso.clave]} sin elegir
                  </p>
                )}
              </div>
            ))}
          </div>

          {menu.bebes > 0 && (
            <p className="mt-3 text-xs text-carbon/40">
              {menu.bebes} bebé(s) no eligen menú y no entran en este conteo.
            </p>
          )}
        </section>
      )}

      <section className="mt-8 flex flex-wrap gap-3">
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre…"
          className="campo flex-1 sm:max-w-xs"
        />
        <select
          value={filtroGrupo}
          onChange={(e) => setFiltroGrupo(e.target.value)}
          className="campo w-auto"
          aria-label="Filtrar por lista"
        >
          <option value="Todos">Ambas listas</option>
          <option value="Llely">Lista Llely</option>
          <option value="Drix">Lista Drix</option>
        </select>
        <select
          value={filtroConfirmacion}
          onChange={(e) => setFiltroConfirmacion(e.target.value)}
          className="campo w-auto"
          aria-label="Filtrar por confirmación"
        >
          <option value="Todos">Toda confirmación</option>
          <option value="Si">Asistirán</option>
          <option value="No">No podrán</option>
          <option value="Pendiente">Sin responder</option>
        </select>
        <select
          value={filtroCategoria}
          onChange={(e) => setFiltroCategoria(e.target.value)}
          className="campo w-auto"
          aria-label="Filtrar por categoría"
        >
          <option value="Todos">Toda categoría</option>
          <option value="Adulto">Adultos</option>
          <option value="Niño">Niños</option>
          <option value="Bebé">Bebés</option>
        </select>
        <button onClick={descargarCsv} className="btn-secundario">
          Descargar CSV
        </button>
      </section>

      <p className="mt-4 text-sm text-carbon/50">
        {filtrados.length === 0
          ? `0 de ${invitados.length}`
          : `Mostrando ${desde + 1}–${Math.min(desde + POR_PAGINA, filtrados.length)} de ${filtrados.length}`}
        {filtrados.length !== invitados.length && ` (${invitados.length} en total)`}
      </p>

      <section className="mt-3 overflow-x-auto rounded-2xl border border-arena bg-white">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-arena text-xs uppercase tracking-wide text-carbon/50">
            <tr>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Lista</th>
              <th className="px-4 py-3 font-medium">Categoría</th>
              <th className="px-4 py-3 font-medium">Mesa</th>
              <th className="px-4 py-3 font-medium">Confirmación</th>
              {hayMenuConfigurado(config) && (
                <th className="px-4 py-3 font-medium">Menú</th>
              )}
              <th className="px-4 py-3 font-medium">Restricciones</th>
              {/* "Acceso" y no "Entrada", para no confundirlo con el
                  primer tiempo del menú. */}
              <th className="px-4 py-3 font-medium">Acceso</th>
              <th className="px-4 py-3 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paginados.map((i) => (
              <tr key={i.id} className="border-b border-arena/60 last:border-0">
                <td className="px-4 py-3">
                  <span className="font-medium">{i.nombre}</span>
                  {i.edad && <span className="ml-2 text-xs text-carbon/50">{i.edad}</span>}
                  {totalPersonas(i) > 1 && (
                    <span className="ml-2 rounded-full bg-salvia/15 px-2 py-0.5 text-xs font-medium text-salviaOscuro">
                      +{resumenAcompanantes(i)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-carbon/60">{i.grupo}</td>
                <td className="px-4 py-3 text-carbon/60">
                  {(i.categoria || 'Adulto') !== 'Adulto' ? (
                    <span className="rounded-full bg-oro/15 px-2.5 py-1 text-xs font-medium text-oro">
                      {i.categoria}
                    </span>
                  ) : (
                    <span className="text-carbon/40">Adulto</span>
                  )}
                </td>
                <td className="px-4 py-3 text-carbon/60">{i.mesa || '—'}</td>
                <td className="px-4 py-3">
                  <Etiqueta tono={i.confirmacion || 'Pendiente'}>
                    {i.confirmacion || 'Pendiente'}
                  </Etiqueta>
                </td>
                {hayMenuConfigurado(config) && (
                  <td className="max-w-[260px] px-4 py-3 text-xs">
                    {i.confirmacion !== 'Si' ? (
                      <span className="text-carbon/30">—</span>
                    ) : (
                      <ul className="space-y-0.5">
                        {personasDelGrupo(i)
                          .filter((p) => p.tipo !== 'bebe')
                          .map((p) => {
                            const elegido = resumenEleccion(i, p, config)
                            return (
                              <li key={p.indice}>
                                <span className="text-carbon/50">{p.nombre}:</span>{' '}
                                {elegido ? (
                                  <span className="text-carbon/80">{elegido}</span>
                                ) : (
                                  <span className="text-oro">falta elegir</span>
                                )}
                              </li>
                            )
                          })}
                      </ul>
                    )}
                  </td>
                )}
                <td className="max-w-[200px] px-4 py-3 text-carbon/60">
                  {i.restricciones || '—'}
                </td>
                <td className="px-4 py-3">
                  {i.entradaRegistrada ? (
                    <span className="text-salviaOscuro">✓</span>
                  ) : (
                    <span className="text-carbon/30">—</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <button
                    onClick={() => copiarLink(i.id)}
                    className="rounded-lg px-2 py-1 text-xs text-salviaOscuro hover:bg-arena"
                    title="Copiar link de RSVP"
                  >
                    {copiadoId === i.id ? '✓ Copiado' : 'Link'}
                  </button>
                  {hayMenuConfigurado(config) && (
                    <button
                      onClick={() => abrirMenuDe(i)}
                      className="rounded-lg px-2 py-1 text-xs text-carbon/70 hover:bg-arena"
                      title="Cambiar lo que va a comer"
                    >
                      Menú
                    </button>
                  )}
                  <button
                    onClick={() => setEditando(i)}
                    className="rounded-lg px-2 py-1 text-xs text-carbon/70 hover:bg-arena"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => {
                      setBorrando(i)
                      setTextoBorrado('')
                    }}
                    className="rounded-lg px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                  >
                    Borrar
                  </button>
                </td>
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr>
                <td
                  colSpan={hayMenuConfigurado(config) ? 9 : 8}
                  className="px-4 py-10 text-center text-carbon/50"
                >
                  Ningún invitado coincide con esos filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {totalPaginas > 1 && (
        <nav
          className="mt-4 flex items-center justify-center gap-2"
          aria-label="Paginación de invitados"
        >
          <button
            onClick={() => setPagina(paginaSegura - 1)}
            disabled={paginaSegura <= 1}
            className="btn-secundario px-4 py-2 text-sm"
          >
            ← Anterior
          </button>

          <span className="px-3 text-sm tabular-nums text-carbon/60">
            Página {paginaSegura} de {totalPaginas}
          </span>

          <button
            onClick={() => setPagina(paginaSegura + 1)}
            disabled={paginaSegura >= totalPaginas}
            className="btn-secundario px-4 py-2 text-sm"
          >
            Siguiente →
          </button>
        </nav>
      )}

      <section className="mt-10">
        <h2 className="font-titulo text-2xl">Mensajes</h2>
        <div className="mt-4 space-y-3">
          {invitados
            .filter((i) => i.mensaje)
            .map((i) => (
              <blockquote key={i.id} className="tarjeta">
                <p className="text-carbon/80">“{i.mensaje}”</p>
                <footer className="mt-2 text-sm text-carbon/50">— {i.nombre}</footer>
              </blockquote>
            ))}
          {invitados.filter((i) => i.mensaje).length === 0 && (
            <p className="text-carbon/50">Todavía no hay mensajes.</p>
          )}
        </div>
      </section>

      {/* ---------- Diálogos ---------- */}

      <Modal
        abierto={editandoMenu}
        onCerrar={() => setEditandoMenu(false)}
        titulo="Menú del banquete"
      >
        <ConfigMenu
          key={editandoMenu ? 'abierto' : 'cerrado'}
          config={config}
          onGuardar={guardarMenu}
          onCancelar={() => setEditandoMenu(false)}
          guardando={guardando}
        />
      </Modal>

      <Modal
        abierto={Boolean(menuDe)}
        onCerrar={() => setMenuDe(null)}
        titulo={`Menú de ${menuDe?.nombre || ''}`}
      >
        {menuDe && (
          <>
            <p className="mb-4 text-sm text-carbon/60">
              Cambia lo que va a comer cada quien. Útil cuando te avisan por
              teléfono. Aquí no hace falta completarlo todo.
            </p>
            <SelectorMenu
              invitado={menuDe}
              config={config}
              elecciones={eleccionesEdit}
              onCambio={(indice, curso, valor) =>
                setEleccionesEdit((prev) => ({
                  ...prev,
                  [indice]: { ...(prev[indice] || {}), [curso]: valor },
                }))
              }
            />
            <div className="mt-6 flex gap-3">
              <button onClick={() => setMenuDe(null)} className="btn-secundario flex-1">
                Cancelar
              </button>
              <button
                onClick={guardarMenuDeInvitado}
                disabled={guardando}
                className="btn-primario flex-1"
              >
                {guardando ? 'Guardando…' : 'Guardar menú'}
              </button>
            </div>
          </>
        )}
      </Modal>

      <Modal abierto={creando} onCerrar={() => setCreando(false)} titulo="Agregar invitado">
        <FormularioInvitado
          onGuardar={crear}
          onCancelar={() => setCreando(false)}
          guardando={guardando}
        />
      </Modal>

      <Modal
        abierto={Boolean(editando)}
        onCerrar={() => setEditando(null)}
        titulo="Editar invitado"
      >
        <FormularioInvitado
          // `key` fuerza a reiniciar el formulario al cambiar de invitado.
          key={editando?.id}
          inicial={editando}
          onGuardar={guardarEdicion}
          onCancelar={() => setEditando(null)}
          guardando={guardando}
        />
      </Modal>

      <Modal
        abierto={Boolean(recienCreado)}
        onCerrar={() => setRecienCreado(null)}
        titulo="Invitado agregado"
      >
        <p className="text-carbon/70">
          <span className="font-medium text-carbon">{recienCreado?.nombre}</span> ya
          está en la lista. Este es su link para mandarle por WhatsApp:
        </p>
        <div className="mt-4">
          {recienCreado && <CampoLink valor={linkDe(recienCreado.id)} />}
        </div>
        <button onClick={() => setRecienCreado(null)} className="btn-primario mt-6 w-full">
          Listo
        </button>
      </Modal>

      <Modal
        abierto={Boolean(borrando)}
        onCerrar={() => setBorrando(null)}
        titulo="Borrar invitado"
      >
        <p className="text-carbon/70">
          Vas a borrar a{' '}
          <span className="font-medium text-carbon">{borrando?.nombre}</span>. Su link
          de RSVP dejará de funcionar y no se puede deshacer.
        </p>

        {borradoDelicado && (
          <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-medium">Cuidado</p>
            <p className="mt-1">
              {borrando?.entradaRegistrada
                ? 'Esta persona ya registró su entrada al evento.'
                : 'Esta persona ya confirmó que sí asistirá.'}{' '}
              Si solo no va a venir, es mejor <strong>editarla</strong> y ponerle
              “No asistirá”: así conservas el registro.
            </p>
            <label htmlFor="conf-borrado" className="mt-3 block font-medium">
              Escribe “{borrando?.nombre}” para confirmar:
            </label>
            <input
              id="conf-borrado"
              value={textoBorrado}
              onChange={(e) => setTextoBorrado(e.target.value)}
              className="campo mt-2"
            />
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button onClick={() => setBorrando(null)} className="btn-secundario flex-1">
            Cancelar
          </button>
          <button
            onClick={confirmarBorrado}
            disabled={!puedeBorrar || guardando}
            className="btn flex-1 bg-red-600 text-white hover:bg-red-700"
          >
            {guardando ? 'Borrando…' : 'Borrar'}
          </button>
        </div>
      </Modal>
    </main>
  )
}
