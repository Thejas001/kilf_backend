import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Wallet, RefreshCcw, TrendingUp, Ticket } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/common/ErrorState';
import {
  getDailyRevenue,
  getMonthlyRevenue,
  getRevenueByFestival,
  getRevenueByPaymentStatus,
  getRevenueByTicket,
  getRevenueSummary,
} from '@/services/revenue.service';
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils';

const CHART_COLORS = ['#7a2d3c', '#c9a24b', '#4b7a5f', '#3c5a7a', '#8a5a3c', '#6b4b7a'];

export default function RevenuePage() {
  const summary = useQuery({ queryKey: ['revenue-summary'], queryFn: getRevenueSummary });
  const daily = useQuery({ queryKey: ['revenue-daily'], queryFn: () => getDailyRevenue(30) });
  const monthly = useQuery({ queryKey: ['revenue-monthly'], queryFn: () => getMonthlyRevenue(12) });
  const byTicket = useQuery({ queryKey: ['revenue-by-ticket'], queryFn: getRevenueByTicket });
  const byFestival = useQuery({ queryKey: ['revenue-by-festival'], queryFn: getRevenueByFestival });
  const byPaymentStatus = useQuery({ queryKey: ['revenue-by-payment-status'], queryFn: getRevenueByPaymentStatus });

  const isLoading = summary.isLoading || daily.isLoading || monthly.isLoading || byTicket.isLoading;
  const isError = summary.isError || daily.isError || monthly.isError || byTicket.isError;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Revenue" description="Financial performance across the festival" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !summary.data) {
    return (
      <div>
        <PageHeader title="Revenue" description="Financial performance across the festival" />
        <ErrorState onRetry={() => summary.refetch()} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Revenue" description="Financial performance across the festival" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Gross Revenue" value={formatCurrency(summary.data.grossRevenue)} icon={Wallet} tone="success" />
        <StatCard label="Refunds" value={formatCurrency(summary.data.refunds)} icon={RefreshCcw} tone="destructive" />
        <StatCard label="Net Revenue" value={formatCurrency(summary.data.netRevenue)} icon={TrendingUp} />
        <StatCard label="Tickets Sold" value={formatNumber(summary.data.ticketsSold)} icon={Ticket} />
        <StatCard label="Avg. Ticket Value" value={formatCurrency(summary.data.averageTicketValue)} icon={Wallet} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Daily revenue (last 30 days)</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={daily.data ?? []} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(346 15% 90%)" />
                <XAxis dataKey="date" tickFormatter={(v) => formatDate(v)} tick={{ fontSize: 11 }} minTickGap={20} />
                <YAxis tick={{ fontSize: 11 }} width={60} tickFormatter={(v) => formatNumber(v)} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} labelFormatter={(v) => formatDate(v as string)} />
                <Line type="monotone" dataKey="grossRevenue" stroke="#7a2d3c" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly revenue</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly.data ?? []} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(346 15% 90%)" />
                <XAxis dataKey="month" tickFormatter={(v) => formatDate(v)} tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={60} tickFormatter={(v) => formatNumber(v)} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} labelFormatter={(v) => formatDate(v as string)} />
                <Bar dataKey="grossRevenue" fill="#c9a24b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue by ticket type</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byTicket.data ?? []} dataKey="revenue" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {(byTicket.data ?? []).map((_, index) => (
                    <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue by festival</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byFestival.data ?? []} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(346 15% 90%)" />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => formatNumber(v)} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="revenue" fill="#4b7a5f" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue by payment status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(byPaymentStatus.data ?? []).map((row) => (
              <div key={row.status} className="rounded-md border border-border p-3">
                <p className="text-xs font-medium uppercase text-muted-foreground">{row.status}</p>
                <p className="mt-1 font-serif text-lg font-semibold">{formatCurrency(row.amount)}</p>
                <p className="text-xs text-muted-foreground">{row.count} transaction(s)</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Revenue by ticket (detail)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {(byTicket.data ?? []).map((row) => (
              <div key={row.ticketId} className="flex items-center justify-between border-b border-border py-2 text-sm last:border-0">
                <div>
                  <p className="font-medium">{row.name}</p>
                  <p className="text-xs text-muted-foreground">{row.ticketType.replace('_', ' ')} • {row.quantitySold} sold</p>
                </div>
                <p className="font-medium">{formatCurrency(row.revenue)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
