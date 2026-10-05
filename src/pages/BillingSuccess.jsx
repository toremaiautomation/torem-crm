import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { useAuth } from '../auth/context';
import { supabase } from '../lib/supabase';
import { Card, PageHeader } from '../components/ui';
import { Spinner } from '../components/Feedback';

const POLL_MS = 2000;
const TIMEOUT_MS = 30000;

export default function BillingSuccess() {
  const { activeClientId } = useAuth();
  const [phase, setPhase] = useState('polling'); // 'polling' | 'active' | 'timeout'
  const stopped = useRef(false);

  useEffect(() => {
    if (!activeClientId) return;
    stopped.current = false;
    const deadline = Date.now() + TIMEOUT_MS;

    async function poll() {
      if (stopped.current) return;
      try {
        const { data, error } = await supabase
          .from('clients')
          .select('billing_status')
          .eq('id', activeClientId)
          .single();

        if (stopped.current) return;
        if (!error && data?.billing_status === 'active') {
          setPhase('active');
          return;
        }
      } catch {
        // network hiccup — keep polling
      }
      if (stopped.current) return;
      if (Date.now() >= deadline) {
        setPhase('timeout');
        return;
      }
      setTimeout(poll, POLL_MS);
    }

    poll();
    return () => { stopped.current = true; };
  }, [activeClientId]);

  return (
    <>
      <PageHeader title="Payment" />
      <div className="mx-auto max-w-md">
        <Card>
          <div className="flex flex-col items-center px-6 py-12 text-center">

            {phase === 'polling' && (
              <>
                <Spinner className="h-8 w-8" />
                <p className="mt-4 text-base font-semibold">Confirming your payment...</p>
                <p className="mt-1 text-sm text-muted">This usually takes just a moment.</p>
              </>
            )}

            {phase === 'active' && (
              <>
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
                  <CheckCircle className="h-7 w-7 text-success-ink" />
                </div>
                <p className="mt-4 text-lg font-semibold text-success-ink">You're all set</p>
                <p className="mt-1 text-sm text-muted">Your plan is now active. All features are unlocked.</p>
                <Link to="/billing" className="btn-primary mt-6">Go to Billing</Link>
              </>
            )}

            {phase === 'timeout' && (
              <>
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-3">
                  <CheckCircle className="h-7 w-7 text-muted" />
                </div>
                <p className="mt-4 text-base font-semibold">Your payment is processing</p>
                <p className="mt-1 max-w-xs text-sm text-muted">
                  This can take a minute to confirm. Your plan will be active once processing completes — nothing else is needed from you.
                </p>
                <Link to="/billing" className="btn-secondary mt-6">Back to Billing</Link>
              </>
            )}

          </div>
        </Card>
      </div>
    </>
  );
}
