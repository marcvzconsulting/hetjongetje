/**
 * Normaliseer een (kind/huisdier/vriend)naam: trim, dubbele spaties
 * weg, en elke woordcomponent een hoofdletter geven. Werkt voor
 * enkelvoudige namen, dubbele namen ("Mia Sofia") én streepjes
 * ("Jan-Willem").
 *
 * Bewust simpel — geen rekening met voorvoegsels als "van der", want
 * dit gaat om voornamen.
 */
export function normalizeChildName(input: string): string {
  return input
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((part) =>
      part
        .split("-")
        .map((seg) =>
          seg.length === 0
            ? seg
            : seg[0].toLocaleUpperCase("nl-NL") + seg.slice(1).toLocaleLowerCase("nl-NL"),
        )
        .join("-"),
    )
    .join(" ");
}

/** Pas normalizeChildName toe op een lijst objecten met een `name`-veld. */
export function normalizeNamesIn<T extends { name?: unknown }>(
  list: unknown,
): T[] | undefined {
  if (!Array.isArray(list)) return undefined;
  return list.map((item) => {
    if (item && typeof item === "object" && "name" in item && typeof (item as { name: unknown }).name === "string") {
      return { ...item, name: normalizeChildName((item as { name: string }).name) };
    }
    return item;
  }) as T[];
}

