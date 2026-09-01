import { Outlet } from 'react-router-dom';
import { BookOpen } from 'lucide-react';

export function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <BookOpen className="h-6 w-6" />
          </div>
          <h1 className="font-serif text-2xl font-semibold">Kilf Admin</h1>
          <p className="mt-1 text-sm text-muted-foreground">Literature Festival Management Console</p>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
