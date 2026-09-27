import { useCallback, useEffect, useRef, useState } from 'react'

/* Carga y auto-refresco de rankings.
 *
 * Antes cada juego tenia su propio useEffect con deps [] que:
 *   - corria UNA sola vez al montar, asi que si el fetch fallaba la
 *     pantalla se quedaba vacia hasta que el interval de 5s reintentaba,
 *   - mezclaba "el server fallo" con "nadie fallo todavia": el catch caia
 *     al ranking local y se mostraba el EmptyState como si fuera normal,
 *   - dependia de que State.currentTab ya estuviera seteado al montar.
 *
 * `cargar` debe devolver { list, degraded }:
 *   - list:     el ranking (del server o del fallback local)
 *   - degraded: true cuando vino del fallback local, o sea que hay un
 *               problema de red/servidor y esos datos pueden no estar
 *               completos. Con eso la UI puede avisar en vez de mentir. */
export function useRanking({ activo = true, cadaMs = 5000, retries = 3, sort }) {
  const [ranking, setRanking] = useState([])
  const [cargando, setCargando] = useState(true)
  const [degraded, setDegraded] = useState(false)
  const timer = useRef(null)
  const retry = useRef(null)
  const intento = useRef(0)
  const aliveRef = useRef(true)

  const run = useCallback(async cargar => {
    if (!aliveRef.current) return
    try {
      const out = await cargar()
      if (!aliveRef.current) return
      const list = Array.isArray(out) ? out : (out && out.list) || []
      setRanking(sort ? list.slice().sort(sort) : list)
      setDegraded(!!(out && out.degraded))
      setCargando(false)
      intento.current = 0
    } catch (e) {
      if (!aliveRef.current) return
      setDegraded(true)
      setCargando(false)
    }
  }, [sort])

  useEffect(() => {
    aliveRef.current = true
    if (!activo) return () => { aliveRef.current = false }

    const canceled = { v: false }
    const tick = () => { if (!canceled.v) run(cargar) }
    tick()
    timer.current = setInterval(tick, cadaMs)

    /* Reintentos rapidos mientras el server no responde: si es un cold
       start de Supabase o un deploy recien salido, se recupera solo. */
    retry.current = setInterval(() => {
      if (canceled.v || intento.current >= retries) return
      intento.current++
      run(cargar)
    }, 1500)

    /* Al volver de otra pestana los datos pueden estar viejos. */
    const onVisible = () => { if (document.visibilityState === 'visible') run(cargar) }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      canceled.v = true
      aliveRef.current = false
      clearInterval(timer.current)
      clearInterval(retry.current)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [activo, cadaMs, retries, run, cargar])

  return { ranking, cargando, degraded }
}
