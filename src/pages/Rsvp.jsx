import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { QRCodeCanvas } from 'qrcode.react'
import { db, COLECCION } from '../lib/firebase.js'
import { EVENTO } from '../lib/evento.js'
import { resumenAcompanantes, totalPersonas } from '../lib/acompanantes.js'
import {
  aMenuGuardable,
  COLECCION_CONFIG,
  CONFIG_VACIA,
  CURSOS,
  DOC_CONFIG,
  eleccionDe,
  eleccionCompleta,
  hayMenuConfigurado,
  leerConfig,
  opcionesPara,
  personasDelGrupo,
  personasQueEligen,
  resumenEleccion,
  textoEleccion,
} from '../lib/menu.js'
import Cargando from '../components/Cargando.jsx'
import AsistenteMenu from '../components/AsistenteMenu.jsx'

const LIMITE_RESTRICCIONES = 300
const LIMITE_MENSAJE = 500

function Encabezado() {
  return (
    <header className="mb-8 text-center">
      {/* Etiqueta, no estado: por eso va en texto tenue y no en ámbar. */}
      <p className="text-xs uppercase tracking-[0.3em] text-texto/50">Nuestra boda</p>
      <h1 className="mt-2 font-titulo text-4xl">{EVENTO.novios}</h1>
      {/* El único sitio de todo el sitio donde aparece el oro. */}
      <div className="filete mx-auto mt-3" />
      {EVENTO.fecha !== 'Por definir' && (
        <p className="mt-2 text-sm text-texto/60">
          {EVENTO.fecha} · {EVENTO.lugar}
        </p>
      )}
    </header>
  )
}

/** QR + botón de descarga. El QR codifica solo el ID del invitado. */
function CodigoQR({ invitadoId, nombre }) {
  const contenedor = useRef(null)

  function descargar() {
    const canvas = contenedor.current?.querySelector('canvas')
    if (!canvas) return
    const enlace = document.createElement('a')
    // Nombre de archivo seguro. NFD separa los acentos en marcas combinantes
    // y el filtro alfanumérico las descarta junto con cualquier otro símbolo.
    const limpio = nombre
      .normalize('NFD')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    enlace.download = `pase-${limpio || 'invitado'}.png`
    enlace.href = canvas.toDataURL('image/png')
    enlace.click()
  }

  return (
    <div className="flex flex-col items-center">
      {/*
        Blanco literal, no `bg-superficie`: el QR necesita su marco claro para
        que el lector lo distinga. Si algún día la superficie deja de ser
        blanca, este marco tiene que seguir siéndolo.
      */}
      <div ref={contenedor} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-linea">
        <QRCodeCanvas
          value={invitadoId}
          size={260}
          // Máximo contraste y nivel de corrección alto: legible impreso
          // en blanco y negro o desde una pantalla con brillo bajo.
          fgColor="#000000"
          bgColor="#FFFFFF"
          level="H"
          includeMargin
        />
      </div>
      <button onClick={descargar} className="btn-secundario mt-4">
        Descargar mi pase
      </button>
      {/*
        Casi nadie va a imprimir el pase: lo van a enseñar desde la pantalla, y
        una pantalla a brillo bajo cuesta de leer. Decirlo aquí ahorra segundos
        por invitado en la puerta.
      */}
      <p className="mt-3 max-w-xs text-center text-xs text-texto/70">
        Guarda una captura de este código. Lo presentarás en la entrada.
        <br />
        <span className="mt-1 inline-block font-medium text-texto/70">
          Sube el brillo de tu pantalla al mostrarlo.
        </span>
      </p>
    </div>
  )
}

