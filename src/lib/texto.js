/**
 * Normaliza texto para buscar: sin acentos, sin signos y en minúsculas.
 *
 * Hace falta porque los nombres del Excel vienen con acentos irregulares
 * ("Lucía" / "Lucia", "TOÑITA") y quien busca en la puerta escribe con prisa.
 *
 * NFD separa cada letra acentuada en letra + marca combinante, y el filtro
 * alfanumérico descarta las marcas: "Ordóñez" -> "ordonez".
 *
 * Los espacios repetidos se colapsan a uno: el Excel trae nombres como
 * "JAVIER  C." con doble espacio, y en la puerta nadie va a teclear dos.
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
