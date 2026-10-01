/**
 * pnpm tsx scripts/build-communes.ts — rebuilds public/data/communes/NN.json,
 * the communes of each of the 58 wilayas offered by the order form.
 *
 * Source: Wikidata (CC0, public domain) — items that are a « commune of
 * Algeria » (Q2989398), their French and Arabic names, and the wilaya
 * (Q240601) they lie in, identified by its ISO code (DZ-01 … DZ-58).
 * Cleaning: communes Wikidata files under a wilaya newer than our 58 go back
 * to the one they were carved from; duplicates in a wilaya are dropped; a
 * missing French or Arabic name is taken from the other; « (…) »
 * disambiguations are removed. Run it again only to refresh the list.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const QUERY = `
SELECT ?c ?fr ?ar ?iso ?wilayaFr WHERE {
  ?c wdt:P31 wd:Q2989398 .
  OPTIONAL { ?c rdfs:label ?fr FILTER(LANG(?fr) = "fr") }
  OPTIONAL { ?c rdfs:label ?ar FILTER(LANG(?ar) = "ar") }
  OPTIONAL {
    ?c wdt:P131+ ?wilaya . ?wilaya wdt:P31 wd:Q240601 .
    OPTIONAL { ?wilaya wdt:P300 ?iso }
    OPTIONAL { ?wilaya rdfs:label ?wilayaFr FILTER(LANG(?wilayaFr) = "fr") }
  }
}`;

/** Wilayas newer than our list (no ISO code yet) → the wilaya they come from. */
const PARENT_OF_NEW: Record<string, string> = {
  aflou: '03',
  barika: '05',
  'el kantara': '07',
  'bir el ater': '12',
  'el aricha': '13',
  'ksar chellala': '14',
  'ain oussara': '17',
  messaad: '17',
  'ksar el boukhari': '26',
  'bou saada': '28',
  'el abiodh sidi cheikh': '32',
};

interface Commune {
  fr: string;
  ar: string;
}

const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** « بلدية عين البنيان » → « عين البنيان », « Commune de Aflou (Algérie) » → « Aflou ». */
const clean = (name: string | undefined) =>
  (name ?? '')
    .replace(/\s*\([^)]*\)\s*$/, '')
    .replace(/^بلدية\s+/, '')
    .replace(/^commune (de |d['’]\s?)/i, '')
    .trim();

function wilayaCode(iso: string | undefined, wilayaFr: string | undefined): string | null {
  const fromIso = /^DZ-(\d{2})$/.exec(iso ?? '')?.[1];
  if (fromIso) return fromIso;
  const name = fold((wilayaFr ?? '').replace(/^wilaya (de |d )?/i, ''));
  return Object.entries(PARENT_OF_NEW).find(([key]) => name === key || name.endsWith(` ${key}`))?.[1] ?? null;
}

async function main() {
  const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(QUERY)}`;
  const response = await fetch(url, {
    headers: { Accept: 'application/sparql-results+json', 'User-Agent': 'AutoLink-communes/1.0 (qauto.store)' },
  });
  if (!response.ok) throw new Error(`Wikidata answered ${response.status}`);
  const rows = (await response.json()).results.bindings as Record<string, { value: string } | undefined>[];

  // One entry per Wikidata item, with every wilaya code it was found under.
  const items = new Map<string, { fr: string; ar: string; codes: Set<string> }>();
  for (const row of rows) {
    const id = row.c!.value;
    const item = items.get(id) ?? { fr: clean(row.fr?.value), ar: clean(row.ar?.value), codes: new Set<string>() };
    const code = wilayaCode(row.iso?.value, row.wilayaFr?.value);
    if (code) item.codes.add(code);
    items.set(id, item);
  }

  const byWilaya = new Map<string, Map<string, Commune>>();
  let skipped = 0;
  for (const item of items.values()) {
    const fr = item.fr || item.ar;
    const ar = item.ar || item.fr;
    // An item under two of our wilayas, or none, cannot be placed with certainty.
    if (!fr || item.codes.size !== 1) {
      skipped++;
      continue;
    }
    const [code] = [...item.codes] as [string];
    const communes = byWilaya.get(code) ?? new Map<string, Commune>();
    if (!communes.has(fold(fr))) communes.set(fold(fr), { fr, ar });
    byWilaya.set(code, communes);
  }

  const out = path.join(process.cwd(), 'public', 'data', 'communes');
  await mkdir(out, { recursive: true });
  let total = 0;
  for (let n = 1; n <= 58; n++) {
    const code = String(n).padStart(2, '0');
    const communes = [...(byWilaya.get(code)?.values() ?? [])].sort((a, b) => a.fr.localeCompare(b.fr, 'fr'));
    if (communes.length === 0) throw new Error(`no commune for wilaya ${code}`);
    total += communes.length;
    await writeFile(path.join(out, `${code}.json`), JSON.stringify(communes) + '\n');
  }
  console.log(`✓ ${total} communes in 58 wilayas (${skipped} Wikidata items left out)`);
}

main().catch((error: unknown) => {
  console.error('✗ communes:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
