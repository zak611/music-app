import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

export interface Track {
  id: string
  title: string
  artist: string
  album: string
  duration: number
  /** Fichier audio original, stocké dans le navigateur pour l'écoute hors ligne. */
  file: Blob
  cover?: Blob
  addedAt: number
}

/** Version allégée d'un morceau (sans le fichier audio) pour l'affichage. */
export type TrackInfo = Omit<Track, 'file'>

export interface Playlist {
  id: string
  name: string
  trackIds: string[]
  createdAt: number
}

interface MusicDB extends DBSchema {
  tracks: { key: string; value: Track }
  playlists: { key: string; value: Playlist }
}

let dbPromise: Promise<IDBPDatabase<MusicDB>> | null = null

function db() {
  dbPromise ??= openDB<MusicDB>('music-app', 1, {
    upgrade(database) {
      database.createObjectStore('tracks', { keyPath: 'id' })
      database.createObjectStore('playlists', { keyPath: 'id' })
    },
  })
  return dbPromise
}

export async function getAllTracks(): Promise<TrackInfo[]> {
  const all = await (await db()).getAll('tracks')
  return all.map(({ file: _file, ...info }) => info)
}

export async function getTrackFile(id: string): Promise<Blob | undefined> {
  return (await (await db()).get('tracks', id))?.file
}

export async function addTrack(track: Track) {
  await (await db()).put('tracks', track)
}

export async function deleteTrack(id: string) {
  const d = await db()
  const tx = d.transaction(['tracks', 'playlists'], 'readwrite')
  await tx.objectStore('tracks').delete(id)
  const playlists = await tx.objectStore('playlists').getAll()
  for (const p of playlists) {
    if (p.trackIds.includes(id)) {
      await tx.objectStore('playlists').put({ ...p, trackIds: p.trackIds.filter((t) => t !== id) })
    }
  }
  await tx.done
}

export async function getAllPlaylists(): Promise<Playlist[]> {
  const all = await (await db()).getAll('playlists')
  return all.sort((a, b) => a.createdAt - b.createdAt)
}

export async function savePlaylist(playlist: Playlist) {
  await (await db()).put('playlists', playlist)
}

export async function deletePlaylist(id: string) {
  await (await db()).delete('playlists', id)
}

/** Demande au navigateur de ne pas effacer la bibliothèque en cas de manque d'espace. */
export async function requestPersistentStorage() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist()
    }
  } catch {
    /* non supporté : sans conséquence */
  }
}
