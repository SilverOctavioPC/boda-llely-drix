import { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import Rsvp from './pages/Rsvp.jsx'
import Cargando from './components/Cargando.jsx'

/**
 * Todo lo privado (login, panel, escáner y Firebase Auth) vive en un chunk
 * aparte que se descarga solo al entrar a /admin.
 *
 * Importa: la mayoría de los invitados abre su link desde WhatsApp en el
 * celular, muchas veces con datos móviles. La página de RSVP no debe cargar
 * la librería del escáner ni el módulo de autenticación.
 */
const ZonaPrivada = lazy(() => import('./ZonaPrivada.jsx'))

export default function App() {
  return (
    <Suspense fallback={<Cargando />}>
      <Routes>
        <Route path="/rsvp/:invitadoId" element={<Rsvp />} />
        <Route path="/*" element={<ZonaPrivada />} />
      </Routes>
    </Suspense>
  )
}
