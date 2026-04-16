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

export const OCCASIONS = {
  none: { label: "Geen", labelEn: "", description: "", emoji: "" },
  birthday: { label: "Verjaardag", labelEn: "Birthday", description: "A birthday celebration with cake, presents, balloons, and a party", emoji: "🎂" },
  christmas: { label: "Kerst", labelEn: "Christmas", description: "Christmas with snow, a decorated tree, Santa Claus, reindeer, and presents", emoji: "🎄" },
  sinterklaas: { label: "Sinterklaas", labelEn: "Sinterklaas (Dutch holiday)", description: "The Dutch Sinterklaas with his steamboat from Spain, pieten helpers, pepernoten, shoes by the fireplace, and surprises", emoji: "🎅" },
  easter: { label: "Pasen", labelEn: "Easter", description: "Easter with the Easter bunny, hidden colorful eggs, baby chicks, and chocolate", emoji: "🐣" },
  new_years: { label: "Oud & Nieuw", labelEn: "New Year's Eve", description: "New Year's Eve with fireworks, confetti, counting down, and wishes", emoji: "🎆" },
  mothers_day: { label: "Moederdag", labelEn: "Mother's Day", description: "A Mother's Day celebration with love, flowers, breakfast in bed, and handmade gifts", emoji: "💐" },
  fathers_day: { label: "Vaderdag", labelEn: "Father's Day", description: "A Father's Day celebration with love, adventures together, and special surprises for dad", emoji: "👔" },
  valentines: { label: "Valentijnsdag", labelEn: "Valentine's Day", description: "Valentine's Day with hearts, friendship, love letters, and kindness", emoji: "💌" },
  kings_day: { label: "Koningsdag", labelEn: "King's Day (Dutch holiday)", description: "Dutch King's Day with orange clothes, flea markets, canal boats, and outdoor festivities", emoji: "🧡" },
  sint_maarten: { label: "Sint Maarten", labelEn: "Sint Maarten (Dutch lantern festival)", description: "Sint Maarten lantern festival, walking door-to-door with handmade lanterns singing songs for candy and treats", emoji: "🏮" },
  three_kings: { label: "Drie Koningen", labelEn: "Three Kings / Epiphany", description: "Three Kings Day with the three wise men, a star to follow, and singing door-to-door", emoji: "⭐" },
  sugar_feast: { label: "Suikerfeest", labelEn: "Eid al-Fitr (Sugar Feast)", description: "Eid al-Fitr celebration with family gatherings, delicious sweets, new clothes, and sharing with others", emoji: "🌙" },
  hanukkah: { label: "Chanoeka", labelEn: "Hanukkah", description: "Hanukkah with the menorah, dreidel games, latkes, and eight nights of light", emoji: "🕎" },
  carnival: { label: "Carnaval", labelEn: "Carnival", description: "Carnival celebration with colorful costumes, masks, music, parades, and dancing", emoji: "🎭" },
  animal_day: { label: "Dierendag", labelEn: "World Animal Day", description: "World Animal Day celebrating and caring for animals, visiting a shelter, and learning about nature", emoji: "🐾" },
} as const;

export type Occasion = keyof typeof OCCASIONS;

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
