import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import RutaProtegida from './components/RutaProtegida.jsx'
import Cargando from './components/Cargando.jsx'
import Login from './pages/Login.jsx'
import Admin from './pages/Admin.jsx'
import { EVENTO } from './lib/evento.js'

// El escáner arrastra html5-qrcode (~300 kB). Se carga solo al abrirlo.
const Scanner = lazy(() => import('./pages/Scanner.jsx'))

function NoEncontrado() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <h1 className="font-titulo text-3xl">{EVENTO.novios}</h1>
      <p className="mt-4 text-carbon/70">
        Esta página no existe. Si buscas confirmar tu asistencia, abre el link que te enviamos por
        WhatsApp.
      </p>
    </div>
  )
}

export default function ZonaPrivada() {
  return (
    <AuthProvider>
      <Suspense fallback={<Cargando />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/admin"
            element={
              <RutaProtegida soloNovios>
                <Admin />
              </RutaProtegida>
            }
          />
          <Route
            path="/admin/scanner"
            element={
              <RutaProtegida>
                <Scanner />
              </RutaProtegida>
            }
          />
          <Route path="/" element={<Navigate to="/admin" replace />} />
          <Route path="*" element={<NoEncontrado />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  )
}
