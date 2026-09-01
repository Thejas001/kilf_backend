import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Ticket, ClipboardCheck, Wallet, Handshake, TrendingUp, Clock } from 'lucide-react';
import { getDashboardStats } from '@/services/revenue.service';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/common/ErrorState';
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils';

const CHART_COLORS = ['#7a2d3c', '#c9a24b', '#4b7a5f', '#3c5a7a', '#8a5a3c', '#6b4b7a'];

export default function DashboardPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" description="Overview of festival performance" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div>
        <PageHeader title="Dashboard" description="Overview of festival performance" />
        <ErrorState onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Overview of festival performance" />

      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Revenue</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Revenue" value={formatCurrency(data.revenue.total)} icon={Wallet} tone="success" />
          <StatCard label="Today's Revenue" value={formatCurrency(data.revenue.today)} icon={TrendingUp} />
          <StatCard label="This Week" value={formatCurrency(data.revenue.thisWeek)} icon={TrendingUp} />
          <StatCard label="This Month" value={formatCurrency(data.revenue.thisMonth)} icon={TrendingUp} />
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Tickets &amp; Bookings</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Tickets" value={formatNumber(data.tickets.total)} icon={Ticket} />
          <StatCard
            label="Tickets Sold"
            value={formatNumber(data.tickets.sold)}
            hint={`${data.tickets.utilizationPercentage}% utilization`}
            icon={ClipboardCheck}
            tone="success"
          />
          <StatCard label="Tickets Available" value={formatNumber(data.tickets.available)} icon={Ticket} />
          <StatCard label="Total Bookings" value={formatNumber(data.bookings.total)} icon={ClipboardCheck} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Confirmed" value={formatNumber(data.bookings.confirmed)} tone="success" icon={ClipboardCheck} />
        <StatCard label="Pending" value={formatNumber(data.bookings.pending)} tone="warning" icon={Clock} />
        <StatCard label="Cancelled" value={formatNumber(data.bookings.cancelled)} tone="destructive" icon={ClipboardCheck} />
        <StatCard label="Refunded" value={formatNumber(data.bookings.refunded)} tone="destructive" icon={Wallet} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue by day</CardTitle>
          </CardHeader>
          <CardContent className="h-72 pl-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.charts.revenueByDay} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7a2d3c" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#7a2d3c" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(346 15% 90%)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) => formatDate(v)}
                  tick={{ fontSize: 11 }}
                  minTickGap={20}
                />
                <YAxis tick={{ fontSize: 11 }} width={60} tickFormatter={(v) => formatNumber(v)} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={(v) => formatDate(v as string)}
                />
                <Area type="monotone" dataKey="revenue" stroke="#7a2d3c" strokeWidth={2} fill="url(#revenueGradient)" />
              </AreaChart>
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
                <Pie
                  data={data.charts.revenueByTicketType}
                  dataKey="revenue"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {data.charts.revenueByTicketType.map((_, index) => (
                    <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue by month</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.charts.revenueByMonth} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(346 15% 90%)" />
                <XAxis dataKey="month" tickFormatter={(v) => formatDate(v)} tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={60} tickFormatter={(v) => formatNumber(v)} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} labelFormatter={(v) => formatDate(v as string)} />
                <Bar dataKey="revenue" fill="#c9a24b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sponsors</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <StatCard label="Total Sponsors" value={formatNumber(data.sponsors.total)} icon={Handshake} />
            <StatCard label="Active Sponsors" value={formatNumber(data.sponsors.active)} icon={Handshake} tone="success" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
