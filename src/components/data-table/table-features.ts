import {
  columnFilteringFeature,
  columnVisibilityFeature,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFns,
  rowPaginationFeature,
  rowSortingFeature,
  sortFns,
  tableFeatures,
} from "@tanstack/react-table";

/**
 * Jeu de features pour les tables interactives (tri, pagination et filtrage
 * côté client) — utilisé par les tableaux des guides.
 */
export const interactiveTableFeatures = tableFeatures({
  rowSortingFeature,
  rowPaginationFeature,
  columnFilteringFeature,
  columnVisibilityFeature,
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  filteredRowModel: createFilteredRowModel(),
  // En v9 les fonctions de tri/filtre intégrées ne sont plus auto-enregistrées :
  // il faut fournir les registres pour que les identifiants comme "text" ou
  // "alphanumeric" (choisis automatiquement) soient résolus.
  sortFns,
  filterFns,
});

export type InteractiveTableFeatures = typeof interactiveTableFeatures;

/**
 * Jeu minimal pour les tables paginées/triées côté serveur (collection) :
 * seule la visibilité des colonnes est requise pour `row.getVisibleCells()`.
 */
export const serverTableFeatures = tableFeatures({
  columnVisibilityFeature,
});

export type ServerTableFeatures = typeof serverTableFeatures;
