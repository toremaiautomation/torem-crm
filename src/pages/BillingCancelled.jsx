import { Link } from 'react-router-dom';
import { XCircle } from 'lucide-react';
import { Card, PageHeader } from '../components/ui';

export default function BillingCancelled() {
  return (
    <>
      <PageHeader title="Checkout cancelled" />
      <div className="mx-auto max-w-md">
        <Card>
          <div className="flex flex-col items-center px-6 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-3">
              <XCircle className="h-7 w-7 text-muted" />
            </div>
            <p className="mt-4 text-base font-semibold">Checkout cancelled</p>
            <p className="mt-1 max-w-xs text-sm text-muted">
              You haven't been charged. You can subscribe whenever you're ready.
            </p>
            <Link to="/billing" className="btn-primary mt-6">Back to Billing</Link>
          </div>
        </Card>
      </div>
    </>
  );
}
