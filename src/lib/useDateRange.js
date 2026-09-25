import { useSearchParams } from 'react-router-dom';
import { rangeFromDays } from './analytics';

export function useDateRange(defaultDays = 30) {
  const [params, setParams] = useSearchParams();
  const days = Number(params.get('range')) || defaultDays;
  const range = rangeFromDays(days);
  const setDays = (d) => {
    const next = new URLSearchParams(params);
    next.set('range', String(d));
    setParams(next, { replace: true });
  };
  return { range, days, setDays };
}
