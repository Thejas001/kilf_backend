import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { useAuth } from '@/hooks/useAuth';
import { Topbar } from '@/components/layout/Topbar';

export function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();
  // Gate staff only have the scan screen: no sidebar needed.
  const isScanner = useAuth().admin?.role === 'SCANNER';
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className={isScanner ? 'hidden' : 'hidden w-60 shrink-0 lg:block'}>
        <Sidebar />
      </aside>

      {mobileOpen && !isScanner && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 shadow-xl">
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setMobileOpen(true)} />
        {/* relative: keeps Radix's hidden native selects inside this scroller so they can't stretch the document. */}
        <main ref={mainRef} className="relative flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
