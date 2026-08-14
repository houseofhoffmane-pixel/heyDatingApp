/**
 * Hey — seed script.
 *
 * Run with `npm run db:seed`. Idempotent: re-runs are safe.
 *
 * What this seeds:
 *   - Interests catalog (matches the buckets in screens-onboarding-q.jsx)
 *   - Prompts library (matches PROMPT_LIBRARY in screens-onboarding-q.jsx)
 *   - Cities (NYC, LA, SF, London, Mumbai, Bangalore, Singapore, Tokyo)
 *   - Sample Spots and Events lifted from frontend data.js (so the prototype
 *     IDs line up when developing against this DB).
 *   - One admin user (email: admin@hey.app, password: admin) for /admin login.
 *   - feed_config singleton already created by migration.
 */

import { PrismaClient, Prisma } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────
// Catalog data
// ─────────────────────────────────────────────────────────────

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
  // misc from frontend mocks
  ['gallery-hopping', 'creative'], ['film-cameras', 'creative'], ['thrifting', 'creative'],
  ['specialty-coffee', 'food-drink'], ['dim-sum', 'food-drink'], ['pizza', 'food-drink'],
].map(([slug, category]) => ({
  slug,
  category,
  label: slug.replace(/-/g, ' '),
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

const CITIES: { slug: string; name: string; country: string; lat: number; lng: number; radiusKm: number }[] = [
  { slug: 'us-nyc', name: 'NYC',       country: 'US', lat: 40.7128, lng: -74.0060, radiusKm: 50 },
  { slug: 'us-la',  name: 'LA',        country: 'US', lat: 34.0522, lng: -118.2437, radiusKm: 80 },
  { slug: 'us-sf',  name: 'SF',        country: 'US', lat: 37.7749, lng: -122.4194, radiusKm: 50 },
  { slug: 'uk-ldn', name: 'London',    country: 'GB', lat: 51.5074, lng:  -0.1278, radiusKm: 50 },
  { slug: 'in-bom', name: 'Mumbai',    country: 'IN', lat: 19.0760, lng:  72.8777, radiusKm: 50 },
  { slug: 'in-blr', name: 'Bangalore', country: 'IN', lat: 12.9716, lng:  77.5946, radiusKm: 50 },
  { slug: 'sg',     name: 'Singapore', country: 'SG', lat:  1.3521, lng: 103.8198, radiusKm: 30 },
  { slug: 'jp-tyo', name: 'Tokyo',     country: 'JP', lat: 35.6762, lng: 139.6503, radiusKm: 60 },
];

// Spots — IDs match data.js so the prototype lines up after a seed.
// Real lat/lngs around NYC near the addresses in the prototype.
const PLACES = [
  { slug: 'parchm',   label: 'Parchm Coffee',   kind: 'coffee',     vibe: 'quiet study, oat lattes, sage decor',     tone: 'peach',  icon: 'coffee',   address: '142 Mott St',     lat: 40.7194, lng: -73.9963, hot: true  },
  { slug: 'attaboy',  label: 'Attaboy',         kind: 'cocktail',   vibe: 'no menu, no rules, low light',            tone: 'lilac',  icon: 'cocktail', address: '134 Eldridge St', lat: 40.7204, lng: -73.9919, hot: true  },
  { slug: 'foundry',  label: 'The Foundry',     kind: 'gym',        vibe: 'sweaty, then social',                     tone: 'mint',   icon: 'fire',     address: '88 Bleecker St',  lat: 40.7264, lng: -73.9952, hot: false },
  { slug: 'rosesilk', label: 'Rose & Silk',     kind: 'wine-bar',   vibe: 'natural wine, soft jazz, the good lighting', tone: 'rose', icon: 'cocktail', address: '47 Stanton St',   lat: 40.7220, lng: -73.9904, hot: true  },
  { slug: 'mezzo',    label: 'Mezzo Jazz',      kind: 'live-music', vibe: 'tuesday sets that turn into thursdays',   tone: 'sky',    icon: 'music',    address: '255 W 4th St',    lat: 40.7327, lng: -74.0035, hot: false },
  { slug: 'leaf',     label: 'Tompkins Square', kind: 'park',       vibe: 'sun, dogs, that one good bench',          tone: 'mint',   icon: 'park',     address: 'East Village',    lat: 40.7264, lng: -73.9818, hot: true  },
  { slug: 'spineco',  label: 'Spine & Co.',     kind: 'bookshop',   vibe: 'staff picks you actually trust',          tone: 'butter', icon: 'book',     address: '57 Spring St',    lat: 40.7228, lng: -73.9974, hot: false },
  { slug: 'sliceguy', label: "Joe's Slice",     kind: 'pizza',      vibe: '$3.50 cheese, no questions',              tone: 'peach',  icon: 'pizza',    address: '7 Carmine St',    lat: 40.7308, lng: -74.0028, hot: true  },
];

// Events — IDs match data.js. Dates set relative to "now" so they're always
// reachable; tests can override via Prisma directly.
function eventDates(daysAhead: number, hour: number) {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() + daysAhead);
  start.setHours(hour, 0, 0, 0);
  const end = new Date(start);
  end.setHours(end.getHours() + 4);
  return { startsAt: start, endsAt: end };
}

const EVENTS = [
  { slug: 'nophone',    title: 'no-phones party',      host: 'Warehouse 17', placeSlug: null,       lat: 40.7000, lng: -73.9300, vibe: "phones in a pouch, dance like nobody's filming.", door: '10pm – 4am', cover: '$12',    tone: 'lilac',  icon: 'music',   tags: ['nightlife','electronic','21+','sweaty'], dayOff: 5, hour: 22, hot: true  },
  { slug: 'matchawork', title: 'matcha & laptops',     host: 'Parchm Coffee', placeSlug: 'parchm',  lat: 40.7194, lng: -73.9963, vibe: 'casual co-working, hot matcha, slow playlist.',   door: '11am – 3pm', cover: 'free',   tone: 'mint',   icon: 'coffee',  tags: ['daytime','chill','wifi','solo-friendly'], dayOff: 7, hour: 11, hot: false },
  { slug: 'openmic',    title: 'open mic monday',      host: 'Mezzo Jazz',   placeSlug: 'mezzo',    lat: 40.7327, lng: -74.0035, vibe: 'mostly poetry, occasionally a saxophone.',        door: '8pm – 11pm', cover: '$5',     tone: 'sky',    icon: 'music',   tags: ['live','cozy','sit-down','BYOB'], dayOff: 1, hour: 20, hot: false },
  { slug: 'samplesale', title: 'sample sale · sat',    host: 'soft loft co.', placeSlug: null,      lat: 40.7236, lng: -74.0014, vibe: 'thrift, but fancy. cash & cards.',                door: '12pm – 6pm', cover: 'free',   tone: 'peach',  icon: 'sparkle', tags: ['shopping','daytime','cute fits','rsvp'], dayOff: 4, hour: 12, hot: true  },
  { slug: 'moonyoga',   title: 'moon yoga',            host: 'Tompkins Square', placeSlug: 'leaf', lat: 40.7264, lng: -73.9818, vibe: 'mats provided, please bring chill.',              door: '7pm – 8:30pm', cover: 'donate', tone: 'butter', icon: 'leaf',    tags: ['wellness','outdoors','sober','beginner ok'], dayOff: 3, hour: 19, hot: false },
  { slug: 'datetrivia', title: 'first dates trivia',   host: 'Attaboy',      placeSlug: 'attaboy',  lat: 40.7204, lng: -73.9919, vibe: 'team up with someone you swiped right on.',       door: '9pm – 12am', cover: '$10',    tone: 'rose',   icon: 'cocktail', tags: ['icebreaker','cocktails','flirty','21+'], dayOff: 2, hour: 21, hot: true  },
];

// ─────────────────────────────────────────────────────────────
// Seed
// ─────────────────────────────────────────────────────────────

async function main() {
  console.log('▶ seeding catalogs…');

  // Interests — upsert by slug
  for (const it of INTERESTS) {
    await prisma.interest.upsert({
      where: { slug: it.slug },
      update: { label: it.label, category: it.category },
      create: it,
    });
  }
  console.log(`  ✓ ${INTERESTS.length} interests`);

  // Prompts — upsert by text
  for (const text of PROMPTS) {
    const existing = await prisma.prompt.findFirst({ where: { text } });
    if (!existing) await prisma.prompt.create({ data: { text } });
  }
  console.log(`  ✓ ${PROMPTS.length} prompts`);

  // Cities — upsert by slug. Center is geography, set via raw SQL.
  for (const c of CITIES) {
    const existing = await prisma.city.findUnique({ where: { slug: c.slug } });
    if (existing) {
      await prisma.$executeRaw`
        UPDATE "cities"
           SET "name"=${c.name}, "country"=${c.country}, "radius_km"=${c.radiusKm},
               "center"=ST_SetSRID(ST_MakePoint(${c.lng}, ${c.lat}), 4326)::geography
         WHERE "slug"=${c.slug}
      `;
    } else {
      await prisma.$executeRaw`
        INSERT INTO "cities" ("slug","name","country","radius_km","center")
        VALUES (${c.slug}, ${c.name}, ${c.country}, ${c.radiusKm},
                ST_SetSRID(ST_MakePoint(${c.lng}, ${c.lat}), 4326)::geography)
      `;
    }
  }
  console.log(`  ✓ ${CITIES.length} cities`);

  const nyc = await prisma.city.findUnique({ where: { slug: 'us-nyc' } });
  if (!nyc) throw new Error('seed: missing NYC city');

  // Places — upsert keyed on (city_id, label).
  // We don't have a natural unique on label, so we look up by city+label first.
  const placeIdBySlug: Record<string, string> = {};
  for (const p of PLACES) {
    const existing = await prisma.place.findFirst({ where: { cityId: nyc.id, label: p.label } });
    let id: string;
    if (existing) {
      id = existing.id;
      await prisma.$executeRaw`
        UPDATE "places"
           SET "kind"=${p.kind}, "vibe"=${p.vibe}, "address"=${p.address},
               "icon"=${p.icon}, "tone"=${p.tone}, "hot"=${p.hot},
               "location"=ST_SetSRID(ST_MakePoint(${p.lng}, ${p.lat}), 4326)::geography
         WHERE "id"=${id}::uuid
      `;
    } else {
      const inserted = await prisma.$queryRaw<{ id: string }[]>`
        INSERT INTO "places" ("label","kind","vibe","address","icon","tone","hot","city_id","location")
        VALUES (${p.label}, ${p.kind}, ${p.vibe}, ${p.address}, ${p.icon}, ${p.tone}, ${p.hot},
                ${nyc.id}::uuid,
                ST_SetSRID(ST_MakePoint(${p.lng}, ${p.lat}), 4326)::geography)
        RETURNING "id"
      `;
      id = inserted[0].id;
    }
    placeIdBySlug[p.slug] = id;
  }
  console.log(`  ✓ ${PLACES.length} places`);

  // Events — upsert keyed on (city_id, title).
  for (const e of EVENTS) {
    const { startsAt, endsAt } = eventDates(e.dayOff, e.hour);
    const placeId = e.placeSlug ? placeIdBySlug[e.placeSlug] : null;
    const existing = await prisma.event.findFirst({ where: { cityId: nyc.id, title: e.title } });
    if (existing) {
      await prisma.$executeRaw`
        UPDATE "events"
           SET "host"=${e.host}, "vibe"=${e.vibe}, "starts_at"=${startsAt}::timestamptz,
               "ends_at"=${endsAt}::timestamptz, "door_text"=${e.door},
               "cover_text"=${e.cover}, "tone"=${e.tone}, "icon"=${e.icon},
               "tags"=${e.tags}::text[], "hot"=${e.hot},
               "place_id"=${placeId}::uuid,
               "location"=ST_SetSRID(ST_MakePoint(${e.lng}, ${e.lat}), 4326)::geography
         WHERE "id"=${existing.id}::uuid
      `;
    } else {
      await prisma.$executeRaw`
        INSERT INTO "events"
          ("title","host","vibe","place_id","starts_at","ends_at","door_text","cover_text","city_id","tags","icon","tone","hot","location")
        VALUES
          (${e.title}, ${e.host}, ${e.vibe}, ${placeId}::uuid,
           ${startsAt}::timestamptz, ${endsAt}::timestamptz,
           ${e.door}, ${e.cover}, ${nyc.id}::uuid, ${e.tags}::text[],
           ${e.icon}, ${e.tone}, ${e.hot},
           ST_SetSRID(ST_MakePoint(${e.lng}, ${e.lat}), 4326)::geography)
      `;
    }
  }
  console.log(`  ✓ ${EVENTS.length} events`);

  // Admin user — dev creds (email=admin@hey.app, password=admin).
  const adminEmail = 'admin@hey.app';
  const adminExists = await prisma.adminUser.findUnique({ where: { email: adminEmail } });
  if (!adminExists) {
    const passwordHash = await argon2.hash('admin');
    await prisma.adminUser.create({
      data: { email: adminEmail, passwordHash, role: 'admin' },
    });
    console.log(`  ✓ admin user ${adminEmail} / admin`);
  } else {
    console.log(`  · admin user already present (${adminEmail})`);
  }

  console.log('▶ done.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
