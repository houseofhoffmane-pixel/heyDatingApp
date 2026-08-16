/**
 * Hey — seed script (ship-scope).
 *
 * Run with `npm run db:seed`. Idempotent: re-runs are safe.
 *
 * What this seeds:
 *   - Interests catalog (~50 slugs across creative / outdoors / food /
 *     going-out / staying-in / tech / media)
 *   - Prompts library (12 prompts, matching the originals)
 *
 * That's it. Spots, events, cities, admin user were removed with the
 * corresponding modules in Sprint 1. `feed_config` singleton row is
 * created by migration 0_init.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const INTERESTS: { slug: string; label: string; category: string }[] = [
  // creative
  ['art', 'creative'], ['music', 'creative'], ['photography', 'creative'],
  ['design', 'creative'], ['zines', 'creative'], ['writing', 'creative'],
  ['theatre', 'creative'], ['film', 'creative'],
  // outdoors
  ['hiking', 'outdoors'], ['running', 'outdoors'], ['climbing', 'outdoors'],
  ['cycling', 'outdoors'], ['surfing', 'outdoors'], ['camping', 'outdoors'],
  ['yoga', 'outdoors'], ['gym', 'outdoors'],
  // food & drink
  ['cooking', 'food-drink'], ['coffee', 'food-drink'], ['natural-wine', 'food-drink'],
  ['cocktails', 'food-drink'], ['baking', 'food-drink'], ['street-food', 'food-drink'],
  ['matcha', 'food-drink'], ['byob', 'food-drink'],
  // going out
  ['live-music', 'going-out'], ['house-parties', 'going-out'],
  ['dive-bars', 'going-out'], ['speakeasies', 'going-out'],
  ['pop-ups', 'going-out'], ['comedy', 'going-out'], ['raves', 'going-out'],
  // staying in
  ['reading', 'staying-in'], ['gaming', 'staying-in'], ['board-games', 'staying-in'],
  ['puzzles', 'staying-in'], ['studio-ghibli', 'staying-in'], ['pinterest', 'staying-in'],
  // tech & nerd
  ['coding', 'tech'], ['ai', 'tech'], ['startups', 'tech'],
  ['chess', 'tech'], ['f1', 'tech'], ['crypto', 'tech'], ['lego', 'tech'],
  // media
  ['letterboxd', 'media'], ['nyt-games', 'media'], ['a24', 'media'],
  ['k-drama', 'media'], ['podcasts', 'media'], ['criterion', 'media'],
  // misc
  ['gallery-hopping', 'creative'], ['film-cameras', 'creative'], ['thrifting', 'creative'],
  ['specialty-coffee', 'food-drink'], ['dim-sum', 'food-drink'], ['pizza', 'food-drink'],
].map(([slug, category]) => ({
  slug, category, label: slug.replace(/-/g, ' '),
}));

const PROMPTS: string[] = [
  'green flag i look for',
  'my hottest take',
  'the way to my heart',
  "i'll fall for you if",
  'a non-negotiable',
  'two truths and a lie',
  'sunday morning is for',
  'a recent rabbit hole',
  "i'm a 10 but",
  'unusual skill',
  "best meal i've had",
  'my therapist would say',
];

async function main() {
  console.log('▶ seeding catalogs…');

  for (const it of INTERESTS) {
    await prisma.interest.upsert({
      where: { slug: it.slug },
      update: { label: it.label, category: it.category },
      create: it,
    });
  }
  console.log(`  ✓ ${INTERESTS.length} interests`);

  for (const text of PROMPTS) {
    const existing = await prisma.prompt.findFirst({ where: { text } });
    if (!existing) await prisma.prompt.create({ data: { text } });
  }
  console.log(`  ✓ ${PROMPTS.length} prompts`);

  console.log('▶ done.');
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
