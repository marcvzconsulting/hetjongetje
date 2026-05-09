import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { StoryPdfDocument } from "@/lib/pdf/story-pdf";

/**
 * Genereert een PDF voor één verhaal en streamt 'm terug als
 * `application/pdf` met een `attachment`-header zodat de browser
 * automatisch een download-prompt toont.
 *
 * Auth: alleen de eigenaar van het verhaal mag 'm downloaden (dezelfde
 * regel als de reader-pagina). Geen credit-kosten — een PDF is gratis
 * een keer of vaker.
 *
 * Performance: rendering gebeurt in-memory met `renderToBuffer`.
 * Voor onze ~6 pagina's neemt dat <1s. Als verhalen langer worden
 * kunnen we omschakelen op `renderToStream` met chunked transfer.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _req: Request,
  context: { params: Promise<{ storyId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "auth_required" }, { status: 401 });
  }
  const { storyId } = await context.params;

  const story = await prisma.story.findFirst({
    where: { id: storyId, childProfile: { userId: session.user.id } },
    include: {
      pages: { orderBy: { pageNumber: "asc" } },
      childProfile: { select: { name: true } },
    },
  });
  if (!story) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (story.status !== "ready") {
    return NextResponse.json(
      { error: "story_not_ready" },
      { status: 409 },
    );
  }

  // Splits het laatste pagina-record af als afsluitscène (bestaande
  // conventie: de "ending"-illustratie staat op pageNumber === N+1 met
  // een lege text).
  const lastPage = story.pages[story.pages.length - 1];
  const isEndingPlaceholder =
    lastPage && lastPage.text.trim().length === 0 && !!lastPage.illustrationUrl;
  const storyPages = isEndingPlaceholder
    ? story.pages.slice(0, -1)
    : story.pages;
  const endingIllustrationUrl =
    isEndingPlaceholder && lastPage ? lastPage.illustrationUrl : null;

  const buffer = await renderToBuffer(
    StoryPdfDocument({
      story: {
        title: story.title,
        subtitle: story.subtitle,
        childName: story.childProfile.name,
        createdAt: story.createdAt,
        pages: storyPages.map((p) => ({
          pageNumber: p.pageNumber,
          text: p.text,
          illustrationUrl: p.illustrationUrl,
        })),
        endingIllustrationUrl,
      },
    }),
  );

  // Filename: titel + kindnaam, met spaties → underscore en zonder
  // gekkigheid waar Windows op klaagt.
  const safeTitle = story.title
    .replace(/[/\\?%*:|"<>]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 60);
  const filename = `${safeTitle}-${story.childProfile.name}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, max-age=0, no-store",
    },
  });
}
