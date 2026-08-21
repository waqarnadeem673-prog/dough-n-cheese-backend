import { motion } from 'framer-motion';
import { ArrowRight, Truck } from 'lucide-react';
import { site } from '@/data/site';
import { useRestaurantSettings } from '@/hooks/useRestaurantSettings';

export default function WhatWeOffer() {
  const { settings } = useRestaurantSettings();

  const scrollToMenu = () => {
    document.querySelector('#menu')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative overflow-hidden py-20 sm:py-28">
      <div className="container-x">
        <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16">
          {/* Visual */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="relative order-2 lg:order-1"
          >
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-primary-500/10 to-accent-500/5 p-8 sm:p-12">
              <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary-500/20 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-accent-500/15 blur-3xl" />

              {/* Delivery illustration */}
              <div className="relative flex items-center justify-center">
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
                  className="relative"
                >
                  <img
                    src={settings.delivery_image_url || site.deliveryImage}
                    alt="Dough N Cheese delivery"
                    className="h-56 w-auto object-contain sm:h-72"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </motion.div>
              </div>

              {/* Floating badge */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3, type: 'spring' }}
                className="absolute right-4 top-4 flex items-center gap-2 rounded-full bg-ink-950/70 px-3 py-1.5 text-xs font-semibold text-primary-400 backdrop-blur-sm"
              >
                <Truck className="h-3.5 w-3.5" />
                Fast Delivery
              </motion.div>
            </div>
          </motion.div>

          {/* Text */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="order-1 lg:order-2"
          >
            <span className="section-label">Fast Service</span>
            <h2 className="mt-3 text-3xl font-bold text-ink-50 sm:text-4xl lg:text-5xl">
              Hot, Fresh & Delivered Fast
            </h2>
            <p className="mt-4 text-base leading-relaxed text-ink-300">
              Craving Dough N Cheese? Get your favorite pizzas, burgers, and cheesy favorites delivered hot and fresh, straight to your doorstep in Kamoke.
            </p>

            <div className="mt-6 space-y-3">
              {['⚡ Lightning-fast delivery', '🍕 Freshly prepared to order', '🧀 Hot, cheesy & delicious', '📱 Easy WhatsApp ordering', '🏠 Doorstep delivery across Kamoke'].map((item, i) => (
                <motion.div
                  key={item}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-500/15 text-primary-500">
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-sm text-ink-200">{item}</span>
                </motion.div>
              ))}
            </div>

            <button
              onClick={scrollToMenu}
              className="btn-primary mt-8"
            >
              Order Now
              <ArrowRight className="h-4 w-4" />
            </button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
