import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
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
  const { usuario, cargando, entrar } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  if (cargando) return <Cargando texto="Verificando sesión…" />

  // Si ya hay sesión, no tiene sentido mostrar el formulario.
  // La cuenta de la puerta va directa al escáner, no al panel.
  if (usuario) return <Navigate to={location.state?.destino || inicioDe(usuario)} replace />

  async function onSubmit(e) {
    e.preventDefault()
    setEnviando(true)
    setError('')
    try {
      const credencial = await entrar(email.trim(), password)
      navigate(location.state?.destino || inicioDe(credencial.user), { replace: true })
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
