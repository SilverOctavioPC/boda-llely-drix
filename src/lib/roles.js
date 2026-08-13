/**
 * Roles de las cuentas del staff.
 *
 * Hay dos perfiles:
 *
 *   NOVIOS  — control total: alta y baja de invitados, menú, exportar.
 *   ESCÁNER — solo puede leer la lista y marcar accesos en la puerta.
 *
 * El rol se decide por el correo. Es deliberado: con dos cuentas fijas, tenerlo
 * escrito en las reglas es más simple y auditable que gestionar custom claims,
 * que además obligan a cerrar sesión para refrescar el token.
 *
 * Los dos correos están en una LISTA BLANCA: cualquier otra cuenta que llegue a
 * existir no puede hacer nada, ni siquiera leer la lista. Antes bastaba con
 * tener sesión y no ser el escáner para mandar sobre todo, así que una cuenta
 * creada por error habría tenido control total.
 *
 * ⚠️ Si cambias un correo, cámbialo también en `firestore.rules` y vuelve a
 * publicarlas. Están acopladas a propósito: el navegador decide qué se ve, pero
 * quien manda de verdad son las reglas. Hay un test que comprueba que los
 * correos de ambos archivos coinciden.
 */
export const CORREO_ESCANER = 'escaner@bodallelydrix.com'
export const CORREO_NOVIOS = 'novios@bodallelydrix.com'

/** Las únicas cuentas que existen. Cualquier otra no tiene permiso a nada. */
export const CORREOS_STAFF = [CORREO_NOVIOS, CORREO_ESCANER]

const normalizarCorreo = (usuario) => usuario?.email?.toLowerCase().trim() || ''

/** ¿Esta sesión es la cuenta limitada de la puerta? */
export function esEscaner(usuario) {
  return normalizarCorreo(usuario) === CORREO_ESCANER
}

/** ¿Esta sesión es la cuenta de los novios? */
export function esNovios(usuario) {
  return normalizarCorreo(usuario) === CORREO_NOVIOS
}

/** Ruta a la que mandar a cada perfil al iniciar sesión. */
export function inicioDe(usuario) {
  return esEscaner(usuario) ? '/admin/scanner' : '/admin'
}
