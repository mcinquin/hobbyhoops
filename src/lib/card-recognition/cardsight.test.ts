import { describe, expect, it } from "vitest";
import {
  maskApiKey,
  parseCardSightResponse,
  parseCardSightSubscription,
} from "@/lib/card-recognition/cardsight";
import { RecognitionError } from "@/lib/card-recognition/errors";

function detection(overrides: Record<string, unknown> = {}) {
  return {
    success: true,
    requestId: "req-1",
    detections: [
      {
        confidence: "High",
        card: {
          id: "11111111-1111-4111-8111-111111111111",
          year: "2023",
          manufacturer: "Panini",
          releaseName: "Prizm Basketball",
          setName: "Base Set",
          name: "Victor Wembanyama",
          number: "136",
          attributes: ["Rookie"],
          ...overrides,
        },
      },
    ],
    processingTime: 250,
  };
}

describe("parseCardSightResponse", () => {
  it("extrait une identification exacte High", () => {
    const result = parseCardSightResponse(detection());
    expect(result).toEqual({
      player: "Victor Wembanyama",
      year: "2023",
      brand: "Panini",
      set: "Prizm Basketball",
      variation: "",
      cardNumber: "136",
      serialTotal: null,
      rookie: true,
      autograph: false,
      memorabilia: false,
      confidence: "high",
      variationUncertain: false,
      warnings: [],
    });
  });

  it("mappe un parallel unique High sans marquer d'incertitude", () => {
    const result = parseCardSightResponse(
      detection({
        parallelSuggestions: [{ name: "Silver Prizm", confidence: "High" }],
      })
    );
    expect(result?.variation).toBe("Silver Prizm");
    expect(result?.variationUncertain).toBe(false);
  });

  it("marque la variation incertaine avec plusieurs parallels", () => {
    const result = parseCardSightResponse(
      detection({
        parallelSuggestions: [
          { name: "Silver Prizm", confidence: "Medium" },
          { name: "Hyper Prizm", confidence: "Low" },
        ],
      })
    );
    expect(result?.variation).toBe("Silver Prizm");
    expect(result?.variationUncertain).toBe(true);
  });

  it("utilise le setName comme variation pour les inserts", () => {
    const result = parseCardSightResponse(
      detection({ setName: "Emergent", parallelSuggestions: undefined })
    );
    expect(result?.variation).toBe("Emergent");
    expect(result?.variationUncertain).toBe(false);
  });

  it("mappe numberedTo, attributs auto/memorabilia et les avertissements", () => {
    const payload = detection({
      numberedTo: 25,
      attributes: ["Autograph", "Patch"],
    });
    (payload as { messages?: unknown }).messages = [
      { type: "warning", message: "Image partially blurred" },
    ];
    const result = parseCardSightResponse(payload);
    expect(result?.serialTotal).toBe(25);
    expect(result?.autograph).toBe(true);
    expect(result?.memorabilia).toBe(true);
    expect(result?.rookie).toBe(false);
    expect(result?.warnings).toEqual(["Image partially blurred"]);
  });

  it("choisit la détection la plus fiable", () => {
    const payload = {
      success: true,
      requestId: "req-2",
      detections: [
        { confidence: "Low", card: { name: "Mauvaise" } },
        { confidence: "High", card: { name: "Bonne", year: "2020" } },
      ],
    };
    const result = parseCardSightResponse(payload);
    expect(result?.player).toBe("Bonne");
    expect(result?.confidence).toBe("high");
  });

  it("renvoie null sans détection ou avec une carte vide", () => {
    expect(
      parseCardSightResponse({ success: true, requestId: "r", detections: [] })
    ).toBeNull();
    expect(
      parseCardSightResponse({
        success: true,
        requestId: "r",
        detections: [{ confidence: "Low", card: {} }],
      })
    ).toBeNull();
  });

  it("rejette une réponse non-objet", () => {
    expect(() => parseCardSightResponse("oops")).toThrow(RecognitionError);
    expect(() => parseCardSightResponse(null)).toThrow(RecognitionError);
  });
});

describe("maskApiKey", () => {
  it("garde les 4 derniers caractères", () => {
    expect(maskApiKey("cs_live_secret_abcd")).toBe("••••abcd");
  });

  it("masque entièrement une clé trop courte", () => {
    expect(maskApiKey("ab")).toBe("••••");
  });

  it("renvoie null pour une chaîne vide", () => {
    expect(maskApiKey("  ")).toBeNull();
  });
});

describe("parseCardSightSubscription", () => {
  it("extrait l'usage et remasque la clé (même si CardSight renvoie le secret en clair)", () => {
    expect(
      parseCardSightSubscription({
        calls: 42,
        api_keys: [{ key: "cs_live_full_secret_key_xyz9", calls: 40 }],
      })
    ).toEqual({
      totalCalls: 42,
      keyMasked: "••••xyz9",
      keyCalls: 40,
    });
  });

  it("tolère une liste de clés vide", () => {
    expect(parseCardSightSubscription({ calls: 0, api_keys: [] })).toEqual({
      totalCalls: 0,
      keyMasked: null,
      keyCalls: null,
    });
  });

  it("rejette une réponse invalide", () => {
    expect(() => parseCardSightSubscription(null)).toThrow(RecognitionError);
    expect(() => parseCardSightSubscription({ api_keys: [] })).toThrow(
      RecognitionError
    );
  });
});
