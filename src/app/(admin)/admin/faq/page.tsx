import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { V2 } from "@/components/v2/tokens";
import { AdminShell, ADMIN_NAV } from "@/components/v2/admin/AdminShell";
import {
  createFaqAction,
  deleteFaqAction,
  updateFaqAction,
} from "./actions";

export const dynamic = "force-dynamic";

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

const btnPrimary: React.CSSProperties = {
  padding: "10px 22px",
  background: V2.ink,
  color: V2.paper,
  border: "none",
  fontFamily: V2.ui,
  fontSize: 13,
  fontWeight: 500,
  letterSpacing: 0.2,
  cursor: "pointer",
  borderRadius: 2,
};

const btnGhost: React.CSSProperties = {
  padding: "8px 14px",
  background: "transparent",
  color: V2.ink,
  border: `1px solid ${V2.paperShade}`,
  fontFamily: V2.ui,
  fontSize: 12,
  fontWeight: 500,
  cursor: "pointer",
  borderRadius: 2,
};

export default async function AdminFaqPage() {
  const session = await auth();
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
          <button type="submit" style={btnPrimary}>
            Toevoegen →
          </button>
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
                style={{
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
                    <div style={{ display: "flex", gap: 10 }}>
                      <button type="submit" style={btnPrimary}>
                        Opslaan
                      </button>
                    </div>
                  </div>
                </form>

                <form
                  action={deleteFaqAction}
                  style={{ marginTop: 12 }}
                >
                  <input type="hidden" name="id" value={e.id} />
                  <button
                    type="submit"
                    style={{ ...btnGhost, color: V2.heart }}
                  >
                    Verwijderen
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AdminShell>
  );
}
