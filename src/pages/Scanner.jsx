import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Html5Qrcode } from 'html5-qrcode'
import { collection, doc, onSnapshot, runTransaction, serverTimestamp } from 'firebase/firestore'
import { db, COLECCION } from '../lib/firebase.js'
import {
  nombresAcompanantes,
  resumenAcompanantes,
  totalPersonas,
} from '../lib/acompanantes.js'

const ID_LECTOR = 'lector-qr'
// Tiempo que se ignora un mismo código tras leerlo, para que la cámara no
// dispare la misma verificación decenas de veces por segundo.
const ENFRIAMIENTO_MS = 3000

const ESTILOS = {
  valido: {
    caja: 'bg-emerald-600 text-white',
    titulo: '✓ Adelante',
  },
  yaUsado: {
    caja: 'bg-amber-500 text-white',
    titulo: '⚠ Ya registrado',
  },
  noConfirmo: {
    caja: 'bg-red-600 text-white',
    titulo: '✕ No confirmó',
  },
  noEncontrado: {
    caja: 'bg-red-600 text-white',
    titulo: '✕ Código no válido',
  },
}

export default function Scanner() {
  const [resultado, setResultado] = useState(null)
  const [errorCamara, setErrorCamara] = useState('')
  const [invitados, setInvitados] = useState([])

  // Refs en vez de estado: se leen dentro del callback de la cámara, que se
  // registra una sola vez y no debe re-crearse en cada render.
  const scannerRef = useRef(null)
  const corriendoRef = useRef(false)
  const ultimoRef = useRef({ texto: null, cuando: 0 })
  const procesandoRef = useRef(false)

  // Contador en vivo de entradas registradas vs. personas esperadas.
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
      if (datos.confirmacion !== 'Si') {
        return { tipo: 'noConfirmo', nombre: datos.nombre, confirmacion: datos.confirmacion }
      }
      if (datos.entradaRegistrada) {
        return {
          tipo: 'yaUsado',
          nombre: datos.nombre,
          personas: totalPersonas(datos),
          acompanantes: resumenAcompanantes(datos),
        }
      }

      tx.update(ref, { entradaRegistrada: true, fechaEntrada: serverTimestamp() })
      return {
        tipo: 'valido',
        nombre: datos.nombre,
        mesa: datos.mesa,
        personas: totalPersonas(datos),
        acompanantes: resumenAcompanantes(datos),
        nombres: nombresAcompanantes(datos),
      }
    })
  }

  async function alLeer(texto) {
    const ahora = Date.now()
    // Ignora relecturas del mismo código y lecturas mientras se procesa otra.
    if (procesandoRef.current) return
    if (ultimoRef.current.texto === texto && ahora - ultimoRef.current.cuando < ENFRIAMIENTO_MS) {
      return
    }
    ultimoRef.current = { texto, cuando: ahora }
    procesandoRef.current = true

    try {
      // El QR contiene únicamente el ID del documento de Firestore.
      const res = await registrarEntrada(texto.trim())
      setResultado(res)
      if (navigator.vibrate) navigator.vibrate(res.tipo === 'valido' ? 80 : [60, 60, 60])
    } catch (e) {
      console.error(e)
      setResultado({ tipo: 'noEncontrado' })
    } finally {
      procesandoRef.current = false
    }
  }

  useEffect(() => {
    const scanner = new Html5Qrcode(ID_LECTOR, { verbose: false })
    scannerRef.current = scanner
    let cancelado = false

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        alLeer,
        // Este callback se dispara en cada frame sin código; lo ignoramos.
        () => {}
      )
      .then(() => {
        if (cancelado) {
          // El componente se desmontó mientras la cámara arrancaba.
          scanner.stop().catch(() => {})
        } else {
          corriendoRef.current = true
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
      if (corriendoRef.current) {
        corriendoRef.current = false
        scanner
          .stop()
          .then(() => scanner.clear())
          .catch(() => {})
      }
    }
    // Se monta una sola vez: `alLeer` solo usa refs y setState, que son estables.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const estilo = resultado ? ESTILOS[resultado.tipo] : null

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-titulo text-2xl">Acceso</h1>
        <Link to="/admin" className="text-sm text-salviaOscuro underline">
          Volver al panel
        </Link>
      </div>

      <div className="tarjeta mb-4 flex items-center justify-between p-4">
        <span className="text-sm text-carbon/60">Han entrado</span>
        <span className="font-titulo text-3xl tabular-nums">
          {conteo.dentro}
          <span className="text-lg text-carbon/40"> / {conteo.esperados}</span>
        </span>
      </div>

      {errorCamara ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{errorCamara}</p>
      ) : (
        <div id={ID_LECTOR} className="overflow-hidden rounded-2xl border border-arena bg-black" />
      )}

      {resultado && (
        <div className={`mt-4 rounded-2xl p-6 text-center ${estilo.caja}`}>
          <p className="font-titulo text-2xl">{estilo.titulo}</p>

          {resultado.nombre && (
            <p className="mt-2 text-lg font-medium">{resultado.nombre}</p>
          )}

          {/* Lo más importante para quien está en la puerta: cuántos pasan. */}
          {resultado.personas > 1 && (
            <div className="mt-3 rounded-xl bg-white/20 px-4 py-3">
              <p className="font-titulo text-3xl tabular-nums">
                {resultado.personas} personas
              </p>
              {resultado.acompanantes && (
                <p className="mt-1 text-sm opacity-90">
                  Titular + {resultado.acompanantes}
                </p>
              )}
              {/* Nombres, para poder cotejar con quien está enfrente. */}
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
            <p className="mt-1 text-sm opacity-90">
              Este código no corresponde a ningún invitado.
            </p>
          )}

          <button
            onClick={() => setResultado(null)}
            className="mt-4 rounded-xl bg-white/20 px-5 py-2 font-medium"
          >
            Escanear siguiente
          </button>
        </div>
      )}

      <p className="mt-6 text-center text-xs text-carbon/50">
        Apunta al código QR del invitado. El resultado aparece automáticamente.
      </p>
    </main>
  )
}
