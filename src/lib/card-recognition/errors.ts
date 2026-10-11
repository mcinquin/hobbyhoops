export type RecognitionErrorCode =
  /** CARDSIGHT_API_KEY absente de l'environnement. */
  | "unconfigured"
  /** Clé API refusée par le fournisseur (401/403). */
  | "auth"
  /** Limite de débit ou quota mensuel atteint (429/402). */
  | "quota"
  /** Le fournisseur n'a pas répondu à temps. */
  | "timeout"
  /** Erreur réseau ou HTTP inattendue. */
  | "network"
  /** Réponse illisible. */
  | "parse";

export class RecognitionError extends Error {
  constructor(
    public readonly code: RecognitionErrorCode,
    message: string
  ) {
    super(message);
    this.name = "RecognitionError";
  }
}
