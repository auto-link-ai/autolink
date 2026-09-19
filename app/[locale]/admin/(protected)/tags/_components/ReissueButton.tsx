'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useHydrated } from '@/components/ui/useHydrated';
import { downloadZip, errorMessage } from './downloadZip';

export function ReissueButton({
  batchPublicId,
  labels,
  errors,
}: {
  batchPublicId: string;
  labels: { reissue: string; reissuing: string; confirm: string; done: string };
  errors: Record<string, string>;
}) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function reissue() {
    if (!window.confirm(labels.confirm)) return;
    setWorking(true);
    setMessage(null);
    const result = await downloadZip(`/api/admin/batches/${encodeURIComponent(batchPublicId)}/reissue`);
    setWorking(false);
    if (result.ok) {
      setMessage({ ok: true, text: labels.done });
      router.refresh();
    } else {
      setMessage({ ok: false, text: errorMessage(errors, result.error, result.detail) });
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button variant="secondary" size="sm" onClick={reissue} disabled={!hydrated || working}>
        {working ? labels.reissuing : labels.reissue}
      </Button>
      {message && (
        <span aria-live="polite" className={message.ok ? 'text-xs text-success' : 'text-xs text-danger'}>
          {message.text}
        </span>
      )}
    </div>
  );
}
