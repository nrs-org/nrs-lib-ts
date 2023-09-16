import {
    DiagonalMatrix,
    Entry,
    Id,
    Impact,
    Matrix,
    Relation,
    ScalarMatrix,
    identityMatrix,
    mapAddAssign,
} from "../mod.ts";
import { AM, AV, AL, factorScores } from "./DAH_factors.ts";

export class DAH_entry_roles {
    constructor(_: ExtConfig_DAH_entry_roles) {}

    dependencies(): string[] {
        return ["DAH_factors"];
    }

    addRole(
        object: Entry | Impact | Relation,
        entryId: Id,
        roles: Iterable<EntryRole>,
    ) {
        let roleObject = object.DAH_meta.DAH_entry_roles?.roles;
        if (roleObject === undefined) {
            object.DAH_meta.DAH_entry_roles ??= { roles: {} };
            roleObject = {};
            object.DAH_meta.DAH_entry_roles.roles ??= roleObject;
        }

        for (const role of roles) {
            const atomicRoles = expandToAtomicRoles(role);

            const existingRolesMap = new Map<
                AtomicRoleType,
                EntryRole<AtomicRoleType>
            >();
            for (const role of roleObject[entryId] ?? []) {
                existingRolesMap.set(role.roleType, role);
            }

            for (const role of atomicRoles) {
                const type = role.roleType;
                const existingRole = existingRolesMap.get(type);
                if (existingRole === undefined) {
                    // this relies on the fact that `expandToAtomicRoles` yields
                    // distinct-typed `EntryRole<AtomicRoleType>`s
                    roleObject[entryId].push(role);
                } else {
                    existingRole.multiplyFactor += role.multiplyFactor;
                    existingRole.expressionString +=
                        "+" + role.expressionString;
                }
            }
        }
    }

    preprocessEntries(entries: Map<Id, Entry>) {
        for (const [id, entry] of entries.entries()) {
            const roles = entry.DAH_meta.DAH_entry_roles;
            if (roles === undefined) {
                continue;
            }

            const factors = calculateFactors(roles);
            for (const [parent, weight] of factors.entries()) {
                const children = entries.get(parent)?.children;
                if (children === undefined) {
                    continue;
                }

                mapAddAssign(children, id, weight);
            }
        }
    }

    preprocessIRs(irs: Iterable<Impact | Relation>) {
        for (const ir of irs) {
            const roles = ir.DAH_meta.DAH_entry_roles;
            if (roles === undefined) {
                continue;
            }

            const factors = calculateFactors(roles);
            for (const [id, weight] of factors.entries()) {
                mapAddAssign(ir.contributors, id, weight);
            }
        }
    }
}

export type ExtConfig_DAH_entry_roles = Record<string | number | symbol, never>;
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
    // how much vocal-lyrics compared to instrumental
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

export function defaultMusicVars(
    roles: Set<AtomicRoleType>,
): Required<MusicVars> {
    return {
        vocallyrics: 0.5,
        lyricsmusic: 0.1,
        emolyrics: 0.2,
        arrange: 0.5,
        feat: roles.has("image-feat"),
    };
}

type AtomicRoleType =
    | "total"
    | "compose"
    | "arrange"
    | "image"
    | "image-feat"
    | "vocal"
    | "lyrics"
    | "inst-perform"
    | "mv"
    | "albumart";
type CompositeRoleType =
    | "music-total"
    | "image-total"
    | "prod"
    | "perform"
    | "vocal-lyrics"
    | "inst"
    | "inst-total";
type RoleType = AtomicRoleType | CompositeRoleType;
type CalcFactorHelperFn = (role: RoleType) => Matrix;
type CalcFactorFn = (
    factor: CalcFactorHelperFn,
    vars: Required<MusicVars>,
) => Matrix;

function AMMatrix(factor: number): DiagonalMatrix {
    const matrix = new DiagonalMatrix(new Array<number>(factorScores.length));
    matrix.data[AM.factorIndex] = factor;
    return matrix;
}

function ALMatrix(factor: number): DiagonalMatrix {
    const matrix = new DiagonalMatrix(new Array<number>(factorScores.length));
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

function isAtomicRoleType(role: RoleType): role is AtomicRoleType {
    return AtomicRoleTypes[role as AtomicRoleType] !== undefined;
}

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

    function recursive(type: CompositeRoleType): AtomicRoleType[] {
        if (partial[type] !== undefined) {
            return partial[type]!.children;
        }

        const expandedChildren = obj[type].children.flatMap(
            getComposingAtomicRoleTypes,
        );

        partial[type] = {
            calcFactor:
                obj[type].calcFactor ??
                ((factor) =>
                    expandedChildren
                        .map(factor)
                        .reduce((a, b) => a.add(b), new ScalarMatrix(0.0))),
            children: expandedChildren,
        };
        return expandedChildren;
    }

    for (const key in obj) {
        recursive(key as CompositeRoleType);
    }

    return partial as Required<typeof partial>;
}

