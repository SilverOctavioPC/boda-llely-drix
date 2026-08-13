import { createContext, useContext } from 'react'

/**
 * El contexto y su hook viven aparte del proveedor a propósito.
 *
 * Un archivo que exporta componentes y no-componentes a la vez rompe el hot
 * reload de Vite: al editarlo recarga la página entera en lugar de conservar el
 * estado. Con el contexto aquí, `AuthContext.jsx` solo exporta el proveedor.
 *
 * Este módulo no importa `../lib/auth.js`: quien toca Firebase Auth es el
 * proveedor. Así el SDK sigue sin colarse en el bundle público.
 */
export const ContextoAuth = createContext(null)

export function useAuth() {
  const ctx = useContext(ContextoAuth)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
