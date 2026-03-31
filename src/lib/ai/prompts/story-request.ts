export const STORY_SETTINGS = {
  fantasy_forest: {
    label: "Betoverd Bos",
    labelEn: "Enchanted Forest",
    description: "An enchanted forest with talking animals, magical trees, and hidden paths",
    emoji: "🌳",
  },
  space_adventure: {
    label: "Ruimte-avontuur",
    labelEn: "Space Adventure",
    description: "Outer space with friendly aliens, colorful planets, and rocket ships",
    emoji: "🚀",
  },
  underwater_kingdom: {
    label: "Onderwaterkoninkrijk",
    labelEn: "Underwater Kingdom",
    description: "An underwater world with mermaids, coral castles, and friendly sea creatures",
    emoji: "🐠",
  },
  fairy_tale_castle: {
    label: "Sprookjeskasteel",
    labelEn: "Fairy Tale Castle",
    description: "A magical castle with knights, friendly dragons, and enchanted rooms",
    emoji: "🏰",
  },
  jungle_expedition: {
    label: "Jungle-expeditie",
    labelEn: "Jungle Expedition",
    description: "A lush jungle with exotic animals, treasure maps, and ancient ruins",
    emoji: "🌴",
  },
  snowy_mountain: {
    label: "Besneeuwde Bergen",
    labelEn: "Snowy Mountains",
    description: "Snowy mountains with ice caves, polar bears, and cozy cabins",
    emoji: "🏔️",
  },
  pirate_seas: {
    label: "Piratenzeeën",
    labelEn: "Pirate Seas",
    description: "The open seas with treasure islands, friendly pirates, and sea adventures",
    emoji: "🏴‍☠️",
  },
  dinosaur_land: {
    label: "Dinoland",
    labelEn: "Dinosaur Land",
    description: "A prehistoric world with gentle dinosaurs, volcanoes, and time travel",
    emoji: "🦕",
  },
  future_city: {
    label: "Stad van de Toekomst",
    labelEn: "City of the Future",
    description: "A futuristic city with friendly robots, flying cars, and amazing inventions",
    emoji: "🤖",
  },
  magical_garden: {
    label: "Magische Tuin",
    labelEn: "Magical Garden",
    description: "A magical garden with tiny creatures, giant flowers, and secret pathways",
    emoji: "🌸",
  },
} as const;

export type StorySetting = keyof typeof STORY_SETTINGS;

export const ADVENTURE_TYPES = {
  discovery: { label: "Ontdekking", labelEn: "Discovery", emoji: "🔍" },
  rescue: { label: "Redding", labelEn: "Rescue Mission", emoji: "🦸" },
  celebration: { label: "Feest", labelEn: "Celebration", emoji: "🎉" },
  mystery: { label: "Mysterie", labelEn: "Mystery", emoji: "🔮" },
  friendship: { label: "Vriendschap", labelEn: "Friendship", emoji: "🤝" },
  learning: { label: "Leren", labelEn: "Learning", emoji: "💡" },
} as const;

export type AdventureType = keyof typeof ADVENTURE_TYPES;

export const STORY_MOODS = {
  exciting: { label: "Spannend", labelEn: "Exciting", emoji: "⚡" },
  bedtime: { label: "Slaapverhaaltje", labelEn: "Bedtime / Calm", emoji: "🌙" },
  funny: { label: "Grappig", labelEn: "Funny", emoji: "😄" },
  magical: { label: "Magisch", labelEn: "Magical", emoji: "✨" },
} as const;

export type StoryMood = keyof typeof STORY_MOODS;

export function buildStoryRequestPrompt(params: {
  setting: StorySetting | string;
  adventureType: AdventureType;
  mood: StoryMood;
  companion?: string;
  specialDetail?: string;
}) {
  const { setting, adventureType, mood, companion, specialDetail } = params;

  const settingInfo =
    setting in STORY_SETTINGS
      ? STORY_SETTINGS[setting as StorySetting]
      : { labelEn: setting, description: setting };

  const adventureInfo = ADVENTURE_TYPES[adventureType];
  const moodInfo = STORY_MOODS[mood];

  let prompt = `Write a new story with these parameters:

## Setting
${settingInfo.labelEn}: ${settingInfo.description}

## Adventure Type
${adventureInfo.labelEn}

## Mood
${moodInfo.labelEn}`;

  if (companion) {
    prompt += `\n\n## Companion
The main character is joined by: ${companion}`;
  }

  if (specialDetail) {
    prompt += `\n\n## Special Detail to Include
${specialDetail}`;
  }

  prompt += `\n\nRemember to write the story in English. It will be translated to Dutch afterward.
Make it personal, warm, and age-appropriate. Weave in the child's known interests and details naturally.`;

  return prompt;
}
