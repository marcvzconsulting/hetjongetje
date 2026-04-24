import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { calculateAge } from "@/lib/utils/age";
import {
  createPasswordResetToken,
  buildResetUrl,
} from "@/lib/password-reset";
import { deleteUserStorage } from "@/lib/storage/user-cleanup";
import { V2 } from "@/components/v2/tokens";
import { Kicker, EBtn, IconV2 } from "@/components/v2";

function formatDateTime(date: Date | null | undefined): string {
  if (!date) return "-";
  return date.toISOString().replace("T", " ").slice(0, 16);
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return "-";
  return date.toISOString().slice(0, 10);
}

async function addNoteAction(formData: FormData) {
  "use server";
  const session = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const content = String(formData.get("content") ?? "").trim();
  if (!userId || !content) return;
  await prisma.adminNote.create({
    data: { userId, authorId: session.user.id, content },
  });
  revalidatePath(`/admin/users/${userId}`);
}

async function deleteNoteAction(formData: FormData) {
  "use server";
  await requireAdmin();
  const noteId = String(formData.get("noteId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  if (!noteId) return;
  await prisma.adminNote.delete({ where: { id: noteId } });
  revalidatePath(`/admin/users/${userId}`);
}

async function saveSubscriptionAction(formData: FormData) {
  "use server";
  await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const plan = String(formData.get("plan") ?? "free");
  const status = String(formData.get("status") ?? "active");
  const endsAtRaw = String(formData.get("endsAt") ?? "");
  const endsAt = endsAtRaw ? new Date(endsAtRaw) : null;
  if (!userId) return;

  await prisma.subscription.upsert({
    where: { userId },
    create: { userId, plan, status, endsAt },
    update: { plan, status, endsAt },
  });
  revalidatePath(`/admin/users/${userId}`);
}

async function deleteSubscriptionAction(formData: FormData) {
  "use server";
  await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  if (!userId) return;
  await prisma.subscription.deleteMany({ where: { userId } });
  revalidatePath(`/admin/users/${userId}`);
}

async function generateResetLinkAction(formData: FormData) {
  "use server";
  const session = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  if (!userId) return;
  const { token, expiresAt } = await createPasswordResetToken({
    userId,
    createdByAdminId: session.user.id,
  });
  const url = await buildResetUrl(token);
  revalidatePath(`/admin/users/${userId}`);
  redirect(
    `/admin/users/${userId}?resetLink=${encodeURIComponent(url)}&resetExp=${expiresAt.getTime()}`
  );
}

async function setPasswordAction(formData: FormData) {
  "use server";
  await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  if (!userId) return;
  if (newPassword.length < 6) {
    redirect(`/admin/users/${userId}?pwError=too_short`);
  }
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
    prisma.passwordResetToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    }),
  ]);
  revalidatePath(`/admin/users/${userId}`);
  redirect(`/admin/users/${userId}?pwSet=1`);
}

async function updateApprovalAction(formData: FormData) {
  "use server";
  await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const action = String(formData.get("action") ?? "");
  const creditsRaw = String(formData.get("credits") ?? "");
  if (!userId) return;

  if (action === "approve") {
    const credits = Math.max(0, parseInt(creditsRaw, 10) || 5);
    await prisma.user.update({
      where: { id: userId },
      data: { status: "approved", storyCredits: credits },
    });
  } else if (action === "suspend") {
    await prisma.user.update({
      where: { id: userId },
      data: { status: "suspended" },
    });
  } else if (action === "unsuspend") {
    await prisma.user.update({
      where: { id: userId },
      data: { status: "approved" },
    });
  } else if (action === "setCredits") {
    const credits = Math.max(0, parseInt(creditsRaw, 10) || 0);
    await prisma.user.update({
      where: { id: userId },
      data: { storyCredits: credits },
    });
  } else if (action === "addCredits") {
    const delta = Math.max(0, parseInt(creditsRaw, 10) || 0);
    await prisma.user.update({
      where: { id: userId },
      data: { storyCredits: { increment: delta } },
    });
  }

  revalidatePath(`/admin/users/${userId}`);
}

