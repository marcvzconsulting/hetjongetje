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

function formatDateTime(date: Date | null | undefined): string {
  if (!date) return "—";
  return date.toISOString().replace("T", " ").slice(0, 16);
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return "—";
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
    <div className="space-y-8">
      <div>
        <Link
          href="/admin/users"
          className="text-sm text-muted-foreground hover:text-primary"
        >
          ← Terug naar gebruikers
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{user.name}</h1>
        <p className="text-sm text-muted-foreground">{user.email}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
              user.status === "approved"
                ? "bg-green-100 text-green-800"
                : user.status === "suspended"
                  ? "bg-red-100 text-red-800"
                  : "bg-amber-100 text-amber-800"
            }`}
          >
            {user.status === "approved"
              ? "✓ Goedgekeurd"
              : user.status === "suspended"
                ? "🚫 Opgeschort"
                : "⏳ Wacht op goedkeuring"}
          </span>
          {user.role !== "admin" && (
            <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              {user.storyCredits} verhalen beschikbaar
            </span>
          )}
          {user.role === "admin" && (
            <span className="inline-flex items-center rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-800">
              Admin (onbeperkt)
            </span>
          )}
        </div>
      </div>

      {user.role !== "admin" && (
        <section className="rounded-2xl border border-muted bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Goedkeuring & verhalen-tegoed
          </h2>

          {user.status === "pending" && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="mb-3 text-sm text-amber-900">
                Deze gebruiker wacht op goedkeuring. Stel een startbedrag aan
                verhalen in en keur goed.
              </p>
              <form
                action={updateApprovalAction}
                className="flex flex-wrap items-end gap-3"
              >
                <input type="hidden" name="userId" value={user.id} />
                <input type="hidden" name="action" value="approve" />
                <label className="text-sm">
                  <span className="block text-xs text-amber-900">
                    Start-tegoed
                  </span>
                  <input
                    name="credits"
                    type="number"
                    min={0}
                    defaultValue={5}
                    className="mt-1 w-24 rounded-lg border border-amber-300 px-3 py-2 text-sm"
                  />
                </label>
                <button
                  type="submit"
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700"
                >
                  ✓ Goedkeuren
                </button>
              </form>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <form
              action={updateApprovalAction}
              className="rounded-lg border border-muted p-3"
            >
              <input type="hidden" name="userId" value={user.id} />
              <input type="hidden" name="action" value="setCredits" />
              <p className="mb-2 text-xs text-muted-foreground">
                Zet verhalen-tegoed op exact dit getal.
              </p>
              <div className="flex gap-2">
                <input
                  name="credits"
                  type="number"
                  min={0}
                  defaultValue={user.storyCredits}
                  className="flex-1 rounded-lg border border-muted px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-light"
                >
                  Instellen
                </button>
              </div>
            </form>

            <form
              action={updateApprovalAction}
              className="rounded-lg border border-muted p-3"
            >
              <input type="hidden" name="userId" value={user.id} />
              <input type="hidden" name="action" value="addCredits" />
              <p className="mb-2 text-xs text-muted-foreground">
                Extra verhalen bij huidige tegoed optellen.
              </p>
              <div className="flex gap-2">
                <input
                  name="credits"
                  type="number"
                  min={1}
                  defaultValue={5}
                  className="flex-1 rounded-lg border border-muted px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  className="rounded-lg border border-muted px-4 py-2 text-sm font-semibold transition-colors hover:bg-muted"
                >
                  + Toevoegen
                </button>
              </div>
            </form>
          </div>

          <div className="mt-4 flex gap-2">
            {user.status === "approved" && (
              <form action={updateApprovalAction}>
                <input type="hidden" name="userId" value={user.id} />
                <input type="hidden" name="action" value="suspend" />
                <button
                  type="submit"
                  className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50"
                >
                  🚫 Opschorten
                </button>
              </form>
            )}
            {user.status === "suspended" && (
              <form action={updateApprovalAction}>
                <input type="hidden" name="userId" value={user.id} />
                <input type="hidden" name="action" value="unsuspend" />
                <button
                  type="submit"
                  className="rounded-lg border border-green-300 px-4 py-2 text-sm font-medium text-green-700 transition-colors hover:bg-green-50"
                >
                  ✓ Opschorting opheffen
                </button>
              </form>
            )}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-muted bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Accountgegevens
        </h2>
        <dl className="grid gap-4 text-sm md:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">ID</dt>
            <dd className="font-mono text-xs">{user.id}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Rol</dt>
            <dd className="capitalize">{user.role}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Taal</dt>
            <dd>{user.locale}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Aangemaakt</dt>
            <dd>{formatDateTime(user.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Laatste update</dt>
            <dd>{formatDateTime(user.updatedAt)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Laatste login</dt>
            <dd>{formatDateTime(user.lastLoginAt)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Kindprofielen</dt>
            <dd>{user.children.length}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Verhalen totaal</dt>
            <dd>{totalStories}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Telefoon</dt>
            <dd>{user.phone ?? "—"}</dd>
          </div>
          <div className="md:col-span-2">
            <dt className="text-xs text-muted-foreground">Adres</dt>
            <dd>
              {user.street || user.city ? (
                <>
                  {user.street} {user.houseNumber}
                  {user.street && <br />}
                  {user.postalCode} {user.city}
                  {user.country && <>, {user.country}</>}
                </>
              ) : (
                "—"
              )}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-muted bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Wachtwoord
        </h2>

        {query.pwSet === "1" && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
            ✓ Wachtwoord ingesteld. Alle bestaande reset-links zijn
            geïnvalideerd.
          </div>
        )}
        {query.pwError === "too_short" && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            Wachtwoord moet minimaal 6 tekens zijn
          </div>
        )}
        {query.resetLink && (
          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm">
            <p className="font-medium text-blue-900">
              Reset-link gegenereerd (24u geldig)
            </p>
            <p className="mt-2 break-all rounded border border-blue-200 bg-white px-2 py-1.5 font-mono text-xs">
              {query.resetLink}
            </p>
            <p className="mt-2 text-xs text-blue-800/80">
              Stuur deze link handmatig naar de klant. Na gebruik of verval
              werkt hij niet meer.
            </p>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <form action={generateResetLinkAction}>
            <input type="hidden" name="userId" value={user.id} />
            <p className="mb-2 text-xs text-muted-foreground">
              Genereer een eenmalige reset-link voor de klant (aanbevolen).
            </p>
            <button
              type="submit"
              className="w-full rounded-lg border border-muted px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
            >
              Reset-link genereren
            </button>
          </form>

          <form action={setPasswordAction} className="space-y-2">
            <input type="hidden" name="userId" value={user.id} />
            <p className="text-xs text-muted-foreground">
              Of stel direct een wachtwoord in (min. 6 tekens).
            </p>
            <input
              name="newPassword"
              type="password"
              required
              minLength={6}
              placeholder="Nieuw wachtwoord"
              className="w-full rounded-lg border border-muted px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-light"
            >
              Wachtwoord instellen
            </button>
          </form>
        </div>
      </section>

      <section className="rounded-2xl border border-muted bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Abonnement
          </h2>
          <span className="text-xs text-muted-foreground">
            placeholder — geen betaalprovider
          </span>
        </div>
        <form action={saveSubscriptionAction} className="grid gap-3 md:grid-cols-4">
          <input type="hidden" name="userId" value={user.id} />
          <label className="text-sm">
            <span className="block text-xs text-muted-foreground">Plan</span>
            <select
              name="plan"
              defaultValue={user.subscription?.plan ?? "free"}
              className="mt-1 w-full rounded-lg border border-muted px-3 py-2"
            >
              <option value="free">Free</option>
              <option value="basic">Basic</option>
              <option value="premium">Premium</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="block text-xs text-muted-foreground">Status</span>
            <select
              name="status"
              defaultValue={user.subscription?.status ?? "active"}
              className="mt-1 w-full rounded-lg border border-muted px-3 py-2"
            >
              <option value="active">Active</option>
              <option value="trialing">Trialing</option>
              <option value="cancelled">Cancelled</option>
              <option value="expired">Expired</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="block text-xs text-muted-foreground">
              Eindigt op
            </span>
            <input
              type="date"
              name="endsAt"
              defaultValue={
                user.subscription?.endsAt
                  ? user.subscription.endsAt.toISOString().slice(0, 10)
                  : ""
              }
              className="mt-1 w-full rounded-lg border border-muted px-3 py-2"
            />
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-light"
            >
              Opslaan
            </button>
          </div>
        </form>
        {user.subscription && (
          <form action={deleteSubscriptionAction} className="mt-3">
            <input type="hidden" name="userId" value={user.id} />
            <button
              type="submit"
              className="text-xs text-muted-foreground hover:text-red-600"
            >
              Abonnement verwijderen
            </button>
          </form>
        )}
        {user.subscription && (
          <p className="mt-3 text-xs text-muted-foreground">
            Gestart op {formatDate(user.subscription.startedAt)}
            {user.subscription.cancelledAt &&
              ` · geannuleerd op ${formatDate(user.subscription.cancelledAt)}`}
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-muted bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Kindprofielen ({user.children.length})
        </h2>
        {user.children.length === 0 ? (
          <p className="text-sm text-muted-foreground">Geen kindprofielen.</p>
        ) : (
          <div className="space-y-6">
            {user.children.map((child) => (
              <div
                key={child.id}
                className="rounded-xl border border-muted p-4"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">
                      {child.gender === "boy"
                        ? "👦"
                        : child.gender === "girl"
                          ? "👧"
                          : "🧒"}{" "}
                      {child.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {calculateAge(child.dateOfBirth)} jaar · geboren{" "}
                      {formatDate(child.dateOfBirth)} · {child.stories.length}{" "}
                      verhalen
                    </p>
                    {child.interests.length > 0 && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Interesses: {child.interests.join(", ")}
                      </p>
                    )}
                  </div>
                  {child.approvedPreviewUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={child.approvedPreviewUrl}
                      alt={`Character ${child.name}`}
                      className="h-16 w-16 rounded-lg object-cover"
                    />
                  )}
                </div>
                {child.stories.length > 0 && (
                  <details className="text-sm">
                    <summary className="cursor-pointer text-xs text-muted-foreground hover:text-primary">
                      Verhalen ({child.stories.length})
                    </summary>
                    <ul className="mt-2 space-y-1">
                      {child.stories.map((s) => (
                        <li
                          key={s.id}
                          className="flex items-center justify-between border-b border-muted py-1 last:border-0"
                        >
                          <span>
                            {s.isFavorite && "⭐ "}
                            {s.title}
                            <span className="ml-2 text-xs text-muted-foreground">
                              {s.setting} · {s.status} · {formatDate(s.createdAt)}
                            </span>
                          </span>
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

      <section className="rounded-2xl border border-muted bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Admin-notities ({user.adminNotes.length})
        </h2>
        <form action={addNoteAction} className="mb-4 flex gap-2">
          <input type="hidden" name="userId" value={user.id} />
          <input
            name="content"
            required
            placeholder="Nieuwe notitie..."
            className="flex-1 rounded-lg border border-muted px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-light"
          >
            Toevoegen
          </button>
        </form>
        {user.adminNotes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nog geen notities.</p>
        ) : (
          <ul className="space-y-3">
            {user.adminNotes.map((note) => (
              <li
                key={note.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-muted p-3"
              >
                <div className="flex-1">
                  <p className="text-sm">{note.content}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {note.author.name} · {formatDateTime(note.createdAt)}
                  </p>
                </div>
                <form action={deleteNoteAction}>
                  <input type="hidden" name="noteId" value={note.id} />
                  <input type="hidden" name="userId" value={user.id} />
                  <button
                    type="submit"
                    className="text-xs text-muted-foreground hover:text-red-600"
                  >
                    verwijder
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-red-200 bg-red-50/40 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-red-900">
          Gevarenzone
        </h2>
        <p className="mt-1 text-sm text-red-800/80">
          Account permanent verwijderen. Alle kindprofielen, verhalen, boeken
          en illustratiebestanden worden opgeruimd. Dit kan niet ongedaan
          gemaakt worden.
        </p>

        {query.delError === "self" && (
          <div className="mt-4 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-red-800">
            Je kunt je eigen account niet via deze pagina verwijderen.
          </div>
        )}
        {query.delError === "admin_blocked" && (
          <div className="mt-4 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-red-800">
            Admin-accounts kunnen niet verwijderd worden. Degradeer eerst de
            rol via de database.
          </div>
        )}
        {query.delError === "email_mismatch" && (
          <div className="mt-4 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-red-800">
            Het ingevulde email komt niet overeen.
          </div>
        )}

        {user.role === "admin" ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-red-800">
            Admin-accounts kunnen niet via deze pagina verwijderd worden.
          </p>
        ) : (
          <details className="mt-4">
            <summary className="inline-block cursor-pointer rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100">
              Deze gebruiker verwijderen
            </summary>
            <form
              action={deleteUserAction}
              className="mt-4 grid gap-3 rounded-xl border border-red-200 bg-white p-4"
            >
              <input type="hidden" name="userId" value={user.id} />
              <p className="text-sm text-red-800">
                Typ <strong>{user.email}</strong> om te bevestigen.
              </p>
              <input
                name="emailConfirm"
                type="email"
                required
                autoComplete="off"
                placeholder={user.email}
                className="w-full rounded-lg border border-red-200 px-3 py-2 text-sm"
              />
              <div>
                <button
                  type="submit"
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
                >
                  Account definitief verwijderen
                </button>
              </div>
            </form>
          </details>
        )}
      </section>
    </div>
  );
}
