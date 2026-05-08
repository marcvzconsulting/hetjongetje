/**
 * Backup-restore validatie. Bewijst dat onze datamodellen rond een
 * gebruiker correct serialisable + restorable zijn — los van Neon's
 * point-in-time-restore feature, die het laatste vangnet is.
 *
 * Wat 't doet:
 *   1. Maak een synthetische test-user aan (deterministische e-mail
 *      met timestamp zodat parallelle runs niet botsen)
 *   2. Vul met realistische test-data: 2 kindprofielen, een verhaal
 *      met 5 pagina's, een credit-order in `paid` state
 *   3. Exporteer alle gerelateerde rijen naar een JSON-bestand
 *   4. Verwijder de user (cascade ruimt children/stories/orders mee op)
 *   5. Importeer alles terug uit de JSON-export
 *   6. Verifieer dat counts en kerngegevens kloppen
 *   7. Ruim alles op
 *
 * Wat 't NIET doet:
 *   - Geen test van Neon's PITR-API zelf (handmatige UI-actie in
 *     Neon-console; documenteer in architecture.md)
 *   - Geen test van bestandsstorage (Scaleway-images blijven na user-delete
 *     in de bucket — die ruimen we niet op in deze flow)
 *
 * Run:
 *   pnpm tsx scripts/backup-restore-test.ts
 *
 * Tegen prod (gevaarlijk! gebruikt de prod-DB):
 *   DATABASE_URL=$(grep DATABASE_URL .env.production.local | cut -d= -f2-) \
 *     pnpm tsx scripts/backup-restore-test.ts
 *   ↑ default loopt tegen dev-DB; alleen prod-tegen-prod als je echt
 *     wilt valideren tegen Neon's productie-state. De test creëert/
 *     verwijdert ALLEEN de synthetische user, raakt geen echte data.
 */
import "dotenv/config";
import { writeFileSync, readFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const RUN_ID = Date.now();
const TEST_EMAIL = `backup-test-${RUN_ID}@test.local`;
const TEST_NAME = `Backup Test ${RUN_ID}`;
const SNAPSHOT_DIR = "tmp/backup-restore";
const SNAPSHOT_FILE = join(SNAPSHOT_DIR, `snapshot-${RUN_ID}.json`);

type Snapshot = {
  user: unknown;
  children: unknown[];
  stories: unknown[];
  pages: unknown[];
  orders: unknown[];
};

function log(stage: string, msg: string): void {
  console.log(`[${stage}] ${msg}`);
}

function fail(msg: string): never {
  console.error(`\n❌ FAIL: ${msg}`);
  process.exit(1);
}

async function seedTestUser(): Promise<string> {
  const user = await prisma.user.create({
    data: {
      email: TEST_EMAIL,
      name: TEST_NAME,
      role: "user",
      status: "approved",
      // Niet bedoeld om mee in te loggen — dummy hash. Login zou dit
      // weigeren omdat de plain-text variant niet hashed naar dit.
      passwordHash: "$2a$12$placeholder.do.not.use.for.real.login.test.only",
      storyCredits: 7,
      children: {
        create: [
          {
            name: "Lotte",
            dateOfBirth: new Date("2022-04-12"),
            gender: "girl",
            interests: ["dieren", "tekenen"],
            fears: [],
            mainCharacterType: "self",
            stories: {
              create: {
                title: "Het verloren konijn",
                subtitle: "Bos · zoektocht",
                language: "nl",
                setting: "fantasy_forest",
                status: "ready",
                aiCostCents: 23,
                pages: {
                  create: Array.from({ length: 5 }, (_, i) => ({
                    pageNumber: i + 1,
                    text: `Pagina ${i + 1} van het test-verhaal.`,
                    illustrationPrompt: `[test prompt page ${i + 1}]`,
                  })),
                },
              },
            },
          },
          {
            name: "Sem",
            dateOfBirth: new Date("2024-09-30"),
            gender: "boy",
            interests: ["voertuigen"],
            fears: [],
            mainCharacterType: "self",
          },
        ],
      },
      orders: {
        create: {
          kind: "credits",
          description: "5 verhalen testpakket",
          amountCents: 950,
          currency: "EUR",
          vatRate: 21,
          creditAmount: 5,
          status: "paid",
          paidAt: new Date(),
          molliePaymentId: `tr_test_${RUN_ID}`,
        },
      },
    },
  });
  return user.id;
}

async function exportUser(userId: string): Promise<Snapshot> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const children = await prisma.childProfile.findMany({
    where: { userId },
  });
  const childIds = children.map((c) => c.id);
  const stories = await prisma.story.findMany({
    where: { childProfileId: { in: childIds } },
  });
  const pages = await prisma.storyPage.findMany({
    where: { storyId: { in: stories.map((s) => s.id) } },
  });
  const orders = await prisma.order.findMany({ where: { userId } });

  return { user, children, stories, pages, orders };
}

function writeSnapshot(snap: Snapshot): void {
  if (!existsSync(SNAPSHOT_DIR)) {
    mkdirSync(SNAPSHOT_DIR, { recursive: true });
  }
  writeFileSync(SNAPSHOT_FILE, JSON.stringify(snap, null, 2));
}

function readSnapshot(): Snapshot {
  return JSON.parse(readFileSync(SNAPSHOT_FILE, "utf-8")) as Snapshot;
}

