import React from 'react'
import { AnimatePresence } from 'motion/react'
import { AppProvider, useApp } from './core/app.jsx'
import { View } from './core/ui.jsx'
import Topbar from './components/Topbar.jsx'
import TabsNav from './components/TabsNav.jsx'
import Inicio from './views/Inicio.jsx'
import Fixture from './views/Fixture.jsx'
import Tabla from './views/Tabla.jsx'
import Estadisticas from './views/Estadisticas.jsx'
import Planteles from './views/Planteles.jsx'
import Palmares from './views/Palmares.jsx'
import Seleccion from './views/Seleccion.jsx'
import Juegos from './views/Juegos.jsx'
import Trivia from './games/Trivia.jsx'
import Pasapalabra from './games/Pasapalabra.jsx'
import Penales from './games/Penales.jsx'
import AdminPanel from './admin/AdminPanel.jsx'

function Router() {
  const { tab } = useApp()
  const content = (() => {
    switch (tab) {
      case 'inicio': return <Inicio />
      case 'fixture': return <Fixture />
      case 'tabla': return <Tabla />
      case 'estadisticas': return <Estadisticas />
      case 'planteles': return <Planteles />
      case 'palmares': return <Palmares />
      case 'seleccion': return <Seleccion />
      case 'juegos': return <Juegos />
      case 'trivia': return <Trivia />
      case 'pasapalabra': return <Pasapalabra />
      case 'penales': return <Penales />
      case 'admin': return <AdminPanel />
      default: return <Inicio />
    }
  })()

  return (
    <AnimatePresence mode="wait">
      <View key={tab}>{content}</View>
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