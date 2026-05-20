'use client'

import dynamic from 'next/dynamic'

// Load the entire app client-side to minimize server compilation
const App = dynamic(() => import('@/components/AppShell'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="text-center">
        <div className="mb-4 flex items-center justify-center gap-2">
          <div className="size-10 animate-pulse rounded-full bg-gold/20" />
          <div>
            <div className="h-6 w-28 animate-pulse rounded bg-gold/10" />
            <div className="mt-1 h-3 w-16 animate-pulse rounded bg-gold/5" />
          </div>
        </div>
        <p className="font-serif text-lg text-ink-muted">Cargando...</p>
      </div>
    </div>
  ),
})

export default function Home() {
  return <App />
}
