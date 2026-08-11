import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { auth } from '../lib/auth.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  // `cargando` evita el parpadeo en el que /admin redirige a /login
  // antes de que Firebase restaure la sesión guardada.
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUsuario(u)
      setCargando(false)
    })
  }, [])

  const valor = {
    usuario,
    cargando,
    entrar: (email, password) => signInWithEmailAndPassword(auth, email, password),
    salir: () => signOut(auth),
  }

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
