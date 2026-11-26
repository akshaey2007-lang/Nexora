import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/dashboard/Sidebar';
import TopNav from '../components/dashboard/TopNav';
import ComposeModal from '../components/email/ComposeModal';
import { useAuth } from '../context/AuthContext';

export default function DashboardLayout() {
  const { settings } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(Boolean(settings?.sidebarCollapsed));
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  useEffect(() => {
    if (settings?.sidebarCollapsed !== undefined) {
      setSidebarCollapsed(Boolean(settings.sidebarCollapsed));
    }
  }, [settings?.sidebarCollapsed]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white dark:bg-nexora-dark-bg">
      {/* Left Navigation Sidebar (Desktop rail + Mobile Drawer) */}
      <Sidebar
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        mobileOpen={mobileDrawerOpen}
        setMobileOpen={setMobileDrawerOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopNav onOpenMobileMenu={() => setMobileDrawerOpen(true)} />
        <main className="flex-1 overflow-hidden relative">
          <Outlet />
        </main>
      </div>

      {/* Compose Drawer / Modal */}
      <ComposeModal />
    </div>
  );
}
