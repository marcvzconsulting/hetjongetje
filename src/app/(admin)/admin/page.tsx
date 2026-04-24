import Link from "next/link";
import { prisma } from "@/lib/db";
import { V2 } from "@/components/v2/tokens";
import { Kicker, EBtn, IconV2 } from "@/components/v2";
import { StarField } from "@/components/v2/StarField";

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div
      style={{
        background: V2.paper,
        border: `1px solid ${V2.paperShade}`,
        padding: "22px 24px",
      }}
    >
      <div
        style={{
          fontFamily: V2.ui,
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: V2.inkMute,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: V2.display,
          fontWeight: 300,
          fontSize: 40,
          lineHeight: 1,
          marginTop: 12,
          letterSpacing: -1,
          color: V2.ink,
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            fontFamily: V2.body,
            fontStyle: "italic",
            fontSize: 13,
            color: V2.inkMute,
            marginTop: 10,
            lineHeight: 1.5,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontFamily: V2.display,
        fontWeight: 300,
        fontSize: 24,
        letterSpacing: -0.4,
        margin: "0 0 20px",
        color: V2.ink,
      }}
    >
      {children}
    </h2>
  );
}

export default async function AdminDashboardPage() {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    newUsers7d,
    newUsers30d,
    pendingUsers,
    suspendedUsers,
    totalChildren,
    totalStories,
    stories7d,
    activeSubs,
    failedJobs,
    processingJobs,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "user" } }),
    prisma.user.count({ where: { role: "user", createdAt: { gte: sevenDaysAgo } } }),
    prisma.user.count({ where: { role: "user", createdAt: { gte: thirtyDaysAgo } } }),
    prisma.user.count({ where: { role: "user", status: "pending" } }),
    prisma.user.count({ where: { role: "user", status: "suspended" } }),
    prisma.childProfile.count(),
    prisma.story.count(),
    prisma.story.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.subscription.count({ where: { status: "active", plan: { not: "free" } } }),
    prisma.generationJob.count({ where: { status: "failed" } }),
    prisma.generationJob.count({ where: { status: "processing" } }),
  ]);

  return (
    <div>
      {/* Nacht hero strip with KPI overview — the one hero on the admin side */}
      <section
        style={{
          background: V2.night,
          color: V2.paper,
          padding: "44px 40px",
          position: "relative",
          overflow: "hidden",
          marginBottom: 48,
        }}
      >
        <StarField count={10} />
        <div style={{ position: "relative" }}>
          <Kicker color={V2.gold}>Admin overview</Kicker>
          <h1
            style={{
              fontFamily: V2.display,
              fontWeight: 300,
              fontSize: "clamp(32px, 4vw, 44px)",
              margin: "14px 0 0",
              letterSpacing: -1.2,
              lineHeight: 1.05,
              color: V2.paper,
            }}
          >
            Dashboard <span style={{ fontStyle: "italic", color: V2.gold }}>vandaag</span>
          </h1>

          <div
            style={{
              display: "flex",
              gap: 48,
              marginTop: 32,
              paddingTop: 28,
              borderTop: `1px solid rgba(255,255,255,0.12)`,
              flexWrap: "wrap",
            }}
          >
            {[
              { n: totalUsers, l: "GEBRUIKERS" },
              { n: totalStories, l: "VERHALEN" },
              { n: activeSubs, l: "BETAALDE ABO'S" },
              { n: processingJobs, l: "JOBS ACTIEF" },
            ].map((s, i) => (
              <div key={i}>
                <div
                  style={{
                    fontFamily: V2.display,
                    fontSize: 36,
                    fontWeight: 300,
                    color: V2.gold,
                    lineHeight: 1,
                  }}
                >
                  {s.n}
                </div>
                <div
                  style={{
                    fontFamily: V2.mono,
                    fontSize: 10,
                    letterSpacing: "0.14em",
                    marginTop: 8,
                    opacity: 0.75,
                    color: V2.paper,
                  }}
                >
                  {s.l}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {pendingUsers > 0 && (
        <Link
          href="/admin/users?status=pending"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 20,
            marginBottom: 48,
            padding: "20px 24px",
            background: V2.goldSoft,
            borderLeft: `3px solid ${V2.goldDeep}`,
            textDecoration: "none",
            color: V2.ink,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: V2.ui,
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: V2.goldDeep,
              }}
            >
              Actie vereist
            </div>
            <div
              style={{
                fontFamily: V2.display,
                fontWeight: 300,
                fontSize: 22,
                marginTop: 6,
                letterSpacing: -0.3,
                color: V2.ink,
              }}
            >
              {pendingUsers}{" "}
              {pendingUsers === 1 ? "account wacht" : "accounts wachten"}{" "}
              <span style={{ fontStyle: "italic" }}>op goedkeuring</span>
            </div>
          </div>
          <span
            style={{
              fontFamily: V2.ui,
              fontSize: 13,
              fontWeight: 500,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: V2.ink,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            Bekijken <IconV2 name="arrow" size={16} />
          </span>
        </Link>
      )}

      <div style={{ marginBottom: 56 }}>
        <SectionHeading>Gebruikers</SectionHeading>
        <div
          style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          }}
        >
          <Stat label="Totaal" value={totalUsers} />
          <Stat label="Nieuw (7 dagen)" value={newUsers7d} />
          <Stat label="Nieuw (30 dagen)" value={newUsers30d} />
          <Stat
            label="Wacht op goedkeuring"
            value={pendingUsers}
            sub={pendingUsers > 0 ? "Check /admin/users?status=pending" : undefined}
          />
          <Stat label="Opgeschort" value={suspendedUsers} />
        </div>
      </div>

      <div style={{ marginBottom: 56 }}>
        <SectionHeading>Content</SectionHeading>
        <div
          style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          }}
        >
          <Stat label="Kindprofielen" value={totalChildren} />
          <Stat label="Verhalen totaal" value={totalStories} />
          <Stat label="Verhalen (7 dagen)" value={stories7d} />
        </div>
      </div>

      <div style={{ marginBottom: 56 }}>
        <SectionHeading>Abonnementen</SectionHeading>
        <div
          style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          }}
        >
          <Stat
            label="Actieve betaalde abo's"
            value={activeSubs}
            sub="placeholder: nog geen betaalprovider gekoppeld"
          />
        </div>
      </div>

      <div style={{ marginBottom: 56 }}>
        <SectionHeading>Systeem</SectionHeading>
        <div
          style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          }}
        >
          <Stat label="Jobs in progress" value={processingJobs} />
          <Stat
            label="Mislukte jobs"
            value={failedJobs}
            sub={failedJobs > 0 ? "Check /admin/jobs" : undefined}
          />
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <EBtn kind="primary" size="md" href="/admin/users">
          Gebruikers bekijken →
        </EBtn>
        <EBtn kind="ghost" size="md" href="/admin/jobs">
          Jobs bekijken →
        </EBtn>
      </div>
    </div>
  );
}
