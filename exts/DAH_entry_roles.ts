import { Context, mapAddAssign } from "../mod.ts";
import { Data } from "../mod.ts";
import {
    DiagonalMatrix,
    Entry,
    Id,
    identityMatrix,
    Impact,
    Matrix,
    Relation,
    ScalarMatrix,
} from "../mod.ts";
import { DAH_entry_contains } from "./DAH_entry_contains.ts";
import { AL, AM, AV, factorScores } from "./DAH_factors.ts";

export class DAH_entry_roles {
    config: ExtConfig_DAH_entry_roles;
    constructor(config: ExtConfig_DAH_entry_roles) {
        this.config = config;
    }

    dependencies(): string[] {
        return ["DAH_factors", "DAH_entry_contains"];
    }

    DAH_entry_contains(context: Context): DAH_entry_contains {
        return context.extensions.DAH_entry_contains!;
    }

    addRole(
        object: Entry | Impact | Relation,
        entryId: Id,
        roles: Iterable<EntryRole>,
    ) {
        let entryRoles = object.DAH_meta.DAH_entry_roles;
        if (entryRoles === undefined) {
            entryRoles = {
                roles: {},
            };
            object.DAH_meta.DAH_entry_roles = entryRoles;
        }

        const thisEntryRoles = (entryRoles.roles[entryId] ??= []);

        for (const role of roles) {
            const atomicRoles = this.#expandToAtomicRoles(role);

            const existingRolesMap = new Map<
                AtomicRoleType,
                EntryRole<AtomicRoleType>
            >();
            for (const role of thisEntryRoles) {
                existingRolesMap.set(role.roleType, role);
            }

            for (const role of atomicRoles) {
                const type = role.roleType;
                const existingRole = existingRolesMap.get(type);
                if (existingRole === undefined) {
                    // this relies on the fact that `expandToAtomicRoles` yields
                    // distinct-typed `EntryRole<AtomicRoleType>`s
                    thisEntryRoles.push(role);
                } else {
                    existingRole.multiplyFactor += role.multiplyFactor;
                    existingRole.expressionString += "+" +
                        role.expressionString;
                }
            }
        }
    }

    preprocessData(context: Context, data: Data) {
        const relations = this.preprocessEntries(context, data.entries);
        this.preprocessIRs(data.impacts);
        this.preprocessIRs(data.relations);
        data.relations.push(...relations);
    }

    preprocessEntries(context: Context, entries: Map<Id, Entry>): Relation[] {
        const relations: Relation[] = [];
        for (const [id, entry] of entries.entries()) {
            const roles = entry.DAH_meta.DAH_entry_roles;
            if (roles === undefined) {
                continue;
            }

            const factors = this.#calculateFactors(entry, roles);
            relations.push(
                this.DAH_entry_contains(context).entryContains(
                    context,
                    factors,
                    id,
                ),
            );
        }
        return relations;
    }

    preprocessIRs(irs: Iterable<Impact | Relation>) {
        for (const ir of irs) {
            const roles = ir.DAH_meta.DAH_entry_roles;
            if (roles === undefined) {
                continue;
            }

            const factors = this.#calculateFactors(ir, roles);
            for (const [id, weight] of factors.entries()) {
                mapAddAssign(ir.contributors, id, weight);
            }
        }
    }

    #parseRoleComponent(str: string): EntryRole {
        // e.g. string: image*2*2/3.0

        // split the roletype part
        const roleTypeLength = indexOfOpChar(str) ?? str.length;
        const roleType = str.substring(0, roleTypeLength) as RoleType;
        if (RoleTypes[roleType] === undefined) {
            throw new Error(`invalid role type: ${roleType}`);
        }

        let multiplyFactor = 1.0;
        let i = roleTypeLength;
        while (i < str.length) {
            const opChar = str[i];
            if (opChar !== "*" && opChar !== "/") {
                throw new Error("invalid operation");
            }

            const end = indexOfOpChar(str, i + 1) ?? str.length;
            let factor = parseFloat(str.substring(i + 1, end));
            if (opChar === "/") {
                factor = 1.0 / factor;
            }

            multiplyFactor *= factor;
            i = end;
        }

