import { redirect } from 'next/navigation';

type Props = { params: Promise<{ locale: string }> };

/** /admin → /admin/tags (the admin dashboard with its four numbers arrives in Phase 7). */
export default async function AdminIndexPage({ params }: Props) {
  const { locale } = await params;
  redirect(`/${locale}/admin/tags`);
}
