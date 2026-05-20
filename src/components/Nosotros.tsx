'use client'

import { Gem, Sparkles, Truck, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

const features = [
  {
    icon: Gem,
    title: 'Joyas & Accesorios',
    description: 'Collares, anillos y pulseras seleccionadas con amor para cada estilo.',
  },
  {
    icon: Sparkles,
    title: 'Perfumes & Indumentaria',
    description: 'Fragancias exclusivas y prendas que complementan tu look.',
  },
  {
    icon: Truck,
    title: 'Envíos a todo el país',
    description: 'Recibí tus compras cómodamente en cualquier punto de Argentina.',
  },
]

const WHATSAPP_URL =
  'https://wa.me/5493804313064?text=Hola!%20Quiero%20consultar%20sobre%20un%20producto'

export default function Nosotros() {
  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-12">
      {/* Hero */}
      <div className="mb-12 text-center">
        <h2 className="font-serif text-4xl font-bold text-ink md:text-5xl">
          Sobre Nosotros
        </h2>
        <div className="mx-auto mt-3 h-1 w-16 rounded-full bg-gold" />
      </div>

      {/* Description */}
      <p className="mx-auto mb-12 max-w-2xl text-center font-sans text-lg leading-relaxed text-ink-muted">
        Somos un emprendimiento de regalos y joyas en La Rioja, Argentina. En
        Infinito encontrás collares, anillos, pulseras, perfumes e indumentaria
        para cada ocasión. Cada pieza es seleccionada con amor para que
        encuentres el regalo perfecto.
      </p>

      {/* Feature cards */}
      <div className="mb-12 grid gap-6 sm:grid-cols-3">
        {features.map((feat) => (
          <div
            key={feat.title}
            className="group flex flex-col items-center rounded-2xl border border-gold/20 bg-white p-6 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
          >
            <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-gold/10 transition-colors group-hover:bg-gold/20">
              <feat.icon className="size-7 text-gold" />
            </div>
            <h3 className="mb-2 font-serif text-xl font-semibold text-ink">
              {feat.title}
            </h3>
            <p className="text-sm leading-relaxed text-ink-muted">
              {feat.description}
            </p>
          </div>
        ))}
      </div>

      {/* WhatsApp CTA */}
      <div className="text-center">
        <Button
          asChild
          size="lg"
          className="gap-2 bg-green-600 text-white hover:bg-green-700"
        >
          <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="size-5" />
            Contactanos por WhatsApp
          </a>
        </Button>
      </div>
    </section>
  )
}
