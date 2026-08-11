import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// Aviso temprano y claro si falta el .env, en vez de un error críptico de Firebase.
if (!config.apiKey || !config.projectId) {
  console.error(
    'Falta la configuración de Firebase. Copia .env.example a .env y rellena las variables VITE_FIREBASE_*.'
  )
}

export const app = initializeApp(config)
export const db = getFirestore(app)
export const COLECCION = 'invitados'

// OJO: la autenticación vive aparte, en ./auth.js
//
// Si se exportara `auth` desde aquí, la página pública de RSVP —que solo
// necesita `db`— arrastraría todo el SDK de Firebase Auth al bundle que
// descargan los invitados desde WhatsApp. Manténlos separados.
