import { parseBlob } from 'music-metadata'
import type { Track } from './db'

const AUDIO_EXT = /\.(mp3|m4a|aac|ogg|oga|opus|wav|flac|webm)$/i

export function isAudioFile(file: File) {
  return file.type.startsWith('audio/') || AUDIO_EXT.test(file.name)
}

function titleFromFilename(name: string) {
  return name.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').trim() || 'Sans titre'
}

/** Durée via l'élément audio, quand les métadonnées ne la donnent pas. */
function probeDuration(file: Blob): Promise<number> {
  return new Promise((resolve) => {
    const audio = new Audio()
    const url = URL.createObjectURL(file)
    const done = (d: number) => {
      URL.revokeObjectURL(url)
      resolve(Number.isFinite(d) ? d : 0)
    }
    audio.preload = 'metadata'
    audio.onloadedmetadata = () => done(audio.duration)
    audio.onerror = () => done(0)
    audio.src = url
  })
}

export async function fileToTrack(file: File): Promise<Track> {
  let title = titleFromFilename(file.name)
  let artist = 'Artiste inconnu'
  let album = 'Album inconnu'
  let duration = 0
  let cover: Blob | undefined

  try {
    const { common, format } = await parseBlob(file, { duration: false })
    if (common.title) title = common.title
    if (common.artist) artist = common.artist
    if (common.album) album = common.album
    if (format.duration) duration = format.duration
    const pic = common.picture?.[0]
    if (pic) cover = new Blob([new Uint8Array(pic.data)], { type: pic.format })
  } catch {
    /* fichier sans tags lisibles : on garde les valeurs par défaut */
  }

  if (!duration) duration = await probeDuration(file)

  return {
    id: crypto.randomUUID(),
    title,
    artist,
    album,
    duration,
    file,
    cover,
    addedAt: Date.now(),
  }
}
