import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/dashboard/Sidebar';
import TopNav from '../components/dashboard/TopNav';
import ComposeModal from '../components/email/ComposeModal';
import DemoBanner from '../components/common/DemoBanner';

export default function DashboardLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-nexora-ivory dark:bg-nexora-dark-bg">
      {/* Informative Demo Banner (Visible only in demo mode) */}
      <DemoBanner />

      <div className="flex flex-1 overflow-hidden">
        {/* Left Navigation Sidebar */}
        <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <TopNav />
          <main className="flex-1 overflow-hidden relative">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Floating Compose Modal */}
      <ComposeModal />
    </div>
  );
}
