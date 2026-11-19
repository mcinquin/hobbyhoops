/**
 * Public database API. Implementation is split by domain in this folder;
 * import from `@/lib/db` rather than from the individual modules.
 */
import "server-only";

export {
  EXPECTED_SCHEMA_VERSION,
} from "./schema";
export {
  readDatabaseSchemaVersion,
  readDatabaseFileMeta,
  readAuthSiteCounts,
  getDb,
  createDatabaseBackupFile,
  getDatabaseHealth,
} from "./connection";
export {
  queryCardsPage,
  queryAllCards,
  countCards,
  readCardById,
  readPlayerPageSummary,
  readPlayerCardGroups,
  getNextCardId,
  insertCard,
  updateCard,
  deleteCard,
  readCollectionStats,
  readLeagueCounts,
  readCardCountsByBrand,
  readCardCountsByYear,
  readCardCountsBySet,
  readAcquisitionTimeline,
  readDuplicateGroupRows,
  readCardsByIds,
  readTopPlayerCounts,
  readRecentCards,
  readPlayerSummaries,
} from "./cards";
export {
  insertWantedEntry,
  deleteWantedEntry,
  readWantedBlocks,
  readWantedEntryById,
  readFrNbaPlayers,
  insertFrNbaPlayer,
  updateFrNbaPlayer,
} from "./guides";
export {
  readReferencesState,
  writeReferencesState,
} from "./references";
export {
  readShipments,
  readShipmentById,
  insertShipment,
  updateShipment,
  deleteShipment,
} from "./shipments";
