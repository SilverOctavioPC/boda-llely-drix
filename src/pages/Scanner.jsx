import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Html5Qrcode } from 'html5-qrcode'
import { collection, doc, onSnapshot, runTransaction, serverTimestamp } from 'firebase/firestore'
import { db, COLECCION } from '../lib/firebase.js'
import { normalizar } from '../lib/texto.js'
import { esEscaner } from '../lib/roles.js'
import { useAuth } from '../context/contextoAuth.js'
import { nombresAcompanantes, resumenAcompanantes, totalPersonas } from '../lib/acompanantes.js'

const ID_LECTOR = 'lector-qr'
// Tiempo que se ignora un mismo código tras leerlo, para que la cámara no
// dispare la misma verificación decenas de veces por segundo.
const ENFRIAMIENTO_MS = 3000
// Con 210 invitados, mostrar más resultados solo obliga a hacer scroll.
const MAX_RESULTADOS = 12

const ESTILOS = {
  valido: { caja: 'bg-emerald-600 text-white', titulo: '✓ Adelante' },
  yaUsado: { caja: 'bg-amber-500 text-white', titulo: '⚠ Ya registrado' },
  noConfirmo: { caja: 'bg-red-600 text-white', titulo: '✕ No confirmó' },
  noEncontrado: { caja: 'bg-red-600 text-white', titulo: '✕ Código no válido' },
}

