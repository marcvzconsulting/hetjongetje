import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { V2 } from "@/components/v2/tokens";
import { AdminShell, ADMIN_NAV } from "@/components/v2/admin/AdminShell";
import { PendingButton } from "@/components/v2/PendingButton";
import {
  createFaqAction,
  deleteFaqAction,
  updateFaqAction,
} from "./actions";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ saved?: string; error?: string; id?: string }>;

/** Bovenaan de pagina. Opslaan en toevoegen melden we bij het item zelf. */
const FLASH_LABELS: Record<string, { kind: "success" | "error"; text: string }> = {
  deleted: { kind: "success", text: "Vraag verwijderd." },
  empty: { kind: "error", text: "Vul zowel een vraag als een antwoord in." },
  invalid: {
    kind: "error",
    text: "Opslaan lukte niet: vraag en antwoord mogen niet leeg zijn.",
  },
};

const ITEM_SAVED: Record<string, string> = {
  created: "Toegevoegd ✓",
  updated: "Opgeslagen ✓",
};

const inputBase: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  fontFamily: V2.body,
  fontSize: 14,
  color: V2.ink,
  background: V2.paper,
  border: `1px solid ${V2.paperShade}`,
  outline: "none",
  borderRadius: 2,
};

const labelBase: React.CSSProperties = {
  fontFamily: V2.ui,
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: V2.inkMute,
  display: "block",
  marginBottom: 6,
};

