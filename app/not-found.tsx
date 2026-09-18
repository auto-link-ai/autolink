import Link from 'next/link';
import './globals.css';

/**
 * Fallback 404 for paths outside the locale segment (the middleware does not
 * localize them). Needs its own <html> because the root layout is a pass-through.
 */
export default function RootNotFound() {
  return (
    <html lang="fr" dir="ltr">
      <body>
        <main className="container-page flex min-h-dvh flex-col items-start justify-center gap-4">
          <h1 className="text-h2">Page introuvable · Page not found · الصفحة غير موجودة</h1>
          <Link href="/" className="font-semibold text-accent underline underline-offset-4">
            AutoTag
          </Link>
        </main>
      </body>
    </html>
  );
}
