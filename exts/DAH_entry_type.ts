import {} from "../mod.ts";

export class DAH_entry_type {
    constructor(_: ExtConfig_DAH_entry_type) {}

    dependencies(): string[] {
        return [];
    }
}
export type ExtConfig_DAH_entry_type = Record<string | number | symbol, never>;

export type EntryType = NonStandardEntryType | StandardEntryType;
export type NonStandardEntryType = "Other" | `Other:${string}`;
export enum StandardEntryType {
    Anime = "Anime",
    Manga = "Manga",
    LightNovel = "LightNovel",
    LightNovelGeneric = "LightNovelGeneric",
    VisualNovel = "VisualNovel",
    MusicGeneric = "MusicGeneric",
    MusicAlbum = "MusicAlbum",
    MusicArtist = "MusicArtist",
    MusicTrack = "MusicTrack",
    MusicAlbumTrack = "MusicAlbumTrack",
    Franchise = "Franchise",
    Game = "Game",
}

declare module "../mod.ts" {
    interface EntryMeta {
        // only present in entry meta
        DAH_entry_type: string | undefined;
    }
}
