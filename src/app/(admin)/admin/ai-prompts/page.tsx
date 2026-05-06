import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { V2 } from "@/components/v2/tokens";
import { AdminShell, ADMIN_NAV } from "@/components/v2/admin/AdminShell";
import { PendingButton } from "@/components/v2/PendingButton";
import { AI_PROMPT_SNIPPETS } from "@/lib/ai/prompts/store";
import { saveAiPromptAction, resetAiPromptAction } from "./actions";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  saved?: string;
  error?: string;
  code?: string;
}>;

export default async function AiPromptsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  const sp = await searchParams;

  const overrides = await prisma.aiPromptOverride.findMany({
    select: { code: true, value: true, updatedAt: true },
  });
  const overrideMap = new Map(overrides.map((o) => [o.code, o]));

  const nav = ADMIN_NAV.map((n) => ({
    ...n,
    active: n.href === "/admin/ai-prompts",
  }));

  // Decode flash messages.
  let flash: { kind: "success" | "error"; text: string } | null = null;
  if (sp.saved === "reset" || sp.saved?.startsWith("reset:")) {
    flash = { kind: "success", text: "Override verwijderd — terug naar default." };
  } else if (sp.saved) {
    flash = { kind: "success", text: "Wijzigingen opgeslagen." };
  } else if (sp.error === "empty") {
    flash = { kind: "error", text: "Veld mag niet leeg zijn." };
  } else if (sp.error === "unknown") {
    flash = { kind: "error", text: "Onbekende snippet." };
  }

  return (
    <AdminShell
      section="AI"
      eyebrow="Prompt-tuning"
      title={
        <>
          Schrijfstijl van{" "}
          <span style={{ fontStyle: "italic" }}>de verhalen.</span>
        </>
      }
      nav={nav}
      adminEmail={session?.user?.email ?? undefined}
    >
      <p
        style={{
          fontFamily: V2.body,
          fontSize: 15,
          color: V2.inkSoft,
          lineHeight: 1.55,
          maxWidth: 720,
          margin: "0 0 28px",
        }}
      >
        Per snippet kun je de tekst overschrijven die naar Claude wordt
        gestuurd bij het genereren van verhalen. Defaults blijven leidend
        zolang er geen override staat. Wijzigingen gelden direct bij de
        eerstvolgende verhaal-generatie — geen deploy nodig.
      </p>

      {flash && (
        <div
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

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {AI_PROMPT_SNIPPETS.map((snippet) => {
          const override = overrideMap.get(snippet.code);
          const current = override?.value ?? snippet.default;
          const isOverridden = !!override;
          return (
            <SnippetCard
              key={snippet.code}
              code={snippet.code}
              label={snippet.label}
              description={snippet.description}
              current={current}
              defaultValue={snippet.default}
              isOverridden={isOverridden}
              updatedAt={override?.updatedAt ?? null}
            />
          );
        })}
      </div>
    </AdminShell>
  );
}

function SnippetCard({
  code,
  label,
  description,
  current,
  defaultValue,
  isOverridden,
  updatedAt,
}: {
  code: string;
  label: string;
  description: string;
  current: string;
  defaultValue: string;
  isOverridden: boolean;
  updatedAt: Date | null;
}) {
  return (
    <div
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
          marginBottom: 8,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2
            style={{
              fontFamily: V2.display,
              fontWeight: 400,
              fontSize: 20,
              letterSpacing: -0.4,
              margin: 0,
              color: V2.ink,
            }}
          >
            {label}
          </h2>
          <div
            style={{
              fontFamily: V2.mono,
              fontSize: 11,
              color: V2.inkMute,
              marginTop: 2,
            }}
          >
            {code}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {isOverridden ? (
            <Badge color={V2.gold}>aangepast</Badge>
          ) : (
            <Badge color={V2.inkMute}>standaard</Badge>
          )}
          {updatedAt && (
            <span
              style={{
                fontFamily: V2.mono,
                fontSize: 11,
                color: V2.inkMute,
              }}
            >
              {updatedAt.toLocaleDateString("nl-NL", {
                day: "numeric",
                month: "short",
              })}
            </span>
          )}
        </div>
      </div>
      <p
        style={{
          fontFamily: V2.body,
          fontStyle: "italic",
          fontSize: 13,
          color: V2.inkMute,
          margin: "0 0 14px",
          lineHeight: 1.55,
          maxWidth: 720,
        }}
      >
        {description}
      </p>
      <form action={saveAiPromptAction}>
        <input type="hidden" name="code" value={code} />
        <textarea
          name="value"
          defaultValue={current}
          rows={Math.min(20, Math.max(4, current.split("\n").length + 1))}
          style={{
            width: "100%",
            padding: "10px 12px",
            border: `1px solid ${V2.paperShade}`,
            background: V2.paperDeep,
            fontFamily: V2.mono,
            fontSize: 13,
            lineHeight: 1.6,
            color: V2.ink,
            outline: "none",
            resize: "vertical",
          }}
        />
        <div
          style={{
            display: "flex",
            gap: 12,
            marginTop: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <PendingButton variant="primary" pendingLabel="Opslaan…">
            Opslaan
          </PendingButton>
        </div>
      </form>
      {isOverridden && (
        <form action={resetAiPromptAction} style={{ marginTop: 8 }}>
          <input type="hidden" name="code" value={code} />
          <PendingButton variant="danger" pendingLabel="Resetten…">
            Reset naar default
          </PendingButton>
        </form>
      )}
      {isOverridden && (
        <details style={{ marginTop: 12 }}>
          <summary
            style={{
              fontFamily: V2.ui,
              fontSize: 12,
              color: V2.inkMute,
              cursor: "pointer",
            }}
          >
            Toon code-default ter vergelijking
          </summary>
          <pre
            style={{
              marginTop: 8,
              padding: "10px 12px",
              background: V2.paperDeep,
              border: `1px dashed ${V2.paperShade}`,
              fontFamily: V2.mono,
              fontSize: 12,
              lineHeight: 1.55,
              color: V2.inkSoft,
              whiteSpace: "pre-wrap",
              maxHeight: 240,
              overflow: "auto",
              margin: "8px 0 0",
            }}
          >
            {defaultValue}
          </pre>
        </details>
      )}
    </div>
  );
}

function Badge({
  color,
  children,
}: {
  color: string;
  children: React.ReactNode;
}) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 10px",
        background: `${color}22`,
        color,
        fontFamily: V2.mono,
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
      }}
    >
      {children}
    </span>
  );
}
