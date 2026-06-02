/** ID da liga exibida neste portal — configurado via VITE_LEAGUE_ID. */
export const LEAGUE_ID: string = import.meta.env.VITE_LEAGUE_ID ?? "";

if (!LEAGUE_ID) {
  console.warn(
    "[sports-league-portal] VITE_LEAGUE_ID não definido. " +
    "Copie .env.example para .env e configure o ID da liga."
  );
}
