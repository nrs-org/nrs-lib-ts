// @deno-types="npm:@types/luxon"
import { Duration } from "npm:luxon@3.2.0";
import { Entry } from "../data.ts";
import { Context } from "../process.ts";

export enum EntryStatus {
    Completed = "Completed",
    Watching = "Watching",
    Dropped = "Dropped",
    OnHold = "Temporarily On-Hold",
    Unwatched = "Unwatched",
}

export class DAH_entry_progress {
    config: ExtConfig_DAH_entry_progress;
    constructor(config: ExtConfig_DAH_entry_progress) {
        this.config = config;
    }

    progress(
        _context: Context,
        entry: Entry,
        status: EntryStatus,
        progress: Duration,
        meta: Record<string, unknown> = {}
    ) {
        entry.DAH_meta["DAH_entry_progress"] = {
            status,
            progress: progress.toISO(),
            ...meta,
        };
    }

    animeProgress(
        context: Context,
        entry: Entry,
        status: EntryStatus,
        episodes: number,
        episodeDuration: Duration
    ) {
        this.progress(
            context,
            entry,
            status,
            episodeDuration.mapUnits((x) => x * episodes).normalize(),
            {
                episodes,
            }
        );
    }

    consumedProgress(
        context: Context,
        entry: Entry,
        status: EntryStatus,
        boredom: number,
        duration: Duration
    ) {
        this.progress(context, entry, status, duration);
        context.extensions.DAH_standards!.consumed(
            context,
            new Map([[entry.id, 1.0]]),
            boredom,
            duration
        );
    }

    musicConsumedProgress(context: Context, entry: Entry, duration: Duration) {
        this.consumedProgress(
            context,
            entry,
            EntryStatus.Completed,
            1.0,
            duration
        );
    }

    animeConsumedProgress(
        context: Context,
        entry: Entry,
        status: EntryStatus,
        episodes: number,
        episodeDuration: Duration
    ) {
        this.animeProgress(context, entry, status, episodes, episodeDuration);
        context.extensions.DAH_standards!.animeConsumed(
            context,
            new Map([[entry.id, 1.0]]),
            1.0,
            episodes,
            episodeDuration
        );
    }
}

export type ExtConfig_DAH_entry_progress = Record<
    string | number | symbol,
    never
>;
