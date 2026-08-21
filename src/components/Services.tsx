import { motion } from 'framer-motion';
import {
  UtensilsCrossed,
  ShoppingBag,
  Truck,
  MessageCircle,
  Crown,
  ChefHat,
  Leaf,
  PartyPopper,
  type LucideIcon,
} from 'lucide-react';
import { site } from '@/data/site';

const iconMap: Record<string, LucideIcon> = {
  UtensilsCrossed,
  ShoppingBag,
  Truck,
  MessageCircle,
  Crown,
  ChefHat,
  Leaf,
  PartyPopper,
};

export default function Services() {
  return (
    <section id="services" className="relative py-20 sm:py-28">
      <div className="container-x">
        <div className="mx-auto max-w-2xl text-center">
          <span className="section-label">What We Offer</span>
          <h2 className="mt-3 text-3xl font-bold text-ink-50 sm:text-4xl lg:text-5xl">
            Services Built For You
          </h2>
          <p className="mt-3 text-sm text-ink-400 sm:text-base">
            Whether you're dining in, grabbing takeaway, or ordering delivery — we've got your cravings covered.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {site.services.map((service, i) => {
            const Icon = iconMap[service.icon] ?? UtensilsCrossed;
            return (
              <motion.div
                key={service.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                whileHover={{ y: -6 }}
                className="group relative overflow-hidden rounded-2xl border border-white/5 bg-ink-900/60 p-6 transition-colors hover:border-primary-500/30"
              >
                <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary-500/5 blur-2xl transition-colors group-hover:bg-primary-500/15" />

                <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-500/15 text-primary-500 transition-colors group-hover:bg-primary-500 group-hover:text-ink-950">
                  <Icon className="h-7 w-7" />
                </div>

                <h3 className="relative mt-5 text-lg font-bold text-ink-50">{service.title}</h3>
                <p className="relative mt-2 text-sm leading-relaxed text-ink-400">
                  {service.description}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* Feature strip */}
        <div className="mt-12 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {site.features.map((f, i) => {
            const Icon = iconMap[f.icon] ?? Crown;
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="flex items-center gap-3 rounded-xl border border-white/5 bg-ink-900/40 px-4 py-3"
              >
                <Icon className="h-5 w-5 shrink-0 text-primary-500" />
                <span className="text-sm font-medium text-ink-200">{f.title}</span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
