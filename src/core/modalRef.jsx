import { useRef } from 'react'

/* Ref que espeja si hay modales abiertos (los juegos pausan sus timers
   mientras un modal esté abierto, igual que el código legacy). */
export function useModalRef(modals) {
  const ref = useRef(false)
  ref.current = modals && modals.length > 0
  return ref
}