        return {
            roleType,
            factor: new ScalarMatrix(NaN),
            multiplyFactor,
            expressionString: str,
        };
    }

    parseRoleExpressionString(str: string): EntryRole[] {
        return str.split("+").map(this.#parseRoleComponent);
    }

    #expandToAtomicRoles(role: EntryRole): EntryRole<AtomicRoleType>[] {
        return this.getComposingAtomicRoleTypes(role.roleType).map(
            (roleType) => {
                return {
                    ...role,
                    roleType,
                };
            },
        );
    }

    #calculateFactors(
        entry: Entry | Impact | Relation,
        roles: EntryRoles<AtomicRoleType>,
    ): Map<Id, Matrix> {
        const atomicRoles = new Set<AtomicRoleType>(
            Object.values(roles.roles)
                .flat()
                .map((role) => role.roleType),
        );

        const musicVars = {
            ...defaultMusicVars(
                atomicRoles,
                "contributors" in entry ? undefined : entry,
            ),
            ...this.config.defaultMusicVars,
            ...roles.musicVars,
        };

        const cache = new Map<RoleType, Matrix>();
        const result = new Map<Id, Matrix>();

        const calcRoleFactor = (roleType: RoleType): Matrix => {
            if (cache.has(roleType)) {
                return cache.get(roleType)!;
            }

            const roleCalcFn = this.isAtomicRoleType(roleType)
                ? AtomicRoleTypes[roleType]
                : CompositeRoleTypes[roleType].calcFactor;

            const result = roleCalcFn(calcRoleFactor, musicVars);
            cache.set(roleType, result);
            return result;
        };

        for (const [id, entryRoles] of Object.entries(roles.roles)) {
            let total: Matrix = new ScalarMatrix(0.0);

            for (const role of entryRoles) {
                role.factor = calcRoleFactor(role.roleType).scale(
                    role.multiplyFactor,
                );
                total = total.add(role.factor);
            }

            result.set(id, total);
        }

        return result;
    }

    getComposingAtomicRoleTypes(role: RoleType): AtomicRoleType[] {
        return getComposingAtomicRoleTypes(role);
    }

    isAtomicRoleType(role: RoleType): role is AtomicRoleType {
        return isAtomicRoleType(role);
    }
}

export type AtomicRoleType =
    | "total"
    | "compose"
    | "arrange"
    | "image"
    | "image_feat"
    | "vocal"
    | "lyrics"
    | "inst_perform"
    | "mv"
    | "albumart";
export type CompositeRoleType =
    | "music_total"
    | "image_total"
    | "prod"
    | "perform"
    | "vocal_lyrics"
    | "inst"
    | "inst_total";

export type RoleType = AtomicRoleType | CompositeRoleType;

export type ExtConfig_DAH_entry_roles = {
    defaultMusicVars?: MusicVars;
};
export type EntryRoles<T = RoleType> = {
    roles: Record<Id, EntryRole<T>[]>;
    musicVars?: MusicVars;
};

export type EntryRole<T = RoleType> = {
    roleType: T;
    factor: Matrix;
    multiplyFactor: number;
    expressionString: string;
};

export interface MusicVars {
    // how much vocal_lyrics compared to instrumental
    // e.g. some pop idol song: 0.5 (default)
    //      weird ass electronic song with like 3 lines from nayuta: 0.1-0.3 idk
    vocallyrics?: number;
    // how much the lyrics blend with the music
    // e.g. vietnamese song (tonal language): 0.3-0.4
    //      japanese, us-uk, etc.: 0.1 (default)
    lyricsmusic?: number;
    // how emotional is the lyrics
    // e.g. suisei hoshizora dori nite (no one care about the
    //      original meaning, they only care about himeno sena): 0-0.1
    //      azuring the reunion, akm: 0.2 (default)
    emolyrics?: number;
    // how much arranging work wrt composing work
    // e.g. vtuber cover with redshift mix (arrangement in this case): 0.2
    //      generic rst idolshit song: 0.5 (default)
    //      sukinano song: 0.5-0.7 (nanou ily but the sukinano arrangers are so fucking goated)
    arrange?: number;
    // true if there is featured artist (feat. stuff), default is false
    // self-explanatory af but here's examples
    // e.g. dbnguhoc - man i love koseki (feat. nayuta): true
    //      fins - con luu: false
    feat?: boolean;
}

function isAtomicRoleType(role: RoleType): role is AtomicRoleType {
    return AtomicRoleTypes[role as AtomicRoleType] !== undefined;
}

function getComposingAtomicRoleTypes(role: RoleType): AtomicRoleType[] {
    return isAtomicRoleType(role) ? [role] : CompositeRoleTypes[role].children;
}

function defaultMusicVars(
    roles: Set<AtomicRoleType>,
    entry?: Entry,
): Required<MusicVars> {
    const title = entry?.DAH_meta.DAH_entry_title ?? "";
    const titleHasFeat = title.includes("feat.") || title.includes("ft.");
    return {
        vocallyrics: 0.5,
        lyricsmusic: 0.1,
        emolyrics: 0.2,
        arrange: 0.5,
        feat: roles.has("image_feat") || titleHasFeat,
    };
}

type CalcFactorHelperFn = (role: RoleType) => Matrix;
type CalcFactorFn = (
    factor: CalcFactorHelperFn,
    vars: Required<MusicVars>,
) => Matrix;

function AMMatrix(factor: number): DiagonalMatrix {
    const matrix = new DiagonalMatrix(
        new Array<number>(factorScores.length).fill(0),
    );
    matrix.data[AM.factorIndex] = factor;
    return matrix;
}

