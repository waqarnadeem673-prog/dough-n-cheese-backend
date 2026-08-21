import { useAuth } from '@/context/AuthContext';
import {
  UtensilsCrossed,
  MapPin,
  Tag,
  ShoppingBag,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminDashboard() {
  const { profile, role } = useAuth();

  const quickCards = [
    {
      title: 'Menu Products',
      description: 'Manage items, prices, crusts, and categories',
      icon: UtensilsCrossed,
      link: '/admin/products',
      status: 'Ready for CRUD module',
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    },
    {
      title: 'Branch Locations',
      description: 'Update hours, contact numbers, and WhatsApp ordering',
      icon: MapPin,
      link: '/admin/branches',
      status: 'Ready for branch module',
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      title: 'Promotions & Discounts',
      description: 'Configure percentage discounts and targeted promos',
      icon: Tag,
      link: '/admin/discounts',
      status: 'Ready for discount module',
      color: 'text-primary-400 bg-primary-500/10 border-primary-500/20',
    },
    {
      title: 'Orders Overview',
      description: 'Order tracking and customer checkout records',
      icon: ShoppingBag,
      link: '/admin/orders',
      status: 'WhatsApp ordering active',
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-primary-500/20 bg-gradient-to-br from-ink-900 via-ink-900/90 to-primary-950/40 p-6 sm:p-8 backdrop-blur-md">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary-500/10 blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary-400">
              <Sparkles className="h-4 w-4" />
              <span>Administration Overview</span>
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink-50 sm:text-3xl">
              Welcome back, {profile?.name || 'Administrator'}
            </h1>
            <p className="mt-1 text-sm text-ink-400">
              You are signed in with{' '}
              <span className="font-semibold text-primary-400">{role}</span>{' '}
              privileges. Your session is secured with Row Level Security.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-ink-950/60 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-500/20 text-primary-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-ink-400">
                System Status
              </div>
              <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 mt-0.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Database Connected
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Module Overview Cards */}
      <div>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-ink-50">Management Modules</h2>
          <p className="text-xs text-ink-400">
            Select a section to manage restaurant resources
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.title}
                to={card.link}
                className="group relative flex flex-col justify-between rounded-2xl border border-white/5 bg-ink-900/60 p-5 transition-all duration-300 hover:border-primary-500/30 hover:bg-ink-900/90"
              >
                <div>
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl border ${card.color}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-base font-bold text-ink-50 group-hover:text-primary-300 transition-colors">
                    {card.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-ink-400">
                    {card.description}
                  </p>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-white/5 pt-3">
                  <span className="text-[11px] font-medium text-ink-500">
                    {card.status}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-primary-400 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
