import { Link } from 'react-router-dom';
import { BookX } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
      <BookX className="h-10 w-10 text-muted-foreground" />
      <div>
        <h1 className="font-serif text-2xl font-semibold">Page not found</h1>
        <p className="mt-1 text-sm text-muted-foreground">This chapter doesn't exist in our festival catalog.</p>
      </div>
      <Button asChild>
        <Link to="/dashboard">Back to dashboard</Link>
      </Button>
    </div>
  );
}
