import { getAuth } from 'firebase/auth'
import { app } from './firebase.js'

/**
 * Autenticación de los novios/staff.
 *
 * Este módulo debe importarse ÚNICAMENTE desde la zona privada
 * (AuthContext). Importarlo desde la página de RSVP metería el SDK de
 * Firebase Auth en el bundle público sin necesidad.
 */
export const auth = getAuth(app)
