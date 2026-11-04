import { ReactNode } from 'react';
import { SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { PaginationBar } from '@/components/common/PaginationBar';
import { cn } from '@/lib/utils';
import { Pagination } from '@/types';

interface DataPanelProps {
  tabs?: ReactNode;
  filters?: ReactNode;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  isEmpty: boolean;
  isStale?: boolean;
  empty: ReactNode;
  hasFilters?: boolean;
  onClearFilters?: () => void;
  pagination?: Pagination;
  onPageChange?: (page: number) => void;
  children: ReactNode;
}

// The standard list layout: filters on top, then the table or its loading, error or empty state.
export function DataPanel({
  tabs,
  filters,
  isLoading,
  isError,
  onRetry,
  isEmpty,
  isStale,
  empty,
  hasFilters,
  onClearFilters,
  pagination,
  onPageChange,
  children,
}: DataPanelProps) {
  return (
    <Card>
      {tabs && <div className="border-b border-border px-2">{tabs}</div>}
      {filters && <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:flex-wrap">{filters}</div>}

      {isLoading && (
        <div className="space-y-3 p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
      )}

      {isError && (
        <div className="p-4">
          <ErrorState onRetry={onRetry} />
        </div>
      )}

      {!isLoading && !isError && isEmpty &&
        (hasFilters ? (
          <EmptyState
            icon={SearchX}
            title="No matching results"
            description="Try a different search or remove some filters."
            action={
              <Button variant="outline" size="sm" onClick={onClearFilters}>
                Clear filters
              </Button>
            }
          />
        ) : (
          empty
        ))}

      {!isLoading && !isError && !isEmpty && (
        <>
          <div className={cn('transition-opacity', isStale && 'opacity-60')}>{children}</div>
          {pagination && onPageChange && (
            <div className="px-4">
              <PaginationBar pagination={pagination} onPageChange={onPageChange} />
            </div>
          )}
        </>
      )}
    </Card>
  );
}