function ALMatrix(factor: number): DiagonalMatrix {
    const matrix = new DiagonalMatrix(
        new Array<number>(factorScores.length).fill(0),
    );
    matrix.data[AL.factorIndex] = factor;
    return matrix;
}

interface CompositeRoleTypeObject {
    children: AtomicRoleType[];
    calcFactor: CalcFactorFn;
}

interface CompositeRoleTypeObjectInit {
    children: RoleType[];
    calcFactor?: CalcFactorFn;
}

type AtomicRoleTypeObject = CalcFactorFn;

function composite(
    children: RoleType[],
    calcFactor?: CalcFactorFn,
): CompositeRoleTypeObjectInit {
    return {
        children,
        calcFactor,
    };
}

function initComposite(
    obj: Record<CompositeRoleType, CompositeRoleTypeObjectInit>,
): Record<CompositeRoleType, CompositeRoleTypeObject> {
    const partial = {} as Partial<
        Record<CompositeRoleType, CompositeRoleTypeObject>
    >;

    const recursive = (type: CompositeRoleType): AtomicRoleType[] => {
        if (partial[type] !== undefined) {
            return partial[type]!.children;
        }

        const expandedChildren = obj[type].children.flatMap((role) => {
            if (isAtomicRoleType(role)) {
                return [role];
            }

            const obj = partial[role];
            if (obj !== undefined) {
                return obj.children;
            }

            return recursive(role);
        });

        const calcFactor = obj[type].calcFactor ??
            ((factor) =>
                expandedChildren
                    .map(factor)
                    .reduce((a, b) => a.add(b), new ScalarMatrix(0.0)));

        partial[type] = {
            calcFactor,
            children: expandedChildren,
        };
        return expandedChildren;
    };

    for (const key in obj) {
        recursive(key as CompositeRoleType);
    }

    return partial as Required<typeof partial>;
}

const AtomicRoleTypes: Record<AtomicRoleType, AtomicRoleTypeObject> = {
    total: () => identityMatrix,
    arrange: (factor, vars) =>
        factor("inst_total").scale((vars.arrange * 2) / 3),
    compose: (factor) => factor("inst_total").add(factor("arrange").scale(-1)),
    inst_perform: (factor) => factor("inst_total").scale(1 / 3),
    image: (factor, vars) => factor("image_total").scale(vars.feat ? 0.7 : 1.0),
    image_feat: (factor) =>
        factor("image_total").add(factor("image").scale(-1)),
    vocal: (factor) => factor("vocal_lyrics").add(factor("lyrics").scale(-1)),
    lyrics: (factor, vars) =>
        factor("vocal_lyrics").mul(
            identityMatrix
                .scale(vars.emolyrics)
                .add(ALMatrix(1.0 - vars.emolyrics)) // set AL to 1.0
                .add(AMMatrix(vars.lyricsmusic - vars.emolyrics)), // set AM to vars.lyricsmusic
        ),
    mv: () => DiagonalMatrix.fromFactors([[AV, 1.0]]),
    albumart: () => DiagonalMatrix.fromFactors([[AV, 1.0]]),
};

// inst: C8/3A8/3IP8/3I2:
// vocal: C4/3A4/3IP4/3V4I2:L10

const CompositeRoleTypes = initComposite({
    music_total: composite(
        ["prod", "perform", "image_total"],
        (factor) => factor("total"),
    ),
    image_total: composite(
        ["image", "image_feat"],
        (factor) => factor("music_total").scale(0.2),
    ),
    vocal_lyrics: composite(
        ["vocal", "lyrics"],
        (factor, vars) =>
            factor("music_total")
                .add(factor("image_total").scale(-1))
                .mul(
                    new ScalarMatrix(vars.vocallyrics).add(
                        ALMatrix(1.0 - vars.vocallyrics),
                    ),
                ),
    ),
    inst_total: composite(
        ["inst", "inst_perform"],
        (factor) =>
            factor("music_total")
                .add(factor("image_total").scale(-1))
                .add(factor("vocal_lyrics").scale(-1)),
    ),
    inst: composite(["compose", "arrange"]),
    perform: composite(["inst_perform", "vocal"]),
    prod: composite(["inst", "lyrics"]),
});

const RoleTypes = {
    ...AtomicRoleTypes,
    ...CompositeRoleTypes,
} as const;

function indexOfOpChar(str: string, pos = 0): number | undefined {
    for (let i = pos; i < str.length; ++i) {
        if (str[i] === "*" || str[i] === "/") {
            return i;
        }
    }

    return undefined;
}

declare module "../mod.ts" {
    interface EntryMeta {
        DAH_entry_roles?: EntryRoles<AtomicRoleType>;
    }

    interface ImpactMeta {
        DAH_entry_roles?: EntryRoles<AtomicRoleType>;
    }

    interface RelationMeta {
        DAH_entry_roles?: EntryRoles<AtomicRoleType>;
    }
}