async function setLandingPreviewSlotAction(formData: FormData) {
  "use server";
  await requireAdmin();
  const storyId = String(formData.get("storyId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  const raw = String(formData.get("slot") ?? "");
  if (!storyId || !userId) return;

  const VALID = ["girl-2", "girl-4", "boy-2", "boy-4"] as const;
  const slot = (VALID as readonly string[]).includes(raw) ? raw : null;

  // Only one story per slot — clear any other story holding this slot first.
  if (slot) {
    await prisma.story.updateMany({
      where: { landingPreviewSlot: slot, NOT: { id: storyId } },
      data: { landingPreviewSlot: null },
    });
  }

  await prisma.story.update({
    where: { id: storyId },
    data: { landingPreviewSlot: slot },
  });

  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/");
}

async function deleteUserAction(formData: FormData) {
  "use server";
  const session = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const emailConfirm = String(formData.get("emailConfirm") ?? "")
    .trim()
    .toLowerCase();
  if (!userId) return;

  if (userId === session.user.id) {
    redirect(`/admin/users/${userId}?delError=self`);
  }

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) redirect("/admin/users");

  if (target.role === "admin") {
    redirect(`/admin/users/${userId}?delError=admin_blocked`);
  }
  if (emailConfirm !== target.email.toLowerCase()) {
    redirect(`/admin/users/${userId}?delError=email_mismatch`);
  }

  const cleanup = await deleteUserStorage(userId);
  if (cleanup.error) {
    console.error(
      `[admin-delete] storage cleanup error for user ${userId}: ${cleanup.error}`
    );
  } else if (cleanup.failed.length > 0) {
    console.error(
      `[admin-delete] ${cleanup.failed.length}/${cleanup.requested} storage keys failed for user ${userId}:`,
      cleanup.failed
    );
  } else {
    console.log(
      `[admin-delete] removed ${cleanup.requested} storage objects for user ${userId} (by admin ${session.user.id})`
    );
  }

  await prisma.user.delete({ where: { id: userId } });
  redirect(`/admin/users?deleted=${encodeURIComponent(target.email)}`);
}

// ── Styling helpers ────────────────────────────────────────────

const sectionStyle: React.CSSProperties = {
  marginTop: 48,
  paddingTop: 36,
  borderTop: `1px solid ${V2.paperShade}`,
};

const sectionTitleStyle: React.CSSProperties = {
  fontFamily: V2.display,
  fontWeight: 300,
  fontSize: 26,
  margin: 0,
  letterSpacing: -0.5,
  color: V2.ink,
};

const sectionMetaStyle: React.CSSProperties = {
  fontFamily: V2.body,
  fontStyle: "italic",
  fontSize: 14,
  color: V2.inkMute,
  margin: "6px 0 0",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 0",
  border: "none",
  borderBottom: `1px solid ${V2.paperShade}`,
  background: "transparent",
  fontSize: 15,
  fontFamily: V2.body,
  color: V2.ink,
  outline: "none",
};

const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 0",
  border: "none",
  borderBottom: `1px solid ${V2.paperShade}`,
  background: "transparent",
  fontSize: 15,
  fontFamily: V2.body,
  color: V2.ink,
  outline: "none",
};

const fieldLabelStyle: React.CSSProperties = {
  fontFamily: V2.ui,
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: V2.inkMute,
  display: "block",
  marginBottom: 4,
};

function FlashSaved({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        marginBottom: 20,
        padding: "14px 20px",
        background: "rgba(201,169,97,0.14)",
        borderLeft: `2px solid ${V2.gold}`,
        fontFamily: V2.body,
        fontSize: 14,
        color: V2.ink,
      }}
    >
      {children}
    </div>
  );
}

function FlashError({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        marginBottom: 20,
        padding: "14px 20px",
        background: "rgba(196,165,168,0.18)",
        borderLeft: `2px solid ${V2.heart}`,
        fontFamily: V2.body,
        fontSize: 14,
        color: V2.ink,
      }}
    >
      {children}
    </div>
  );
}

function StatusPill({ status, role }: { status: string; role: string }) {
  if (role === "admin") {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "5px 14px",
          background: V2.ink,
          color: V2.paper,
          fontFamily: V2.ui,
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}
      >
        Admin
      </span>
    );
  }
  if (status === "approved") {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "5px 14px",
          background: V2.paperDeep,
          color: V2.ink,
          fontFamily: V2.ui,
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}
      >
        <IconV2 name="check" size={12} color={V2.ink} /> Goedgekeurd
      </span>
    );
  }
  if (status === "suspended") {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "5px 14px",
          background: "rgba(196,165,168,0.2)",
          color: V2.heart,
          fontFamily: V2.ui,
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}
      >
        Opgeschort
      </span>
    );
  }
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "5px 14px",
        background: V2.goldSoft,
        color: V2.goldDeep,
        fontFamily: V2.ui,
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
      }}
    >
      Wacht op goedkeuring
    </span>
  );
}