export default function Scanner() {
  const { usuario, salir } = useAuth()
  const [modo, setModo] = useState('camara') // 'camara' | 'buscar'
  const [resultado, setResultado] = useState(null)
  const [errorCamara, setErrorCamara] = useState('')
  const [invitados, setInvitados] = useState([])
  const [busqueda, setBusqueda] = useState('')

  // Refs en vez de estado: se leen dentro del callback de la cámara, que se
  // registra una sola vez y no debe re-crearse en cada render.
  const ultimoRef = useRef({ texto: null, cuando: 0 })
  const procesandoRef = useRef(false)
  // Espeja `resultado` para poder consultarlo desde el callback de la cámara.
  const hayResultadoRef = useRef(false)

  // Toda la lista se mantiene en memoria: así la búsqueda es instantánea y no
  // gasta lecturas de Firestore con cada tecla.
  useEffect(() => {
    return onSnapshot(collection(db, COLECCION), (snap) =>
      setInvitados(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    )
  }, [])

  // El conteo es de PERSONAS: un grupo de 4 suma 4, no 1.
  const conteo = useMemo(() => {
    let esperados = 0
    let dentro = 0
    for (const i of invitados) {
      const personas = totalPersonas(i)
      if (i.confirmacion === 'Si') esperados += personas
      if (i.entradaRegistrada) dentro += personas
    }
    return { esperados, dentro }
  }, [invitados])

  const resultadosBusqueda = useMemo(() => {
    const q = normalizar(busqueda)
    if (q.length < 2) return []
    return invitados
      .filter((i) => normalizar(i.nombre).includes(q))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
      .slice(0, MAX_RESULTADOS)
  }, [invitados, busqueda])

  /**
   * Registra la entrada de forma atómica.
   * La transacción evita que dos celulares escaneando a la vez marquen
   * la misma entrada como "primera vez" y descuadren el conteo.
   */
  async function registrarEntrada(invitadoId) {
    const ref = doc(db, COLECCION, invitadoId)
    return runTransaction(db, async (tx) => {
      const snap = await tx.get(ref)
      if (!snap.exists()) return { tipo: 'noEncontrado' }

      const datos = snap.data()
      const comunes = {
        nombre: datos.nombre,
        personas: totalPersonas(datos),
        acompanantes: resumenAcompanantes(datos),
        nombres: nombresAcompanantes(datos),
      }

      if (datos.confirmacion !== 'Si') {
        return { tipo: 'noConfirmo', ...comunes, confirmacion: datos.confirmacion }
      }
      if (datos.entradaRegistrada) {
        return { tipo: 'yaUsado', ...comunes }
      }

      tx.update(ref, { entradaRegistrada: true, fechaEntrada: serverTimestamp() })
      return { tipo: 'valido', ...comunes, mesa: datos.mesa }
    })
  }

  function mostrar(res) {
    setResultado(res)
    hayResultadoRef.current = true
  }

  function cerrarResultado() {
    setResultado(null)
    hayResultadoRef.current = false
  }

  async function procesar(invitadoId) {
    try {
      const res = await registrarEntrada(invitadoId)
      mostrar(res)
      if (navigator.vibrate) navigator.vibrate(res.tipo === 'valido' ? 80 : [60, 60, 60])
      return res
    } catch (e) {
      console.error(e)
      mostrar({ tipo: 'noEncontrado' })
    }
  }

  async function alLeer(texto) {
    const ahora = Date.now()
    // Ignora relecturas del mismo código y lecturas mientras se procesa otra.
    if (procesandoRef.current) return
    /*
      Mientras el resultado está en pantalla, la cámara sigue leyendo pero no
      la ve nadie: el resultado la tapa entera. Sin esto, el celular del
      siguiente invitado entrando en cuadro reemplazaría el resultado del
      anterior sin que el personal lo hubiera confirmado. Se retoma al pulsar
      "Escanear siguiente".
    */
    if (hayResultadoRef.current) return
    if (ultimoRef.current.texto === texto && ahora - ultimoRef.current.cuando < ENFRIAMIENTO_MS) {
      return
    }
    ultimoRef.current = { texto, cuando: ahora }
    procesandoRef.current = true
    try {
      // El QR contiene únicamente el ID del documento de Firestore.
      await procesar(texto.trim())
    } finally {
      procesandoRef.current = false
    }
  }

  async function alElegirDeLaLista(invitado) {
    await procesar(invitado.id)
    setBusqueda('')
  }

  // La cámara solo vive mientras estamos en su modo: apagarla al buscar
  // ahorra batería y evita lecturas accidentales del bolsillo de al lado.
  useEffect(() => {
    if (modo !== 'camara') return

    // `corriendo` es local a esta ejecución del efecto, no un ref compartido:
    // al alternar rápido entre modos conviven dos instancias un instante, y un
    // estado común haría que la limpieza de una apagara la otra.
    let corriendo = false
    let cancelado = false
    let scanner

    // El constructor lanza si el div no está montado. Puede pasar tras un
    // error de permisos, así que se controla en vez de tumbar la pantalla.
    try {
      scanner = new Html5Qrcode(ID_LECTOR, { verbose: false })
    } catch (e) {
      console.error(e)
      // La regla avisa de renders en cascada por hacer setState dentro de un
      // efecto. Aquí es una vía de error que solo se recorre si el constructor
      // revienta: pasa una vez y deja la pantalla quieta con el mensaje. Sacarlo
      // del efecto obligaría a un estado intermedio que enturbiaría el caso
      // normal para ahorrar un render que nadie llega a ver.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setErrorCamara('No se pudo inicializar la cámara. Recarga la página.')
      return
    }

    scanner
      .start(
        { facingMode: 'environment' },
        {
          fps: 15,

          /*
            El recuadro se adapta al ancho real de la cámara en vez de quedarse
            en 250px fijos. Con el fijo, en pantallas grandes el invitado tenía
            que acercar mucho el QR para que cayera dentro.
          */
          qrbox: (anchoVisor, altoVisor) => {
            const lado = Math.floor(Math.min(anchoVisor, altoVisor) * 0.75)
            return { width: lado, height: lado }
          },

          /*
            Usa el detector de códigos del propio navegador cuando existe
            (Chrome en Android, Safari 17+). Va mucho más rápido que decodificar
            por JavaScript, que es lo que hacía antes. Donde no exista, la
            librería vuelve sola a su decodificador.

            Importa sobre todo aquí: casi todos los invitados van a enseñar el
            QR en la pantalla del celular, y una pantalla brilla, se mueve y
            refresca — es más difícil de leer que un papel.
          */
          experimentalFeatures: { useBarCodeDetectorIfSupported: true },
        },
        alLeer,
        // Este callback se dispara en cada frame sin código; lo ignoramos.
        () => {}
      )
      .then(() => {
        if (cancelado) {
          // Cambiamos de modo mientras la cámara arrancaba.
          scanner.stop().catch(() => {})
        } else {
          corriendo = true
          setErrorCamara('')
        }
      })
      .catch((e) => {
        console.error(e)
        setErrorCamara(
          'No pudimos acceder a la cámara. Concede el permiso en el navegador y recarga. ' +
            'La cámara solo funciona en HTTPS o en localhost.'
        )
      })

    return () => {
      cancelado = true
      if (corriendo) {
        corriendo = false
        scanner
          .stop()
          .then(() => scanner.clear())
          .catch(() => {})
      }
    }
    // `alLeer` solo usa refs y setState, que son estables entre renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo])

  const estilo = resultado ? ESTILOS[resultado.tipo] : null

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-titulo text-2xl">Acceso</h1>
        {/* La cuenta de la puerta no tiene panel: le ofrecemos salir. */}
        {esEscaner(usuario) ? (
          <button onClick={salir} className="text-sm text-carbon/50 underline">
            Salir
          </button>
        ) : (
          <Link to="/admin" className="text-sm text-salviaOscuro underline">
            Volver al panel
          </Link>
        )}
      </div>

      <div className="tarjeta mb-4 flex items-center justify-between p-4">
        <span className="text-sm text-carbon/60">Han entrado</span>
        <span className="font-titulo text-3xl tabular-nums">
          {conteo.dentro}
          <span className="text-lg text-carbon/40"> / {conteo.esperados}</span>
        </span>
      </div>

      {/* Dos formas de registrar: el QR y, para quien llegue sin él, el nombre. */}
      <div className="mb-4 grid grid-cols-2 gap-2">
        {[
          { id: 'camara', texto: 'Escanear QR' },
          { id: 'buscar', texto: 'Buscar por nombre' },
        ].map((op) => (
          <button
            key={op.id}
            onClick={() => {
              setModo(op.id)
              cerrarResultado()
            }}
            aria-pressed={modo === op.id}
            className={`btn border py-2 text-sm ${
              modo === op.id
                ? 'border-salvia bg-salvia text-white'
                : 'border-arena bg-white text-carbon'
            }`}
          >
            {op.texto}
          </button>
        ))}
      </div>

      {modo === 'camara' ? (
        <div>
          {errorCamara && (
            <p className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorCamara} <strong>Mientras tanto, usa “Buscar por nombre”.</strong>
            </p>
          )}
          {/*
            El contenedor se monta siempre en este modo, aunque haya error.
            html5-qrcode lo busca por id al arrancar y lanza si no existe:
            si se ocultara, volver aquí tras un error tumbaría la pantalla.
          */}
          <div
            id={ID_LECTOR}
            className="overflow-hidden rounded-2xl border border-arena bg-black"
          />
        </div>
      ) : (
        <div>
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Nombre del invitado…"
            autoFocus
            className="campo"
            aria-label="Buscar invitado por nombre"
          />

          <p className="mt-2 text-xs text-carbon/50">
            Para quien llegue sin su código: sin celular, sin batería o sin el mensaje. Toca su
            nombre para registrar el acceso.
          </p>

          <div className="mt-3 space-y-2">
            {resultadosBusqueda.map((i) => {
              const personas = totalPersonas(i)
              const puedeEntrar = i.confirmacion === 'Si' && !i.entradaRegistrada
              return (
                <button
                  key={i.id}
                  onClick={() => alElegirDeLaLista(i)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-arena bg-white px-4 py-3 text-left hover:bg-arena/40"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{i.nombre}</span>
                    <span className="text-xs text-carbon/50">
                      {personas > 1 ? `${personas} personas` : '1 persona'}
                      {i.mesa && ` · Mesa ${i.mesa}`}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs">
                    {i.entradaRegistrada ? (
                      <span className="text-amber-600">Ya entró</span>
                    ) : i.confirmacion === 'Si' ? (
                      <span className="text-salviaOscuro">Confirmado</span>
                    ) : (
                      <span className="text-red-600">{i.confirmacion || 'Pendiente'}</span>
                    )}
                  </span>
                  {puedeEntrar && <span className="sr-only">Registrar acceso</span>}
                </button>
              )
            })}

            {normalizar(busqueda).length >= 2 && resultadosBusqueda.length === 0 && (
              <p className="py-6 text-center text-sm text-carbon/50">
                Nadie coincide con “{busqueda}”.
              </p>
            )}
          </div>
        </div>
      )}

      {/*
        El resultado ocupa TODA la pantalla, no un bloque debajo de la cámara.
        Antes quedaba fuera de vista en el celular: escaneabas y tenías que
        bajar la mirada para saber si había entrado. En la puerta, con gente
        esperando, eso no funciona. Ahora el color llena la pantalla y se ve
        de reojo y a distancia.
      */}
      {resultado && (
        <div
          role="alert"
          className={`fixed inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto p-6 text-center ${estilo.caja}`}
        >
          <p className="font-titulo text-4xl">{estilo.titulo}</p>

          {resultado.nombre && <p className="mt-3 text-2xl font-medium">{resultado.nombre}</p>}

          {/* Lo más importante para quien está en la puerta: cuántos pasan. */}
          {resultado.personas > 1 && (
            <div className="mt-3 rounded-xl bg-white/20 px-4 py-3">
              <p className="font-titulo text-3xl tabular-nums">{resultado.personas} personas</p>
              {resultado.acompanantes && (
                <p className="mt-1 text-sm opacity-90">Titular + {resultado.acompanantes}</p>
              )}
              {resultado.nombres?.length > 0 && (
                <ul className="mt-2 space-y-0.5 text-sm opacity-90">
                  {resultado.nombres.map((n, i) => (
                    <li key={i}>· {n}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {resultado.tipo === 'valido' && resultado.mesa && (
            <p className="mt-2 opacity-90">Mesa {resultado.mesa}</p>
          )}
          {resultado.tipo === 'yaUsado' && (
            <p className="mt-1 text-sm opacity-90">
              Este pase ya se usó para entrar. Verifica con la persona.
            </p>
          )}
          {resultado.tipo === 'noConfirmo' && (
            <p className="mt-1 text-sm opacity-90">
              Aparece como “{resultado.confirmacion || 'Pendiente'}”. Consulta con los novios.
            </p>
          )}
          {resultado.tipo === 'noEncontrado' && (
            <p className="mt-1 text-sm opacity-90">Este código no corresponde a ningún invitado.</p>
          )}

          {/* Botón grande: se pulsa con una mano, sin mirar y con prisa. */}
          <button
            onClick={cerrarResultado}
            autoFocus
            className="mt-8 w-full max-w-xs rounded-2xl bg-white/25 px-6 py-4 text-lg font-medium active:bg-white/40"
          >
            {modo === 'camara' ? 'Escanear siguiente' : 'Buscar otro'}
          </button>
        </div>
      )}

      {modo === 'camara' && (
        <p className="mt-6 text-center text-xs text-carbon/50">
          Apunta al código QR del invitado. El resultado aparece automáticamente.
        </p>
      )}
    </main>
  )
}
