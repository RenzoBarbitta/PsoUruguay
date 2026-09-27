import React, { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { ShoppingBag, Megaphone, UserPlus, ArrowRightLeft, X, Trash2, Trophy, Activity } from 'lucide-react'
import { useApp } from '../core/app.jsx'
import { t, TeamDot, EmptyState } from '../core/ui.jsx'

const MERCADO_STORAGE_KEY = 'pso_mercado_feed'

function getFeed() {
  try {
    const raw = localStorage.getItem(MERCADO_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch (e) {
    return []
  }
}

function saveFeed(feed) {
  try {
    localStorage.setItem(MERCADO_STORAGE_KEY, JSON.stringify(feed.slice(0, 100)))
  } catch (e) {}
}

function addFeedItem(item) {
  const feed = getFeed()
  feed.unshift({ ...item, id: Date.now() + Math.random(), timestamp: Date.now() })
  saveFeed(feed)
  if (typeof window !== 'undefined' && window.psoBus) {
    window.psoBus.emit('mercado-updated', { feed: feed.slice(0, 20) })
  }
}

export function recordPlayerCreated(playerName, teamName, teamLogo) {
  addFeedItem({
    type: 'fichaje',
    icon: UserPlus,
    titleKey: 'mercado_fichaje',
    titleVars: { player: playerName, team: teamName },
    teamLogo,
    teamName
  })
}

export function recordTransfer(playerName, fromTeam, toTeam, fromLogo, toLogo) {
  addFeedItem({
    type: 'traspaso',
    icon: ArrowRightLeft,
    titleKey: 'mercado_traspaso',
    titleVars: { player: playerName, from: fromTeam, to: toTeam },
    fromLogo,
    toLogo,
    fromTeam,
    toTeam
  })
}

export function recordRelease(playerName, teamName, teamLogo) {
  addFeedItem({
    type: 'liberacion',
    icon: X,
    titleKey: 'mercado_liberacion',
    titleVars: { player: playerName, team: teamName },
    teamLogo,
    teamName
  })
}

export function recordMatchResult(match) {
  const home = match.home
  const away = match.away
  if (!home || !away) return
  addFeedItem({
    type: 'resultado',
    icon: Trophy,
    titleKey: 'mercado_resultado',
    titleVars: { home: home.name, away: away.name, hg: match.homeScore, ag: match.awayScore },
    homeLogo: home.logo,
    awayLogo: away.logo,
    homeName: home.name,
    awayName: away.name,
    homeScore: match.homeScore,
    awayScore: match.awayScore
  })
}

export function recordAnnouncement(teamName, teamLogo, message) {
  addFeedItem({
    type: 'anuncio',
    icon: Megaphone,
    titleKey: 'mercado_anuncio',
    titleVars: { team: teamName, message },
    teamLogo,
    teamName
  })
}

function formatTime(ts) {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `hace ${mins}m`
  if (hours < 24) return `hace ${hours}h`
  return `hace ${days}d`
}

function FeedItem({ item }) {
  const Icon = item.icon || Activity
  return (
    <motion.div
      key={item.id}
      className={`mercado-item mercado-${item.type}`}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="mercado-icon-wrap">
        <Icon size={20} className="mercado-icon" />
      </div>
      <div className="mercado-content">
        <div className="mercado-header">
          <span className="mercado-type">{t(item.titleKey)}</span>
          <span className="mercado-time">{formatTime(item.timestamp)}</span>
        </div>
        <div className="mercado-text">
          {t(item.titleKey, item.titleVars)}
        </div>
        {(item.homeLogo || item.awayLogo || item.teamLogo) && (
          <div className="mercado-teams">
            {item.homeLogo && <TeamDot team={{ logo: item.homeLogo, name: item.homeName }} size={32} />}
            {item.homeScore !== undefined && item.awayScore !== undefined && (
              <span className="mercado-score">{item.homeScore} - {item.awayScore}</span>
            )}
            {item.awayLogo && <TeamDot team={{ logo: item.awayLogo, name: item.awayName }} size={32} />}
            {item.fromLogo && <TeamDot team={{ logo: item.fromLogo, name: item.fromTeam }} size={28} />}
            {item.toLogo && (
              <>
                <ArrowRightLeft size={16} className="mercado-arrow" />
                <TeamDot team={{ logo: item.toLogo, name: item.toTeam }} size={28} />
              </>
            )}
            {item.teamLogo && !item.homeLogo && !item.awayLogo && <TeamDot team={{ logo: item.teamLogo, name: item.teamName }} size={32} />}
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default function Mercado() {
  const { v } = useApp()
  void v
  const [feed, setFeed] = useState(getFeed())

  useEffect(() => {
    const handler = () => setFeed(getFeed())
    let unsub = () => {}
    if (typeof window !== 'undefined' && window.psoBus) {
      unsub = window.psoBus.on('mercado-updated', handler)
    }
    const interval = setInterval(handler, 5000)
    return () => {
      unsub()
      clearInterval(interval)
    }
  }, [v])

  return (
    <>
      <div className="section-head">
        <h2 className="section-title">{t('mercado_title')}</h2>
        <span className="section-sub">{t('mercado_sub')}</span>
      </div>

      <motion.div className="card mercado-header-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="mercado-header-inner">
          <div className="mercado-header-icon">
            <ShoppingBag size={28} />
          </div>
          <div>
            <h3>{t('mercado_header_title')}</h3>
            <p>{t('mercado_header_desc')}</p>
          </div>
        </div>
        <div className="mercado-stats">
          <div className="mercado-stat">
            <span className="mercado-stat-value">{feed.filter(i => i.type === 'fichaje').length}</span>
            <span className="mercado-stat-label">{t('mercado_fichajes')}</span>
          </div>
          <div className="mercado-stat">
            <span className="mercado-stat-value">{feed.filter(i => i.type === 'traspaso').length}</span>
            <span className="mercado-stat-label">{t('mercado_traspasos')}</span>
          </div>
          <div className="mercado-stat">
            <span className="mercado-stat-value">{feed.filter(i => i.type === 'liberacion').length}</span>
            <span className="mercado-stat-label">{t('mercado_liberaciones')}</span>
          </div>
          <div className="mercado-stat">
            <span className="mercado-stat-value">{feed.filter(i => i.type === 'resultado').length}</span>
            <span className="mercado-stat-label">{t('mercado_resultados')}</span>
          </div>
        </div>
      </motion.div>

      <div className="section-head">
        <h3 className="section-title" style={{ fontSize: '1.15rem' }}>{t('mercado_feed')}</h3>
      </div>

      {feed.length > 0 ? (
        <div className="mercado-feed">
          {feed.slice(0, 20).map(item => <FeedItem key={item.id} item={item} />)}
        </div>
      ) : (
        <EmptyState icon="📋" text={t('mercado_empty')} />
      )}
    </>
  )
}