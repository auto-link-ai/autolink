import type { routing } from '@/i18n/routing';
import type messages from '@/messages/fr.json';

// Types next-intl against the French catalogue (the default locale), so a
// missing or misspelled key is a compile error.
declare module 'next-intl' {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof messages;
  }
}
