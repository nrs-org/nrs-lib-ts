import { HasMeta, Meta } from "../data.ts";
import { Duration } from "../deps.ts";

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
    youtube?: YoutubeSource;
    spotify?: SpotifySource;
    urls?: URLSource[];
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

export type YoutubeSource =
    | YoutubeVideoSource
    | YoutubePlaylistSource
    | YoutubeUserSource;

export interface YoutubeVideoSource extends HasMeta<Meta> {
    video: string;
    from?: Duration;
    to?: Duration;
}

export interface YoutubePlaylistSource extends HasMeta<Meta> {
    playlist: string;
}

export type YoutubeUserSource =
    | {
          channelId: string;
          channelHandle?: string;
      }
    | {
          channelHandle: string;
      };

export type SpotifySource =
    | {
          track: string;
      }
    | {
          album: string;
      }
    | {
          artist: string;
      };

declare module "../data.ts" {
    interface EntryMeta {
        // only present in entry meta
        DAH_additional_sources?: AdditionalSources;
    }
}
