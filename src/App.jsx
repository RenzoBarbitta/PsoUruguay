import React, { Suspense, lazy } from 'react'
import { AnimatePresence } from 'motion/react'
import { AppProvider, useApp } from './core/app.jsx'
import { View } from './core/ui.jsx'
import Topbar from './components/Topbar.jsx'
import TabsNav from './components/TabsNav.jsx'
import Inicio from './views/Inicio.jsx'

/* Vistas y juegos se cargan bajo demanda (code splitting) para que la
   carga inicial solo traiga lo necesario (Inicio). El resto se descarga
   cuando el usuario navega a esa pestaña. */
const Fixture = lazy(() => import('./views/Fixture.jsx'))
const Tabla = lazy(() => import('./views/Tabla.jsx'))
const Estadisticas = lazy(() => import('./views/Estadisticas.jsx'))
const Planteles = lazy(() => import('./views/Planteles.jsx'))
const Palmares = lazy(() => import('./views/Palmares.jsx'))
const Seleccion = lazy(() => import('./views/Seleccion.jsx'))
const Juegos = lazy(() => import('./views/Juegos.jsx'))
const Mercado = lazy(() => import('./views/Mercado.jsx'))
const Trivia = lazy(() => import('./games/Trivia.jsx'))
const Pasapalabra = lazy(() => import('./games/Pasapalabra.jsx'))
const Penales = lazy(() => import('./games/Penales.jsx'))
const Predicciones = lazy(() => import('./games/Predicciones.jsx'))
const Perfil = lazy(() => import('./views/Perfil.jsx'))
const AdminPanel = lazy(() => import('./admin/AdminPanel.jsx'))

const VIEWS = {
  inicio: Inicio,
  fixture: Fixture,
  tabla: Tabla,
  estadisticas: Estadisticas,
  planteles: Planteles,
  palmares: Palmares,
  seleccion: Seleccion,
  juegos: Juegos,
  mercado: Mercado,
  trivia: Trivia,
  pasapalabra: Pasapalabra,
  penales: Penales,
  predicciones: Predicciones,
  perfil: Perfil,
  admin: AdminPanel,
}

function SuspenseFallback() {
  return (
    <div className="view active" style={{ minHeight: 360, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
      Cargando…
    </div>
  )
}

function Router() {
  const { tab } = useApp()
  const ViewComp = VIEWS[tab] || Inicio

  return (
    <AnimatePresence mode="popLayout">
      <Suspense fallback={<SuspenseFallback />}>
        <View key={tab}><ViewComp /></View>
      </Suspense>
    </AnimatePresence>
  )
}

function Footer() {
  return (
    <footer className="page-footer">
      <span className="page-footer-brand">PSO URUGUAY · PRO SOCCER ONLINE</span>
      <span className="page-footer-muted">{typeof tr === 'function' ? tr('footer_line') : 'La casa de la Celeste en PSO'}</span>
    </footer>
  )
}

export default function App() {
  return (
    <AppProvider>
      <div className="app">
        <Topbar />
        <TabsNav />
        <main id="main-content" className="main">
          <Router />
        </main>
        <Footer />
      </div>
    </AppProvider>
  )
}