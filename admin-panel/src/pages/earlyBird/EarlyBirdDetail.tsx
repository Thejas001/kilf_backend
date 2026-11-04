import { ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/common/PageHeader';
import { ErrorState } from '@/components/common/ErrorState';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/utils';
import { EARLY_BIRD_TYPES, INTEREST_LABELS, getEarlyBird } from '@/services/earlyBird.service';

export default function EarlyBirdDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: r, isLoading, isError, refetch } = useQuery({
    queryKey: ['early-bird', 'detail', id],
    queryFn: () => getEarlyBird(id!),
    enabled: !!id,
  });

  if (isLoading) return <Skeleton className="h-96" />;
  if (isError || !r) return <ErrorState onRetry={() => refetch()} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={r.name}
        description={`Registered ${formatDate(r.createdAt, true)}`}
        backTo="/early-bird"
        backLabel="Back to early bird"
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Registration</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
            <InfoRow
              label="Type"
              value={
                <Badge variant="accent">
                  {EARLY_BIRD_TYPES.find((t) => t.value === r.interestType)?.label ?? r.interestType}
                </Badge>
              }
            />
            <InfoRow label="Age group" value={r.ageGroup} />
            <InfoRow label="Town / city" value={r.townOrCity} />
            <InfoRow label="Registered" value={formatDate(r.createdAt, true)} />
            <InfoRow label="Last updated" value={formatDate(r.updatedAt, true)} />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <InfoRow
                label="WhatsApp"
                value={
                  <a
                    href={`https://wa.me/91${r.whatsappNumber}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline"
                  >
                    +91 {r.whatsappNumber}
                  </a>
                }
              />
              <InfoRow
                label="Email"
                value={
                  r.email ? (
                    <a href={`mailto:${r.email}`} className="break-all text-primary hover:underline">
                      {r.email}
                    </a>
                  ) : (
                    '—'
                  )
                }
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Interests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {r.interests.length === 0 && <span className="text-sm text-muted-foreground">—</span>}
                {r.interests.map((i) => (
                  <Badge key={i} variant="outline">
                    {INTEREST_LABELS[i] ?? i}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
