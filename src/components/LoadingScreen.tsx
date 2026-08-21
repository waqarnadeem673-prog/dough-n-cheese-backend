import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { site } from '@/data/site';

type Props = {
  onComplete: () => void;
};

export default function LoadingScreen({ onComplete }: Props) {
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const start = performance.now();
    const duration = 2200;

    let raf = 0;
    const tick = (now: number) => {
      const elapsed = now - start;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(pct);
      if (pct >= 100) {
        setDone(true);
        setTimeout(onComplete, 600);
      } else {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-ink-950"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Glow */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-500/10 blur-[120px]" />
          </div>

          {/* Logo reveal */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 flex flex-col items-center"
          >
            <div className="relative">
              <motion.div
                initial={{ rotateY: 90 }}
                animate={{ rotateY: 0 }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-28 w-28 overflow-hidden rounded-2xl sm:h-32 sm:w-32"
              >
                <img
                  src={site.logo}
                  alt="Dough N Cheese logo"
                  className="h-full w-full object-contain"
                />
              </motion.div>
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                className="absolute -bottom-2 left-0 h-0.5 w-full origin-left bg-gradient-to-r from-transparent via-primary-500 to-transparent"
              />
            </div>

            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="mt-6 text-2xl font-bold tracking-tight text-ink-50 sm:text-3xl"
            >
              Dough N Cheese
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.5 }}
              className="mt-1 text-xs font-medium uppercase tracking-[0.3em] text-primary-500"
            >
              {site.tagline}
            </motion.p>
          </motion.div>

          {/* Loading bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="relative z-10 mt-10 w-56 sm:w-72"
          >
            <div className="h-1 w-full overflow-hidden rounded-full bg-ink-800">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-[10px] font-medium text-ink-400">
              <span>Loading</span>
              <span>{progress}%</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
