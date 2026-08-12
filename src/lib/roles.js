/**
 * Roles de las cuentas del staff.
 *
 * Hay dos perfiles:
 *
 *   NOVIOS  — control total: alta y baja de invitados, menú, exportar.
 *   ESCÁNER — solo puede leer la lista y marcar accesos en la puerta.
 *
 * El rol se decide por el correo. Es deliberado: con dos o tres cuentas fijas,
 * tenerlo escrito en las reglas es más simple y auditable que gestionar
 * custom claims, que además obligan a cerrar sesión para refrescar el token.
 *
 * ⚠️ Si cambias este correo, cambia también `firestore.rules` y vuelve a
 * publicarlas. Están acopladas a propósito: el navegador decide qué se ve,
 * pero quien manda de verdad son las reglas.
 */
export const CORREO_ESCANER = 'escaner@bodallelydrix.com'

/** ¿Esta sesión es la cuenta limitada de la puerta? */
export function esEscaner(usuario) {
  return usuario?.email?.toLowerCase().trim() === CORREO_ESCANER
}

/** Ruta a la que mandar a cada perfil al iniciar sesión. */
export function inicioDe(usuario) {
  return esEscaner(usuario) ? '/admin/scanner' : '/admin'
}
