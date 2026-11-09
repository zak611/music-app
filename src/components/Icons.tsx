type P = { size?: number }

const svg = (d: string) =>
  function Icon({ size = 22 }: P) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d={d} />
      </svg>
    )
  }

export const PlayIcon = svg('M8 5.14v13.72a1 1 0 0 0 1.52.85l10.6-6.86a1 1 0 0 0 0-1.7L9.52 4.29A1 1 0 0 0 8 5.14z')
export const PauseIcon = svg('M7 5h3.5v14H7zM13.5 5H17v14h-3.5z')
export const NextIcon = svg('M6 6.5v11a1 1 0 0 0 1.55.83L15 13.2V17h2V7h-2v3.8L7.55 5.67A1 1 0 0 0 6 6.5z')
export const PrevIcon = svg('M18 6.5v11a1 1 0 0 1-1.55.83L9 13.2V17H7V7h2v3.8l7.45-5.13A1 1 0 0 1 18 6.5z')
export const ShuffleIcon = svg(
  'M17 3l4 4-4 4V8h-2.1l-2.4 3-1.3-1.6L13.9 6H17zm0 10l4 4-4 4v-3h-3.1L5.9 8H3V6h3.9l8 10H17zM3 16h2.9l2.3-2.9 1.3 1.6L6.9 18H3z',
)
export const RepeatIcon = svg('M7 7h10v3l4-4-4-4v3H5v6h2zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2z')
export const RepeatOneIcon = svg(
  'M7 7h10v3l4-4-4-4v3H5v6h2zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2zm-4-2V9h-1l-2 1v1h1.5v4z',
)
export const VolumeIcon = svg('M4 9v6h4l5 5V4L8 9zm12.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z')
export const MuteIcon = svg('M4 9v6h4l5 5V4L8 9zm12.6 3 2.7-2.7-1.4-1.4-2.7 2.7-2.7-2.7-1.4 1.4 2.7 2.7-2.7 2.7 1.4 1.4 2.7-2.7 2.7 2.7 1.4-1.4z')
export const PlusIcon = svg('M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z')
export const MoreIcon = svg('M12 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4z')
export const SearchIcon = svg('M10 3a7 7 0 0 1 5.6 11.2l5.1 5.1-1.4 1.4-5.1-5.1A7 7 0 1 1 10 3zm0 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10z')
export const ChevronDownIcon = svg('M6.4 8.6 12 14.2l5.6-5.6L19 10l-7 7-7-7z')
export const BackIcon = svg('M15.4 5.4 9.8 11l5.6 5.6L14 18l-7-7 7-7z')
export const QueueIcon = svg('M3 6h13v2H3zm0 5h13v2H3zm0 5h9v2H3zm14-1V9l5 3z')
export const MusicIcon = svg('M9 3v10.6A4 4 0 1 0 11 17V8l8-2v5.6A4 4 0 1 0 21 15V1z')
export const CloseIcon = svg('M6.4 5 12 10.6 17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6 10.6 12 5 6.4z')
