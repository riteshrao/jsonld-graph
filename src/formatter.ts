import * as jsonld from 'jsonld';
import { JsonldKeywords } from "./constants";
import Vertex from "./vertex";

/**
 * @description Expansion format options.
 * @export
 * @interface ExpandFormatOptions
 */
export interface ExpandFormatOptions {
    /**
     * @description Set to true or pass a custom filter to embed references as anonymous refernces without any @id.
     * @type {boolean}
     */
    anonymousReferences?: boolean | ((vertex: Vertex) => boolean);
    /**
     * @description Set to true or pass a custom filter to supress @type attribute.
     * @memberof ExpandOptions
     */
    anonymousTypes?: boolean | ((vertex: Vertex) => boolean);
    /**
     * @description Set to true or pass a custom filter to filter out references.
     */
    excludeReferences?: boolean | ((predicate: string, from: Vertex, to: Vertex) => boolean);

    /**
     * @description Optional filter to filter out attribute values.
     */
    excludeAttributes?: string | ((vertex: Vertex, name: string) => boolean);
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

/**
 * @description Json formatting options.
 * @export
 * @interface JsonFormatOptions
 * @extends {ExpandFormatOptions}
 */
export interface JsonFormatOptions extends ExpandFormatOptions {
    frame?: any;
}

export async function toJson(
    vertices: Vertex[],
    contexts: string | string[] | any | any[],
    loader: (urn: string) => Promise<any>,
    options: JsonFormatOptions = {}): Promise<any> {

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

export function expand(vertex: Vertex, options: ExpandFormatOptions = {}): any {
    const expanded: any = { [JsonldKeywords.id]: vertex.iri };
    const types = vertex.getTypes().items();

    if (!options.anonymousTypes ||
        (typeof options.anonymousTypes === 'boolean' && !options.anonymousTypes) ||
        (typeof options.anonymousTypes !== 'boolean' && !options.anonymousTypes(vertex))) {
        if (types.length > 0) {
            expanded[JsonldKeywords.type] = types.map(x => x.iri);
        }
    }


    for (const { id, values } of vertex.getAttributes()) {
        if ((options.excludeAttributes && typeof options.excludeAttributes === 'string' && id.startsWith(options.excludeAttributes)) ||
            (options.excludeAttributes && typeof options.excludeAttributes !== 'string' && options.excludeAttributes(vertex, id))) {
            continue
        }

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
            if ((options.excludeReferences && typeof options.excludeReferences === 'boolean' && options.excludeReferences === true) ||
                (options.excludeReferences && typeof options.excludeReferences !== 'boolean' && options.excludeReferences(outgoing.iri, outgoing.from, outgoing.to))) {
                continue;
            }

            const expandedOut = expand(outgoing.to, options);
            if ((options.anonymousReferences && typeof options.anonymousReferences === 'boolean' && options.anonymousReferences === true) ||
                (options.anonymousReferences && typeof options.anonymousReferences !== 'boolean' && options.anonymousReferences(outgoing.to))) {
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