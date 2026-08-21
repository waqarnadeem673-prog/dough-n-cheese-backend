import { motion } from 'framer-motion';
import {
  Crown,
  ChefHat,
  Truck,
  Leaf,
  Check,
  type LucideIcon,
} from 'lucide-react';
import { site } from '@/data/site';

const iconMap: Record<string, LucideIcon> = {
  Crown,
  ChefHat,
  Truck,
  Leaf,
};

const featureDescriptions: Record<string, string> = {
  'Super Quality Food':
    'Premium ingredients in every bite.',
  'Original Recipes':
    'Signature flavors you won’t find anywhere else.',
  'Quick Fast Delivery':
    'Hot and fresh, delivered to your door.',
  '100% Fresh Foods':
    'Made to order, never frozen, always fresh.',
};

const highlights = [
  'Fresh, never-frozen ingredients',
  'Original signature recipes',
  'Extra cheesy, extra delicious',
  'Fast delivery across Kamoke',
];

export default function About() {
  return (
    <section
      id="about"
      className="relative overflow-hidden py-20 sm:py-28"
    >
      <div className="pointer-events-none absolute inset-0 bg-cheese-pattern" />

      <div className="container-x relative">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">

          {/* LEFT CONTENT */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7 }}
          >
            <span className="section-label">
              About Us
            </span>

            <h2 className="mt-3 text-3xl font-bold text-ink-50 sm:text-4xl lg:text-5xl">
              {site.about.heading}
            </h2>

            <p className="mt-6 text-base leading-relaxed text-ink-300">
              {site.about.body}
            </p>

            <p className="mt-5 text-base leading-relaxed text-ink-300">
              We believe great food brings people together. Whether you dine
              in, take away, or order delivery, our promise is simple: meet,
              eat, repeat — cravings satisfied every single time.
            </p>

            {/* HIGHLIGHTS */}
            <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {highlights.map((item, index) => (
                <motion.div
                  key={item}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.4,
                    delay: index * 0.08,
                  }}
                  className="flex items-center gap-2.5"
                >
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-500">
                    <Check className="h-3 w-3 text-ink-950" />
                  </div>

                  <span className="text-sm text-ink-200">
                    {item}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* RIGHT SIDE - 2x2 CARDS */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {site.features.map((feature, i) => {
              const Icon = iconMap[feature.icon] ?? Crown;

              const description =
                featureDescriptions[feature.title] ??
                'Made with care for every Dough N Cheese craving.';

              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 25 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{
                    duration: 0.5,
                    delay: i * 0.1,
                  }}
                  whileHover={{ y: -4 }}
                  className="group relative overflow-hidden rounded-2xl border border-white/5 bg-ink-900/60 p-6 transition-colors hover:border-primary-500/30"
                >
                  {/* Decorative background */}
                  <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary-500/5 blur-2xl transition-colors group-hover:bg-primary-500/15" />

                  {/* Icon */}
                  <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-500/15 text-primary-500 transition-colors group-hover:bg-primary-500 group-hover:text-ink-950">
                    <Icon className="h-7 w-7" />
                  </div>

                  {/* Title */}
                  <h3 className="relative mt-5 text-lg font-bold text-ink-50">
                    {feature.title}
                  </h3>

                  {/* Description */}
                  <p className="relative mt-2 text-sm leading-relaxed text-ink-400">
                    {description}
                  </p>
                </motion.div>
              );
            })}
          </div>

        </div>
      </div>
    </section>
  );
}