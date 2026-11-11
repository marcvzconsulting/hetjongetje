import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getImageReadUrl, privateImagesEnabled } from "@/lib/storage/scaleway";

/**
 * Beveiligde uitlevering van kindplaatjes (alleen in de privé-stand, zie
 * privateImagesEnabled). Controleert wie er kijkt en stuurt dan door naar
 * een kortlevende ondertekende link van de opslag; de bytes lopen dus niet
 * via onze server.
 *
 * Wie mag wat zien:
 *  - stories/<storyId>/…  : de eigenaar van het verhaal, een admin, iedereen
 *    met het geldige deeltoken van dat verhaal (?s=…), en iedereen als het
 *    verhaal een voorbeeld op de homepage is.
 *  - previews/<childId>/… : de ouder van dat kind of een admin.
 * Alle andere paden bestaan hier niet.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Bestandsnamen die wij zelf schrijven: page-1.jpg, page-1.jpg.r1,
// ending.jpg, approved.jpg, reference-face.jpg, …
const FILE = /^[a-z0-9][a-z0-9.-]{0,60}$/i;

function notFound() {
  return new NextResponse(null, { status: 404 });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ key: string[] }> },
) {
  if (!privateImagesEnabled()) return notFound();

  const { key: parts } = await context.params;
  if (parts.length !== 3) return notFound();
  const [area, id, file] = parts;
  if (!UUID.test(id) || !FILE.test(file) || file.includes("..")) {
    return notFound();
  }

  const session = await auth();
  const userId = session?.user?.id ?? null;
  const isAdmin = session?.user?.role === "admin";
  let allowed = false;
  let isPublic = false;

  if (area === "stories") {
    const story = await prisma.story.findUnique({
      where: { id },
      select: {
        shareToken: true,
        landingPreviewSlot: true,
        childProfile: { select: { userId: true } },
      },
    });
    if (!story) return notFound();
    const shareToken = request.nextUrl.searchParams.get("s");
    if (story.landingPreviewSlot) {
      allowed = true;
      isPublic = true;
    } else if (isAdmin || (userId && story.childProfile.userId === userId)) {
      allowed = true;
    } else if (shareToken && story.shareToken && shareToken === story.shareToken) {
      allowed = true;
    }
  } else if (area === "previews") {
    const child = await prisma.childProfile.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!child) return notFound();
    allowed = isAdmin || (!!userId && child.userId === userId);
  } else {
    return notFound();
  }

  // Bewust 404 en geen 403: zo verraadt de route niet of een id bestaat.
  if (!allowed) return notFound();

  const target = await getImageReadUrl(`${area}/${id}/${file}`);
  return new NextResponse(null, {
    status: 302,
    headers: {
      Location: target,
      // De doorverwijzing mag kort bewaard worden, maar alleen door de
      // browser van deze kijker (tenzij het een publiek voorbeeld is).
      "Cache-Control": isPublic
        ? "public, max-age=1800"
        : "private, max-age=1800",
    },
  });
}
