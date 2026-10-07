import { Outlet } from 'react-router-dom';
import { BookOpen } from 'lucide-react';

export function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#dcebf9] via-background to-[#fdfbf4] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-sm bg-primary text-primary-foreground">
            <BookOpen className="h-6 w-6" />
          </div>
          <h1 className="font-serif text-2xl font-extrabold leading-tight text-primary">
            Kollam International
            <br />
            Literature <span className="text-festival-gradient">Festival</span>
          </h1>
          <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">KILF 2027 · Admin Console</p>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
