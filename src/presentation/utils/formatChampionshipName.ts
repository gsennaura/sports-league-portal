/**
 * Monta o nome de exibição de um campeonato a partir de seus campos separados.
 * Exemplo: "Campeonato Amador" + "1ª divisão" + 2025 → "Campeonato Amador 1ª Divisão 2025"
 */

function capitalizeDivision(division: string): string {
  // "1ª divisão" → "1ª Divisão"
  // Split by spaces to avoid \b mis-firing on accented chars (e.g. "ã" is non-ASCII,
  // so \b fires between "ã" and "o" and would uppercase the "o" in "Divisão").
  return division
    .split(" ")
    .map((word) => (word.length > 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(" ");
}

export function formatChampionshipName(
  name: string,
  division: string | null | undefined,
  year: number,
): string {
  const parts = [name];
  if (division) parts.push(capitalizeDivision(division));
  parts.push(String(year));
  return parts.join(" ");
}

/** Display curto: usa nickname se disponível, senão monta a partir dos campos. */
export function formatChampionshipShort(
  name: string,
  nickname: string | null | undefined,
  division: string | null | undefined,
  year: number,
): string {
  if (nickname) return `${nickname} ${year}`;
  return formatChampionshipName(name, division, year);
}
