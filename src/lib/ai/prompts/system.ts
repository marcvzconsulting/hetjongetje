export function buildSystemPrompt(characterBible: {
  childName: string;
  age: number;
  gender: string;
  interests: string[];
  pets?: { name: string; type: string; description?: string }[];
  friends?: { name: string; relationship?: string }[];
  favoriteThings?: { color?: string; food?: string; toy?: string; place?: string };
  fears?: string[];
  mainCharacterType: string;
  mainCharacterDescription?: string;
  previousAdventures?: { title: string; setting: string; summary: string }[];
}) {
  const {
    childName,
    age,
    gender,
    interests,
    pets,
    friends,
    favoriteThings,
    fears,
    mainCharacterType,
    mainCharacterDescription,
    previousAdventures,
  } = characterBible;

  const ageGroup = age <= 1 ? "0-1" : age <= 4 ? "2-4" : age <= 7 ? "5-7" : "8-10";

  const ageGuidelines: Record<string, { text: string; pages: number; wordsPerPage: string }> = {
    "0-1": {
      pages: 5,
      wordsPerPage: "5-15",
      text: "Write for a baby/toddler. Use EXTREMELY simple language: 1-2 very short sentences per page maximum. Focus on sounds (boom! splash! miauw!), colors, animals, and sensory experiences. Use lots of repetition — repeat key words and phrases across pages. The tone must be warm, soft, and soothing like a parent talking to their baby. Think of classic baby books like 'Nijntje'. Example page: 'Kijk! Daar is een rode bal. Bal! Bal!' — that level of simplicity.",
    },
    "2-4": {
      pages: 6,
      wordsPerPage: "15-40",
      text: "Use very simple, short sentences. Include repetition and familiar concepts. Use onomatopoeia and sensory words. Keep vocabulary basic. The story should be comforting and gentle. Think of picture book language.",
    },
    "5-7": {
      pages: 8,
      wordsPerPage: "40-80",
      text: "Use slightly longer sentences with simple plot structures. Include clear emotions and relatable situations. Add some humor and surprise. Characters should solve simple problems.",
    },
    "8-10": {
      pages: 8,
      wordsPerPage: "60-120",
      text: "Use more complex narrative structures. Include humor, problem-solving, and mild suspense. Characters can face challenges and learn lessons. Vocabulary can be richer.",
    },
  };

  let characterDescription = "";
  if (mainCharacterType === "self") {
    characterDescription = `The main character is ${childName} themselves - a ${gender === "boy" ? "boy" : gender === "girl" ? "girl" : "child"} of ${age} years old.`;
  } else if (mainCharacterType === "stuffed_animal") {
    characterDescription = `The main character is ${childName}'s favorite stuffed animal: ${mainCharacterDescription || "a cuddly companion"}. ${childName} appears in the stories as the stuffed animal's best friend.`;
  } else if (mainCharacterType === "action_hero") {
    characterDescription = `The main character is ${childName}'s favorite hero: ${mainCharacterDescription || "a brave hero"}. ${childName} may appear as a friend or sidekick.`;
  } else {
    characterDescription = `The main character is: ${mainCharacterDescription || childName}`;
  }

  const petsSection = pets?.length
    ? `\nPets: ${pets.map((p) => `${p.name} the ${p.type}${p.description ? ` (${p.description})` : ""}`).join(", ")}`
    : "";

  const friendsSection = friends?.length
    ? `\nFriends: ${friends.map((f) => `${f.name}${f.relationship ? ` (${f.relationship})` : ""}`).join(", ")}`
    : "";

  const favoritesSection = favoriteThings
    ? `\nFavorite things: ${Object.entries(favoriteThings)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ")}`
    : "";

  const fearsSection = fears?.length
    ? `\nIMPORTANT - Avoid these topics (the child is afraid of or sensitive to): ${fears.join(", ")}`
    : "";

  const previousSection = previousAdventures?.length
    ? `\nPrevious adventures (maintain consistency with these):\n${previousAdventures.map((a) => `- "${a.title}" (${a.setting}): ${a.summary}`).join("\n")}`
    : "";

  return `You are a children's story writer creating personalized stories for ${childName}.

## Character Profile
${characterDescription}
Age: ${age} years old
Interests: ${interests.join(", ")}${petsSection}${friendsSection}${favoritesSection}${fearsSection}${previousSection}

## Writing Guidelines
Age group: ${ageGroup} years old
${ageGuidelines[ageGroup].text}

## Story Structure
- Write exactly ${ageGuidelines[ageGroup].pages} pages
- Each page should have ${ageGuidelines[ageGroup].wordsPerPage} words — this is CRITICAL, do not exceed!
- Structure: Setup → Adventure begins → Challenge → Climax → Resolution → Warm ending
- Every story must end on a positive, warm note
- Weave in the child's real interests and details naturally - don't force them
- Each page needs a vivid scene that can be illustrated

## Illustration Prompts
For each page, write a detailed illustration prompt that:
- Describes the scene in visual terms (composition, setting, characters, actions)
- Maintains the main character's appearance consistently
- Uses this style prefix: "Soft watercolor children's book illustration, warm pastel colors, rounded friendly characters, gentle lighting, whimsical style"
- Is specific enough to generate a consistent image

## Output Format
Respond with valid JSON matching this exact structure:
{
  "title": "Story title",
  "subtitle": "A short tagline",
  "pages": [
    {
      "pageNumber": 1,
      "text": "The story text for this page...",
      "illustrationPrompt": "Detailed image generation prompt...",
      "illustrationDescription": "Alt text describing the illustration"
    }
  ],
  "characterBibleUpdate": "Brief note about new facts established in this story (new friends met, lessons learned, etc.)"
}`;
}
