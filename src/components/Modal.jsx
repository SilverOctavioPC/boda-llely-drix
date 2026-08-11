import { useEffect, useRef } from 'react'

/**
 * Modal accesible: se cierra con Escape o clic en el fondo, bloquea el scroll
 * de la página y devuelve el foco al elemento que lo abrió.
 *
 * En móvil aparece pegado abajo (hoja), que es más cómodo con una sola mano.
 */
export default function Modal({ abierto, onCerrar, titulo, children }) {
  const focoPrevio = useRef(null)
  const caja = useRef(null)

  useEffect(() => {
    if (!abierto) return

    focoPrevio.current = document.activeElement
    const scrollPrevio = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const alPulsar = (e) => {
      if (e.key === 'Escape') onCerrar()
    }
    document.addEventListener('keydown', alPulsar)

    // Lleva el foco dentro del modal para quien navega con teclado.
    caja.current?.focus()

    return () => {
      document.removeEventListener('keydown', alPulsar)
      document.body.style.overflow = scrollPrevio
      focoPrevio.current?.focus?.()
    }
  }, [abierto, onCerrar])

  if (!abierto) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
      onClick={onCerrar}
    >
      <div
        ref={caja}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl outline-none sm:max-w-md sm:rounded-2xl"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 className="font-titulo text-2xl">{titulo}</h2>
          <button
            onClick={onCerrar}
            aria-label="Cerrar"
            className="-mt-1 text-3xl leading-none text-carbon/40 hover:text-carbon"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
