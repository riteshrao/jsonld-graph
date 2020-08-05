import * as jsonld from 'jsonld';
import { JsonldKeywords } from "./constants";
import Vertex from "./vertex";

export interface ExpandedEntity {
    '@id': string,
    '@type'?: string[],
    [key: string]: string | any[] | undefined
}

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
    anonymousReferences?: boolean | ((source: Vertex, predicate?: string, target?: Vertex) => boolean);
    /**
     * @description Set to true or pass a custom filter to supress @type attribute.
     * @memberof ExpandOptions
     */
    anonymousTypes?: boolean | ((source: Vertex, predicate?: string, target?: Vertex) => boolean);
    /**
     * @description Set to true or pass a custom filter to embed references as compact @ids rather then embedding the reference.
     * @memberof ExpandFormatOptions
     */
    compactReferences?: boolean | ((source: Vertex, predicate?: string, target?: Vertex) => boolean);
    /**
     * @description Set to true or pass a custom filter to filter out references.
     */
    excludeReferences?: boolean | ((source: Vertex, predicate?: string, target?: Vertex) => boolean);

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

    /**
     * @description Custom transform function to execute on the expanded format.
     * @memberof ExpandFormatOptions
     */
    transform?: (vertex: Vertex, input: ExpandedEntity) => ExpandedEntity;
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
    return _expand(vertex, options, []);
}

function _expand(vertex: Vertex, options: ExpandFormatOptions = {}, visitStack: string[]) {
    visitStack.push(vertex.iri);
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
                (options.excludeReferences && typeof options.excludeReferences !== 'boolean' && options.excludeReferences(outgoing.from, outgoing.iri, outgoing.to))) {
                continue;
            }

            if ((options.compactReferences && typeof options.compactReferences === 'boolean' && options.compactReferences === true) ||
                (options.compactReferences && typeof options.compactReferences !== 'boolean' && options.compactReferences(outgoing.from, outgoing.iri, outgoing.to))) {
                if (!expanded[outgoing.iri]) {
                    expanded[outgoing.iri] = [];
                }
                expanded[outgoing.iri].push({ '@id': outgoing.to.iri });
            } else {
                if (!visitStack.includes(outgoing.to.iri)) {
                    const expandedOut = _expand(outgoing.to, options, visitStack);
                    if (expandedOut[JsonldKeywords.id] &&
                        (options.anonymousReferences && typeof options.anonymousReferences === 'boolean' && options.anonymousReferences === true) ||
                        (options.anonymousReferences && typeof options.anonymousReferences !== 'boolean' && options.anonymousReferences(outgoing.from, outgoing.iri, outgoing.to))) {

                        delete expandedOut[JsonldKeywords.id];
                    }

                    if (expandedOut[JsonldKeywords.type] &&
                        (options.anonymousTypes && typeof options.anonymousTypes === 'boolean' && options.anonymousTypes === true) ||
                        (options.anonymousTypes && typeof options.anonymousTypes !== 'boolean' && options.anonymousTypes(outgoing.from, outgoing.iri, outgoing.to))) {

                        delete expandedOut[JsonldKeywords.type];
                    }

                    if (!expanded[outgoing.iri]) {
                        expanded[outgoing.iri] = [];
                    }
                    expanded[outgoing.iri].push(expandedOut);
                }
            }
        }
    }

    if (options.transform) {
        return options.transform(vertex, expanded);
    } else {
        return expanded;
    }
}