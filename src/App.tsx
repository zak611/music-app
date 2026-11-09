import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  addTrack,
  deletePlaylist,
  deleteTrack,
  getAllPlaylists,
  getAllTracks,
  requestPersistentStorage,
  savePlaylist,
  type Playlist,
  type TrackInfo,
} from './db'
import { fileToTrack, isAudioFile } from './importer'
import { usePlayer } from './usePlayer'
import { TrackList, type TrackActions } from './components/TrackList'
import { NowPlaying, PlayerBar } from './components/PlayerBar'
import { Cover, formatTime } from './components/Cover'
import { BackIcon, PlayIcon, PlusIcon, SearchIcon, ShuffleIcon } from './components/Icons'

type Tab = 'songs' | 'albums' | 'artists' | 'playlists'
type Detail = { kind: 'album' | 'artist' | 'playlist'; key: string } | null

const TABS: [Tab, string][] = [
  ['songs', 'Morceaux'],
  ['albums', 'Albums'],
  ['artists', 'Artistes'],
  ['playlists', 'Playlists'],
]

const byTitle = (a: TrackInfo, b: TrackInfo) => a.title.localeCompare(b.title, 'fr', { sensitivity: 'base' })

export default function App() {
  const [tracks, setTracks] = useState<TrackInfo[]>([])
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [loaded, setLoaded] = useState(false)
  const [tab, setTab] = useState<Tab>('songs')
  const [detail, setDetail] = useState<Detail>(null)
  const [query, setQuery] = useState('')
  const [importing, setImporting] = useState<{ done: number; total: number } | null>(null)
  const [dragging, setDragging] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [dialog, setDialog] = useState<{ title: string; initial: string; onSubmit: (name: string) => void } | null>(
    null,
  )
  const [toast, setToast] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const trackMap = useMemo(() => new Map(tracks.map((t) => [t.id, t])), [tracks])
  const player = usePlayer(trackMap)

  useEffect(() => {
    Promise.all([getAllTracks(), getAllPlaylists()]).then(([t, p]) => {
      setTracks(t)
      setPlaylists(p)
      setLoaded(true)
    })
  }, [])

  const notify = useCallback((msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 2500)
  }, [])

  const importFiles = useCallback(
    async (files: File[]) => {
      const audio = files.filter(isAudioFile)
      if (!audio.length) {
        notify('Aucun fichier audio reconnu.')
        return
      }
      requestPersistentStorage()
      setImporting({ done: 0, total: audio.length })
      const added: TrackInfo[] = []
      let failed = 0
      for (const [i, file] of audio.entries()) {
        try {
          const track = await fileToTrack(file)
          await addTrack(track)
          const { file: _f, ...info } = track
          added.push(info)
        } catch {
          failed++
        }
        setImporting({ done: i + 1, total: audio.length })
      }
      setTracks((t) => [...t, ...added])
      setImporting(null)
      notify(
        `${added.length} morceau${added.length > 1 ? 'x' : ''} ajouté${added.length > 1 ? 's' : ''}` +
          (failed ? ` (${failed} échec${failed > 1 ? 's' : ''} — espace de stockage plein ?)` : ''),
      )
    },
    [notify],
  )

  // Glisser-déposer de fichiers n'importe où dans la fenêtre.
  useEffect(() => {
    let depth = 0
    const hasFiles = (e: DragEvent) => e.dataTransfer?.types.includes('Files')
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return
      depth++
      setDragging(true)
    }
    const leave = () => {
      depth = Math.max(0, depth - 1)
      if (!depth) setDragging(false)
    }
    const over = (e: DragEvent) => hasFiles(e) && e.preventDefault()
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      depth = 0
      setDragging(false)
      importFiles(Array.from(e.dataTransfer!.files))
    }
    window.addEventListener('dragenter', enter)
    window.addEventListener('dragleave', leave)
    window.addEventListener('dragover', over)
    window.addEventListener('drop', drop)
    return () => {
      window.removeEventListener('dragenter', enter)
      window.removeEventListener('dragleave', leave)
      window.removeEventListener('dragover', over)
      window.removeEventListener('drop', drop)
    }
  }, [importFiles])

  // Raccourcis clavier.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.matches('input, textarea') || dialog) return
      if (e.code === 'Space') {
        e.preventDefault()
        player.toggle()
      } else if (e.code === 'ArrowRight' && e.shiftKey) player.next()
      else if (e.code === 'ArrowLeft' && e.shiftKey) player.prev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [player, dialog])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q
      ? tracks.filter((t) => `${t.title} ${t.artist} ${t.album}`.toLowerCase().includes(q))
      : tracks
    return [...list].sort(byTitle)
  }, [tracks, query])

  const albums = useMemo(() => groupBy(filtered, (t) => `${t.album}\u0000${t.artist}`), [filtered])
  const artists = useMemo(() => groupBy(filtered, (t) => t.artist), [filtered])

  // --- Playlists ---
  const createPlaylist = (withTrack?: string) =>
    setDialog({
      title: 'Nouvelle playlist',
      initial: '',
      onSubmit: async (name) => {
        const p: Playlist = {
          id: crypto.randomUUID(),
          name,
          trackIds: withTrack ? [withTrack] : [],
          createdAt: Date.now(),
        }
        await savePlaylist(p)
        setPlaylists((ps) => [...ps, p])
        notify(`Playlist « ${name} » créée`)
      },
    })

  const updatePlaylist = async (p: Playlist) => {
    await savePlaylist(p)
    setPlaylists((ps) => ps.map((x) => (x.id === p.id ? p : x)))
  }

  const actions: TrackActions = {
    onPlay: () => {},
    onPlayNext: (id) => {
      player.playNext(id)
      notify('Sera lu ensuite')
    },
    onAddToQueue: (id) => {
      player.addToQueue(id)
      notify("Ajouté à la file d'attente")
    },
    onAddToPlaylist: async (trackId, playlistId) => {
      const p = playlists.find((x) => x.id === playlistId)
      if (!p) return
      if (p.trackIds.includes(trackId)) return notify(`Déjà dans « ${p.name} »`)
      await updatePlaylist({ ...p, trackIds: [...p.trackIds, trackId] })
      notify(`Ajouté à « ${p.name} »`)
    },
    onNewPlaylistWith: (trackId) => createPlaylist(trackId),
    onDelete: async (id) => {
      const t = trackMap.get(id)
      if (!t || !confirm(`Supprimer « ${t.title} » de la bibliothèque ?`)) return
      await deleteTrack(id)
      setTracks((ts) => ts.filter((x) => x.id !== id))
      setPlaylists((ps) => ps.map((p) => ({ ...p, trackIds: p.trackIds.filter((x) => x !== id) })))
    },
  }

  const listProps = (list: TrackInfo[], extra?: Partial<TrackActions>) => ({
    ...actions,
    ...extra,
    onPlay: (id: string) =>
      player.playQueue(
        list.map((t) => t.id),
        id,
      ),
    tracks: list,
    playlists,
    currentId: player.current?.id,
    isPlaying: player.isPlaying,
  })

  // --- Rendu ---
  const renderDetail = () => {
    if (!detail) return null
    let title = ''
    let subtitle = ''
    let list: TrackInfo[] = []
    let extra: Partial<TrackActions> | undefined
    let playlist: Playlist | undefined

    if (detail.kind === 'album') {
      const [album, artist] = detail.key.split('\u0000')
      title = album
      subtitle = artist
      list = tracks.filter((t) => t.album === album && t.artist === artist).sort(byTitle)
    } else if (detail.kind === 'artist') {
      title = detail.key
      list = tracks
        .filter((t) => t.artist === detail.key)
        .sort((a, b) => a.album.localeCompare(b.album, 'fr') || byTitle(a, b))
      subtitle = `${new Set(list.map((t) => t.album)).size} album(s)`
    } else {
      playlist = playlists.find((p) => p.id === detail.key)
      if (!playlist) return null
      title = playlist.name
      list = playlist.trackIds.map((id) => trackMap.get(id)).filter((t): t is TrackInfo => !!t)
      const p = playlist
      extra = {
        onRemoveFromPlaylist: (id) => updatePlaylist({ ...p, trackIds: p.trackIds.filter((x) => x !== id) }),
      }
    }

    const total = list.reduce((s, t) => s + t.duration, 0)
    const ids = list.map((t) => t.id)
    return (
      <div className="detail">
        <button className="back" onClick={() => setDetail(null)}>
          <BackIcon size={20} /> Retour
        </button>
        <div className="detail-head">
          <Cover blob={list.find((t) => t.cover)?.cover} size={160} />
          <div>
            <p className="eyebrow">{detail.kind === 'album' ? 'Album' : detail.kind === 'artist' ? 'Artiste' : 'Playlist'}</p>
            <h1>{title}</h1>
            <p className="muted">
              {subtitle && `${subtitle} · `}
              {list.length} morceau{list.length > 1 ? 'x' : ''} · {formatTime(total)}
            </p>
            <div className="detail-actions">
              <button className="btn primary" disabled={!list.length} onClick={() => player.playQueue(ids, ids[0])}>
                <PlayIcon size={18} /> Lire
              </button>
              <button
                className="btn"
                disabled={!list.length}
                onClick={() => player.playQueue(ids, undefined, { shuffle: true })}
              >
                <ShuffleIcon size={18} /> Aléatoire
              </button>
              {playlist && (
                <>
                  <button
                    className="btn"
                    onClick={() =>
                      setDialog({
                        title: 'Renommer la playlist',
                        initial: playlist!.name,
                        onSubmit: (name) => updatePlaylist({ ...playlist!, name }),
                      })
                    }
                  >
                    Renommer
                  </button>
                  <button
                    className="btn danger"
                    onClick={async () => {
                      if (!confirm(`Supprimer la playlist « ${playlist!.name} » ?`)) return
                      await deletePlaylist(playlist!.id)
                      setPlaylists((ps) => ps.filter((x) => x.id !== playlist!.id))
                      setDetail(null)
                    }}
                  >
                    Supprimer
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
        {list.length ? (
          <TrackList {...listProps(list, extra)} numbered={detail.kind === 'album'} />
        ) : (
          <p className="muted empty-small">
            Cette playlist est vide. Utilise le menu « ⋯ » d'un morceau pour l'ajouter ici.
          </p>
        )}
      </div>
    )
  }

  const renderTab = () => {
    if (tab === 'songs') {
      return filtered.length ? (
        <>
          <div className="list-actions">
            <button className="btn primary" onClick={() => player.playQueue(filtered.map((t) => t.id))}>
              <PlayIcon size={18} /> Tout lire
            </button>
            <button
              className="btn"
              onClick={() => player.playQueue(filtered.map((t) => t.id), undefined, { shuffle: true })}
            >
              <ShuffleIcon size={18} /> Aléatoire
            </button>
          </div>
          <TrackList {...listProps(filtered)} />
        </>
      ) : (
        <p className="muted empty-small">Aucun résultat pour « {query} ».</p>
      )
    }
    if (tab === 'albums' || tab === 'artists') {
      const groups = tab === 'albums' ? albums : artists
      return (
        <div className="grid">
          {groups.map(([key, list]) => (
            <button key={key} className="card" onClick={() => setDetail({ kind: tab === 'albums' ? 'album' : 'artist', key })}>
              <Cover blob={list.find((t) => t.cover)?.cover} size={160} className={tab === 'artists' ? 'round' : ''} />
              <span className="card-title">{tab === 'albums' ? list[0].album : key}</span>
              <span className="card-sub">
                {tab === 'albums' ? list[0].artist : `${list.length} morceau${list.length > 1 ? 'x' : ''}`}
              </span>
            </button>
          ))}
        </div>
      )
    }
    return (
      <div className="grid">
        <button className="card new-playlist" onClick={() => createPlaylist()}>
          <span className="cover" style={{ width: 160, height: 160 }}>
            <PlusIcon size={48} />
          </span>
          <span className="card-title">Nouvelle playlist</span>
        </button>
        {playlists.map((p) => {
          const first = p.trackIds.map((id) => trackMap.get(id)).find((t) => t?.cover)
          return (
            <button key={p.id} className="card" onClick={() => setDetail({ kind: 'playlist', key: p.id })}>
              <Cover blob={first?.cover} size={160} />
              <span className="card-title">{p.name}</span>
              <span className="card-sub">
                {p.trackIds.length} morceau{p.trackIds.length > 1 ? 'x' : ''}
              </span>
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className={`app ${player.current ? 'has-player' : ''}`}>
      <header className="topbar">
        <div className="brand">
          <img src="./icon.svg" alt="" width={32} height={32} />
          <span>Music</span>
        </div>
        {tracks.length > 0 && (
          <label className="search">
            <SearchIcon size={18} />
            <input
              type="search"
              placeholder="Rechercher un titre, un artiste, un album"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setDetail(null)
              }}
            />
          </label>
        )}
        <button className="btn primary" onClick={() => fileInput.current?.click()} disabled={!!importing}>
          <PlusIcon size={18} /> <span className="hide-sm">Importer</span>
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="audio/*,.mp3,.m4a,.aac,.ogg,.opus,.wav,.flac"
          multiple
          hidden
          onChange={(e) => {
            importFiles(Array.from(e.target.files ?? []))
            e.target.value = ''
          }}
        />
      </header>

      {tracks.length > 0 && !detail && (
        <nav className="tabs" role="tablist">
          {TABS.map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </nav>
      )}

      <main className="content">
        {!loaded ? null : tracks.length === 0 ? (
          <div className="empty">
            <img src="./icon.svg" alt="" width={96} height={96} />
            <h1>Ta bibliothèque est vide</h1>
            <p className="muted">
              Importe tes fichiers audio (MP3, M4A, FLAC, OGG, WAV…). Ils restent sur cet appareil et s'écoutent même
              hors ligne.
            </p>
            <button className="btn primary big" onClick={() => fileInput.current?.click()}>
              <PlusIcon size={20} /> Importer de la musique
            </button>
            <p className="muted hint">Astuce : tu peux aussi glisser-déposer des fichiers dans la fenêtre.</p>
          </div>
        ) : detail ? (
          renderDetail()
        ) : (
          renderTab()
        )}
      </main>

      <PlayerBar player={player} onExpand={() => setExpanded(true)} />
      {expanded && <NowPlaying player={player} tracks={trackMap} onClose={() => setExpanded(false)} />}

      {importing && (
        <div className="toast">
          Import… {importing.done}/{importing.total}
          <div className="toast-bar" style={{ width: `${(importing.done / importing.total) * 100}%` }} />
        </div>
      )}
      {!importing && toast && <div className="toast">{toast}</div>}
      {dragging && (
        <div className="drop-zone">
          <div>Dépose tes fichiers audio ici</div>
        </div>
      )}
      {dialog && <NameDialog {...dialog} onClose={() => setDialog(null)} />}
    </div>
  )
}

function groupBy(list: TrackInfo[], key: (t: TrackInfo) => string): [string, TrackInfo[]][] {
  const m = new Map<string, TrackInfo[]>()
  for (const t of list) {
    const k = key(t)
    m.set(k, [...(m.get(k) ?? []), t])
  }
  return [...m.entries()].sort(([a], [b]) => a.localeCompare(b, 'fr', { sensitivity: 'base' }))
}

function NameDialog({
  title,
  initial,
  onSubmit,
  onClose,
}: {
  title: string
  initial: string
  onSubmit: (name: string) => void
  onClose: () => void
}) {
  const [name, setName] = useState(initial)
  return (
    <div className="menu-backdrop center" onClick={onClose}>
      <form
        className="dialog"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault()
          const n = name.trim()
          if (!n) return
          onSubmit(n)
          onClose()
        }}
      >
        <h2>{title}</h2>
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom de la playlist" />
        <div className="dialog-actions">
          <button type="button" className="btn" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className="btn primary" disabled={!name.trim()}>
            OK
          </button>
        </div>
      </form>
    </div>
  )
}
