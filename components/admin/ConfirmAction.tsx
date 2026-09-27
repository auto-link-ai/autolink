import { Button } from '@/components/ui/Button';

/**
 * A destructive admin action in two taps, with no browser pop-up: the first
 * opens a line saying exactly what will happen, only the second does it.
 * Works without JavaScript (a <details> and a plain form).
 */
export function ConfirmAction({
  summary,
  message,
  confirm,
  action,
  fields,
  tone = 'danger',
}: {
  summary: string;
  message: string;
  confirm: string;
  action: (formData: FormData) => Promise<void>;
  /** Hidden inputs the action needs (locale, ids, where to return). */
  fields: Record<string, string>;
  /** `neutral` for an action that is irreversible but not destructive (delivering). */
  tone?: 'danger' | 'neutral';
}) {
  const danger = tone === 'danger';
  return (
    <details className="group">
      <summary
        className={
          danger
            ? 'inline-flex h-10 cursor-pointer list-none items-center rounded-sm border border-danger/40 px-3 text-sm font-bold whitespace-nowrap text-danger hover:bg-danger/5'
            : 'inline-flex h-10 cursor-pointer list-none items-center rounded-sm border border-border-strong px-3 text-sm font-bold whitespace-nowrap text-text hover:bg-surface-2'
        }
      >
        {summary}
      </summary>
      <form
        action={action}
        className={
          danger
            ? 'mt-2 flex max-w-sm flex-col items-start gap-2 rounded-sm border border-danger/30 bg-danger/5 p-3'
            : 'mt-2 flex max-w-sm flex-col items-start gap-2 rounded-sm border border-border bg-surface-2 p-3'
        }
      >
        {Object.entries(fields).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <p className="text-sm whitespace-normal text-text">{message}</p>
        <Button type="submit" variant={danger ? 'danger' : 'primary'} size="sm">
          {confirm}
        </Button>
      </form>
    </details>
  );
}
