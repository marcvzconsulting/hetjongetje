import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  generateStory,
  translateStory,
  type CharacterBible,
  type StoryRequest,
} from "@/lib/ai/story-generator";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { childId, characterBible, storyRequest } = body as {
      childId: string;
      characterBible: CharacterBible;
      storyRequest: StoryRequest;
    };

    if (!childId || !characterBible || !storyRequest) {
      return NextResponse.json(
        { error: "childId, characterBible en storyRequest zijn verplicht" },
        { status: 400 }
      );
    }

    // Verify child belongs to user
    const child = await prisma.childProfile.findFirst({
      where: { id: childId, userId: session.user.id },
    });
    if (!child) {
      return NextResponse.json(
        { error: "Kindprofiel niet gevonden" },
        { status: 404 }
      );
    }

    // 1. Generate story in English
    const englishStory = await generateStory(characterBible, storyRequest);

    // 2. Translate to Dutch
    const dutchStory = await translateStory(englishStory);

    // 3. Save to database
    const story = await prisma.story.create({
      data: {
        childProfileId: childId,
        title: dutchStory.title,
        subtitle: dutchStory.subtitle || null,
        language: "nl",
        setting: storyRequest.setting,
        status: "ready",
        generationParams: JSON.parse(JSON.stringify(storyRequest)),
        pages: {
          create: dutchStory.pages.map((page) => ({
            pageNumber: page.pageNumber,
            text: page.text,
            illustrationPrompt: englishStory.pages[page.pageNumber - 1]?.illustrationPrompt || null,
            illustrationDescription: page.illustrationDescription,
          })),
        },
      },
      include: { pages: { orderBy: { pageNumber: "asc" } } },
    });

    // 4. Update character bible with new facts
    if (dutchStory.characterBibleUpdate) {
      const currentBible = (child.characterBible as Record<string, unknown>) || {};
      const previousAdventures = (currentBible.previousAdventures as Array<Record<string, string>>) || [];
      previousAdventures.push({
        title: dutchStory.title,
        setting: storyRequest.setting,
        summary: dutchStory.characterBibleUpdate,
      });
      await prisma.childProfile.update({
        where: { id: childId },
        data: {
          characterBible: { ...currentBible, previousAdventures },
        },
      });
    }

    return NextResponse.json({ story });
  } catch (error) {
    console.error("Story generation error:", error);
    return NextResponse.json(
      { error: "Er ging iets mis bij het genereren van het verhaal" },
      { status: 500 }
    );
  }
}
