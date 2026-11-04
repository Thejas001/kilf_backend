import { useSearchParams } from 'react-router-dom';

// Keeps list page, search and filters in the URL so they survive opening a record and coming back.
export function useListParams<K extends string>(keys: readonly K[]) {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const hasFilters = keys.some((key) => !!searchParams.get(key));

  function get(key: K) {
    return searchParams.get(key) ?? '';
  }

  function setFilter(key: K, value: string) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        next.delete('page');
        return next;
      },
      { replace: true }
    );
  }

  function setPage(value: number) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value > 1) next.set('page', String(value));
      else next.delete('page');
      return next;
    });
  }

  function clearFilters() {
    setSearchParams({}, { replace: true });
  }

  return { page, get, setFilter, setPage, hasFilters, clearFilters };
}
