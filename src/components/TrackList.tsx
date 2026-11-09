import { useEffect, useRef, useState } from 'react'
import type { Playlist, TrackInfo } from '../db'
import { Cover, formatTime } from './Cover'
import { MoreIcon } from './Icons'

export interface TrackActions {
  onPlay: (id: string) => void
  onPlayNext: (id: string) => void
  onAddToQueue: (id: string) => void
  onAddToPlaylist: (trackId: string, playlistId: string) => void
  onNewPlaylistWith: (trackId: string) => void
  onDelete: (id: string) => void
  onRemoveFromPlaylist?: (id: string) => void
}

interface Props extends TrackActions {
  tracks: TrackInfo[]
  playlists: Playlist[]
  currentId?: string
  isPlaying: boolean
  numbered?: boolean
}

export function TrackList({ tracks, playlists, currentId, isPlaying, numbered, ...actions }: Props) {
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null)

  return (
    <>
      <ul className="track-list">
        {tracks.map((t, i) => {
          const active = t.id === currentId
          return (
            <li key={t.id} className={active ? 'active' : ''}>
              <button className="track-main" onClick={() => actions.onPlay(t.id)}>
                {numbered ? (
                  <span className="track-num">{active && isPlaying ? <Equalizer /> : i + 1}</span>
                ) : (
                  <span className="track-cover">
                    <Cover blob={t.cover} size={44} />
                    {active && isPlaying && (
                      <span className="cover-overlay">
                        <Equalizer />
                      </span>
                    )}
                  </span>
                )}
                <span className="track-text">
                  <span className="track-title">{t.title}</span>
                  <span className="track-sub">
                    {t.artist}
                    {!numbered && ` · ${t.album}`}
                  </span>
                </span>
                <span className="track-duration">{formatTime(t.duration)}</span>
              </button>
              <button
                className="icon-btn"
                aria-label={`Options pour ${t.title}`}
                onClick={(e) => {
                  const r = e.currentTarget.getBoundingClientRect()
                  setMenu({ id: t.id, x: r.right, y: r.bottom })
                }}
              >
                <MoreIcon size={20} />
              </button>
            </li>
          )
        })}
      </ul>
      {menu && <TrackMenu {...menu} playlists={playlists} actions={actions} onClose={() => setMenu(null)} />}
    </>
  )
}

function Equalizer() {
  return (
    <span className="eq" aria-label="En lecture">
      <i />
      <i />
      <i />
    </span>
  )
}

function TrackMenu({
  id,
  x,
  y,
  playlists,
  actions,
  onClose,
}: {
  id: string
  x: number
  y: number
  playlists: Playlist[]
  actions: TrackActions
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ left: x, top: y })
  const [showPlaylists, setShowPlaylists] = useState(false)

  // Garde le menu à l'intérieur de l'écran.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const { width, height } = el.getBoundingClientRect()
    setPos({
      left: Math.max(8, Math.min(x - width, window.innerWidth - width - 8)),
      top: y + height > window.innerHeight - 8 ? Math.max(8, y - height - 40) : y,
    })
  }, [x, y, showPlaylists])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const run = (fn: () => void) => () => {
    fn()
    onClose()
  }

  return (
    <div className="menu-backdrop" onClick={onClose}>
      <div className="menu" ref={ref} style={pos} role="menu" onClick={(e) => e.stopPropagation()}>
        {showPlaylists ? (
          <>
            <button role="menuitem" onClick={run(() => actions.onNewPlaylistWith(id))}>
              + Nouvelle playlist…
            </button>
            {playlists.map((p) => (
              <button key={p.id} role="menuitem" onClick={run(() => actions.onAddToPlaylist(id, p.id))}>
                {p.name}
              </button>
            ))}
          </>
        ) : (
          <>
            <button role="menuitem" onClick={run(() => actions.onPlayNext(id))}>
              Lire ensuite
            </button>
            <button role="menuitem" onClick={run(() => actions.onAddToQueue(id))}>
              Ajouter à la file d'attente
            </button>
            <button role="menuitem" onClick={() => setShowPlaylists(true)}>
              Ajouter à une playlist ›
            </button>
            {actions.onRemoveFromPlaylist && (
              <button role="menuitem" onClick={run(() => actions.onRemoveFromPlaylist!(id))}>
                Retirer de la playlist
              </button>
            )}
            <button role="menuitem" className="danger" onClick={run(() => actions.onDelete(id))}>
              Supprimer de la bibliothèque
            </button>
          </>
        )}
      </div>
    </div>
  )
}
