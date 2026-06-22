import { ImageResponse } from 'next/og'

export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        background: '#f97316',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '23%',
      }}
    >
      <span
        style={{
          color: 'white',
          fontSize: 196,
          fontWeight: 900,
          fontFamily: 'sans-serif',
          letterSpacing: '-6px',
          lineHeight: 1,
        }}
      >
        5×5
      </span>
    </div>,
    { width: 512, height: 512 },
  )
}