export const AtomicRoleTypes: Record<AtomicRoleType, AtomicRoleTypeObject> = {
    total: () => identityMatrix,
    arrange: (factor, vars) =>
        factor("inst-total").scale((vars.arrange * 2) / 3),
    compose: (factor) => factor("inst-total").add(factor("compose").scale(-1)),
    "inst-perform": (factor) => factor("inst-total").scale(1 / 3),
    image: (factor, vars) => factor("image-total").scale(vars.feat ? 0.7 : 1.0),
    "image-feat": (factor) =>
        factor("image-total").add(factor("image").scale(-1)),
    vocal: (factor) => factor("vocal-lyrics").add(factor("lyrics").scale(-1)),
    lyrics: (factor, vars) =>
        factor("vocal-lyrics").mul(
            identityMatrix
                .scale(vars.emolyrics)
                .add(AMMatrix(vars.lyricsmusic - vars.emolyrics)), // set AM to vars.lyricsmusic
        ),
    mv: () => DiagonalMatrix.fromFactors([[AV, 1.0]]),
    albumart: () => DiagonalMatrix.fromFactors([[AV, 1.0]]),
};

// inst: C8/3A8/3IP8/3I2:
// vocal: C4/3A4/3IP4/3V4I2:L10

export const CompositeRoleTypes = initComposite({
    "music-total": composite(["prod", "perform", "image-total"], (factor) =>
        factor("total"),
    ),
    "image-total": composite(["image", "image-feat"], (factor) =>
        factor("music-total").scale(0.2),
    ),
    "vocal-lyrics": composite(["vocal", "lyrics"], (factor, vars) =>
        factor("music-total")
            .add(factor("image-total").scale(-1))
            .mul(
                new ScalarMatrix(vars.vocallyrics).add(
                    ALMatrix(1.0 - vars.vocallyrics),
                ),
            ),
    ),
    "inst-total": composite(["inst", "inst-perform"], (factor) =>
        factor("music-total")
            .add(factor("image-total").scale(-1))
            .add(factor("vocal-lyrics").scale(-1)),
    ),
    inst: composite(["compose", "arrange"]),
    perform: composite(["inst-perform", "vocal"]),
    prod: composite(["inst", "lyrics"]),
});

export const RoleTypes = {
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

function parseRoleComponent(str: string): EntryRole {
    // e.g. string: image*2*2/3.0

    // split the roletype part
    const roleTypeLength = indexOfOpChar(str) ?? str.length;
    const roleType = str.substring(roleTypeLength) as RoleType;
    if (RoleTypes[roleType] !== undefined) {
        throw new Error("invalid role type");
    }

    let multiplyFactor = 1.0;
    let i = roleTypeLength;
    while (i < str.length) {
        const opChar = str[i];
        if (opChar !== "*" && opChar !== "/") {
            throw new Error("invalid operation");
        }

        const end = indexOfOpChar(str, i) ?? str.length;
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

export function parseRoleExpressionString(str: string): EntryRole[] {
    return str.split(":").map(parseRoleComponent);
}

export function getComposingAtomicRoleTypes(role: RoleType): AtomicRoleType[] {
    return isAtomicRoleType(role) ? [role] : CompositeRoleTypes[role].children;
}

export function expandToAtomicRoles(
    role: EntryRole,
): EntryRole<AtomicRoleType>[] {
    return getComposingAtomicRoleTypes(role.roleType).map((roleType) => {
        return {
            ...role,
            roleType,
        };
    });
}

export function calculateFactors(
    roles: EntryRoles<AtomicRoleType>,
): Map<Id, Matrix> {
    const atomicRoles = new Set<AtomicRoleType>(
        Object.values(roles.roles)
            .flat()
            .map((role) => role.roleType),
    );

    const musicVars = {
        ...defaultMusicVars(atomicRoles),
        ...roles.musicVars,
    };

    const cache = new Map<RoleType, Matrix>();
    const result = new Map<Id, Matrix>();

    function calcRoleFactor(roleType: RoleType): Matrix {
        if (cache.has(roleType)) {
            return cache.get(roleType)!;
        }

        const roleCalcFn = isAtomicRoleType(roleType)
            ? AtomicRoleTypes[roleType]
            : CompositeRoleTypes[roleType].calcFactor;

        return roleCalcFn(calcRoleFactor, musicVars);
    }

    for (const [id, entryRoles] of Object.entries(roles.roles)) {
        let total: Matrix = new ScalarMatrix(0.0);

        for (const role of entryRoles) {
            role.factor = calcRoleFactor(role.roleType);
            const factor = role.factor.scale(role.multiplyFactor);
            total = total.add(factor);
        }

        result.set(id, total);
    }

    return result;
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