export default async function AdminUserDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    resetLink?: string;
    resetExp?: string;
    pwSet?: string;
    pwError?: string;
    delError?: string;
  }>;
}) {
  const { id } = await params;
  const query = await searchParams;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      subscription: true,
      children: {
        include: {
          stories: {
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              title: true,
              setting: true,
              status: true,
              isFavorite: true,
              language: true,
              createdAt: true,
              landingPreviewSlot: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      adminNotes: {
        include: { author: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!user) notFound();

  const totalStories = user.children.reduce(
    (sum, c) => sum + c.stories.length,
    0
  );

  return (
    <div>
      {/* Back link */}
      <div
        style={{
          fontFamily: V2.ui,
          fontSize: 13,
          color: V2.inkMute,
          marginBottom: 24,
        }}
      >
        <Link
          href="/admin/users"
          style={{ color: V2.inkMute, textDecoration: "none" }}
        >
          ← Terug naar gebruikers
        </Link>
      </div>

      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <Kicker>Admin · gebruiker</Kicker>
        <h1
          style={{
            fontFamily: V2.display,
            fontWeight: 300,
            fontSize: "clamp(32px, 4.4vw, 44px)",
            letterSpacing: -1.2,
            margin: "10px 0 4px",
            lineHeight: 1.05,
          }}
        >
          {user.name}
        </h1>
        <p
          style={{
            fontFamily: V2.mono,
            fontSize: 13,
            color: V2.inkMute,
            margin: 0,
            letterSpacing: "0.02em",
          }}
        >
          {user.email}
        </p>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            marginTop: 20,
          }}
        >
          <StatusPill status={user.status} role={user.role} />
          {user.role !== "admin" && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "5px 14px",
                background: V2.goldSoft,
                color: V2.goldDeep,
                fontFamily: V2.ui,
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              {user.storyCredits} verhalen beschikbaar
            </span>
          )}
          {user.role === "admin" && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "5px 14px",
                background: V2.night,
                color: V2.gold,
                fontFamily: V2.ui,
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              Admin · onbeperkt
            </span>
          )}
        </div>
      </div>

      {/* Goedkeuring & tegoed */}
      {user.role !== "admin" && (
        <section style={sectionStyle}>
          <div style={{ marginBottom: 24 }}>
            <h2 style={sectionTitleStyle}>
              Goedkeuring & <span style={{ fontStyle: "italic" }}>tegoed</span>
            </h2>
            <p style={sectionMetaStyle}>
              Status wijzigen of verhalen-tegoed aanpassen
            </p>
          </div>

          {user.status === "pending" && user.role !== "admin" && (
            <div
              style={{
                marginBottom: 24,
                padding: "20px 24px",
                background: V2.goldSoft,
                borderLeft: `3px solid ${V2.goldDeep}`,
              }}
            >
              <p
                style={{
                  fontFamily: V2.body,
                  fontSize: 14,
                  color: V2.ink,
                  margin: "0 0 16px",
                  lineHeight: 1.5,
                }}
              >
                Deze gebruiker wacht op goedkeuring. Stel een startbedrag aan
                verhalen in en keur goed.
              </p>
              <form
                action={updateApprovalAction}
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "flex-end",
                  gap: 20,
                }}
              >
                <input type="hidden" name="userId" value={user.id} />
                <input type="hidden" name="action" value="approve" />
                <div style={{ minWidth: 120 }}>
                  <label style={fieldLabelStyle}>Start-tegoed</label>
                  <input
                    name="credits"
                    type="number"
                    min={0}
                    defaultValue={5}
                    style={{
                      ...inputStyle,
                      borderBottomColor: V2.goldDeep,
                    }}
                  />
                </div>
                <EBtn kind="primary" size="sm" type="submit">
                  Goedkeuren →
                </EBtn>
              </form>
            </div>
          )}

          <div
            style={{
              display: "grid",
              gap: 32,
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            }}
          >
            <form action={updateApprovalAction}>
              <input type="hidden" name="userId" value={user.id} />
              <input type="hidden" name="action" value="setCredits" />
              <p
                style={{
                  fontFamily: V2.body,
                  fontStyle: "italic",
                  fontSize: 13,
                  color: V2.inkMute,
                  margin: "0 0 12px",
                }}
              >
                Zet verhalen-tegoed op exact dit getal.
              </p>
              <div
                style={{
                  display: "flex",
                  gap: 16,
                  alignItems: "flex-end",
                }}
              >
                <div style={{ flex: 1 }}>
                  <label style={fieldLabelStyle}>Tegoed</label>
                  <input
                    name="credits"
                    type="number"
                    min={0}
                    defaultValue={user.storyCredits}
                    style={inputStyle}
                  />
                </div>
                <EBtn kind="primary" size="sm" type="submit">
                  Instellen
                </EBtn>
              </div>
            </form>

            <form action={updateApprovalAction}>
              <input type="hidden" name="userId" value={user.id} />
              <input type="hidden" name="action" value="addCredits" />
              <p
                style={{
                  fontFamily: V2.body,
                  fontStyle: "italic",
                  fontSize: 13,
                  color: V2.inkMute,
                  margin: "0 0 12px",
                }}
              >
                Extra verhalen bij huidige tegoed optellen.
              </p>
              <div
                style={{
                  display: "flex",
                  gap: 16,
                  alignItems: "flex-end",
                }}
              >
                <div style={{ flex: 1 }}>
                  <label style={fieldLabelStyle}>Toevoegen</label>
                  <input
                    name="credits"
                    type="number"
                    min={1}
                    defaultValue={5}
                    style={inputStyle}
                  />
                </div>
                <EBtn kind="ghost" size="sm" type="submit">
                  <IconV2 name="plus" size={14} /> Toevoegen
                </EBtn>
              </div>
            </form>
          </div>

          <div
            style={{
              marginTop: 24,
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            {user.status === "approved" && (
              <form action={updateApprovalAction}>
                <input type="hidden" name="userId" value={user.id} />
                <input type="hidden" name="action" value="suspend" />
                <button
                  type="submit"
                  style={{
                    padding: "10px 18px",
                    background: "transparent",
                    color: V2.heart,
                    border: `1px solid ${V2.heart}`,
                    fontFamily: V2.ui,
                    fontSize: 13,
                    fontWeight: 500,
                    letterSpacing: 0.2,
                    cursor: "pointer",
                    borderRadius: 2,
                  }}
                >
                  Opschorten
                </button>
              </form>
            )}
            {user.status === "suspended" && (
              <form action={updateApprovalAction}>
                <input type="hidden" name="userId" value={user.id} />
                <input type="hidden" name="action" value="unsuspend" />
                <EBtn kind="ghost" size="sm" type="submit">
                  <IconV2 name="check" size={14} /> Opschorting opheffen
                </EBtn>
              </form>
            )}
          </div>
        </section>
      )}

      {/* Accountgegevens */}
      <section style={sectionStyle}>
        <div style={{ marginBottom: 24 }}>
          <h2 style={sectionTitleStyle}>Accountgegevens</h2>
        </div>
        <dl
          style={{
            display: "grid",
            gap: 24,
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            margin: 0,
          }}
        >
          <InfoRow label="ID" value={user.id} mono />
          <InfoRow label="Rol" value={user.role} capitalize />
          <InfoRow label="Taal" value={user.locale} />
          <InfoRow label="Aangemaakt" value={formatDateTime(user.createdAt)} mono />
          <InfoRow label="Laatste update" value={formatDateTime(user.updatedAt)} mono />
          <InfoRow label="Laatste login" value={formatDateTime(user.lastLoginAt)} mono />
          <InfoRow label="Kindprofielen" value={user.children.length} mono />
          <InfoRow label="Verhalen totaal" value={totalStories} mono />
          <InfoRow label="Telefoon" value={user.phone ?? "-"} />
          <div style={{ gridColumn: "1 / -1" }}>
            <dt style={fieldLabelStyle}>Adres</dt>
            <dd
              style={{
                fontFamily: V2.body,
                fontSize: 15,
                color: V2.ink,
                margin: "4px 0 0",
                lineHeight: 1.5,
              }}
            >
              {user.street || user.city ? (
                <>
                  {user.street} {user.houseNumber}
                  {user.street && <br />}
                  {user.postalCode} {user.city}
                  {user.country && <>, {user.country}</>}
                </>
              ) : (
                <span style={{ fontStyle: "italic", color: V2.inkMute }}>-</span>
              )}
            </dd>
          </div>
        </dl>
      </section>

      {/* Wachtwoord */}
      <section style={sectionStyle}>
        <div style={{ marginBottom: 24 }}>
          <h2 style={sectionTitleStyle}>Wachtwoord</h2>
          <p style={sectionMetaStyle}>
            Reset-link genereren of direct een wachtwoord instellen
          </p>
        </div>

        {query.pwSet === "1" && (
          <FlashSaved>
            Wachtwoord ingesteld. Alle bestaande reset-links zijn
            geïnvalideerd.
          </FlashSaved>
        )}
        {query.pwError === "too_short" && (
          <FlashError>Wachtwoord moet minimaal 6 tekens zijn</FlashError>
        )}
        {query.resetLink && (
          <div
            style={{
              marginBottom: 24,
              padding: "20px 24px",
              background: V2.paperDeep,
              borderLeft: `2px solid ${V2.ink}`,
            }}
          >
            <p
              style={{
                fontFamily: V2.ui,
                fontSize: 12,
                fontWeight: 500,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: V2.ink,
                margin: "0 0 10px",
              }}
            >
              Reset-link gegenereerd · 24u geldig
            </p>
            <p
              style={{
                fontFamily: V2.mono,
                fontSize: 12,
                wordBreak: "break-all",
                background: V2.paper,
                border: `1px solid ${V2.paperShade}`,
                padding: "10px 12px",
                margin: "0 0 10px",
                color: V2.ink,
              }}
            >
              {query.resetLink}
            </p>
            <p
              style={{
                fontFamily: V2.body,
                fontStyle: "italic",
                fontSize: 13,
                color: V2.inkMute,
                margin: 0,
              }}
            >
              Stuur deze link handmatig naar de klant. Na gebruik of verval
              werkt hij niet meer.
            </p>
          </div>
        )}

        <div
          style={{
            display: "grid",
            gap: 32,
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          }}
        >
          <form action={generateResetLinkAction}>
            <input type="hidden" name="userId" value={user.id} />
            <p
              style={{
                fontFamily: V2.body,
                fontStyle: "italic",
                fontSize: 13,
                color: V2.inkMute,
                margin: "0 0 16px",
              }}
            >
              Genereer een eenmalige reset-link voor de klant (aanbevolen).
            </p>
            <EBtn kind="ghost" size="md" type="submit">
              Reset-link genereren →
            </EBtn>
          </form>

          <form action={setPasswordAction}>
            <input type="hidden" name="userId" value={user.id} />
            <p
              style={{
                fontFamily: V2.body,
                fontStyle: "italic",
                fontSize: 13,
                color: V2.inkMute,
                margin: "0 0 12px",
              }}
            >
              Of stel direct een wachtwoord in (min. 6 tekens).
            </p>
            <div style={{ marginBottom: 16 }}>
              <label style={fieldLabelStyle}>Nieuw wachtwoord</label>
              <input
                name="newPassword"
                type="password"
                required
                minLength={6}
                placeholder="••••••"
                style={inputStyle}
              />
            </div>
            <EBtn kind="primary" size="md" type="submit">
              Wachtwoord instellen →
            </EBtn>
          </form>
        </div>
      </section>

      {/* Abonnement */}
      <section style={sectionStyle}>
        <div
          style={{
            marginBottom: 24,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2 style={sectionTitleStyle}>Abonnement</h2>
            <p style={sectionMetaStyle}>
              Placeholder: nog geen betaalprovider gekoppeld
            </p>
          </div>
        </div>
        <form
          action={saveSubscriptionAction}
          style={{
            display: "grid",
            gap: 24,
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            alignItems: "flex-end",
          }}
        >
          <input type="hidden" name="userId" value={user.id} />
          <div>
            <label style={fieldLabelStyle}>Plan</label>
            <select
              name="plan"
              defaultValue={user.subscription?.plan ?? "free"}
              style={selectStyle}
            >
              <option value="free">Free</option>
              <option value="basic">Basic</option>
              <option value="premium">Premium</option>
            </select>
          </div>
          <div>
            <label style={fieldLabelStyle}>Status</label>
            <select
              name="status"
              defaultValue={user.subscription?.status ?? "active"}
              style={selectStyle}
            >
              <option value="active">Active</option>
              <option value="trialing">Trialing</option>
              <option value="cancelled">Cancelled</option>
              <option value="expired">Expired</option>
            </select>
          </div>
          <div>
            <label style={fieldLabelStyle}>Eindigt op</label>
            <input
              type="date"
              name="endsAt"
              defaultValue={
                user.subscription?.endsAt
                  ? user.subscription.endsAt.toISOString().slice(0, 10)
                  : ""
              }
              style={inputStyle}
            />
          </div>
          <div>
            <EBtn kind="primary" size="md" type="submit">
              Opslaan →
            </EBtn>
          </div>
        </form>
        {user.subscription && (
          <form action={deleteSubscriptionAction} style={{ marginTop: 16 }}>
            <input type="hidden" name="userId" value={user.id} />
            <button
              type="submit"
              style={{
                background: "transparent",
                border: "none",
                padding: 0,
                fontFamily: V2.ui,
                fontSize: 13,
                color: V2.inkMute,
                cursor: "pointer",
                textDecoration: "underline",
                textUnderlineOffset: 3,
              }}
            >
              Abonnement verwijderen
            </button>
          </form>
        )}
        {user.subscription && (
          <p
            style={{
              marginTop: 16,
              fontFamily: V2.body,
              fontStyle: "italic",
              fontSize: 13,
              color: V2.inkMute,
            }}
          >
            Gestart op {formatDate(user.subscription.startedAt)}
            {user.subscription.cancelledAt &&
              ` · geannuleerd op ${formatDate(user.subscription.cancelledAt)}`}
          </p>
        )}
      </section>

      {/* Kindprofielen */}
      <section style={sectionStyle}>
        <div style={{ marginBottom: 24 }}>
          <h2 style={sectionTitleStyle}>
            Kindprofielen{" "}
            <span
              style={{
                fontFamily: V2.mono,
                fontSize: 16,
                color: V2.inkMute,
                letterSpacing: "0.08em",
                marginLeft: 8,
              }}
            >
              · {user.children.length}
            </span>
          </h2>
        </div>
        {user.children.length === 0 ? (
          <p
            style={{
              fontFamily: V2.body,
              fontStyle: "italic",
              fontSize: 14,
              color: V2.inkMute,
            }}
          >
            Geen kindprofielen.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {user.children.map((child) => (
              <div
                key={child.id}
                style={{
                  background: V2.paper,
                  border: `1px solid ${V2.paperShade}`,
                  padding: "20px 24px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 16,
                    marginBottom: 12,
                  }}
                >
                  <div>
                    <h3
                      style={{
                        fontFamily: V2.display,
                        fontWeight: 300,
                        fontSize: 22,
                        letterSpacing: -0.3,
                        margin: 0,
                        color: V2.ink,
                      }}
                    >
                      <span style={{ fontStyle: "italic" }}>{child.name}</span>
                    </h3>
                    <p
                      style={{
                        fontFamily: V2.mono,
                        fontSize: 12,
                        color: V2.inkMute,
                        letterSpacing: "0.04em",
                        margin: "6px 0 0",
                      }}
                    >
                      {calculateAge(child.dateOfBirth)} jaar ·{" "}
                      {child.gender === "boy"
                        ? "jongen"
                        : child.gender === "girl"
                          ? "meisje"
                          : "kind"}{" "}
                      · geboren {formatDate(child.dateOfBirth)} ·{" "}
                      {child.stories.length} verhalen
                    </p>
                    {child.interests.length > 0 && (
                      <p
                        style={{
                          fontFamily: V2.body,
                          fontStyle: "italic",
                          fontSize: 13,
                          color: V2.inkSoft,
                          margin: "6px 0 0",
                        }}
                      >
                        Interesses: {child.interests.join(", ")}
                      </p>
                    )}
                  </div>
                  {child.approvedPreviewUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={child.approvedPreviewUrl}
                      alt={`Character ${child.name}`}
                      style={{
                        height: 64,
                        width: 64,
                        objectFit: "cover",
                        border: `1px solid ${V2.paperShade}`,
                      }}
                    />
                  )}
                </div>
                {child.stories.length > 0 && (
                  <details style={{ marginTop: 12 }}>
                    <summary
                      style={{
                        cursor: "pointer",
                        fontFamily: V2.ui,
                        fontSize: 12,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: V2.inkMute,
                      }}
                    >
                      Verhalen ({child.stories.length})
                    </summary>
                    <ul
                      style={{
                        listStyle: "none",
                        padding: 0,
                        margin: "12px 0 0",
                      }}
                    >
                      {child.stories.map((s) => (
                        <li
                          key={s.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 12,
                            padding: "10px 0",
                            borderBottom: `1px solid ${V2.paperShade}`,
                            fontFamily: V2.body,
                            fontSize: 14,
                            flexWrap: "wrap",
                          }}
                        >
                          <span style={{ flex: "1 1 260px", minWidth: 0 }}>
                            {s.isFavorite && (
                              <IconV2
                                name="heart"
                                size={12}
                                color={V2.heart}
                                filled
                              />
                            )}{" "}
                            {s.title}
                            <span
                              style={{
                                fontFamily: V2.mono,
                                fontSize: 12,
                                color: V2.inkMute,
                                marginLeft: 8,
                                letterSpacing: "0.04em",
                              }}
                            >
                              · {s.setting} · {s.status} ·{" "}
                              {formatDate(s.createdAt)}
                            </span>
                          </span>
                          {user.role === "admin" && (
                            <form
                              action={setLandingPreviewSlotAction}
                              style={{
                                display: "flex",
                                gap: 6,
                                alignItems: "center",
                              }}
                            >
                              <input
                                type="hidden"
                                name="storyId"
                                value={s.id}
                              />
                              <input
                                type="hidden"
                                name="userId"
                                value={user.id}
                              />
                              <select
                                name="slot"
                                defaultValue={s.landingPreviewSlot ?? ""}
                                style={{
                                  fontFamily: V2.ui,
                                  fontSize: 12,
                                  padding: "4px 6px",
                                  background: V2.paper,
                                  border: `1px solid ${V2.paperShade}`,
                                  color: V2.ink,
                                }}
                                aria-label="Landing preview slot"
                              >
                                <option value="">Geen preview</option>
                                <option value="girl-2">Landing · meisje 2</option>
                                <option value="girl-4">Landing · meisje 4</option>
                                <option value="boy-2">Landing · jongen 2</option>
                                <option value="boy-4">Landing · jongen 4</option>
                              </select>
                              <button
                                type="submit"
                                style={{
                                  fontFamily: V2.ui,
                                  fontSize: 11,
                                  padding: "5px 10px",
                                  background: V2.ink,
                                  color: V2.paper,
                                  border: "none",
                                  cursor: "pointer",
                                  letterSpacing: "0.04em",
                                }}
                              >
                                Zet
                              </button>
                            </form>
                          )}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Admin-notities */}
      <section style={sectionStyle}>
        <div style={{ marginBottom: 24 }}>
          <h2 style={sectionTitleStyle}>
            Admin-notities{" "}
            <span
              style={{
                fontFamily: V2.mono,
                fontSize: 16,
                color: V2.inkMute,
                letterSpacing: "0.08em",
                marginLeft: 8,
              }}
            >
              · {user.adminNotes.length}
            </span>
          </h2>
        </div>
        <form
          action={addNoteAction}
          style={{
            display: "flex",
            gap: 16,
            alignItems: "flex-end",
            marginBottom: 24,
          }}
        >
          <input type="hidden" name="userId" value={user.id} />
          <div style={{ flex: 1 }}>
            <label style={fieldLabelStyle}>Nieuwe notitie</label>
            <input
              name="content"
              required
              placeholder="Notitie toevoegen..."
              style={inputStyle}
            />
          </div>
          <EBtn kind="primary" size="sm" type="submit">
            <IconV2 name="plus" size={14} /> Toevoegen
          </EBtn>
        </form>
        {user.adminNotes.length === 0 ? (
          <p
            style={{
              fontFamily: V2.body,
              fontStyle: "italic",
              fontSize: 14,
              color: V2.inkMute,
            }}
          >
            Nog geen notities.
          </p>
        ) : (
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {user.adminNotes.map((note) => (
              <li
                key={note.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 16,
                  padding: "16px 20px",
                  background: V2.paper,
                  border: `1px solid ${V2.paperShade}`,
                }}
              >
                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      fontFamily: V2.body,
                      fontSize: 15,
                      color: V2.ink,
                      margin: 0,
                      lineHeight: 1.5,
                    }}
                  >
                    {note.content}
                  </p>
                  <p
                    style={{
                      fontFamily: V2.mono,
                      fontSize: 11,
                      color: V2.inkMute,
                      margin: "8px 0 0",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {note.author.name} · {formatDateTime(note.createdAt)}
                  </p>
                </div>
                <form action={deleteNoteAction}>
                  <input type="hidden" name="noteId" value={note.id} />
                  <input type="hidden" name="userId" value={user.id} />
                  <button
                    type="submit"
                    style={{
                      background: "transparent",
                      border: "none",
                      padding: 0,
                      fontFamily: V2.ui,
                      fontSize: 12,
                      color: V2.inkMute,
                      cursor: "pointer",
                      textDecoration: "underline",
                      textUnderlineOffset: 3,
                    }}
                  >
                    verwijder
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Gevarenzone */}
      <section
        style={{
          marginTop: 64,
          padding: 32,
          background: "rgba(196,165,168,0.08)",
          border: `1px solid rgba(176, 74, 65, 0.25)`,
        }}
      >
        <Kicker color={V2.heart}>Gevarenzone</Kicker>
        <h2
          style={{
            fontFamily: V2.display,
            fontWeight: 300,
            fontSize: 26,
            margin: "12px 0 10px",
            letterSpacing: -0.5,
            color: V2.ink,
          }}
        >
          Account <span style={{ fontStyle: "italic" }}>verwijderen.</span>
        </h2>
        <p
          style={{
            fontFamily: V2.body,
            fontSize: 14,
            lineHeight: 1.6,
            color: V2.inkSoft,
            margin: "0 0 20px",
            maxWidth: "60ch",
          }}
        >
          Account permanent verwijderen. Alle kindprofielen, verhalen, boeken
          en illustratiebestanden worden opgeruimd. Dit kan niet ongedaan
          gemaakt worden.
        </p>

        {query.delError === "self" && (
          <FlashError>
            Je kunt je eigen account niet via deze pagina verwijderen.
          </FlashError>
        )}
        {query.delError === "admin_blocked" && (
          <FlashError>
            Admin-accounts kunnen niet verwijderd worden. Degradeer eerst de
            rol via de database.
          </FlashError>
        )}
        {query.delError === "email_mismatch" && (
          <FlashError>Het ingevulde email komt niet overeen.</FlashError>
        )}

        {user.role === "admin" ? (
          <p
            style={{
              fontFamily: V2.body,
              fontStyle: "italic",
              fontSize: 14,
              color: V2.heart,
              background: V2.paper,
              padding: "12px 16px",
              border: `1px solid rgba(176, 74, 65, 0.3)`,
            }}
          >
            Admin-accounts kunnen niet via deze pagina verwijderd worden.
          </p>
        ) : (
          <details>
            <summary
              style={{
                display: "inline-block",
                cursor: "pointer",
                padding: "10px 18px",
                background: "transparent",
                color: V2.heart,
                border: `1px solid ${V2.heart}`,
                fontFamily: V2.ui,
                fontSize: 14,
                fontWeight: 500,
                listStyle: "none",
              }}
            >
              Deze gebruiker verwijderen
            </summary>
            <form
              action={deleteUserAction}
              style={{
                marginTop: 20,
                padding: 24,
                background: V2.paper,
                border: `1px solid rgba(176, 74, 65, 0.25)`,
              }}
            >
              <input type="hidden" name="userId" value={user.id} />
              <p
                style={{
                  fontFamily: V2.body,
                  fontSize: 14,
                  color: V2.inkSoft,
                  margin: "0 0 20px",
                  lineHeight: 1.6,
                }}
              >
                Typ{" "}
                <strong style={{ color: V2.ink }}>{user.email}</strong> om te
                bevestigen.
              </p>
              <div style={{ marginBottom: 16 }}>
                <label style={fieldLabelStyle}>Email ter bevestiging</label>
                <input
                  name="emailConfirm"
                  type="email"
                  required
                  autoComplete="off"
                  placeholder={user.email}
                  style={inputStyle}
                />
              </div>
              <button
                type="submit"
                style={{
                  padding: "12px 24px",
                  background: V2.heart,
                  color: V2.paper,
                  border: "none",
                  fontFamily: V2.ui,
                  fontSize: 14,
                  fontWeight: 500,
                  letterSpacing: 0.2,
                  cursor: "pointer",
                  borderRadius: 2,
                }}
              >
                Account definitief verwijderen
              </button>
            </form>
          </details>
        )}
      </section>
    </div>
  );
}

// ── Info row for definition list ────────────────────────────
function InfoRow({
  label,
  value,
  mono,
  capitalize,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  capitalize?: boolean;
}) {
  return (
    <div>
      <dt
        style={{
          fontFamily: V2.ui,
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: V2.inkMute,
          marginBottom: 6,
        }}
      >
        {label}
      </dt>
      <dd
        style={{
          fontFamily: mono ? V2.mono : V2.body,
          fontSize: mono ? 13 : 15,
          color: V2.ink,
          margin: 0,
          textTransform: capitalize ? "capitalize" : undefined,
          letterSpacing: mono ? "0.02em" : undefined,
          wordBreak: mono ? "break-all" : undefined,
        }}
      >
        {value}
      </dd>
    </div>
  );
}
