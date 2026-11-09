import { useCoverUrl } from '../usePlayer'
import { MusicIcon } from './Icons'

export function Cover({ blob, size, className = '' }: { blob?: Blob; size: number; className?: string }) {
  const url = useCoverUrl(blob)
  return (
    <div className={`cover ${className}`} style={{ width: size, height: size }}>
      {url ? <img src={url} alt="" /> : <MusicIcon size={Math.round(size * 0.42)} />}
    </div>
  )
}

export function formatTime(s: number) {
  if (!Number.isFinite(s) || s < 0) s = 0
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}
