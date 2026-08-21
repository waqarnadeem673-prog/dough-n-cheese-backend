import { motion } from 'framer-motion';
import { ArrowDown, MessageCircle, UtensilsCrossed } from 'lucide-react';
import { site } from '@/data/site';
import { useBranch } from '@/context/BranchContext';
import { useRestaurantSettings } from '@/hooks/useRestaurantSettings';

export default function Hero() {
  const { selectedBranch } = useBranch();
  const { settings } = useRestaurantSettings();

  const scrollToMenu = () => {
    document.querySelector('#menu')?.scrollIntoView({ behavior: 'smooth' });
  };

  const orderNow = () => {
    scrollToMenu();
  };

  return (
    <section className="relative flex min-h-[100svh] items-center overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src={settings.hero_image_url || site.heroImage}
          alt={`${settings.restaurant_name || site.name} premium food`}
          className="h-full w-full object-cover"
          fetchPriority="high"
        />
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-ink-950/90 via-ink-950/70 to-ink-950/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-transparent to-ink-950/30" />
      </div>

 {/* Content */}
      <div className="container-x relative z-10 pt-24 pb-16">
        <div className="max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <span className="section-label">Now Delivering in {selectedBranch.name}</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="mt-4 text-4xl font-bold leading-[1.05] text-white text-balance sm:text-5xl lg:text-6xl xl:text-7xl"
          >
            Tasty & Crunchy
            <span className="block text-gradient-gold">Select Your Cravings</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-5 max-w-lg text-base leading-relaxed text-ink-200 sm:text-lg"
          >
            Get your favorite cheesy pizzas, juicy burgers, and all your Dough N Cheese
            cravings delivered fresh and fast, right to your doorstep.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.65 }}
            className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <button
              onClick={scrollToMenu}
              className="btn-primary group"
            >
              <UtensilsCrossed className="h-4 w-4" />
              View Full Menu
            </button>
            <button
              onClick={orderNow}
              className="btn-secondary"
            >
              <MessageCircle className="h-4 w-4" />
              Order Now
            </button>
          </motion.div>

          {/* Feature pills */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="mt-10 flex flex-wrap gap-2"
          >
            {site.features.map((f) => (
              <span
                key={f.title}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-ink-200 backdrop-blur-sm"
              >
                {f.title}
              </span>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.button
        onClick={scrollToMenu}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-1 text-ink-400 transition-colors hover:text-primary-500"
        aria-label="Scroll to menu"
      >
        <span className="text-[10px] font-medium uppercase tracking-[0.2em]">Scroll</span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ repeat: Infinity, duration: 1.8 }}
        >
          <ArrowDown className="h-4 w-4" />
        </motion.div>
      </motion.button>
    </section>
  );
}
