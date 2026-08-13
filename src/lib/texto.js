/**
 * Normaliza texto para buscar: sin acentos, sin signos y en minúsculas.
 *
 * Hace falta porque los nombres se escriben con acentuación irregular
 * ("Lucía" / "Lucia", "TOÑITA") y quien busca en la puerta teclea con prisa,
 * a oscuras y con una mano.
 *
 * NFD separa cada letra acentuada en letra + marca combinante, y el filtro
 * alfanumérico descarta las marcas: "Ordóñez" -> "ordonez".
 *
 * Los espacios repetidos se colapsan a uno: al dar de alta es fácil que se
 * cuele un doble espacio ("JAVIER  C.") y en la puerta nadie va a teclear dos.
 */
export function normalizar(texto) {
  return (texto || '')
    .toString()
    .normalize('NFD')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .replace(/ +/g, ' ')
    .toLowerCase()
    .trim()
}
