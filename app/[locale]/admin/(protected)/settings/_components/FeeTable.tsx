'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';

export interface FeeRowInput {
  code: number;
  name: string;
  home: number;
  stopdesk: number;
}

const INPUT = 'h-11 w-28 rounded-sm border border-border-strong bg-surface px-3 text-sm text-text focus:border-accent';

/**
 * The 58 delivery fees. "Fill all" writes the two values into every row so a
 * new price list takes seconds instead of 116 keystrokes.
 */
export function FeeTable({
  rows,
  labels,
}: {
  rows: FeeRowInput[];
  labels: { wilaya: string; home: string; stopdesk: string; fillAll: string; fillHome: string; fillStopdesk: string };
}) {
  const [fees, setFees] = useState(rows);
  const [bulk, setBulk] = useState({ home: '', stopdesk: '' });

  const fillAll = () => {
    const home = Number(bulk.home);
    const stopdesk = Number(bulk.stopdesk);
    setFees((current) =>
      current.map((row) => ({
        ...row,
        home: Number.isFinite(home) && bulk.home !== '' ? home : row.home,
        stopdesk: Number.isFinite(stopdesk) && bulk.stopdesk !== '' ? stopdesk : row.stopdesk,
      })),
    );
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-sm border border-border bg-surface-2 p-4">
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-text">
          {labels.fillHome}
          <input
            type="number"
            min={0}
            value={bulk.home}
            onChange={(event) => setBulk((b) => ({ ...b, home: event.target.value }))}
            className={INPUT}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-text">
          {labels.fillStopdesk}
          <input
            type="number"
            min={0}
            value={bulk.stopdesk}
            onChange={(event) => setBulk((b) => ({ ...b, stopdesk: event.target.value }))}
            className={INPUT}
          />
        </label>
        <Button type="button" variant="secondary" size="sm" onClick={fillAll}>
          {labels.fillAll}
        </Button>
      </div>

      <div className="max-h-[28rem] overflow-y-auto rounded-sm border border-border">
        <table className="w-full text-start text-sm">
          <thead className="sticky top-0 bg-surface-2 text-xs uppercase tracking-wide text-text-muted">
            <tr>
              <th scope="col" className="p-3 text-start font-semibold">
                {labels.wilaya}
              </th>
              <th scope="col" className="p-3 text-start font-semibold">
                {labels.home}
              </th>
              <th scope="col" className="p-3 text-start font-semibold">
                {labels.stopdesk}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {fees.map((row, index) => (
              <tr key={row.code}>
                <td className="p-3 text-text">
                  <span className="font-mono text-text-muted">{String(row.code).padStart(2, '0')}</span> {row.name}
                </td>
                <td className="p-3">
                  <input
                    type="number"
                    min={0}
                    name={`fee_home_${row.code}`}
                    value={row.home}
                    onChange={(event) =>
                      setFees((current) =>
                        current.map((r, i) => (i === index ? { ...r, home: Number(event.target.value) } : r)),
                      )
                    }
                    className={INPUT}
                  />
                </td>
                <td className="p-3">
                  <input
                    type="number"
                    min={0}
                    name={`fee_stopdesk_${row.code}`}
                    value={row.stopdesk}
                    onChange={(event) =>
                      setFees((current) =>
                        current.map((r, i) => (i === index ? { ...r, stopdesk: Number(event.target.value) } : r)),
                      )
                    }
                    className={INPUT}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
