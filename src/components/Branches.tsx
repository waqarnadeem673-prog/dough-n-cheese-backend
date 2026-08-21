import { motion } from 'framer-motion';
import { MapPin, Clock, Phone, Navigation, Check, X } from 'lucide-react';
import { useBranch } from '@/context/BranchContext';
import { useOpenNow } from '@/hooks/useOpenNow';
import { buildBranchDirectionsUrl } from '@/utils/googleMaps';
import type { Branch } from '@/types';

function BranchCard({
  branch,
  isSelected,
  onSelect,
}: {
  branch: Branch;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const isOpen = useOpenNow(branch.openTime, branch.closeTime);
  const directionsUrl = buildBranchDirectionsUrl(branch);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6 }}
      className={`relative mx-auto w-full max-w-4xl overflow-hidden rounded-3xl border p-6 transition-colors sm:p-8 ${
        isSelected
          ? 'border-primary-500/40 bg-primary-500/5'
          : 'border-white/5 bg-ink-900/60'
      }`}
    >
      <div className="grid gap-7 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-500/15">
              <MapPin className="h-6 w-6 text-primary-500" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-ink-50">{branch.name}</h3>
              <div className="mt-0.5 flex items-center gap-1.5">
                {isOpen ? (
                  <Check className="h-3.5 w-3.5 text-success-500" />
                ) : (
                  <X className="h-3.5 w-3.5 text-error-500" />
                )}
                <span
                  className={`text-xs font-semibold ${
                    isOpen ? 'text-success-500' : 'text-error-500'
                  }`}
                >
                  {isOpen ? 'Open Now' : 'Closed'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-2 text-sm text-ink-300">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />
              <span>{branch.address}</span>
            </div>

            <div className="flex items-center gap-2 text-sm text-ink-300">
              <Phone className="h-4 w-4 shrink-0 text-ink-400" />
              <span>{branch.phone}</span>
            </div>

            <div className="flex items-center gap-2 text-sm text-ink-300">
              <Clock className="h-4 w-4 shrink-0 text-ink-400" />
              <span>
                {branch.daysOpen} · {branch.hours}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary justify-center"
          >
            <Navigation className="h-4 w-4" />
            Get Directions
          </a>

          {!isSelected ? (
            <button onClick={onSelect} className="btn-primary justify-center">
              <Check className="h-4 w-4" />
              Select Branch
            </button>
          ) : (
            <div className="flex items-center justify-center gap-2 rounded-full bg-primary-500/15 px-6 py-3 text-sm font-semibold text-primary-400">
              <Check className="h-4 w-4" />
              Selected
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function Branches() {
  const { selectedBranch, setSelectedBranch, allBranches } = useBranch();

  return (
    <section id="branches" className="relative py-20 sm:py-28">
      <div className="container-x">
        <div className="mx-auto max-w-2xl text-center">
          <span className="section-label">Find Us</span>
          <h2 className="mt-3 text-3xl font-bold text-ink-50 sm:text-4xl lg:text-5xl">
            Our Branches
          </h2>
          <p className="mt-3 text-sm text-ink-400 sm:text-base">
            Visit us or order online — your nearest Dough N Cheese is ready to serve.
          </p>
        </div>

        <div className="mt-12 space-y-4">
          {allBranches.map((branch) => (
            <BranchCard
              key={branch.id}
              branch={branch}
              isSelected={branch.id === selectedBranch.id}
              onSelect={() => setSelectedBranch(branch.id)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
