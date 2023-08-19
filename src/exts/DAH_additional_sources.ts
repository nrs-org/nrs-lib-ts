import { HasMeta, Meta } from "../data.ts";

export class DAH_additional_sources {
    constructor(_: ExtConfig_DAH_additional_sources) {}

    dependencies(): string[] {
        return [];
    }
}

export type ExtConfig_DAH_additional_sources = Record<
    string | number | symbol,
    never
>;

export interface AdditionalSources {
    id_MyAnimeList?: number;
    id_AniList?: number;
    id_Kitsu?: number;
    id_AniDB?: number;
    id_VNDB?: number;
    vgmdb?: VGMDBSource;
    urls: URLSource[];
}

export interface VGMDBSource {
    artist?: number;
    album?: number;
    disc?: number;
    track?: number;
    product?: number;
}

export interface URLSource extends HasMeta<Meta> {
    name: string;
    src: string;
}

declare module "../data.ts" {
    interface EntryMeta {
        // only present in entry meta
        DAH_additional_sources?: AdditionalSources;
    }
}
