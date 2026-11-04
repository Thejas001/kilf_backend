import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { listEnquiries } from '@/services/enquiry.service';
import { NAV_GROUPS } from './navigation';

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { data: pendingEnquiries } = useQuery({
    queryKey: ['enquiries', 'pending-count'],
    queryFn: () => listEnquiries({ page: 1, limit: 1, status: 'PENDING' }),
  });
  const pendingCount = pendingEnquiries?.pagination.total ?? 0;

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 shrink-0 items-center gap-2.5 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-active text-white">
          <BookOpen className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="font-serif text-sm font-bold leading-tight text-white">KILF 2027</p>
          <p className="text-xs text-sidebar-muted">Admin console</p>
        </div>
        <button
          className="ml-auto rounded-md p-1 text-sidebar-muted hover:bg-white/10 hover:text-white lg:hidden"
          onClick={onNavigate}
          aria-label="Close menu"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav className="scrollbar-thin flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-1.5 px-2.5 text-xs font-semibold text-sidebar-muted">{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
                      isActive ? 'bg-sidebar-active text-white' : 'hover:bg-white/10 hover:text-white'
                    )
                  }
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                  {item.to === '/enquiries' && pendingCount > 0 && (
                    <span
                      className="ml-auto rounded-full bg-accent px-2 py-0.5 text-xs font-semibold leading-none text-white"
                      title={`${pendingCount} pending`}
                    >
                      {pendingCount}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
}
