import { sendDueCareReminders } from '@/lib/care/reminders';
import { isCronAuthorized } from '@/lib/security/cron';

export const dynamic = 'force-dynamic';

/**
 * Daily car book reminders (vercel.json → crons). Only Vercel Cron, holding
 * CRON_SECRET, may run it. The answer is counts only: nothing about who.
 */
export async function GET(request: Request): Promise<Response> {
  if (!isCronAuthorized(request.headers.get('authorization'), process.env.CRON_SECRET)) {
    return new Response('Unauthorized', { status: 401 });
  }
  try {
    return Response.json(await sendDueCareReminders());
  } catch (error) {
    console.error('[cron] care reminders failed:', error instanceof Error ? error.message : error);
    return Response.json({ error: 'failed' }, { status: 500 });
  }
}