async function deleteUser(userId: string): Promise<void> {
  // Cascade ruimt children → stories → pages mee op. Orders óók (zie
  // schema: Order.user has onDelete: Cascade).
  await prisma.user.delete({ where: { id: userId } });
}

type SerializedUser = Record<string, unknown> & { id: string };
type SerializedChild = Record<string, unknown> & { id: string; userId: string };
type SerializedStory = Record<string, unknown> & {
  id: string;
  childProfileId: string;
};
type SerializedPage = Record<string, unknown> & { id: string; storyId: string };
type SerializedOrder = Record<string, unknown> & { id: string; userId: string };

async function restoreFromSnapshot(snap: Snapshot): Promise<void> {
  // Date-fields zijn ISO-strings na JSON.stringify; Prisma accepteert die
  // direct in createMany via een cast. We doen één tabel per keer in
  // FK-volgorde: user → children → stories → pages → orders.
  await prisma.user.create({ data: snap.user as SerializedUser });
  if (snap.children.length > 0) {
    await prisma.childProfile.createMany({
      data: snap.children as SerializedChild[],
    });
  }
  if (snap.stories.length > 0) {
    await prisma.story.createMany({
      data: snap.stories as SerializedStory[],
    });
  }
  if (snap.pages.length > 0) {
    await prisma.storyPage.createMany({
      data: snap.pages as SerializedPage[],
    });
  }
  if (snap.orders.length > 0) {
    await prisma.order.createMany({
      data: snap.orders as SerializedOrder[],
    });
  }
}

async function verifyRestore(snap: Snapshot, userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) fail("user niet gevonden na restore");
  if (user.email !== TEST_EMAIL) fail(`user.email mismatch: ${user.email}`);
  if (user.storyCredits !== 7)
    fail(`user.storyCredits mismatch: ${user.storyCredits}`);

  const childCount = await prisma.childProfile.count({ where: { userId } });
  if (childCount !== snap.children.length)
    fail(`children count mismatch: ${childCount} vs ${snap.children.length}`);

  const storyCount = await prisma.story.count({
    where: { childProfile: { userId } },
  });
  if (storyCount !== snap.stories.length)
    fail(`stories count mismatch: ${storyCount} vs ${snap.stories.length}`);

  const pageCount = await prisma.storyPage.count({
    where: { story: { childProfile: { userId } } },
  });
  if (pageCount !== snap.pages.length)
    fail(`pages count mismatch: ${pageCount} vs ${snap.pages.length}`);

  const orderCount = await prisma.order.count({ where: { userId } });
  if (orderCount !== snap.orders.length)
    fail(`orders count mismatch: ${orderCount} vs ${snap.orders.length}`);

  // Spot-check: het ene verhaal heeft aiCostCents=23 en 5 pagina's
  const story = await prisma.story.findFirst({
    where: { childProfile: { userId }, title: "Het verloren konijn" },
    include: { pages: true },
  });
  if (!story) fail("verhaal niet gevonden na restore");
  if (story.aiCostCents !== 23)
    fail(`story.aiCostCents mismatch: ${story.aiCostCents}`);
  if (story.pages.length !== 5)
    fail(`story.pages.length mismatch: ${story.pages.length}`);
}

async function cleanup(userId: string): Promise<void> {
  try {
    await prisma.user.delete({ where: { id: userId } });
  } catch {
    // user kan al weg zijn als de test eerder faalde; geen probleem
  }
}

async function main(): Promise<void> {
  const host = process.env.DATABASE_URL?.match(/@([^/:]+)/)?.[1];
  console.log(`📡 DB host: ${host}`);
  console.log(`🆔 Run-id: ${RUN_ID}\n`);

  let userId: string | null = null;
  try {
    log("seed", `Test-user aanmaken (${TEST_EMAIL})…`);
    userId = await seedTestUser();
    log("seed", `✓ user ${userId} + 2 kinderen + 1 verhaal + 1 order`);

    log("export", "Snapshot maken…");
    const snap = await exportUser(userId);
    writeSnapshot(snap);
    log(
      "export",
      `✓ snapshot weggeschreven naar ${SNAPSHOT_FILE} (${snap.children.length} kinderen · ${snap.stories.length} verhalen · ${snap.pages.length} pagina's · ${snap.orders.length} orders)`,
    );

    log("delete", "User verwijderen (cascade)…");
    await deleteUser(userId);
    const stillThere = await prisma.user.findUnique({ where: { id: userId } });
    if (stillThere) fail("user nog steeds aanwezig na delete");
    log("delete", "✓ user weg");

    log("restore", "Restoren uit snapshot…");
    const reloaded = readSnapshot();
    await restoreFromSnapshot(reloaded);
    log("restore", "✓ rijen teruggezet");

    log("verify", "Verifiëren…");
    await verifyRestore(reloaded, userId);
    log("verify", "✓ alle counts en spot-checks kloppen");

    log("cleanup", "Test-user weer verwijderen…");
    await cleanup(userId);
    log("cleanup", "✓ klaar");

    console.log(`\n✅ Backup-restore test geslaagd. Snapshot bewaard: ${SNAPSHOT_FILE}`);
  } catch (err) {
    console.error("\n❌ Onverwachte fout tijdens test:", err);
    if (userId) {
      console.log("Probeer cleanup uit te voeren…");
      await cleanup(userId);
    }
    process.exit(1);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
