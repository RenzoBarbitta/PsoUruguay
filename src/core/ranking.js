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
export function useRanking({ activo = true, cadaMs = 5000, retries = 3, sort, cargar }) {
  const [ranking, setRanking] = useState([])
  const [cargando, setCargando] = useState(true)
  const [degraded, setDegraded] = useState(false)
  const [motivo, setMotivo] = useState(null)
  const timer = useRef(null)
  const retry = useRef(null)
  const intento = useRef(0)
  const falloRef = useRef(false)
  const aliveRef = useRef(true)

  const run = useCallback(async () => {
    if (!aliveRef.current) return
    try {
      const out = await cargar()
      if (!aliveRef.current) return
      const list = Array.isArray(out) ? out : (out && out.list) || []
      setRanking(sort ? list.slice().sort(sort) : list)
      setDegraded(!!(out && out.degraded))
      setCargando(false)
      if (out && out.motivo) setMotivo(out.motivo); else if (!out || !out.degraded) setMotivo(null)
      /* Los reintentos rapidos corren SOLO si el ultimo intento fallo.
         Antes se reseteaba el contador en el exito, y eso hacia que el
         interval de reintento disparara 3 veces mas aunque todo anduviera
         bien (multiplicaba las requests sin motivo). */
      falloRef.current = !!(out && out.degraded)
    } catch (e) {
      if (!aliveRef.current) return
      setDegraded(true)
      setCargando(false)
      falloRef.current = true
      setMotivo(e && (e.code || e.message) ? String(e.code || e.message) : 'error')
    }
  }, [sort])

  useEffect(() => {
    aliveRef.current = true
    if (!activo) return () => { aliveRef.current = false }

    const canceled = { v: false }
    intento.current = 0
    const tick = () => { if (!canceled.v) run() }
    tick()
    timer.current = setInterval(tick, cadaMs)

    /* Reintentos rapidos SOLO mientras el ultimo intento fallo: si es un
       cold start de Supabase o un deploy recien salido, se recupera solo.
       Si la carga va bien, este interval no dispara nada. */
    retry.current = setInterval(() => {
      if (canceled.v || !falloRef.current || intento.current >= retries) return
      intento.current++
      run()
    }, 1500)

    /* Al volver de otra pestana los datos pueden estar viejos. */
    const onVisible = () => { if (document.visibilityState === 'visible') run() }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      canceled.v = true
      aliveRef.current = false
      clearInterval(timer.current)
      clearInterval(retry.current)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [activo, cadaMs, retries, run, cargar])

  return { ranking, cargando, degraded, motivo }
}
