import { useState } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Download, Sparkles, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/common/EmptyState';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { DataPanel } from '@/components/common/DataPanel';
import { FilterSelect, FilterTabs, SearchInput } from '@/components/common/ListControls';
import { useAuth } from '@/hooks/useAuth';
import { useListParams } from '@/hooks/useListParams';
import { getApiErrorMessage } from '@/services/api';
import { formatDate } from '@/lib/utils';
import {
  AGE_GROUPS,
  EARLY_BIRD_TYPES,
  EarlyBirdType,
  INTEREST_LABELS,
  deleteEarlyBird,
  exportEarlyBirdCsv,
  listEarlyBird,
} from '@/services/earlyBird.service';

const FILTER_KEYS = ['search', 'type', 'age', 'interest'] as const;

export default function EarlyBirdListPage() {
  const { admin } = useAuth();
  const queryClient = useQueryClient();
  const { page, get, setFilter, setPage, hasFilters, clearFilters } = useListParams(FILTER_KEYS);
  const [exporting, setExporting] = useState(false);

  const filters = {
    search: get('search') || undefined,
    interestType: (get('type') as EarlyBirdType) || undefined,
    ageGroup: get('age') || undefined,
    interest: get('interest') || undefined,
  };

  const { data, isLoading, isError, isPlaceholderData, refetch } = useQuery({
    queryKey: ['early-bird', page, filters],
    queryFn: () => listEarlyBird({ page, limit: 20, ...filters }),
    placeholderData: keepPreviousData,
  });

  async function handleExport() {
    setExporting(true);
    try {
      await exportEarlyBirdCsv(filters);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to export registrations'));
    } finally {
      setExporting(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteEarlyBird(id);
      toast.success('Registration deleted');
      queryClient.invalidateQueries({ queryKey: ['early-bird'] });
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to delete registration'));
    }
  }

  const canDelete = admin?.role === 'SUPER_ADMIN';

  return (
    <div>
      <PageHeader
        title="Early Bird Registrations"
        description={
          data ? `${data.pagination.total} sign-ups from the public website` : 'Sign-ups from the public website'
        }
        actions={
          <Button variant="outline" onClick={handleExport} loading={exporting}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        }
      />

      <DataPanel
        tabs={
          <FilterTabs
            value={get('type')}
            onChange={(v) => setFilter('type', v)}
            allLabel="All"
            options={EARLY_BIRD_TYPES}
          />
        }
        filters={
          <>
            <SearchInput
              value={get('search')}
              onChange={(v) => setFilter('search', v)}
              placeholder="Search name, number, email, town"
            />
            <FilterSelect
              value={get('age')}
              onChange={(v) => setFilter('age', v)}
              allLabel="All ages"
              className="sm:w-36"
              options={AGE_GROUPS.map((a) => ({ value: a, label: a }))}
            />
            <FilterSelect
              value={get('interest')}
              onChange={(v) => setFilter('interest', v)}
              allLabel="All interests"
              className="sm:w-52"
              options={Object.entries(INTEREST_LABELS).map(([value, label]) => ({ value, label }))}
            />
          </>
        }
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        isEmpty={data?.data.length === 0}
        isStale={isPlaceholderData}
        hasFilters={hasFilters}
        onClearFilters={clearFilters}
        pagination={data?.pagination}
        onPageChange={setPage}
        empty={
          <EmptyState
            icon={Sparkles}
            title="No registrations yet"
            description="Sign-ups from the public website will appear here."
          />
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Age</TableHead>
              <TableHead>Interests</TableHead>
              <TableHead>Registered</TableHead>
              {canDelete && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.data.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <Link to={`/early-bird/${r.id}`} className="font-medium text-primary hover:underline">
                    {r.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">{r.townOrCity}</p>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <a href={`https://wa.me/91${r.whatsappNumber}`} target="_blank" rel="noreferrer" className="hover:underline">
                    +91 {r.whatsappNumber}
                  </a>
                  {r.email && <p className="text-xs text-muted-foreground">{r.email}</p>}
                </TableCell>
                <TableCell>
                  <Badge variant="accent">
                    {EARLY_BIRD_TYPES.find((t) => t.value === r.interestType)?.label ?? r.interestType}
                  </Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap">{r.ageGroup}</TableCell>
                <TableCell className="max-w-xs">
                  <div className="flex flex-wrap gap-1">
                    {r.interests.length === 0 && <span className="text-muted-foreground">—</span>}
                    {r.interests.map((i) => (
                      <Badge key={i} variant="outline">
                        {INTEREST_LABELS[i] ?? i}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(r.createdAt, true)}</TableCell>
                {canDelete && (
                  <TableCell>
                    <ConfirmDialog
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Delete registration"
                          aria-label={`Delete registration from ${r.name}`}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      }
                      title="Delete registration?"
                      description={`This permanently removes the registration from ${r.name}.`}
                      confirmLabel="Delete"
                      variant="destructive"
                      onConfirm={() => handleDelete(r.id)}
                    />
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataPanel>
    </div>
  );
}
