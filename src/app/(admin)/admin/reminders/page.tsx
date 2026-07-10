import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { V2 } from "@/components/v2/tokens";
import { AdminShell, ADMIN_NAV } from "@/components/v2/admin/AdminShell";
import { ReminderSender, type ReminderUserRow } from "./ReminderSender";
import { renderEditableTemplate } from "@/lib/email/template-store";
import { day1ProfileReminderDefaults } from "@/lib/email/templates/day1-profile-reminder";
import { day3StoryReminderDefaults } from "@/lib/email/templates/day3-story-reminder";
import { day7LoginReminderDefaults } from "@/lib/email/templates/day7-login-reminder";
import type { ReminderTrigger } from "./triggers";

export const dynamic = "force-dynamic";

/** Sample values so the preview reads like a real mail. */
const PREVIEW_VARS = {
  name: "Sanne",
  childName: "Noor",
  profileUrl: "https://onsverhaaltje.nl/profile/new",
  dashboardUrl: "https://onsverhaaltje.nl/dashboard",
  unsubscribeUrl:
    "https://onsverhaaltje.nl/api/reminders/opt-out?user_id=voorbeeld",
};

/**
 * Render each reminder's mail (override-or-default, so admin edits show
 * up) with sample vars, for the inline preview on this page.
 */
async function loadPreviews(): Promise<
  Record<ReminderTrigger, { subject: string; html: string }>
> {
  const defs = [
    {
      trigger: "day1-profile" as const,
      code: "day1-profile-reminder",
      defaults: day1ProfileReminderDefaults(),
      ctaUrl: PREVIEW_VARS.profileUrl,
    },
    {
      trigger: "day3-story" as const,
      code: "day3-story-reminder",
      defaults: day3StoryReminderDefaults(),
      ctaUrl: PREVIEW_VARS.dashboardUrl,
    },
    {
      trigger: "day7-login" as const,
      code: "day7-login-reminder",
      defaults: day7LoginReminderDefaults(),
      ctaUrl: PREVIEW_VARS.dashboardUrl,
    },
  ];
  const out = {} as Record<ReminderTrigger, { subject: string; html: string }>;
  for (const d of defs) {
    const r = await renderEditableTemplate(d.code, d.defaults, PREVIEW_VARS, {
      ctaUrl: d.ctaUrl,
    });
    out[d.trigger] = { subject: r.subject, html: r.html };
  }
  return out;
}

type SearchParams = Promise<{
  trigger?: string;
  sent?: string;
  skipped?: string;
  failed?: string;
  error?: string;
}>;

const ERROR_LABELS: Record<string, string> = {
  none_selected: "Geen klanten geselecteerd.",
  unknown_trigger: "Onbekende reminder.",
};

export default async function RemindersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  const sp = await searchParams;

  const users = await prisma.user.findMany({
    where: { role: "user" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      lastLoginAt: true,
      remindersOptOutAt: true,
      day1ProfileReminderSentAt: true,
      day3StoryReminderSentAt: true,
      day7LoginReminderSentAt: true,
      children: {
        select: {
          _count: { select: { stories: true } },
        },
      },
    },
  });

  const rows: ReminderUserRow[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    createdAt: u.createdAt.toISOString(),
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    hasProfile: u.children.length > 0,
    hasStory: u.children.some((c) => c._count.stories > 0),
    optedOut: u.remindersOptOutAt !== null,
    sent: {
      "day1-profile": u.day1ProfileReminderSentAt?.toISOString() ?? null,
      "day3-story": u.day3StoryReminderSentAt?.toISOString() ?? null,
      "day7-login": u.day7LoginReminderSentAt?.toISOString() ?? null,
    },
  }));

  const previews = await loadPreviews();

  const nav = ADMIN_NAV.map((n) => ({
    ...n,
    active: n.href === "/admin/reminders",
  }));

  // Build a flash message from the redirect params.
  let flash: { kind: "success" | "error"; text: string } | null = null;
  if (sp.error && ERROR_LABELS[sp.error]) {
    flash = { kind: "error", text: ERROR_LABELS[sp.error] };
  } else if (sp.sent !== undefined) {
    const sent = Number(sp.sent) || 0;
    const skipped = Number(sp.skipped) || 0;
    const failed = Number(sp.failed) || 0;
    const parts = [`${sent} verstuurd`];
    if (skipped > 0) parts.push(`${skipped} overgeslagen (afgemeld)`);
    if (failed > 0) parts.push(`${failed} mislukt`);
    flash = {
      kind: failed > 0 ? "error" : "success",
      text: parts.join(" · "),
    };
  }

  return (
    <AdminShell
      section="E-mail"
      eyebrow="Retentie"
      title="Reminders versturen"
      nav={nav}
      adminEmail={session?.user?.email ?? undefined}
    >
      {flash && (
        <div
          style={{
            marginBottom: 24,
            padding: "12px 18px",
            background:
              flash.kind === "success"
                ? "rgba(201,169,97,0.18)"
                : "rgba(176,74,65,0.14)",
            borderLeft: `3px solid ${
              flash.kind === "success" ? V2.goldDeep : V2.heart
            }`,
            fontFamily: V2.body,
            fontSize: 14,
            color: V2.ink,
          }}
        >
          {flash.text}
        </div>
      )}

      <p
        style={{
          fontFamily: V2.body,
          fontSize: 15,
          color: V2.inkSoft,
          lineHeight: 1.55,
          maxWidth: 640,
          margin: "0 0 28px",
        }}
      >
        Kies een reminder, selecteer de klanten en verstuur direct. De
        automatische crons draaien dagelijks; hier stuur je handmatig,
        bijvoorbeeld naar klanten buiten het standaard tijdvenster. De tekst
        van elke reminder pas je aan via de link boven de tabel.
      </p>

      <ReminderSender users={rows} previews={previews} />
    </AdminShell>
  );
}
