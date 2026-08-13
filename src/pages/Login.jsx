import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/contextoAuth.js'
import Cargando from '../components/Cargando.jsx'
import { EVENTO } from '../lib/evento.js'
import { inicioDe } from '../lib/roles.js'

// Traducimos los códigos de Firebase a algo legible.
function mensajeDeError(codigo) {
  switch (codigo) {
    case 'auth/invalid-email':
      return 'El correo no tiene un formato válido.'
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Correo o contraseña incorrectos.'
    case 'auth/too-many-requests':
      return 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.'
    case 'auth/network-request-failed':
      return 'Sin conexión. Revisa tu internet.'
    default:
      return 'No pudimos iniciar sesión. Inténtalo de nuevo.'
  }
}

export default function Login() {
  const { usuario, cargando, entrar, salir } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  if (cargando) return <Cargando texto="Verificando sesión…" />

  /*
    Con sesión abierta NO se redirige en silencio.

    Antes sí: quien entrara a /login con la sesión del escáner rebotaba al
    escáner antes de ver el formulario, y /admin también lo devolvía ahí. El
    resultado era quedarse encerrado en la cuenta de la puerta, sin manera
    visible de entrar como novios en ese navegador. La sesión de Firebase no
    caduca, así que el encierro era permanente.
  */
  if (usuario) {
    const inicio = inicioDe(usuario)
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
        <div className="mb-8 text-center">
          <h1 className="font-titulo text-3xl">{EVENTO.novios}</h1>
          <p className="mt-2 text-sm text-carbon/60">Ya hay una sesión abierta</p>
        </div>

        <div className="tarjeta text-center">
          <p className="text-sm text-carbon/60">Estás dentro como</p>
          <p className="mt-1 break-all font-medium">{usuario.email}</p>

          <button
            onClick={() => navigate(inicio, { replace: true })}
            className="btn-primario mt-6 w-full"
          >
            Continuar
          </button>
          <button onClick={salir} className="btn-secundario mt-3 w-full">
            Entrar con otra cuenta
          </button>
        </div>
      </main>
    )
  }

  async function onSubmit(e) {
    e.preventDefault()
    setEnviando(true)
    setError('')
    try {
      const credencial = await entrar(email.trim(), password)
      /*
        Cada cuenta va SIEMPRE a su sitio: los novios al panel, la puerta al
        escáner. No se respeta "la ruta a la que ibas".

        Antes sí, y provocaba esto: quien abría /admin/scanner sin sesión dejaba
        guardado ese destino, así que al entrar como novios aterrizaba en el
        escáner en vez de en el panel. El destino guardado ignoraba el rol.
      */
      navigate(inicioDe(credencial.user), { replace: true })
    } catch (err) {
      setError(mensajeDeError(err.code))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <div className="mb-8 text-center">
        <h1 className="font-titulo text-3xl">{EVENTO.novios}</h1>
        <p className="mt-2 text-sm text-carbon/60">Panel de novios</p>
      </div>

      <form onSubmit={onSubmit} className="tarjeta">
        <label htmlFor="email" className="mb-2 block text-sm font-medium">
          Correo
        </label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="campo"
        />

        <label htmlFor="password" className="mb-2 mt-4 block text-sm font-medium">
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="campo"
        />

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <button type="submit" disabled={enviando} className="btn-primario mt-6 w-full">
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </main>
  )
}
