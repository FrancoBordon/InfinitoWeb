'use client'

import { useCartStore, useAdminStore, useSectionStore } from '@/store'
import { ShoppingBag, LogIn, LogOut, Package, Users, ClipboardList, Gem } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const NAV_ITEMS = [
  { key: 'catalogo', label: 'Catálogo', icon: Gem },
  { key: 'nosotros', label: 'Nosotros', icon: null },
]

const ADMIN_ITEMS = [
  { key: 'stock', label: 'Stock', icon: Package },
  { key: 'crm', label: 'CRM', icon: Users },
  { key: 'pedidos', label: 'Pedidos', icon: ClipboardList },
]

export default function Header() {
  const cartCount = useCartStore((s) => s.getTotalItems())
  const openCart = useCartStore((s) => s.setCartOpen)
  const isAdmin = useAdminStore((s) => s.isAdmin)
  const logout = useAdminStore((s) => s.logout)
  const section = useSectionStore((s) => s.section)
  const setSection = useSectionStore((s) => s.setSection)

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gold/20 bg-ink shadow-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        {/* Logo */}
        <button
          onClick={() => setSection('catalogo')}
          className="flex items-center gap-2 transition-opacity hover:opacity-80"
        >
          <span className="font-serif text-2xl font-bold tracking-wide text-gold">
            Infinito
          </span>
          <span className="font-serif text-xl text-gold-light">∞</span>
        </button>

        {/* Nav – center */}
        <nav className="hidden items-center gap-1 sm:flex">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              onClick={() => setSection(item.key)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                section === item.key
                  ? 'bg-gold/20 text-gold'
                  : 'text-cream/70 hover:bg-white/5 hover:text-cream'
              }`}
            >
              {item.label}
            </button>
          ))}
          {isAdmin &&
            ADMIN_ITEMS.map((item) => (
              <button
                key={item.key}
                onClick={() => setSection(item.key)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  section === item.key
                    ? 'bg-gold/20 text-gold'
                    : 'text-cream/70 hover:bg-white/5 hover:text-cream'
                }`}
              >
                <item.icon className="size-3.5" />
                {item.label}
              </button>
            ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* Cart */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => openCart(true)}
            className="relative text-cream/80 hover:bg-white/10 hover:text-cream"
          >
            <ShoppingBag className="size-5" />
            {cartCount > 0 && (
              <Badge className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-gold p-0 text-[10px] font-bold text-ink">
                {cartCount}
              </Badge>
            )}
          </Button>

          {/* Admin toggle */}
          {isAdmin ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="gap-1.5 text-cream/70 hover:bg-white/10 hover:text-cream"
            >
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Salir</span>
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSection('admin')}
              className="gap-1.5 text-cream/70 hover:bg-white/10 hover:text-cream"
            >
              <LogIn className="size-4" />
              <span className="hidden sm:inline">Admin</span>
            </Button>
          )}
        </div>
      </div>

      {/* Mobile nav */}
      <div className="flex border-t border-gold/10 sm:hidden">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            onClick={() => setSection(item.key)}
            className={`flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
              section === item.key
                ? 'bg-gold/20 text-gold'
                : 'text-cream/60 hover:text-cream'
            }`}
          >
            {item.label}
          </button>
        ))}
        {isAdmin &&
          ADMIN_ITEMS.map((item) => (
            <button
              key={item.key}
              onClick={() => setSection(item.key)}
              className={`flex flex-1 items-center justify-center gap-1 py-2 text-xs font-medium transition-colors ${
                section === item.key
                  ? 'bg-gold/20 text-gold'
                  : 'text-cream/60 hover:text-cream'
              }`}
            >
              <item.icon className="size-3" />
              {item.label}
            </button>
          ))}
      </div>
    </header>
  )
}
