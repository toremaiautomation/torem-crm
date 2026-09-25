import { useEffect, useRef } from 'react';
import { AlertTriangle, Inbox, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Spinner({ className = '' }) {
  return (
    <span
      className={`inline-block h-5 w-5 animate-spin rounded-full border-2 border-line border-t-brand ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}

export function FullPageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner className="h-8 w-8" />
    </div>
  );
}

export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-md bg-surface-3 ${className}`} />;
}

export function EmptyState({ icon: Icon = Inbox, title, children, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-brand">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      {children && <p className="mt-1 max-w-sm text-sm text-muted">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, retry }) {
  return (
    <div className="card flex items-start gap-3 border-red-200 bg-danger-soft p-4 text-sm">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
      <div className="flex-1">
        <p className="font-medium text-danger">Something went wrong</p>
        <p className="mt-0.5 text-red-800/80">{error?.message ?? String(error)}</p>
        {retry && (
          <button className="btn-secondary mt-3" onClick={retry}>
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

export function Reveal({ children, delay = 0, className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    el.style.transitionDelay = `${delay}ms`;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('reveal-in');
          observer.disconnect();
        }
      },
      { threshold: 0.05, rootMargin: '0px 0px -20px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);
  return <div ref={ref} className={`reveal-elem${className ? ` ${className}` : ''}`}>{children}</div>;
}

export function LockedFeature({ title, price, children }) {
  return (
    <div className="card mx-auto max-w-xl p-8 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-brand">
        <Lock className="h-6 w-6" />
      </div>
      <h2 className="text-lg font-semibold">{title} isn't on your plan yet</h2>
      <p className="mt-2 text-sm text-muted">{children}</p>
      {price != null && <p className="mt-4 text-2xl font-semibold">+${price}/mo</p>}
      <div className="mt-5 flex justify-center gap-3">
        <a className="btn-primary" href="mailto:toremaiautomation@gmail.com?subject=Add-on%20request">
          Ask Torem to enable it
        </a>
        <Link className="btn-secondary" to="/settings">
          View my plan
        </Link>
      </div>
    </div>
  );
}
