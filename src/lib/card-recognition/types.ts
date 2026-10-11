export const RECOGNITION_CONFIDENCES = ["high", "medium", "low"] as const;
export type RecognitionConfidence = (typeof RECOGNITION_CONFIDENCES)[number];

/**
 * Résultat de reconnaissance normalisé, indépendant du fournisseur
 * (CardSight aujourd'hui, remplaçable par Ximilar/CardVault/LLM demain).
 * Champs texte vides ("") quand le fournisseur n'a rien renvoyé.
 */
export interface RecognizedCard {
  player: string;
  year: string;
  brand: string;
  set: string;
  variation: string;
  cardNumber: string;
  /** Tirage pour les cartes numérotées (ex. 25 pour une /25). */
  serialTotal: number | null;
  rookie: boolean;
  autograph: boolean;
  memorabilia: boolean;
  confidence: RecognitionConfidence;
  /** true quand la variation vient d'une suggestion incertaine (beta / plusieurs candidats). */
  variationUncertain: boolean;
  /** Avertissements du fournisseur (ex. qualité d'image insuffisante). */
  warnings: string[];
}

/**
 * Suggestion prête pour le formulaire : valeurs rapprochées des références
 * existantes quand une correspondance exacte (insensible casse/accents) existe.
 */
export interface CardRecognitionSuggestion extends RecognizedCard {
  /** Champ par champ : true si la valeur correspond à une référence connue. */
  matched: {
    player: boolean;
    year: boolean;
    brand: boolean;
    set: boolean;
    variation: boolean;
  };
}

export interface RecognizeApiResponse {
  suggestion: CardRecognitionSuggestion | null;
  warnings: string[];
}

/** État du compte CardSight pour l’admin (sans secrets en clair). */
export interface AdminCardSightStatus {
  configured: boolean;
  monthlyQuota: number;
  usage: {
    totalCalls: number;
    keyMasked: string | null;
    keyCalls: number | null;
    remaining: number;
  } | null;
  /** Présent quand l’appel CardSight a échoué (clé invalide, réseau…). */
  errorCode: "auth" | "quota" | "network" | null;
}
