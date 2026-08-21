import { motion } from 'framer-motion';
import { MapPin, Clock, Phone, Download, ArrowUp, UtensilsCrossed } from 'lucide-react';
import { site } from '@/data/site';
import { useBranch } from '@/context/BranchContext';
import { useRestaurantSettings } from '@/hooks/useRestaurantSettings';

export default function Footer() {
  const { selectedBranch } = useBranch();
  const { settings } = useRestaurantSettings();

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  const scrollTo = (href: string) =>
    document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <footer className="relative overflow-hidden border-t border-white/5 bg-ink-950">
      {/* CTA banner */}
      <div className="border-b border-white/5">
        <div className="container-x py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center justify-between gap-6 text-center sm:flex-row sm:text-left"
          >
            <div>
              <h2 className="text-2xl font-bold text-ink-50 sm:text-3xl">
                Ready to order your cravings?
              </h2>
              <p className="mt-2 text-sm text-ink-400">
                Fresh pizzas, burgers, and more — just a WhatsApp message away.
              </p>
            </div>
            <button
              onClick={() => scrollTo('#menu')}
              className="btn-primary shrink-0"
            >
              <UtensilsCrossed className="h-4 w-4" />
              Order Now
            </button>
          </motion.div>
        </div>
      </div>

      {/* Main footer */}
      <div className="container-x py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Logo */}
          <div className="sm:col-span-2 lg:col-span-1">
            <img
              src={settings.logo_url || site.logo}
              alt={settings.restaurant_name || site.name}
              className="h-14 w-auto object-contain"
            />
            <p className="mt-4 text-sm leading-relaxed text-ink-400">
              {settings.tagline || site.tagline} — premium pizzas, burgers, pastas and more. Made with love, served
              with passion.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-300">
              Quick Links
            </h4>
            <ul className="mt-4 space-y-2.5">
              {[
                { label: 'Menu', href: '#menu' },
                { label: 'About', href: '#about' },
                { label: 'Services', href: '#services' },
                { label: 'Branches', href: '#branches' },
                { label: 'Contact', href: '#contact' },
              ].map((link) => (
                <li key={link.href}>
                  <button
                    onClick={() => scrollTo(link.href)}
                    className="text-sm text-ink-400 transition-colors hover:text-primary-400"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-300">
              {selectedBranch.name} Branch
            </h4>
            <ul className="mt-4 space-y-3">
              <li className="flex items-start gap-2 text-sm text-ink-400">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" />
                <span>{selectedBranch.address}</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-ink-400">
                <Phone className="h-4 w-4 shrink-0 text-primary-500" />
                <span>{selectedBranch.phone}</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-ink-400">
                <Clock className="h-4 w-4 shrink-0 text-primary-500" />
                <span>
                  {selectedBranch.daysOpen} · {selectedBranch.hours}
                </span>
              </li>
            </ul>
          </div>

          {/* Social + menu */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-300">
              Connect
            </h4>
            <ul className="mt-4 space-y-2.5">
              <li>
                <a
                  href={settings.instagram_url || site.socials.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-ink-400 transition-colors hover:text-primary-400"
                >
                  Instagram
                </a>
              </li>
              <li>
                <a
                  href={settings.tiktok_url || site.socials.tiktok}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-ink-400 transition-colors hover:text-primary-400"
                >
                  TikTok
                </a>
              </li>
              <li>
                <a
                  href={settings.facebook_url || site.socials.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-ink-400 transition-colors hover:text-primary-400"
                >
                  Facebook
                </a>
              </li>
              <li>
                <a
                  href={settings.menu_pdf_url || site.menuPdf}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1.5 text-sm text-primary-400 transition-colors hover:text-primary-300"
                >
                  <Download className="h-4 w-4" />
                  Download Menu
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-6 sm:flex-row">
          <p className="text-xs text-ink-500">
            © {new Date().getFullYear()} Dough N Cheese. All rights reserved.
          </p>
          <button
            onClick={scrollToTop}
            className="flex items-center gap-1.5 text-xs text-ink-400 transition-colors hover:text-primary-400"
          >
            Back to top
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </footer>
  );
}
