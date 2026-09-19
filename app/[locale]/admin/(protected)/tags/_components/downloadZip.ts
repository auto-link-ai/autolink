export type DownloadResult = { ok: true } | { ok: false; error: string; detail?: string };

function filenameFrom(disposition: string | null): string {
  const match = disposition?.match(/filename="([^"]+)"/);
  return match?.[1] ?? 'autolink-batch.zip';
}

/** POSTs to a batch endpoint and saves the returned ZIP; maps failures to error codes. */
export async function downloadZip(url: string, body?: unknown): Promise<DownloadResult> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    });
  } catch {
    return { ok: false, error: 'network' };
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string; detail?: string } | null;
    return { ok: false, error: payload?.error ?? 'server_error', detail: payload?.detail };
  }

  const blob = await response.blob();
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = filenameFrom(response.headers.get('Content-Disposition'));
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(href), 10_000);
  return { ok: true };
}

export function errorMessage(messages: Record<string, string>, code: string, detail?: string): string {
  const template = messages[code] ?? messages.server_error ?? code;
  return template.replace('{detail}', detail ?? '');
}
