import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Clock, Phone, Check, X, Loader2, AlertCircle, RotateCw, RefreshCw } from 'lucide-react';
import { useBranch } from '@/context/BranchContext';
import { useOpenNow } from '@/hooks/useOpenNow';
import { site } from '@/data/site';
import type { Branch } from '@/types';

type Props = {
  onSelect: (id: string) => void;
  onClose?: () => void;
  mode?: 'initial' | 'change';
};

function BranchCard({
  branch,
  onSelect,
}: {
  branch: Branch;
  onSelect: () => void;
}) {
  const isOpen = useOpenNow(branch.openTime, branch.closeTime);

  return (
    <motion.button
      onClick={onSelect}
      whileHover={{ y: -6 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="group relative flex w-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-ink-900/60 p-6 text-left backdrop-blur-md transition-colors hover:border-primary-500/40"
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary-500/5 blur-2xl transition-opacity group-hover:bg-primary-500/10" />

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-500/15">
            <MapPin className="h-6 w-6 text-primary-500" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-ink-50">{branch.name}</h3>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span
                className={`h-2 w-2 rounded-full ${
                  isOpen ? 'bg-success-500' : 'bg-error-500'
                }`}
              />
              <span className="text-xs font-medium text-ink-300">
                {isOpen ? 'Open Now' : 'Closed'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-2 text-sm text-ink-300">
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />
          <span>{branch.address}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 shrink-0 text-ink-400" />
          <span>
            {branch.daysOpen} · {branch.hours}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 shrink-0 text-ink-400" />
          <span>{branch.phone}</span>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-primary-500 transition-colors group-hover:text-primary-400">
          Select Branch
        </span>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500/15 text-primary-500 transition-all group-hover:bg-primary-500 group-hover:text-ink-950">
          <Check className="h-4 w-4" />
        </div>
      </div>
    </motion.button>
  );
}

export default function BranchSelection({ onSelect, onClose, mode = 'initial' }: Props) {
  const { allBranches, loading, syncing, syncError, refreshBranches } = useBranch();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] flex flex-col items-center justify-center overflow-y-auto bg-ink-950 px-4 py-10"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-500/8 blur-[150px]" />
      </div>

      {mode === 'change' && onClose && (
        <button
          onClick={onClose}
          aria-label="Close branch selection"
          className="absolute right-5 top-5 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-ink-100 transition-colors hover:bg-white/10"
        >
          <X className="h-5 w-5" />
        </button>
      )}

      <div className="relative z-10 w-full max-w-2xl">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8 flex flex-col items-center text-center"
        >
          <div className="mb-4 h-20 w-20 overflow-hidden rounded-xl">
            <img src={site.logo} alt="Dough N Cheese" className="h-full w-full object-contain" />
          </div>

          <p className="section-label mb-2">{mode === 'change' ? 'Change Branch' : 'Welcome to'}</p>

          <h1 className="text-3xl font-bold text-ink-50 sm:text-4xl">
            {mode === 'change' ? 'Choose Your Dough N Cheese Branch' : 'Choose Your Dough N Cheese'}
          </h1>

          <p className="mt-2 max-w-md text-sm text-ink-400">
            {mode === 'change'
              ? 'Select a branch to update your hours, contact info, and WhatsApp ordering.'
              : 'Select your nearest branch for accurate hours, contact info, and WhatsApp ordering.'}
          </p>

          {/* ── Non-blocking background sync indicator ── */}
          <AnimatePresence>
            {syncing && allBranches.length > 0 && (
              <motion.div
                key="syncing"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.25 }}
                className="mt-3 flex items-center gap-2 rounded-full border border-white/8 bg-ink-900/60 px-4 py-1.5 text-xs text-ink-400"
              >
                <RefreshCw className="h-3 w-3 animate-spin text-primary-500" />
                Updating branch info…
              </motion.div>
            )}

            {syncError && allBranches.length > 0 && (
              <motion.div
                key="sync-error"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.25 }}
                className="mt-3 flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/5 px-4 py-1.5 text-xs text-amber-400"
              >
                <AlertCircle className="h-3 w-3" />
                <span>Using saved branch data — tap to retry</span>
                <button
                  onClick={refreshBranches}
                  className="ml-1 rounded-full p-0.5 transition-colors hover:text-amber-300"
                  aria-label="Retry branch sync"
                >
                  <RotateCw className="h-3 w-3" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <div className="grid gap-4">
          {/* ── CASE 1: No cache + Supabase still loading (genuine first visit) ── */}
          {loading && allBranches.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-ink-900/40 p-12 text-center backdrop-blur-md">
              <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
              <p className="mt-4 text-sm font-medium text-ink-300">Loading available branches…</p>
            </div>

          ) : !loading && syncError && allBranches.length === 0 ? (
            /* ── CASE 2: No cache + Supabase error ── */
            <div className="flex flex-col items-center justify-center rounded-3xl border border-error-500/20 bg-error-500/5 p-8 text-center backdrop-blur-md">
              <AlertCircle className="h-8 w-8 text-error-400" />
              <p className="mt-3 text-sm font-semibold text-ink-200">Unable to load branches</p>
              <p className="mt-1 text-xs text-ink-400">{syncError}</p>
              <button
                onClick={refreshBranches}
                className="btn-primary mt-4 py-2 text-xs"
              >
                <RotateCw className="h-3.5 w-3.5" />
                <span>Retry</span>
              </button>
            </div>

          ) : (
            /* ── CASE 3: Branches available (cached or live) ── */
            <AnimatePresence>
              {allBranches.map((branch, i) => (
                <motion.div
                  key={branch.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.08, duration: 0.4 }}
                >
                  <BranchCard branch={branch} onSelect={() => onSelect(branch.id)} />
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>
    </motion.div>
  );
}
