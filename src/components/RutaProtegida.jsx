import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import Cargando from './Cargando.jsx'

export default function RutaProtegida({ children }) {
  const { usuario, cargando } = useAuth()
  const location = useLocation()

  if (cargando) return <Cargando texto="Verificando sesión…" />

  if (!usuario) {
    // Guardamos a dónde iba para volver ahí después del login.
    return <Navigate to="/login" replace state={{ destino: location.pathname }} />
  }

  return children
}
