import Link from "next/link";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

type SearchParams = Promise<{ status?: string; type?: string }>;

function formatDateTime(date: Date | null | undefined): string {
  if (!date) return "—";
  return date.toISOString().replace("T", " ").slice(0, 19);
}

function statusColor(status: string): string {
  switch (status) {
    case "failed":
      return "bg-red-100 text-red-700";
    case "completed":
      return "bg-green-100 text-green-700";
    case "processing":
      return "bg-blue-100 text-blue-700";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export default async function AdminJobsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const status = params.status ?? "failed";
  const type = params.type ?? "";

  const where: Prisma.GenerationJobWhereInput = {};
  if (status !== "all") where.status = status;
  if (type) where.type = type;

  const [jobs, counts] = await Promise.all([
    prisma.generationJob.findMany({
      where,
      include: {
        story: {
          select: {
            id: true,
            title: true,
            childProfile: {
              select: {
                name: true,
                user: { select: { id: true, email: true, name: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.generationJob.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  const countsByStatus = Object.fromEntries(
    counts.map((c) => [c.status, c._count._all])
  );

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Generation jobs</h1>

      <div className="mb-6 grid gap-3 md:grid-cols-4">
        {(["pending", "processing", "completed", "failed"] as const).map((s) => (
          <Link
            key={s}
            href={`/admin/jobs?status=${s}`}
            className={`rounded-2xl border p-4 transition-colors ${
              status === s
                ? "border-primary bg-primary/5"
                : "border-muted bg-white hover:bg-muted/30"
            }`}
          >
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              {s}
            </div>
            <div className="mt-1 text-2xl font-bold">
              {countsByStatus[s] ?? 0}
            </div>
          </Link>
        ))}
      </div>

      <form className="mb-4 flex flex-wrap gap-3">
        <select
          name="status"
          defaultValue={status}
          className="rounded-lg border border-muted px-3 py-2 text-sm"
        >
          <option value="all">Alle statussen</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>
        <select
          name="type"
          defaultValue={type}
          className="rounded-lg border border-muted px-3 py-2 text-sm"
        >
          <option value="">Alle types</option>
          <option value="text">Text</option>
          <option value="illustration">Illustration</option>
          <option value="pdf">PDF</option>
        </select>
        <button
          type="submit"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-light"
        >
          Filter
        </button>
      </form>

      <p className="mb-3 text-xs text-muted-foreground">
        {jobs.length} resultaten {jobs.length === 200 && "(max 200)"}
      </p>

      <div className="overflow-x-auto rounded-2xl border border-muted bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-muted bg-muted/30">
            <tr className="text-left">
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Type</th>
              <th className="px-4 py-3 font-semibold">Progress</th>
              <th className="px-4 py-3 font-semibold">Verhaal / Kind / User</th>
              <th className="px-4 py-3 font-semibold">Foutmelding</th>
              <th className="px-4 py-3 font-semibold">Gestart</th>
              <th className="px-4 py-3 font-semibold">Afgerond</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id} className="border-b border-muted last:border-0 align-top">
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(
                      job.status
                    )}`}
                  >
                    {job.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs">{job.type}</td>
                <td className="px-4 py-3 text-xs tabular-nums">
                  {job.progress}%
                </td>
                <td className="px-4 py-3 text-xs">
                  <div>{job.story.title}</div>
                  <div className="text-muted-foreground">
                    {job.story.childProfile.name} ·{" "}
                    {job.story.childProfile.user.email}
                  </div>
                  <Link
                    href={`/admin/users/${job.story.childProfile.user.id}`}
                    className="text-primary hover:underline"
                  >
                    user →
                  </Link>
                </td>
                <td className="max-w-xs px-4 py-3 text-xs">
                  {job.errorMessage ? (
                    <span className="text-red-600 break-all">
                      {job.errorMessage}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs tabular-nums">
                  {formatDateTime(job.createdAt)}
                </td>
                <td className="px-4 py-3 text-xs tabular-nums">
                  {formatDateTime(job.completedAt)}
                </td>
              </tr>
            ))}
            {jobs.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-sm text-muted-foreground"
                >
                  Geen jobs gevonden
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
