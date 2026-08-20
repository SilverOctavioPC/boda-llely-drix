export default function Cargando({ texto = 'Cargando…' }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-texto/60">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-linea border-t-accion"
        role="status"
        aria-label={texto}
      />
      <p className="text-sm">{texto}</p>
    </div>
  )
}
