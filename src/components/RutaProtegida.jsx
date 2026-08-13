import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/contextoAuth.js'
import { esEscaner } from '../lib/roles.js'
import Cargando from './Cargando.jsx'

/**
 * Exige sesión iniciada. Con `soloNovios`, además impide que la cuenta de la
 * puerta entre al panel: la mandamos a lo suyo en vez de enseñarle una
 * pantalla que las reglas le van a rechazar a medias.
 *
 * Esto es comodidad, no seguridad. Quien protege de verdad es firestore.rules.
 */
export default function RutaProtegida({ children, soloNovios = false }) {
  const { usuario, cargando } = useAuth()

  if (cargando) return <Cargando texto="Verificando sesión…" />

  if (!usuario) {
    // No se guarda a dónde iba: tras el login, cada cuenta va siempre a su
    // sitio (novios al panel, puerta al escáner). Respetar la ruta anterior
    // hacía que los novios aterrizaran en el escáner por haber pasado antes
    // por /admin/scanner sin sesión.
    return <Navigate to="/login" replace />
  }

  if (soloNovios && esEscaner(usuario)) {
    return <Navigate to="/admin/scanner" replace />
  }

  return children
}