export default function Rsvp() {
  const { invitadoId } = useParams()

  const [invitado, setInvitado] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [noExiste, setNoExiste] = useState(false)

  const [respuesta, setRespuesta] = useState(null) // 'Si' | 'No'
  const [restricciones, setRestricciones] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const [config, setConfig] = useState(CONFIG_VACIA)
  // Elecciones indexadas por persona: -1 es el titular.
  const [elecciones, setElecciones] = useState({})
  // Paso del asistente de menú. Cuando llega al final del grupo, se muestran
  // las restricciones, el mensaje y el botón de enviar.
  const [paso, setPaso] = useState(0)
  const [errorPaso, setErrorPaso] = useState('')

  useEffect(() => {
    let activo = true
    async function cargar() {
      try {
        // El menú se pide en paralelo: si no está configurado, la página
        // funciona igual y simplemente no se muestran las preguntas.
        const [snap, snapConfig] = await Promise.all([
          getDoc(doc(db, COLECCION, invitadoId)),
          getDoc(doc(db, COLECCION_CONFIG, DOC_CONFIG)).catch(() => null),
        ])
        if (!activo) return

        if (snapConfig?.exists()) setConfig(leerConfig(snapConfig.data()))

        if (!snap.exists()) {
          setNoExiste(true)
        } else {
          const datos = { id: snap.id, ...snap.data() }
          setInvitado(datos)
          setRestricciones(datos.restricciones || '')
          setMensaje(datos.mensaje || '')

          // Precargamos lo que ya hubiera elegido, para poder cambiarlo.
          const previas = {}
          for (const p of personasDelGrupo(datos)) {
            previas[p.indice] = eleccionDe(datos, p.indice)
          }
          setElecciones(previas)
        }
      } catch (e) {
        console.error(e)
        if (activo) setError('No pudimos cargar tu invitación. Revisa tu conexión.')
      } finally {
        if (activo) setCargando(false)
      }
    }
    cargar()
    return () => {
      activo = false
    }
  }, [invitadoId])

  async function guardar() {
    if (!respuesta) return

    // Red de seguridad: el asistente ya no deja avanzar sin elegir, pero
    // revalidamos por si el grupo cambió mientras la página estaba abierta.
    if (respuesta === 'Si' && hayMenuConfigurado(config)) {
      const faltan = personasQueEligen(invitado, config).filter(
        (p) => !eleccionCompleta(p, elecciones[p.indice], config)
      )
      if (faltan.length > 0) {
        setPaso(personasQueEligen(invitado, config).indexOf(faltan[0]))
        setError(`Falta elegir el menú de ${faltan[0].nombre}.`)
        return
      }
    }

    setGuardando(true)
    setError('')
    try {
      const cambios = {
        confirmacion: respuesta,
        restricciones: respuesta === 'Si' ? restricciones.trim() || null : null,
        mensaje: mensaje.trim() || null,
        fechaConfirmacion: serverTimestamp(),
      }

      // El menú solo tiene sentido si asiste. Se guarda en dos campos: el del
      // titular y una lista paralela para sus acompañantes.
      if (respuesta === 'Si' && hayMenuConfigurado(config)) {
        cambios.menu = aMenuGuardable(elecciones[-1])
        cambios.menuAcompanantes = personasDelGrupo(invitado)
          .filter((p) => !p.esTitular)
          .sort((a, b) => a.indice - b.indice)
          .map((p) => aMenuGuardable(elecciones[p.indice]))
      }
      await updateDoc(doc(db, COLECCION, invitadoId), cambios)
      // Reflejamos el cambio en pantalla sin volver a leer de Firestore.
      setInvitado((prev) => ({ ...prev, ...cambios }))
    } catch (e) {
      console.error(e)
      setError('No se pudo guardar tu confirmación. Inténtalo de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) return <Cargando texto="Abriendo tu invitación…" />

  if (noExiste) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
        <Encabezado />
        <div className="tarjeta text-center">
          <p className="text-texto/70">
            No encontramos esta invitación. Verifica que hayas abierto el link completo tal como te
            lo enviamos, o escríbenos directamente.
          </p>
        </div>
      </main>
    )
  }

  const yaRespondio = invitado.confirmacion === 'Si' || invitado.confirmacion === 'No'

  // ---------- Asistente de menú ----------
  const conMenu = hayMenuConfigurado(config)
  const personasMenu = conMenu ? personasQueEligen(invitado, config) : []
  // Un paso por persona; el último (índice = longitud) es el tramo final
  // con restricciones, mensaje y el botón de enviar.
  const enAsistente = respuesta === 'Si' && personasMenu.length > 0 && paso < personasMenu.length

  function avanzar(siguiente) {
    if (siguiente > paso) {
      const persona = personasMenu[paso]
      if (persona && !eleccionCompleta(persona, elecciones[persona.indice], config)) {
        setErrorPaso('Elige todas las opciones para continuar.')
        return
      }
    }
    setErrorPaso('')
    setPaso(Math.max(0, siguiente))
  }

  /**
   * Copia la elección de la primera persona al resto del grupo.
   * Solo copia un tiempo si la opción existe también en la lista del destino:
   * así el plato de adulto no se le cuela a un niño, pero la bebida —que es
   * común— sí se propaga.
   */
  function aplicarATodos() {
    const origen = personasMenu[0]
    const eleccionOrigen = elecciones[origen.indice] || {}

    setElecciones((prev) => {
      const siguiente = { ...prev }
      for (const p of personasMenu) {
        if (p.indice === origen.indice) continue
        const copia = { ...(siguiente[p.indice] || {}) }
        for (const curso of CURSOS) {
          const id = eleccionOrigen[curso.clave]
          if (!id) continue
          const disponibles = opcionesPara(curso.clave, p.tipo, config)
          if (disponibles.some((o) => o.id === id)) copia[curso.clave] = id
        }
        siguiente[p.indice] = copia
      }
      return siguiente
    })
  }

  /*
    Volver a dejar la respuesta en blanco. Rebobina también el asistente: si
    cambia de "sí" a "no" y luego se arrepiente, empezar el menú por la mitad
    sería desconcertante.
  */
  function cambiarRespuesta() {
    setRespuesta(null)
    setPaso(0)
    setError('')
    setErrorPaso('')
  }

  const totalDelGrupo = totalPersonas(invitado)
  const vaAcompanado = totalDelGrupo > 1
  const textoAcompanantes = resumenAcompanantes(invitado)
  const personas = personasDelGrupo(invitado)

  return (
    <main className="mx-auto max-w-md px-6 py-10">
      <Encabezado />

      {/* --- Ya confirmó antes: mostramos estado y QR, sin repetir el formulario --- */}
      {yaRespondio ? (
        <div className="tarjeta">
          {invitado.confirmacion === 'Si' ? (
            <>
              <h2 className="font-titulo text-2xl">¡Gracias por confirmar, {invitado.nombre}!</h2>
              <p className="mt-2 text-texto/70">
                {vaAcompanado
                  ? `Los esperamos. Este pase vale por ${totalDelGrupo} personas:`
                  : 'Te esperamos. Este es tu pase de entrada:'}
              </p>
              <div className="mt-6">
                <CodigoQR invitadoId={invitado.id} nombre={invitado.nombre} />
              </div>
              {vaAcompanado && (
                <p className="mt-4 text-center text-sm text-texto/60">
                  Incluye a {textoAcompanantes}. Con un solo código entran todos, no hace falta que
                  cada quien traiga el suyo.
                </p>
              )}
              {hayMenuConfigurado(config) && (
                <div className="mt-6 rounded-xl bg-reposo px-4 py-3 text-sm">
                  <p className="font-medium">Su menú</p>
                  <ul className="mt-2 space-y-1 text-texto/70">
                    {personas.map((p) => {
                      if (p.tipo === 'bebe') return null
                      const elegido = resumenEleccion(invitado, p, config)
                      return (
                        <li key={p.indice}>
                          <span className="text-texto">{p.nombre}:</span>{' '}
                          {elegido || <span className="text-texto/60">sin elegir</span>}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}

              {invitado.restricciones && (
                <p className="mt-4 rounded-xl bg-reposo px-4 py-3 text-sm text-texto/70">
                  <span className="font-medium">Anotamos:</span> {invitado.restricciones}
                </p>
              )}
            </>
          ) : (
            <>
              <h2 className="font-titulo text-2xl">Gracias por avisarnos, {invitado.nombre}</h2>
              <p className="mt-2 text-texto/70">
                Lamentamos que no puedas acompañarnos. Te vamos a extrañar.
              </p>
            </>
          )}

          <p className="mt-6 text-center text-xs text-texto/50">
            ¿Te equivocaste o cambiaron tus planes? Escríbenos y lo ajustamos.
          </p>
        </div>
      ) : (
        /* --- Aún no responde: formulario --- */
        <div className="tarjeta">
          <h2 className="font-titulo text-2xl">Hola, {invitado.nombre}</h2>
          {!respuesta && (
            <p className="mt-2 text-texto/70">
              {vaAcompanado
                ? 'Nos encantaría que nos acompañaran. ¿Podrán asistir?'
                : 'Nos encantaría que nos acompañaras. ¿Podrás asistir?'}
            </p>
          )}

          {vaAcompanado && (
            <p className="mt-3 rounded-xl bg-reposo px-4 py-3 text-sm text-texto/70">
              Tu invitación incluye <strong>{totalDelGrupo} lugares</strong>: tú y{' '}
              {textoAcompanantes}. Al confirmar, respondes por todos.
            </p>
          )}
          {!respuesta && EVENTO.limiteConfirmacion !== 'Por definir' && (
            <p className="mt-1 text-sm text-texto/60">
              Confirma antes del {EVENTO.limiteConfirmacion}.
            </p>
          )}

          {/*
            La pregunta solo se hace UNA vez. En cuanto responde, los dos
            botones se recogen en una línea con lo que eligió y un "Cambiar":
            seguir enseñando "¿Podrás asistir?" encima del menú que acaba de
            elegir hace pensar que no se guardó nada y que hay que empezar otra
            vez. Sigue pudiendo cambiarla hasta que le da a enviar.
          */}
          {!respuesta ? (
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                onClick={() => setRespuesta('Si')}
                className="btn border border-accion bg-accion text-sobreColor"
              >
                Sí, asistiré
              </button>
              <button
                onClick={() => setRespuesta('No')}
                className="btn border border-linea bg-superficie text-texto"
              >
                No podré
              </button>
            </div>
          ) : (
            <div className="mt-6 flex items-center justify-between gap-3 rounded-xl border border-linea px-4 py-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-texto/60">Tu respuesta</p>
                <p className="font-medium">
                  {respuesta === 'Si'
                    ? vaAcompanado
                      ? 'Sí, asistiremos'
                      : 'Sí, asistiré'
                    : vaAcompanado
                      ? 'No podremos'
                      : 'No podré'}
                </p>
              </div>
              <button
                onClick={cambiarRespuesta}
                className="btn-secundario shrink-0 px-4 py-2 text-sm"
              >
                Cambiar
              </button>
            </div>
          )}

          {/* --- Menú, una persona por pantalla --- */}
          {enAsistente && (
            <div className="mt-6">
              <p className="mb-3 text-sm font-medium">
                {personasMenu.length > 1 ? '¿Qué van a querer?' : '¿Qué vas a querer?'}
              </p>
              <AsistenteMenu
                personas={personasMenu}
                paso={paso}
                config={config}
                elecciones={elecciones}
                error={errorPaso}
                onPaso={avanzar}
                onAplicarATodos={aplicarATodos}
                onCambio={(indice, curso, valor) => {
                  setErrorPaso('')
                  setElecciones((prev) => ({
                    ...prev,
                    [indice]: { ...(prev[indice] || {}), [curso]: valor },
                  }))
                }}
              />
            </div>
          )}

          {/* --- Tramo final: solo tras pasar por el menú --- */}
          {!enAsistente && (
            <>
              {respuesta === 'Si' && personasMenu.length > 0 && (
                <div className="mt-6 rounded-xl bg-reposo px-4 py-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <ul className="space-y-1 text-texto/70">
                      {personasMenu.map((p) => (
                        <li key={p.indice}>
                          <span className="text-texto">{p.nombre}:</span>{' '}
                          {textoEleccion(elecciones[p.indice], p.tipo, config)}
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => setPaso(0)}
                      className="shrink-0 text-xs text-accion underline"
                    >
                      Cambiar
                    </button>
                  </div>
                </div>
              )}

              {respuesta === 'Si' && (
                <div className="mt-6">
                  <label htmlFor="restricciones" className="mb-2 block text-sm font-medium">
                    ¿Alguna restricción alimenticia?{' '}
                    <span className="font-normal text-texto/60">(opcional)</span>
                  </label>
                  <textarea
                    id="restricciones"
                    rows={2}
                    maxLength={LIMITE_RESTRICCIONES}
                    value={restricciones}
                    onChange={(e) => setRestricciones(e.target.value)}
                    placeholder="Vegetariano, alergia a los mariscos, sin gluten…"
                    className="campo resize-none"
                  />
                </div>
              )}

              {respuesta && (
                <div className="mt-4">
                  <label htmlFor="mensaje" className="mb-2 block text-sm font-medium">
                    Un mensaje para los novios{' '}
                    <span className="font-normal text-texto/60">(opcional)</span>
                  </label>
                  <textarea
                    id="mensaje"
                    rows={3}
                    maxLength={LIMITE_MENSAJE}
                    value={mensaje}
                    onChange={(e) => setMensaje(e.target.value)}
                    className="campo resize-none"
                  />
                </div>
              )}

              {error && <p className="mt-4 text-sm text-alerta">{error}</p>}

              {/*
                El botón de enviar no aparece hasta que hay respuesta. Antes se
                veía apagado desde el principio, y un botón deshabilitado no
                explica qué falta para poder pulsarlo.
              */}
              {respuesta && (
                <button onClick={guardar} disabled={guardando} className="btn-primario mt-6 w-full">
                  {guardando ? 'Guardando…' : 'Enviar confirmación'}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </main>
  )
}
