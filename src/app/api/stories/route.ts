import { NextRequest, NextResponse } from "next/server";
import { generateStory, translateStory, type CharacterBible, type StoryRequest } from "@/lib/ai/story-generator";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { characterBible, storyRequest } = body as {
      characterBible: CharacterBible;
      storyRequest: StoryRequest;
    };

    if (!characterBible || !storyRequest) {
      return NextResponse.json(
        { error: "characterBible and storyRequest are required" },
        { status: 400 }
      );
    }

    // 1. Generate story in English
    const englishStory = await generateStory(characterBible, storyRequest);

    // 2. Translate to Dutch
    const dutchStory = await translateStory(englishStory);

    // 3. Return both versions (English for illustration prompts, Dutch for display)
    return NextResponse.json({
      story: dutchStory,
      storyEn: englishStory,
    });
  } catch (error) {
    console.error("Story generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate story" },
      { status: 500 }
    );
  }
}
