// import { pgTable, varchar, bigint, text } from "drizzle-orm/pg-core";

// export const cursorTable = pgTable("cursor_table", {
//   id: text("id").primaryKey(),
//   endCursor: bigint("end_cursor", { mode: "number" }).notNull(),
// });

// export const collections = pgTable("collections", {
//   id: varchar("id", { length: 255 }).primaryKey(), // collectionId
//   creator: varchar("creator", { length: 255 }).notNull(),
//   metadataUri: text("metadata_uri"),
//   createdAtBlock: bigint("created_at_block", { mode: "number" }).notNull(),
// });

// export const assets = pgTable("assets", {
//   id: varchar("id", { length: 255 }).primaryKey(), // tokenId
//   collectionId: varchar("collection_id", { length: 255 })
//     .references(() => collections.id)
//     .notNull(),
//   owner: varchar("owner", { length: 255 }).notNull(),
//   tokenUri: text("token_uri"),
//   mintedAtBlock: bigint("minted_at_block", { mode: "number" }).notNull(),
// });

// export const transfers = pgTable("transfers", {
//   id: varchar("id", { length: 255 }).primaryKey(),
//   tokenId: varchar("token_id", { length: 255 })
//     .references(() => assets.id)
//     .notNull(),
//   from: varchar("from", { length: 255 }).notNull(),
//   to: varchar("to", { length: 255 }).notNull(),
//   block: bigint("block", { mode: "number" }).notNull(),
// });

import { pgTable, varchar, bigint, text } from "drizzle-orm/pg-core";

export const cursorTable = pgTable("cursor_table", {
  id: text("id").primaryKey(), // "nft_sepolia", "mip_sepolia", etc.
  endCursor: bigint("end_cursor", { mode: "number" }).notNull(),
});

export const collections = pgTable("collections", {
  id: varchar("id", { length: 255 }).primaryKey(), // collectionId
  creator: varchar("creator", { length: 255 }).notNull(),
  metadataUri: text("metadata_uri"),
  createdAtBlock: bigint("created_at_block", { mode: "number" }).notNull(),
  // Add indexer source to distinguish between nft and mip contracts
  indexerSource: varchar("indexer_source", { length: 50 }).notNull(), // "medialano-dapp", "medialano-mip"
});

export const assets = pgTable("assets", {
  id: varchar("id", { length: 255 }).primaryKey(), // tokenId
  collectionId: varchar("collection_id", { length: 255 })
    .references(() => collections.id)
    .notNull(),
  owner: varchar("owner", { length: 255 }).notNull(),
  tokenUri: text("token_uri"),
  mintedAtBlock: bigint("minted_at_block", { mode: "number" }).notNull(),
  // Add indexer source
  indexerSource: varchar("indexer_source", { length: 50 }).notNull(), // "medialano-dapp", "medialano-mip"
});

export const transfers = pgTable("transfers", {
  id: varchar("id", { length: 255 }).primaryKey(),
  tokenId: varchar("token_id", { length: 255 })
    .references(() => assets.id)
    .notNull(),
  from: varchar("from", { length: 255 }).notNull(),
  to: varchar("to", { length: 255 }).notNull(),
  block: bigint("block", { mode: "number" }).notNull(),
  // Add indexer source
  indexerSource: varchar("indexer_source", { length: 50 }).notNull(), // "medialano-dapp", "medialano-mip"
});

// Optional: Define indexer sources as constants
export const INDEXER_SOURCES = {
  "MEDIALANO-DAPP": "MEDIALANO-DAPP",
  "MEDIALANO-MIPP": "MEDIALANO-MIPP",
} as const;

export type IndexerSource = typeof INDEXER_SOURCES[keyof typeof INDEXER_SOURCES];