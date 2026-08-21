import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, MapPin, ChevronDown, MessageCircle, ArrowRight, ShoppingBag } from 'lucide-react';
import { site } from '@/data/site';
import { useBranch } from '@/context/BranchContext';
import { useCart } from '@/context/CartContext';
import { useOpenNow } from '@/hooks/useOpenNow';
import { useRestaurantSettings } from '@/hooks/useRestaurantSettings';

const NAV_LINKS = [
  { label: 'Menu', href: '#menu' },
  { label: 'About', href: '#about' },
  { label: 'Services', href: '#services' },
  { label: 'Branches', href: '#branches' },
  { label: 'Contact', href: '#contact' },
];

type Props = {
  onChangeBranch: () => void;
};

export default function Header({ onChangeBranch }: Props) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [branchMenuOpen, setBranchMenuOpen] = useState(false);
  const { selectedBranch, allBranches } = useBranch();
  const { cartItemCount, toggleCart } = useCart();
  const { settings } = useRestaurantSettings();
  const isOpen = useOpenNow(selectedBranch.openTime, selectedBranch.closeTime);

  const bannerText = settings.extra_data.announcement_banner?.trim();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (href: string) => {
    setMobileOpen(false);
    const el = document.querySelector(href);
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  const orderNow = () => {
    setMobileOpen(false);
    document.querySelector('#menu')?.scrollIntoView({ behavior: 'smooth' });
  };

  const changeBranch = () => {
    setBranchMenuOpen(false);
    setMobileOpen(false);
    onChangeBranch();
  };

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'border-b border-white/5 bg-ink-950/85 backdrop-blur-xl'
            : 'border-b border-transparent bg-transparent'
        }`}
      >
        {/* Dynamic Top Announcement Banner (only rendered when configured) */}
        {bannerText && (
          <div className="border-b border-primary-500/20 bg-primary-500/10 px-4 py-1.5 text-center text-[11px] font-semibold text-primary-300 backdrop-blur-md sm:text-xs">
            <span>{bannerText}</span>
          </div>
        )}

        <div className="container-x flex h-16 items-center justify-between gap-4 sm:h-20">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center"
            aria-label="Dough N Cheese home"
          >
            <img
              src={settings.logo_url || site.logo}
              alt={settings.restaurant_name || site.name}
              className={`transition-all duration-300 ${
                scrolled ? 'h-10 sm:h-12' : 'h-12 sm:h-14'
              } w-auto object-contain`}
            />
          </button>

          <nav className="hidden items-center gap-1 lg:flex">
            {NAV_LINKS.map((link) => (
              <button
                key={link.href}
                onClick={() => scrollTo(link.href)}
                className="rounded-full px-4 py-2 text-sm font-medium text-ink-200 transition-colors hover:bg-white/5 hover:text-white"
              >
                {link.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Branch control: current branch first, then Change Branch. */}
            <div className="relative hidden sm:block">
              <button
                onClick={() => setBranchMenuOpen((v) => !v)}
                aria-expanded={branchMenuOpen}
                className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-ink-100 transition-colors hover:border-primary-500/30 hover:bg-white/10 sm:text-sm"
              >
                <span className={`h-2 w-2 rounded-full ${isOpen ? 'bg-success-500' : 'bg-error-500'}`} />
                <MapPin className="h-3.5 w-3.5 text-primary-500" />
                <span className="max-w-[80px] truncate">{selectedBranch.name}</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-ink-400 transition-transform ${
                    branchMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              <AnimatePresence>
                {branchMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="absolute right-0 top-full mt-2 w-64 overflow-hidden rounded-2xl border border-white/10 bg-ink-900/95 p-2 shadow-2xl backdrop-blur-xl"
                  >
                    <div className="rounded-xl bg-primary-500/10 px-3 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">
                        Selected Branch
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-primary-400">
                        <MapPin className="h-4 w-4" />
                        {selectedBranch.name}
                      </div>
                    </div>

                    <button
                      onClick={changeBranch}
                      className="mt-2 flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-semibold text-ink-100 transition-colors hover:bg-white/5"
                    >
                      <span>Change Branch</span>
                      <ArrowRight className="h-4 w-4 text-primary-500" />
                    </button>

                    {allBranches.length > 1 && (
                      <div className="mt-1 border-t border-white/10 pt-1">
                        {allBranches
                          .filter((b) => b.id !== selectedBranch.id)
                          .map((b) => (
                            <button
                              key={b.id}
                              onClick={() => {
                                changeBranch();
                              }}
                              className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm text-ink-200 transition-colors hover:bg-white/5"
                            >
                              <span className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                {b.name}
                              </span>
                              <span className="text-xs text-ink-400">{b.phone}</span>
                            </button>
                          ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Cart trigger button */}
            <button
              onClick={toggleCart}
              aria-label="Shopping cart"
              className="relative flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-ink-100 transition-colors hover:border-primary-500/30 hover:bg-white/10 hover:text-primary-400 shrink-0"
            >
              <ShoppingBag className="h-4 w-4" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-primary-500 text-[9px] sm:text-[10px] font-black text-ink-950 shadow-md">
                  {cartItemCount}
                </span>
              )}
            </button>

            <button
              onClick={orderNow}
              className="hidden items-center gap-2 rounded-full bg-primary-500 px-4 py-2 text-xs font-semibold text-ink-950 transition-all hover:bg-primary-400 hover:shadow-lg hover:shadow-primary-500/30 active:scale-95 sm:flex sm:text-sm"
            >
              <MessageCircle className="h-4 w-4" />
              Order Now
            </button>

            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-ink-100 transition-colors hover:bg-white/10 lg:hidden"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 lg:hidden"
          >
            <div
              className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />

            <motion.nav
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="absolute right-0 top-0 h-full w-80 max-w-[85vw] overflow-y-auto border-l border-white/10 bg-ink-950 p-6 pt-24"
            >
              <div className="space-y-1">
                {NAV_LINKS.map((link) => (
                  <button
                    key={link.href}
                    onClick={() => scrollTo(link.href)}
                    className="block w-full rounded-xl px-4 py-3 text-left text-base font-medium text-ink-100 transition-colors hover:bg-white/5 hover:text-white"
                  >
                    {link.label}
                  </button>
                ))}
              </div>

              <div className="mt-6 border-t border-white/10 pt-4">
                <p className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-ink-400">
                  Branch
                </p>

                <div className="rounded-xl bg-primary-500/10 px-4 py-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary-400">
                    <MapPin className="h-4 w-4" />
                    {selectedBranch.name}
                  </div>
                  <p className="mt-1 text-xs text-ink-400">
                    {isOpen ? 'Open Now' : 'Closed'} · {selectedBranch.phone}
                  </p>
                </div>

                <button
                  onClick={changeBranch}
                  className="mt-2 flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-semibold text-ink-100 transition-colors hover:bg-white/5"
                >
                  <span>Change Branch</span>
                  <ArrowRight className="h-4 w-4 text-primary-500" />
                </button>
              </div>

              <button
                onClick={orderNow}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-primary-500 px-6 py-3.5 text-sm font-semibold text-ink-950 transition-all hover:bg-primary-400 active:scale-95"
              >
                <MessageCircle className="h-5 w-5" />
                Order on WhatsApp
              </button>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
