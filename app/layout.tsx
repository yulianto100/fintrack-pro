import type { Metadata, Viewport } from 'next'
import { Syne, Space_Grotesk, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { Toaster } from 'react-hot-toast'

const syne         = Syne({ subsets: ['latin'], variable: '--font-syne', display: 'swap' })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space', display: 'swap' })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains', display: 'swap' })

export const metadata: Metadata = {
  title:       { default: 'Finuvo', template: '%s | Finuvo' },
  description: 'Kelola keuangan & portofolio investasi Anda',
  manifest:    '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Finuvo' },
  icons: {
    icon:  [
      { url: '/favicon.ico',            sizes: 'any' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
  openGraph: {
    title:       'Finuvo',
    description: 'Kelola keuangan & portofolio investasi Anda',
    type:        'website',
  },
}

export const viewport: Viewport = {
  themeColor:     '#061510',
  width:          'device-width',
  initialScale:   1,
  maximumScale:   1,
  userScalable:   false,
  viewportFit:    'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className="dark">
      <body className={`${syne.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}>
        <Providers>
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: 'var(--surface-close)',
                color:      'var(--text-primary)',
                border:     '1px solid var(--border)',
                borderRadius: '12px',
                fontFamily: 'var(--font-space)',
                fontSize:   '0.875rem',
              },
              success: { iconTheme: { primary: '#22C55E', secondary: '#fff' } },
              error:   { iconTheme: { primary: '#F87171', secondary: '#fff' } },
            }}
          />
        </Providers>
      </body>
    </html>
  )
}
