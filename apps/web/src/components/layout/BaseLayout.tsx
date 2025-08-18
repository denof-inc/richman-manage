'use client';

import React, { useState } from 'react';
import NewHeader from './NewHeader';
import Sidebar from './Sidebar';

interface BaseLayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
}

export default function BaseLayout({ children, showSidebar = true }: BaseLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleMobileMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleSidebarClose = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Fixed Header */}
      <NewHeader onMobileMenuToggle={handleMobileMenuToggle} isMobileMenuOpen={isMobileMenuOpen} />

      <div className="flex pt-16">
        {/* Fixed Sidebar */}
        {showSidebar && (
          <>
            <Sidebar isOpen={isMobileMenuOpen} onClose={handleSidebarClose} />
            {/* Mobile sidebar overlay */}
            {isMobileMenuOpen && (
              <div
                className="fixed inset-0 z-30 bg-black bg-opacity-50 transition-opacity lg:hidden"
                onClick={handleSidebarClose}
              />
            )}
          </>
        )}

        {/* Main Content Area */}
        <main className={`flex-1 transition-all duration-200 ${showSidebar ? 'lg:ml-64' : ''}`}>
          <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
