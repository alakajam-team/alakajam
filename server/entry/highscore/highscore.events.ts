import { BookshelfModel } from "bookshelf";
import { EventEmitter2 } from "eventemitter2";

const eventEmitter = new EventEmitter2();

export interface EntryRankingChangeOptions {
  updateTournamentIfClosed?: boolean;
  triggeringUserId?: number;
  triggeringEntryScore?: BookshelfModel;
}

export async function fireEntryRankingChange(entry: BookshelfModel,
  impactedEntryScores: BookshelfModel[], options: EntryRankingChangeOptions): Promise<void> {
  await eventEmitter.emitAsync("entry_ranking_change", entry, impactedEntryScores, options);
}

export function onEntryRankingChange(callback: (entry: BookshelfModel,
  impactedEntryScores: BookshelfModel[], options: EntryRankingChangeOptions) => Promise<void>): void {
  eventEmitter.addListener("entry_ranking_change", callback);
}
