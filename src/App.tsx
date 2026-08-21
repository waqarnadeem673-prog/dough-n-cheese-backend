import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { BranchProvider, useBranch } from '@/context/BranchContext';
import { AuthProvider } from '@/context/AuthContext';
import LoadingScreen from '@/components/LoadingScreen';
import BranchSelection from '@/components/BranchSelection';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import MenuSection from '@/components/MenuSection';
import WhatWeOffer from '@/components/WhatWeOffer';
import About from '@/components/About';
import Services from '@/components/Services';
import Branches from '@/components/Branches';
import Contact from '@/components/Contact';
import Footer from '@/components/Footer';

// Admin imports
import AdminLogin from '@/pages/admin/AdminLogin';
import ProtectedRoute from '@/components/admin/ProtectedRoute';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminProducts from '@/pages/admin/AdminProducts';
import AdminProductForm from '@/pages/admin/AdminProductForm';
import AdminBranches from '@/pages/admin/AdminBranches';
import AdminBranchForm from '@/pages/admin/AdminBranchForm';
import AdminDiscounts from '@/pages/admin/AdminDiscounts';
import AdminDiscountForm from '@/pages/admin/AdminDiscountForm';
import AdminAdmins from '@/pages/admin/AdminAdmins';
import AdminAdminForm from '@/pages/admin/AdminAdminForm';
import AdminSettings from '@/pages/admin/AdminSettings';
import AdminOrders from '@/pages/admin/AdminOrders';
import { CartProvider } from '@/context/CartContext';
import CartDrawer from '@/components/CartDrawer';

type Stage = 'loading' | 'branch' | 'ready';

// ==============================================================================
// PUBLIC CUSTOMER WEBSITE (100% PRESERVED IMMUTABLE VISUAL DESIGN)
// ==============================================================================
function CustomerWebsite() {
  const [stage, setStage] = useState<Stage>('loading');
  const [branchPickerOpen, setBranchPickerOpen] = useState(false);
  const { setSelectedBranch } = useBranch();

  const handleLoadComplete = () => {
    // The live-site flow is: loading screen -> branch selection -> website.
    // Keep this step explicit so a fresh page load always starts with branch selection.
    setStage('branch');
  };

  const handleBranchSelect = (id: string) => {
    setSelectedBranch(id);
    localStorage.setItem('dnc-visited', '1');
    setStage('ready');
    setBranchPickerOpen(false);
  };

  const openBranchPicker = () => {
    setBranchPickerOpen(true);
  };

  return (
    <>
      <AnimatePresence mode="wait">
        {stage === 'loading' && (
          <LoadingScreen key="loader" onComplete={handleLoadComplete} />
        )}

        {stage === 'branch' && (
          <BranchSelection key="branch" onSelect={handleBranchSelect} />
        )}
      </AnimatePresence>

      {stage === 'ready' && (
        <div className="relative min-h-screen bg-ink-950">
          <Header onChangeBranch={openBranchPicker} />

          <main>
            <Hero />
            <MenuSection />
            <WhatWeOffer />
            <About />
            <Services />
            <Branches />
            <Contact />
          </main>

          <Footer />

          {/* Customer Shopping Cart Slide-over */}
          <CartDrawer />

          <AnimatePresence>
            {branchPickerOpen && (
              <BranchSelection
                key="branch-change"
                onSelect={handleBranchSelect}
                onClose={() => setBranchPickerOpen(false)}
                mode="change"
              />
            )}
          </AnimatePresence>
        </div>
      )}
    </>
  );
}

// ==============================================================================
// APP ROUTER ROOT
// ==============================================================================
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BranchProvider>
          <CartProvider>
            <Routes>
              {/* Public Customer Restaurant Website */}
              <Route path="/" element={<CustomerWebsite />} />

            {/* Admin Login */}
            <Route path="/admin/login" element={<AdminLogin />} />

            {/* Protected Admin Suite */}
            <Route path="/admin" element={<ProtectedRoute />}>
              <Route element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />

                {/* Products CRUD Module */}
                <Route path="products" element={<AdminProducts />} />
                <Route path="products/new" element={<AdminProductForm mode="create" />} />
                <Route path="products/:id/edit" element={<AdminProductForm mode="edit" />} />

                {/* Branches CRUD Module */}
                <Route path="branches" element={<AdminBranches />} />
                <Route path="branches/new" element={<AdminBranchForm mode="create" />} />
                <Route path="branches/:id/edit" element={<AdminBranchForm mode="edit" />} />

                {/* Discounts CRUD Module */}
                <Route path="discounts" element={<AdminDiscounts />} />
                <Route path="discounts/new" element={<AdminDiscountForm mode="create" />} />
                <Route path="discounts/:id/edit" element={<AdminDiscountForm mode="edit" />} />

                {/* Administrators Management Module */}
                <Route path="admins" element={<AdminAdmins />} />
                <Route path="admins/new" element={<AdminAdminForm mode="create" />} />
                <Route path="admins/:id/edit" element={<AdminAdminForm mode="edit" />} />

                {/* Orders Management Module — OWNER/ADMIN/MANAGER only */}
                <Route path="orders" element={<AdminOrders />} />

                {/* Restaurant Settings Module */}
                <Route path="settings" element={<AdminSettings />} />
                <Route path="*" element={<Navigate to="/admin" replace />} />
              </Route>
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </CartProvider>
        </BranchProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
