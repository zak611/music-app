import { useState } from 'react'
import type { Player } from '../usePlayer'
import { Cover, formatTime } from './Cover'
import {
  ChevronDownIcon,
  CloseIcon,
  MuteIcon,
  NextIcon,
  PauseIcon,
  PlayIcon,
  PrevIcon,
  QueueIcon,
  RepeatIcon,
  RepeatOneIcon,
  ShuffleIcon,
  VolumeIcon,
} from './Icons'
import type { TrackInfo } from '../db'

function Seek({ player }: { player: Player }) {
  const { currentTime, duration, seek } = player
  const pct = duration ? (currentTime / duration) * 100 : 0
  return (
    <div className="seek">
      <span className="time">{formatTime(currentTime)}</span>
      <input
        type="range"
        min={0}
        max={duration || 0}
        step={0.1}
        value={Math.min(currentTime, duration || 0)}
        onChange={(e) => seek(Number(e.target.value))}
        style={{ '--pct': `${pct}%` } as React.CSSProperties}
        aria-label="Position"
      />
      <span className="time">{formatTime(duration)}</span>
    </div>
  )
}

function Controls({ player, big }: { player: Player; big?: boolean }) {
  const s = big ? 30 : 22
  return (
    <div className={`controls ${big ? 'big' : ''}`}>
      <button
        className={`icon-btn ${player.shuffle ? 'on' : ''}`}
        onClick={player.toggleShuffle}
        aria-label="Lecture aléatoire"
        aria-pressed={player.shuffle}
      >
        <ShuffleIcon size={s - 4} />
      </button>
      <button className="icon-btn" onClick={player.prev} aria-label="Précédent">
        <PrevIcon size={s} />
      </button>
      <button className="play-btn" onClick={player.toggle} aria-label={player.isPlaying ? 'Pause' : 'Lecture'}>
        {player.isPlaying ? <PauseIcon size={s} /> : <PlayIcon size={s} />}
      </button>
      <button className="icon-btn" onClick={player.next} aria-label="Suivant">
        <NextIcon size={s} />
      </button>
      <button
        className={`icon-btn ${player.repeat !== 'off' ? 'on' : ''}`}
        onClick={player.cycleRepeat}
        aria-label={`Répéter : ${player.repeat === 'off' ? 'non' : player.repeat === 'all' ? 'tout' : 'un morceau'}`}
      >
        {player.repeat === 'one' ? <RepeatOneIcon size={s - 4} /> : <RepeatIcon size={s - 4} />}
      </button>
    </div>
  )
}

function Volume({ player }: { player: Player }) {
  const [before, setBefore] = useState(1)
  const muted = player.volume === 0
  return (
    <div className="volume">
      <button
        className="icon-btn"
        aria-label={muted ? 'Réactiver le son' : 'Couper le son'}
        onClick={() => {
          if (muted) player.setVolume(before || 1)
          else {
            setBefore(player.volume)
            player.setVolume(0)
          }
        }}
      >
        {muted ? <MuteIcon size={20} /> : <VolumeIcon size={20} />}
      </button>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={player.volume}
        onChange={(e) => player.setVolume(Number(e.target.value))}
        style={{ '--pct': `${player.volume * 100}%` } as React.CSSProperties}
        aria-label="Volume"
      />
    </div>
  )
}

export function PlayerBar({ player, onExpand }: { player: Player; onExpand: () => void }) {
  const t = player.current
  if (!t) return null
  const pct = player.duration ? (player.currentTime / player.duration) * 100 : 0
  return (
    <footer className="player-bar">
      <div className="mini-progress" style={{ width: `${pct}%` }} />
      <button className="now" onClick={onExpand} aria-label="Ouvrir le lecteur">
        <Cover blob={t.cover} size={48} />
        <span className="track-text">
          <span className="track-title">{t.title}</span>
          <span className="track-sub">{t.artist}</span>
        </span>
      </button>
      <div className="bar-center">
        <Controls player={player} />
        <Seek player={player} />
      </div>
      <div className="bar-right">
        <Volume player={player} />
        <button className="icon-btn" onClick={onExpand} aria-label="File d'attente">
          <QueueIcon size={20} />
        </button>
      </div>
      <div className="bar-mobile">
        <button className="play-btn small" onClick={player.toggle} aria-label={player.isPlaying ? 'Pause' : 'Lecture'}>
          {player.isPlaying ? <PauseIcon size={20} /> : <PlayIcon size={20} />}
        </button>
        <button className="icon-btn" onClick={player.next} aria-label="Suivant">
          <NextIcon size={22} />
        </button>
      </div>
    </footer>
  )
}

export function NowPlaying({
  player,
  tracks,
  onClose,
}: {
  player: Player
  tracks: Map<string, TrackInfo>
  onClose: () => void
}) {
  const t = player.current
  if (!t) return null
  const upcoming = player.queue.map((id, i) => ({ id, i })).slice(player.index + 1)
  return (
    <div className="now-playing" role="dialog" aria-label="Lecture en cours">
      <header>
        <button className="icon-btn" onClick={onClose} aria-label="Fermer">
          <ChevronDownIcon size={28} />
        </button>
        <span className="np-label">Lecture en cours</span>
        <span style={{ width: 40 }} />
      </header>
      <div className="np-body">
        <div className="np-main">
          <Cover blob={t.cover} size={320} className="np-cover" />
          <div className="np-info">
            <h2>{t.title}</h2>
            <p>
              {t.artist} · {t.album}
            </p>
          </div>
          <Seek player={player} />
          <Controls player={player} big />
          <Volume player={player} />
        </div>
        <section className="np-queue">
          <h3>À suivre</h3>
          {upcoming.length === 0 ? (
            <p className="muted">Rien d'autre dans la file d'attente.</p>
          ) : (
            <ul className="track-list compact">
              {upcoming.map(({ id, i }) => {
                const q = tracks.get(id)
                if (!q) return null
                return (
                  <li key={`${id}-${i}`}>
                    <button className="track-main" onClick={() => player.jumpTo(i)}>
                      <span className="track-cover">
                        <Cover blob={q.cover} size={40} />
                      </span>
                      <span className="track-text">
                        <span className="track-title">{q.title}</span>
                        <span className="track-sub">{q.artist}</span>
                      </span>
                    </button>
                    <button className="icon-btn" onClick={() => player.removeFromQueue(i)} aria-label="Retirer de la file">
                      <CloseIcon size={18} />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
