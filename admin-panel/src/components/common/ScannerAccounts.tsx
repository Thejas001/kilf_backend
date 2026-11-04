import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { getApiErrorMessage } from '@/services/api';
import { createScanner, listScanners, updateScanner } from '@/services/scanner.service';

/** Super-admin tool: gate-staff logins that can only verify and check in tickets. */
export function ScannerAccounts() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const scanners = useQuery({ queryKey: ['scanners'], queryFn: listScanners });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['scanners'] });

  const create = useMutation({
    mutationFn: createScanner,
    onSuccess: () => {
      toast.success('Scanner account created');
      setForm({ name: '', email: '', password: '' });
      refresh();
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to create scanner')),
  });

  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => updateScanner(id, { isActive }),
    onSuccess: refresh,
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to update scanner')),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    create.mutate(form);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scanner accounts</CardTitle>
        <CardDescription>
          Gate staff sign in with these and can only scan, verify and check in tickets.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="scanner-name">Name</Label>
            <Input
              id="scanner-name"
              required
              minLength={2}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="scanner-email">Email</Label>
            <Input
              id="scanner-email"
              type="email"
              required
              autoComplete="off"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="scanner-password">Password</Label>
            <Input
              id="scanner-password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <Button type="submit" className="sm:col-span-3 sm:w-fit" loading={create.isPending}>
            Add scanner
          </Button>
        </form>

        <div className="divide-y divide-border border-t border-border">
          {scanners.data?.length === 0 && (
            <p className="pt-4 text-sm text-muted-foreground">No scanner accounts yet.</p>
          )}
          {scanners.data?.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-3 py-3 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium">{s.name}</p>
                <p className="truncate text-xs text-muted-foreground">{s.email}</p>
              </div>
              <label className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                {s.isActive ? 'Active' : 'Disabled'}
                <Switch
                  checked={s.isActive}
                  disabled={toggle.isPending}
                  onCheckedChange={(isActive) => toggle.mutate({ id: s.id, isActive })}
                />
              </label>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
