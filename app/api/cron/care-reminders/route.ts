import { sendDueCareReminders } from '@/lib/care/reminders';
import { sendRenewalWarnings } from '@/lib/renewals/warnings';
import { isCronAuthorized } from '@/lib/security/cron';

export const dynamic = 'force-dynamic';

/**
 * The daily owner reminders (vercel.json → crons): car book dates, and
 * stickers whose service ends soon. Only Vercel Cron, holding CRON_SECRET, may
 * run it. Each job runs even if the other fails. The answer is counts only:
 * nothing about who.
 */
export async function GET(request: Request): Promise<Response> {
  if (!isCronAuthorized(request.headers.get('authorization'), process.env.CRON_SECRET)) {
    return new Response('Unauthorized', { status: 401 });
  }
  const [care, renewal] = await Promise.allSettled([sendDueCareReminders(), sendRenewalWarnings()]);
  for (const [name, outcome] of [['care reminders', care], ['renewal warnings', renewal]] as const) {
    if (outcome.status === 'rejected') {
      console.error(`[cron] ${name} failed:`, outcome.reason instanceof Error ? outcome.reason.message : outcome.reason);
    }
  }
  const body = {
    care: care.status === 'fulfilled' ? care.value : { error: 'failed' },
    renewal: renewal.status === 'fulfilled' ? renewal.value : { error: 'failed' },
  };
  const failed = care.status === 'rejected' || renewal.status === 'rejected';
  return Response.json(body, { status: failed ? 500 : 200 });
}
