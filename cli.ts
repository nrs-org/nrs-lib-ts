import {
    ContextConfig,
    Data,
    deserializeEntries,
    deserializeImpacts,
    deserializeRelations,
    newContext,
    processContext,
} from "./mod.ts";
import { writableStreamFromWriter } from "https://deno.land/std@0.181.0/streams/mod.ts";

const bulk = Deno.openSync("bulk.json", { write: true, create: true });
const stream = writableStreamFromWriter(bulk);
const contextConfig: ContextConfig = {
    extensions: {
        DAH_combine_pow: {},
        DAH_factors: {},
        DAH_overall_score: {},
        DAH_serialize: {},
        DAH_serialize_json: {
            bulk: stream,
        },
        DAH_standards: {},
    },
};

const context = newContext(contextConfig);

const data: Data = {
    entries: deserializeEntries(
        Deno.readTextFileSync(
            "C:\\Users\\nochr\\dev\\nrs-impl-kt\\output\\entries.json"
        )
    ),
    impacts: deserializeImpacts(
        Deno.readTextFileSync(
            "C:\\Users\\nochr\\dev\\nrs-impl-kt\\output\\impacts.json"
        )
    ),
    relations: deserializeRelations(
        Deno.readTextFileSync(
            "C:\\Users\\nochr\\dev\\nrs-impl-kt\\output\\relations.json"
        )
    ),
};

processContext(context, data);
bulk.close();
