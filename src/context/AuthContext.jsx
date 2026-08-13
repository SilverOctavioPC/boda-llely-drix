import { useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { auth } from '../lib/auth.js'
import { ContextoAuth } from './contextoAuth.js'

/**
 * Este archivo exporta ÚNICAMENTE el proveedor. El hook `useAuth` y el objeto
 * de contexto están en `contextoAuth.js` para no romper el hot reload; los
 * consumidores importan el hook desde allí.
 */
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

  return <ContextoAuth.Provider value={valor}>{children}</ContextoAuth.Provider>
}
