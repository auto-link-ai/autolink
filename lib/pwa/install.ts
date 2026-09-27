/**
 * Can this browser put AutoLink on the phone, and how? Plain logic with no
 * browser globals, so it runs in unit tests; the header feeds it what it sees.
 *
 * - `installed`: already opened as the app — nothing to offer.
 * - `prompt`: the browser offered its own install window (Android, Chrome and
 *   Edge on a computer). One tap installs.
 * - `ios`: an iPhone or iPad. Apple lets no website install itself; people add
 *   it from the Share menu, so we show them the steps.
 * - `none`: this browser cannot install apps. Offer nothing rather than a
 *   button that does nothing.
 */
export type InstallMode = 'installed' | 'prompt' | 'ios' | 'none';

export function installMode(traits: { standalone: boolean; ios: boolean; canPrompt: boolean }): InstallMode {
  if (traits.standalone) return 'installed';
  if (traits.canPrompt) return 'prompt';
  if (traits.ios) return 'ios';
  return 'none';
}