export default async function AdminFaqPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  const sp = await searchParams;
  const flash =
    (sp.saved && FLASH_LABELS[sp.saved]) ||
    (sp.error && FLASH_LABELS[sp.error]) ||
    null;
  const itemSaved = sp.saved ? ITEM_SAVED[sp.saved] : undefined;
  const entries = await prisma.faqEntry.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  const nav = ADMIN_NAV.map((n) => ({ ...n, active: n.href === "/admin/faq" }));

  return (
    <AdminShell
      section="Content"
      title={
        <>
          FAQ <span style={{ fontStyle: "italic" }}>beheer</span>
        </>
      }
      nav={nav}
      adminEmail={session?.user?.email ?? undefined}
    >
      <p
        style={{
          fontFamily: V2.body,
          fontSize: 14,
          color: V2.inkSoft,
          maxWidth: 720,
          marginBottom: 32,
          lineHeight: 1.55,
        }}
      >
        Vragen + antwoorden voor{" "}
        <a
          href="/veelgestelde-vragen"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: V2.ink }}
        >
          /veelgestelde-vragen
        </a>
        . Sortering loopt op <code>sortOrder</code> (laag = bovenaan).
        Onuitgegeven items verschijnen niet op de publieke pagina noch in
        de FAQ JSON-LD voor zoekmachines.
      </p>

      {flash && (
        <div
          role={flash.kind === "error" ? "alert" : "status"}
          style={{
            marginBottom: 24,
            padding: "12px 18px",
            background:
              flash.kind === "success"
                ? "rgba(201,169,97,0.18)"
                : "rgba(176,74,65,0.14)",
            borderLeft: `3px solid ${flash.kind === "success" ? V2.goldDeep : V2.heart}`,
            fontFamily: V2.body,
            fontSize: 14,
            color: V2.ink,
          }}
        >
          {flash.text}
        </div>
      )}

      {/* ── Nieuwe vraag ─────────────────────────────────── */}
      <section style={{ marginBottom: 48 }}>
        <h2
          style={{
            fontFamily: V2.display,
            fontWeight: 300,
            fontSize: 22,
            margin: "0 0 16px",
            letterSpacing: -0.4,
          }}
        >
          Nieuwe vraag toevoegen
        </h2>
        <form
          action={createFaqAction}
          style={{
            display: "grid",
            gap: 16,
            background: V2.paper,
            border: `1px solid ${V2.paperShade}`,
            padding: 20,
          }}
        >
          <div>
            <label style={labelBase}>Vraag</label>
            <input
              type="text"
              name="question"
              required
              maxLength={300}
              style={inputBase}
              placeholder="Vanaf welke leeftijd…"
            />
          </div>
          <div>
            <label style={labelBase}>Antwoord</label>
            <textarea
              name="answer"
              required
              maxLength={2000}
              rows={4}
              style={{ ...inputBase, resize: "vertical", fontFamily: V2.body }}
              placeholder="Eerlijk en bondig. Gebruik dubbele enter voor een nieuwe alinea."
            />
          </div>
          <div>
            <PendingButton pendingLabel="Toevoegen…">Toevoegen →</PendingButton>
          </div>
        </form>
      </section>

      {/* ── Bestaande vragen ─────────────────────────────── */}
      <section>
        <h2
          style={{
            fontFamily: V2.display,
            fontWeight: 300,
            fontSize: 22,
            margin: "0 0 16px",
            letterSpacing: -0.4,
          }}
        >
          {entries.length} {entries.length === 1 ? "vraag" : "vragen"}
        </h2>

        {entries.length === 0 ? (
          <p
            style={{
              fontStyle: "italic",
              color: V2.inkMute,
              fontFamily: V2.body,
            }}
          >
            Nog geen FAQ-items.
          </p>
        ) : (
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            {entries.map((e) => (
              <li
                key={e.id}
                id={`faq-${e.id}`}
                style={{
                  scrollMarginTop: 24,
                  background: V2.paper,
                  border: `1px solid ${V2.paperShade}`,
                  padding: 18,
                  opacity: e.isPublished ? 1 : 0.55,
                }}
              >
                <form
                  action={updateFaqAction}
                  style={{ display: "grid", gap: 12 }}
                >
                  <input type="hidden" name="id" value={e.id} />
                  <div
                    style={{
                      display: "grid",
                      gap: 12,
                      gridTemplateColumns: "1fr 100px",
                    }}
                  >
                    <div>
                      <label style={labelBase}>Vraag</label>
                      <input
                        type="text"
                        name="question"
                        defaultValue={e.question}
                        required
                        maxLength={300}
                        style={inputBase}
                      />
                    </div>
                    <div>
                      <label style={labelBase}>Volgorde</label>
                      <input
                        type="number"
                        name="sortOrder"
                        defaultValue={e.sortOrder}
                        style={inputBase}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={labelBase}>Antwoord</label>
                    <textarea
                      name="answer"
                      defaultValue={e.answer}
                      rows={5}
                      required
                      maxLength={2000}
                      style={{
                        ...inputBase,
                        resize: "vertical",
                        fontFamily: V2.body,
                      }}
                    />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <label
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        fontFamily: V2.body,
                        fontSize: 14,
                        color: V2.ink,
                      }}
                    >
                      <input
                        type="checkbox"
                        name="isPublished"
                        defaultChecked={e.isPublished}
                      />
                      Gepubliceerd
                    </label>
                    <div
                      style={{ display: "flex", gap: 12, alignItems: "center" }}
                    >
                      {itemSaved && sp.id === e.id && (
                        <span
                          role="status"
                          style={{
                            fontFamily: V2.ui,
                            fontSize: 13,
                            color: V2.goldDeep,
                          }}
                        >
                          {itemSaved}
                        </span>
                      )}
                      <PendingButton pendingLabel="Opslaan…">Opslaan</PendingButton>
                    </div>
                  </div>
                </form>

                <form
                  action={deleteFaqAction}
                  style={{ marginTop: 12 }}
                >
                  <input type="hidden" name="id" value={e.id} />
                  <PendingButton
                    variant="danger"
                    size="sm"
                    pendingLabel="Verwijderen…"
                    confirm={`"${e.question}" definitief verwijderen? Dit kan niet ongedaan worden gemaakt.`}
                  >
                    Verwijderen
                  </PendingButton>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AdminShell>
  );
}
