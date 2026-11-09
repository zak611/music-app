import { useCallback, useEffect, useRef, useState } from 'react'
import { getTrackFile, type TrackInfo } from './db'

export type RepeatMode = 'off' | 'all' | 'one'

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* stockage indisponible */
  }
}

function shuffled<T>(items: T[]): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function usePlayer(tracks: Map<string, TrackInfo>) {
  const audioRef = useRef<HTMLAudioElement>(null as unknown as HTMLAudioElement)
  if (!audioRef.current) audioRef.current = new Audio()
  const audio = audioRef.current

  const [queue, setQueue] = useState<string[]>([])
  /** File d'attente dans l'ordre d'origine, pour pouvoir désactiver l'aléatoire. */
  const [baseQueue, setBaseQueue] = useState<string[]>([])
  const [index, setIndex] = useState(-1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolumeState] = useState(() => load('player.volume', 1))
  const [shuffle, setShuffle] = useState(() => load('player.shuffle', false))
  const [repeat, setRepeat] = useState<RepeatMode>(() => load('player.repeat', 'off'))

  const currentId = queue[index] as string | undefined
  const current = currentId ? tracks.get(currentId) : undefined

  // Références toujours à jour pour les gestionnaires d'événements.
  const state = useRef({ queue, index, repeat })
  state.current = { queue, index, repeat }

  useEffect(() => {
    audio.volume = volume
    save('player.volume', volume)
  }, [audio, volume])
  useEffect(() => save('player.shuffle', shuffle), [shuffle])
  useEffect(() => save('player.repeat', repeat), [repeat])

  // Chargement du morceau courant.
  const autoplay = useRef(true)
  useEffect(() => {
    if (!currentId) {
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
      setCurrentTime(0)
      setDuration(0)
      return
    }
    let url: string | undefined
    let cancelled = false
    getTrackFile(currentId).then((file) => {
      if (cancelled || !file) return
      url = URL.createObjectURL(file)
      audio.src = url
      if (autoplay.current) audio.play().catch(() => setIsPlaying(false))
      autoplay.current = true
    })
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [audio, currentId])

  const next = useCallback(
    (fromEnded = false) => {
      const { queue: q, index: i, repeat: r } = state.current
      if (!q.length) return
      if (i < q.length - 1) setIndex(i + 1)
      else if (r === 'all') {
        if (q.length === 1) {
          audio.currentTime = 0
          audio.play()
        } else setIndex(0)
      } else if (fromEnded) {
        setIsPlaying(false)
        audio.currentTime = 0
      }
    },
    [audio],
  )

  const prev = useCallback(() => {
    const { queue: q, index: i, repeat: r } = state.current
    if (audio.currentTime > 3 || !q.length) {
      audio.currentTime = 0
      return
    }
    if (i > 0) setIndex(i - 1)
    else if (r === 'all') setIndex(q.length - 1)
    else audio.currentTime = 0
  }, [audio])

  // Événements de l'élément audio.
  useEffect(() => {
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onTime = () => setCurrentTime(audio.currentTime)
    const onMeta = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0)
    const onEnded = () => {
      if (state.current.repeat === 'one') {
        audio.currentTime = 0
        audio.play()
      } else next(true)
    }
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('loadedmetadata', onMeta)
    audio.addEventListener('ended', onEnded)
    return () => {
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('loadedmetadata', onMeta)
      audio.removeEventListener('ended', onEnded)
    }
  }, [audio, next])

  const playQueue = useCallback(
    (ids: string[], startId?: string, opts?: { shuffle?: boolean }) => {
      if (!ids.length) return
      const doShuffle = opts?.shuffle ?? shuffle
      if (opts?.shuffle !== undefined) setShuffle(opts.shuffle)
      const start = startId ?? (doShuffle ? ids[Math.floor(Math.random() * ids.length)] : ids[0])
      setBaseQueue(ids)
      if (doShuffle) {
        setQueue([start, ...shuffled(ids.filter((id) => id !== start))])
        setIndex(0)
      } else {
        setQueue(ids)
        setIndex(Math.max(0, ids.indexOf(start)))
      }
      if (start === currentId) {
        audio.currentTime = 0
        audio.play()
      }
    },
    [audio, currentId, shuffle],
  )

  const toggle = useCallback(() => {
    if (!currentId) return
    if (audio.paused) audio.play().catch(() => {})
    else audio.pause()
  }, [audio, currentId])

  const seek = useCallback(
    (t: number) => {
      audio.currentTime = t
      setCurrentTime(t)
    },
    [audio],
  )

  const toggleShuffle = useCallback(() => {
    const enable = !shuffle
    setShuffle(enable)
    if (!currentId) return
    if (enable) {
      setQueue([currentId, ...shuffled(queue.filter((id) => id !== currentId))])
      setIndex(0)
    } else {
      setQueue(baseQueue)
      setIndex(Math.max(0, baseQueue.indexOf(currentId)))
    }
  }, [baseQueue, currentId, queue, shuffle])

  const cycleRepeat = useCallback(() => {
    setRepeat((r) => (r === 'off' ? 'all' : r === 'all' ? 'one' : 'off'))
  }, [])

  const playNext = useCallback(
    (id: string) => {
      if (index < 0) return playQueue([id])
      setQueue((q) => [...q.slice(0, index + 1), id, ...q.slice(index + 1)])
      setBaseQueue((q) => [...q, id])
    },
    [index, playQueue],
  )

  const addToQueue = useCallback(
    (id: string) => {
      if (index < 0) return playQueue([id])
      setQueue((q) => [...q, id])
      setBaseQueue((q) => [...q, id])
    },
    [index, playQueue],
  )

  const jumpTo = useCallback((i: number) => setIndex(i), [])

  const removeFromQueue = useCallback(
    (i: number) => {
      if (i === index) return
      setQueue((q) => q.filter((_, k) => k !== i))
      if (i < index) setIndex((x) => x - 1)
    },
    [index],
  )

  // Si un morceau est supprimé de la bibliothèque, on le retire de la file.
  useEffect(() => {
    if (queue.some((id) => !tracks.has(id))) {
      const keep = queue.filter((id) => tracks.has(id))
      const stillCurrent = currentId && tracks.has(currentId)
      autoplay.current = !audio.paused
      setQueue(keep)
      setBaseQueue((b) => b.filter((id) => tracks.has(id)))
      setIndex(stillCurrent ? keep.indexOf(currentId) : keep.length ? Math.min(index, keep.length - 1) : -1)
    }
  }, [audio, currentId, index, queue, tracks])

  // Contrôles système (écran verrouillé, casque, notifications).
  const coverUrl = useCoverUrl(current?.cover)
  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    navigator.mediaSession.metadata = current
      ? new MediaMetadata({
          title: current.title,
          artist: current.artist,
          album: current.album,
          artwork: coverUrl ? [{ src: coverUrl, sizes: '512x512' }] : [],
        })
      : null
  }, [current, coverUrl])

  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    const ms = navigator.mediaSession
    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ['play', () => audio.play()],
      ['pause', () => audio.pause()],
      ['previoustrack', () => prev()],
      ['nexttrack', () => next()],
      ['seekto', (d) => d.seekTime != null && seek(d.seekTime)],
    ]
    for (const [action, handler] of handlers) {
      try {
        ms.setActionHandler(action, handler)
      } catch {
        /* action non supportée */
      }
    }
  }, [audio, next, prev, seek])

  return {
    current,
    queue,
    index,
    isPlaying,
    currentTime,
    duration: duration || current?.duration || 0,
    volume,
    shuffle,
    repeat,
    playQueue,
    toggle,
    next: () => next(),
    prev,
    seek,
    setVolume: setVolumeState,
    toggleShuffle,
    cycleRepeat,
    playNext,
    addToQueue,
    jumpTo,
    removeFromQueue,
  }
}

export type Player = ReturnType<typeof usePlayer>

/** URL temporaire pour afficher une pochette stockée en Blob. */
export function useCoverUrl(cover?: Blob) {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    if (!cover) return setUrl(undefined)
    const u = URL.createObjectURL(cover)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [cover])
  return url
}
