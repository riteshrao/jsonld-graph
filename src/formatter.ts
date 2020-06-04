import * as jsonld from 'jsonld';
import { JsonldKeywords } from "./constants";
import Vertex from "./vertex";

export type ExpandOptions = {
    /**
     * @description Set to true to embed references as blank refernces without any @id.
     * @type {boolean}
     */
    blankReferences?: boolean;
    /**
     * @description Framing instructions for formatting the JSON.
     * @type {*}
     */
    frame?: any;
    /**
     * @description Set to true to skip any outgoing references.
     * @type {boolean}
     */
    noReferences?: boolean;
    /**
     * @description Set to true to strip out @context field from the generated json.
     * @type {*}
     */
    stripContext?: any;
}

export async function toJson(
    vertices: Vertex[],
    contexts: string | string[] | any | any[],
    loader: (urn: string) => Promise<any>,
    options: ExpandOptions = {}): Promise<any> {

    const nodes: any[] = [];
    for (const vertex of vertices) {
        nodes.push(expand(vertex, options));
    }

    let json: any;
    if (options.frame) {
        const frameDoc = Object.assign({}, options.frame);
        if (!frameDoc['@context']) {
            frameDoc['@context'] = contexts;
        }

        json = await jsonld.frame(nodes, frameDoc, {
            documentLoader: loader
        } as any);
    } else {
        json = await jsonld.compact(nodes, contexts, {
            documentLoader: loader,
            skipExpansion: true
        });
    }

    if (options.stripContext) {
        delete json['@context'];
    }

    return json;
}

export function expand(vertex: Vertex, options: ExpandOptions = {}): any {
    const expanded: any = { [JsonldKeywords.id]: vertex.iri };
    const types = vertex.getTypes().items();
    if (types.length > 0) {
        expanded[JsonldKeywords.type] = types.map(x => x.iri);
    }

    for (const { id, values } of vertex.getAttributes()) {
        expanded[id] = [];
        for (const attribValue of values) {
            const value = { [JsonldKeywords.value]: attribValue.value }
            if (attribValue.language) {
                value[JsonldKeywords.language] = attribValue.language;
            }
            if (attribValue.type) {
                value[JsonldKeywords.type] = attribValue.type;
            }
            expanded[id].push(value);
        }
    }

    if (!options.noReferences) {
        for (const outgoing of vertex.getOutgoing().filter(x => x.iri !== JsonldKeywords.type)) {
            const expandedOut = expand(outgoing.to, options);
            if (options.blankReferences) {
                delete expandedOut[JsonldKeywords.id];
            }

            if (!expanded[outgoing.iri]) {
                expanded[outgoing.iri] = [];
            }

            expanded[outgoing.iri].push(expandedOut);
        }
    }

    return expanded;
}