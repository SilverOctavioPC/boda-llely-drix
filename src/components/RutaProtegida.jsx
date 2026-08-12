import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
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
  const location = useLocation()

  if (cargando) return <Cargando texto="Verificando sesión…" />

  if (!usuario) {
    // Guardamos a dónde iba para volver ahí después del login.
    return <Navigate to="/login" replace state={{ destino: location.pathname }} />
  }

  if (soloNovios && esEscaner(usuario)) {
    return <Navigate to="/admin/scanner" replace />
  }

  return children
}
