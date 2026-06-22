import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'StrongLifts 5×5',
    short_name: '5×5',
    description: 'Track your Stronglifts 5x5 workout programme',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f0f0f',
    theme_color: '#f97316',
    orientation: 'portrait',
    icons: [
      { src: '/icon', sizes: '192x192', type: 'image/png' },
      { src: '/icon', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
