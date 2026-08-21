import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { site } from '@/data/site';
import {
  LayoutDashboard,
  UtensilsCrossed,
  MapPin,
  Tag,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
  ExternalLink,
  ClipboardList,
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/admin', icon: LayoutDashboard, end: true, roles: null },
  { label: 'Orders', path: '/admin/orders', icon: ClipboardList, roles: ['OWNER', 'ADMIN', 'MANAGER'] },
  { label: 'Products', path: '/admin/products', icon: UtensilsCrossed, roles: null },
  { label: 'Branches', path: '/admin/branches', icon: MapPin, roles: null },
  { label: 'Discounts', path: '/admin/discounts', icon: Tag, roles: null },
  { label: 'Administrators', path: '/admin/admins', icon: Users, roles: null },
  { label: 'Settings', path: '/admin/settings', icon: Settings, roles: null },
];

export default function AdminLayout() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { profile, role, signOut } = useAuth();
  const navigate = useNavigate();

  const visibleNavItems = NAV_ITEMS.filter(
    (item) => item.roles === null || (role && item.roles.includes(role))
  );

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login', { replace: true });
  };

  const getRoleBadgeStyle = (r: string | null) => {
    switch (r) {
      case 'OWNER':
        return 'bg-primary-500/20 text-primary-400 border-primary-500/30';
      case 'ADMIN':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'MANAGER':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'EDITOR':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-ink-800 text-ink-300 border-white/10';
    }
  };

  return (
    <div className="flex min-h-screen bg-ink-950 text-ink-50">
      {/* ========================================================================= */}
      {/* DESKTOP SIDEBAR                                                           */}
      {/* ========================================================================= */}
      <aside className="hidden w-64 flex-col border-r border-white/10 bg-ink-900/90 backdrop-blur-xl lg:flex">
        {/* Brand Header */}
        <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6">
          <img
            src={site.logo}
            alt="Dough N Cheese"
            className="h-10 w-10 object-contain"
          />
          <div>
            <span className="block font-bold tracking-tight text-ink-50">
              Dough N Cheese
            </span>
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-primary-400">
              Admin Suite
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1.5 p-4">
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-ink-500">
            Management
          </div>
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-primary-500 text-ink-950 font-semibold shadow-md shadow-primary-500/20'
                      : 'text-ink-300 hover:bg-white/5 hover:text-white'
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Public site link */}
        <div className="p-4 border-t border-white/5">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs text-ink-400 transition-colors hover:bg-white/5 hover:text-primary-400"
          >
            <span className="flex items-center gap-2">
              <ExternalLink className="h-3.5 w-3.5" />
              <span>View Public Site</span>
            </span>
          </a>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* MOBILE DRAWER OVERLAY                                                     */}
      {/* ========================================================================= */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-ink-950/80 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileSidebarOpen(false)}
          />

          <div className="relative flex w-full max-w-xs flex-1 flex-col bg-ink-900 border-r border-white/10 p-6 pt-5">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <img
                  src={site.logo}
                  alt="Dough N Cheese"
                  className="h-9 w-9 object-contain"
                />
                <span className="font-bold text-ink-50">Admin Suite</span>
              </div>
              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="rounded-lg p-2 text-ink-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="mt-4 flex-1 space-y-1.5">
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.end}
                    onClick={() => setMobileSidebarOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-primary-500 text-ink-950 font-semibold'
                          : 'text-ink-300 hover:bg-white/5 hover:text-white'
                      }`
                    }
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>

            <div className="border-t border-white/10 pt-4">
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-2 rounded-xl bg-error-500/10 px-4 py-2.5 text-xs font-semibold text-error-400 hover:bg-error-500/20"
              >
                <LogOut className="h-4 w-4" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MAIN CONTENT AREA                                                         */}
      {/* ========================================================================= */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <header className="flex h-20 items-center justify-between border-b border-white/10 bg-ink-900/40 px-6 backdrop-blur-md">
          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="rounded-lg p-2 text-ink-300 hover:bg-white/5 hover:text-white lg:hidden"
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Title Area (Hidden on mobile if cramped) */}
          <div className="hidden sm:block">
            <span className="text-xs font-medium text-ink-400">
              Dough N Cheese Management
            </span>
          </div>

          {/* User profile & actions */}
          <div className="flex items-center gap-4">
            {/* Admin Profile Pill */}
            <div className="flex items-center gap-3 rounded-full border border-white/10 bg-ink-900/80 px-3.5 py-1.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-500/20 text-primary-400 font-bold text-xs">
                <Shield className="h-3.5 w-3.5" />
              </div>
              <div className="text-left">
                <div className="text-xs font-semibold text-ink-100">
                  {profile?.name || 'Administrator'}
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`inline-block rounded border px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider ${getRoleBadgeStyle(
                      role
                    )}`}
                  >
                    {role || 'ADMIN'}
                  </span>
                </div>
              </div>
            </div>

            {/* Logout button */}
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-ink-300 transition-colors hover:border-error-500/40 hover:bg-error-500/10 hover:text-error-300"
              title="Sign out of administration"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="flex-1 overflow-y-auto p-6 sm:p-8 bg-ink-950">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
