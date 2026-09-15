// Extraction IA des transcripts d'appels Ringover (scope.md : "piste transcripts
// d'appels + IA... Jérémy le fait déjà sur un autre projet avec Aircall"). Mode
// mock tant que RINGOVER_API_KEY / le provider IA ne sont pas branchés en live -
// même principe adapter mock/live que Cockpit (cf. Cockpit/AGENTS.md §2).
export async function summarizeTranscript(transcript: string): Promise<string> {
  if (!transcript.trim()) return ""

  if (process.env.TRANSCRIPT_IA_MODE !== "live") {
    // Mode mock : troncature simple, pas d'appel API. Le format de sortie
    // (résumé court) reste le même qu'en mode live pour ne pas changer l'UI.
    return transcript.length > 200 ? `${transcript.slice(0, 200)}…` : transcript
  }

  throw new Error(
    "TRANSCRIPT_IA_MODE=live sans provider IA branché - implémenter l'appel au provider choisi ici.",
  )
}
