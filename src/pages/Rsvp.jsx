import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { QRCodeCanvas } from 'qrcode.react'
import { db, COLECCION } from '../lib/firebase.js'
import { EVENTO } from '../lib/evento.js'
import { resumenAcompanantes, totalPersonas } from '../lib/acompanantes.js'
import {
  COLECCION_CONFIG,
  DOC_CONFIG,
  CONFIG_VACIA,
  eleccionDe,
  hayMenuConfigurado,
  leerConfig,
  nombreOpcion,
  personasDelGrupo,
  platosPara,
} from '../lib/menu.js'
import Cargando from '../components/Cargando.jsx'
import SelectorMenu from '../components/SelectorMenu.jsx'

const LIMITE_RESTRICCIONES = 300
const LIMITE_MENSAJE = 500

function Encabezado() {
  return (
    <header className="mb-8 text-center">
      <p className="text-xs uppercase tracking-[0.3em] text-oro">Nuestra boda</p>
      <h1 className="mt-2 font-titulo text-4xl">{EVENTO.novios}</h1>
      {EVENTO.fecha !== 'Por definir' && (
        <p className="mt-2 text-sm text-carbon/60">
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
      <div ref={contenedor} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-arena">
        <QRCodeCanvas
          value={invitadoId}
          size={220}
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
      <p className="mt-3 max-w-xs text-center text-xs text-carbon/50">
        Guarda una captura de este código. Lo presentarás en la entrada.
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
        const personas = personasDelGrupo(invitado)
        const propia = elecciones[-1] || {}
        cambios.menu = { plato: propia.plato || null, bebida: propia.bebida || null }

        const deAcompanantes = personas
          .filter((p) => !p.esTitular)
          .sort((a, b) => a.indice - b.indice)
          .map((p) => {
            const e = elecciones[p.indice] || {}
            return { plato: e.plato || null, bebida: e.bebida || null }
          })
        cambios.menuAcompanantes = deAcompanantes
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
          <p className="text-carbon/70">
            No encontramos esta invitación. Verifica que hayas abierto el link
            completo tal como te lo enviamos, o escríbenos directamente.
          </p>
        </div>
      </main>
    )
  }

  const yaRespondio = invitado.confirmacion === 'Si' || invitado.confirmacion === 'No'

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
              <h2 className="font-titulo text-2xl">
                ¡Gracias por confirmar, {invitado.nombre}!
              </h2>
              <p className="mt-2 text-carbon/70">
                {vaAcompanado
                  ? `Los esperamos. Este pase vale por ${totalDelGrupo} personas:`
                  : 'Te esperamos. Este es tu pase de entrada:'}
              </p>
              <div className="mt-6">
                <CodigoQR invitadoId={invitado.id} nombre={invitado.nombre} />
              </div>
              {vaAcompanado && (
                <p className="mt-4 text-center text-sm text-carbon/60">
                  Incluye a {textoAcompanantes}. Con un solo código entran todos,
                  no hace falta que cada quien traiga el suyo.
                </p>
              )}
              {hayMenuConfigurado(config) && (
                <div className="mt-6 rounded-xl bg-arena/50 px-4 py-3 text-sm">
                  <p className="font-medium">Su menú</p>
                  <ul className="mt-2 space-y-1 text-carbon/70">
                    {personas.map((p) => {
                      if (p.tipo === 'bebe') return null
                      const e = eleccionDe(invitado, p.indice)
                      const plato = nombreOpcion(e.plato, platosPara(p.tipo, config))
                      const bebida = nombreOpcion(e.bebida, config.bebidas)
                      const elegido = [plato, bebida].filter(Boolean).join(' · ')
                      return (
                        <li key={p.indice}>
                          <span className="text-carbon">{p.nombre}:</span>{' '}
                          {elegido || <span className="text-carbon/40">sin elegir</span>}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}

              {invitado.restricciones && (
                <p className="mt-4 rounded-xl bg-arena/50 px-4 py-3 text-sm text-carbon/70">
                  <span className="font-medium">Anotamos:</span> {invitado.restricciones}
                </p>
              )}
            </>
          ) : (
            <>
              <h2 className="font-titulo text-2xl">Gracias por avisarnos, {invitado.nombre}</h2>
              <p className="mt-2 text-carbon/70">
                Lamentamos que no puedas acompañarnos. Te vamos a extrañar.
              </p>
            </>
          )}

          <p className="mt-6 text-center text-xs text-carbon/50">
            ¿Te equivocaste o cambiaron tus planes? Escríbenos y lo ajustamos.
          </p>
        </div>
      ) : (
        /* --- Aún no responde: formulario --- */
        <div className="tarjeta">
          <h2 className="font-titulo text-2xl">Hola, {invitado.nombre}</h2>
          <p className="mt-2 text-carbon/70">
            {vaAcompanado
              ? 'Nos encantaría que nos acompañaran. ¿Podrán asistir?'
              : 'Nos encantaría que nos acompañaras. ¿Podrás asistir?'}
          </p>

          {vaAcompanado && (
            <p className="mt-3 rounded-xl bg-arena/50 px-4 py-3 text-sm text-carbon/70">
              Tu invitación incluye <strong>{totalDelGrupo} lugares</strong>: tú y{' '}
              {textoAcompanantes}. Al confirmar, respondes por todos.
            </p>
          )}
          {EVENTO.limiteConfirmacion !== 'Por definir' && (
            <p className="mt-1 text-sm text-carbon/50">
              Confirma antes del {EVENTO.limiteConfirmacion}.
            </p>
          )}

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              onClick={() => setRespuesta('Si')}
              aria-pressed={respuesta === 'Si'}
              className={`btn border ${
                respuesta === 'Si'
                  ? 'border-salvia bg-salvia text-white'
                  : 'border-arena bg-white text-carbon'
              }`}
            >
              Sí asistiré
            </button>
            <button
              onClick={() => setRespuesta('No')}
              aria-pressed={respuesta === 'No'}
              className={`btn border ${
                respuesta === 'No'
                  ? 'border-carbon bg-carbon text-white'
                  : 'border-arena bg-white text-carbon'
              }`}
            >
              No podré
            </button>
          </div>

          {respuesta === 'Si' && hayMenuConfigurado(config) && (
            <div className="mt-6">
              <p className="mb-1 text-sm font-medium">
                {personas.length > 1 ? '¿Qué van a querer?' : '¿Qué vas a querer?'}
              </p>
              <p className="mb-3 text-xs text-carbon/50">Opcional</p>
              <SelectorMenu
                invitado={invitado}
                config={config}
                elecciones={elecciones}
                onCambio={(indice, campo, valor) =>
                  setElecciones((prev) => ({
                    ...prev,
                    [indice]: { ...(prev[indice] || {}), [campo]: valor },
                  }))
                }
              />
            </div>
          )}

          {respuesta === 'Si' && (
            <div className="mt-6">
              <label htmlFor="restricciones" className="mb-2 block text-sm font-medium">
                ¿Alguna restricción alimenticia?{' '}
                <span className="font-normal text-carbon/50">(opcional)</span>
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
                <span className="font-normal text-carbon/50">(opcional)</span>
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

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

          <button
            onClick={guardar}
            disabled={!respuesta || guardando}
            className="btn-primario mt-6 w-full"
          >
            {guardando ? 'Guardando…' : 'Enviar confirmación'}
          </button>
        </div>
      )}
    </main>
  )
}
