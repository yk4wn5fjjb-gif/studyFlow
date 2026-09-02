import { readFile, writeFile } from 'node:fs/promises';

const SOURCE_URL = 'https://math.fon.bg.ac.rs/aktivnosti';
const OUTPUT_FILE = new URL('../data/updates.json', import.meta.url);
const REGISTRATION_WORD = /(prijav|пријав)/iu;
const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
const ONESIGNAL_API_KEY = process.env.ONESIGNAL_API_KEY;

const SUBJECT_PATTERNS = [
  ['Matematika 1', /(matematik[ae]\s*1|математик[ае]\s*1)/iu],
  ['Matematika 2', /(matematik[ae]\s*2|математик[ае]\s*2)/iu],
  ['Matematika 3', /(matematik[ae]\s*3|математик[ае]\s*3)/iu],
  ['Diskretne matematičke strukture', /(diskretn\p{L}*\s+matematičk\p{L}*\s+struktur\p{L}*|дискретн\p{L}*\s+математичк\p{L}*\s+структур\p{L}*)/iu],
  ['Numerička analiza', /(numeričk\p{L}*\s+analiz\p{L}*|нумеричк\p{L}*\s+анализ\p{L}*)/iu],
  ['Elementi teorije algoritama', /(element\p{L}*\s+teorij\p{L}*\s+algorit\p{L}*|елемент\p{L}*\s+теориј\p{L}*\s+алгорит\p{L}*)/iu],
  ['Matematika i muzika', /(matematik\p{L}*\s+i\s+muzik\p{L}*|математик\p{L}*\s+и\s+музик\p{L}*)/iu],
  ['Matematička logika i primene', /(matematičk\p{L}*\s+logik\p{L}*|математичк\p{L}*\s+логик\p{L}*)/iu],
  ['Matematički softverski paketi', /(matematičk\p{L}*\s+softversk\p{L}*|математичк\p{L}*\s+софтверск\p{L}*)/iu],
  ['Osnovi kompjuterske geometrije', /(kompjutersk\p{L}*\s+geometrij\p{L}*|компјутерск\p{L}*\s+геометриј\p{L}*)/iu],
  ['Uvod u matematičko programiranje', /(matematičk\p{L}*\s+programir\p{L}*|математичк\p{L}*\s+програмир\p{L}*)/iu],
];

function decodeHtml(value) {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function subjectFor(title) {
  return SUBJECT_PATTERNS.find(([, pattern]) => pattern.test(title))?.[0] || 'Opšte obaveštenje';
}

function extractDate(text) {
  return text.match(/\b\d{1,2}\.\d{1,2}\.\d{4}\.?/)?.[0] || '';
}

function extractDeadline(text) {
  const sentence = text.match(/(?:najkasnije|најкасније)[\s\S]{0,100}?(?:23[.:]59|\d{1,2}\.\d{1,2}\.)/iu)?.[0];
  return sentence ? decodeHtml(sentence) : '';
}

const response = await fetch(SOURCE_URL, { headers: { 'user-agent': 'StudyFlow student monitor/1.0' } });
if (!response.ok) throw new Error(`Source returned ${response.status}`);
const html = await response.text();
const anchors = [...html.matchAll(/<a\b[^>]*href=["']([^"']*\/aktivnosti\/(\d+))["'][^>]*>([\s\S]*?)<\/a>/giu)];
const candidates = [];

for (const [, path, id, rawTitle] of anchors) {
  const title = decodeHtml(rawTitle);
  if (!REGISTRATION_WORD.test(title) || candidates.some((item) => item.id === id)) continue;
  const url = new URL(path, SOURCE_URL).href;
  let detailText = '';
  try {
    const detailResponse = await fetch(url, { headers: { 'user-agent': 'StudyFlow student monitor/1.0' } });
    if (detailResponse.ok) detailText = decodeHtml(await detailResponse.text());
  } catch {}
  candidates.push({
    id,
    subject: subjectFor(title),
    title,
    date: extractDate(detailText),
    deadline: extractDeadline(detailText),
    url,
  });
}

let existing = { updates: [] };
try { existing = JSON.parse(await readFile(OUTPUT_FILE, 'utf8')); } catch {}
const knownIds = new Set(existing.updates.map((item) => item.id));
const newUpdates = candidates.filter((item) => !knownIds.has(item.id));
const merged = [...candidates, ...existing.updates.filter((old) => !candidates.some((item) => item.id === old.id))]
  .slice(0, 100);

await writeFile(OUTPUT_FILE, `${JSON.stringify({
  checkedAt: new Date().toISOString(),
  source: SOURCE_URL,
  updates: merged,
}, null, 2)}\n`);

if (newUpdates.length && ONESIGNAL_APP_ID && ONESIGNAL_API_KEY) {
  for (const update of newUpdates) {
    const notificationResponse = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${ONESIGNAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        target_channel: 'push',
        included_segments: ['Subscribed Users'],
        headings: { en: `Nova prijava · ${update.subject}` },
        contents: { en: update.title },
        web_url: update.url,
        name: `StudyFlow registration ${update.id}`,
      }),
    });
    if (!notificationResponse.ok) {
      throw new Error(`OneSignal returned ${notificationResponse.status}: ${await notificationResponse.text()}`);
    }
    console.log(`Sent notification for update ${update.id}.`);
  }
} else if (newUpdates.length) {
  console.log(`Found ${newUpdates.length} new update(s), but OneSignal credentials are not configured.`);
}

console.log(`Saved ${merged.length} registration updates.`);
