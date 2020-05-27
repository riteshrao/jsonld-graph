import Iterable from 'jsiterable';
import { BlankNodePrefix, JsonldKeywords } from './constants';
import Edge from './edge';
import * as errors from './errors';
import JsonldGraph from './graph';
import * as formatter from './formatter';

type VertexSelector = (v: Vertex) => boolean;

/**
 * @description Attribute value type.
 * @export
 * @interface AttributeValue
 * @template T
 */
export interface AttributeValue<T = any> {
    /**
     * @description Optional @language discriptor of the attribute.
     * @type {string}
     * @memberof AttributeValue
     */
    language?: string;
    /**
     * @description Optional @type discriptor of the attribute.
     * @type {string}
     * @memberof AttributeValue
     */
    type?: string;
    /**
     * @description The attribute value.
     * @type {T}
     * @memberof AttributeValue
     */
    value: T;
}

/**
 * @description JSON formatting options for a vertex.
 * @export
 * @interface VertexJsonFormatOptions
 */
export interface VertexFormatOptions {
    /**
     * @description Makes outgoing references anonymous
     * @type {boolean}
     * @memberof VertexJsonFormatOptions
     */
    blankReferences?: boolean;
    /**
     * @description Set to true to format the vertex without any outgoing referneces.
     * @type {boolean}
     * @memberof VertexFormatOptions
     */
    noReferences?: boolean;
    /**
     * @description Framing instruction for formatting the generated JSON.
     * @type {*}
     * @memberof VertexJsonFormatOptions
     */
    frame?: any;
    /**
     * @description Strips the @context reference in the formatted JSON
     * @type {boolean}
     * @memberof VertexJsonFormatOptions
     */
    stripContext?: boolean;
}

/**
 * @description Vertex in a graph.
 * @export
 * @class Vertex
 */
export default class Vertex {
    private _iri: string;
    private readonly _graph: JsonldGraph;
    private readonly _attributes = new Map<string, AttributeValue[]>();

    /**
     * Creates an instance of Vertex.
     * @param {string} iri The IRI of the vertex.
     * @param {JsonldGraph} graph The graph containng the vertex instance.
     * @memberof Vertex
     */
    constructor(iri: string, graph: JsonldGraph) {
        if (!iri) {
            throw new ReferenceError(`Invalid id. id is '${iri}'`);
        }
        if (!graph) {
            throw new ReferenceError(`Invalid graph. graph is '${graph}'`);
        }

        this._iri = iri;
        this._graph = graph;
    }

    /**
     * @description Gets the fully qualified IRI of the vertex.
     * @readonly
     * @type {string}
     * @memberof Vertex
     */
    get iri(): string {
        return this._iri;
    }

    /**
     * @description Gets the compact id of the vertex. If no configured prefix is found, the full qualified IRI is returned.
     * @readonly
     * @type {string}
     * @memberof Node
     */
    get id(): string {
        return this._graph.compactIRI(this._iri);
    }

    /**
     * @description Returns true if the node is a blank node, else false.
     * @readonly
     * @type {boolean}
     * @memberof Vertex
     */
    get isBlankNode(): boolean {
        return this._iri.startsWith(BlankNodePrefix);
    }

    /**
     * @description Appends an attribute vlaue.
     * @param {string} name The name of the attribute to which the value is appended.
     * @param {*} value The value to append.
     * @param {string} [language] Optional language identifier for string values.
     * @returns {this}
     * @memberof Vertex
     */
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    appendAttributeValue(name: string, value: any, language?: string): this {
        if (!name) {
            throw new ReferenceError(`Invalid name. name is '${name}'`);
        }
        if (value === null || value === undefined) {
            throw new ReferenceError(`Invalid value. value is '${value}'`);
        }

        if (language && typeof value !== 'string') {
            throw new TypeError(
                `Invalid value. Language speciifc attribute values must be strings. Found type ${typeof value}`
            );
        }

        const attributeIRI = this._graph.expandIRI(name);
        const type = typeof value === 'object' ? '@json' : undefined;
        if (!this._attributes.has(attributeIRI)) {
            this._attributes.set(attributeIRI, [
                {
                    value,
                    language,
                    type
                }
            ]);
        } else {
            const values = this._attributes.get(attributeIRI)!;
            if (language) {
                const existing = values.find(x => x.language === language);
                if (existing) {
                    existing.value = value;
                } else {
                    values.push({ value, language });
                }
            } else {
                values.push({ value });
            }
        }

        return this;
    }

    /**
     * @description Deletes an attribute.
     * @param {string} name The name of the attribute to delete.
     * @returns {this}
     * @memberof Vertex
     */
    deleteAttribute(name: string): this {
        if (!name) {
            throw new ReferenceError(`Invalid name. name is '${name}'`);
        }

        this._attributes.delete(this._graph.expandIRI(name));
        return this;
    }

    /**
     * @description Deletes a specific value of an attribute.
     * @param {string} name The attribute whose value should be deleted.
     * @param {*} value The value to delete.
     * @returns {this}
     * @memberof Vertex
     */
    deleteAttributeValue(name: string, value: any): this;
    deleteAttributeValue(name: string, value: string, language: string): this;
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    deleteAttributeValue(name: string, value: any, language?: string): this {
        if (!name) {
            throw new ReferenceError(`Invalid name. name is '${name}'`);
        }
        if (value === null || value === undefined) {
            throw new ReferenceError(`Invalid value. value is '${value}'`);
        }
        if (language && typeof language !== 'string') {
            throw new TypeError(
                `Invalid value. Language speciifc attribute values must be strings. Found type ${typeof value}`
            );
        }

        const attributeIRI = this._graph.expandIRI(name);
        const values = this._attributes.get(attributeIRI);

        if (!values || values.length === 0) {
            return this;
        }

        if (language) {
            const valueIndex = values.findIndex(x => x.value === value && x.language === language);
            if (valueIndex > -1) {
                values.splice(valueIndex, 1);
            }
        } else {
            this._attributes.set(attributeIRI, values.filter(x => x.value !== value));
        }

        return this;
    }

    /**
     * @description Gets all attributes of the vertex.
     * @returns {Iterable<[string, AttributeValue[]]>}
     * @memberof Vertex
     */
    getAttributes(): Iterable<{ id: string, name: string; values: AttributeValue[] }> {
        return new Iterable(this._attributes.entries()).map(x => {
            return {
                id: x[0],
                name: this._graph.compactIRI(x[0]),
                values: x[1]
            };
        });
    }

    /**
     * @description Gets the value of an attribute.
     * @template T The data type of the value.
     * @param {string} name The name of the attribute whose value is fetched.
     * @returns {T} The first value of the attribute.
     * @memberof Vertex
     */
    getAttributeValue<T = any>(name: string): T;
    /**
     * @description Gets the value of an attribute.
     * @param {string} name The name of the attribute whose value is retrieved.
     * @param {string} language The language identifier of the value to get.
     * @returns {string} The first value of the attribute.
     * @memberof Vertex
     */
    getAttributeValue(name: string, language: string): string;
    getAttributeValue<T = any>(name: string, language?: string): T | undefined {
        if (!name) {
            throw new ReferenceError(`Invalid name. name is '${name}'`);
        }

        const attributeIRI = this._graph.expandIRI(name);
        if (!this._attributes.has(attributeIRI)) {
            return undefined;
        }

        const values = this._attributes.get(attributeIRI)!;
        if (language) {
            return values.find(x => x.language === language)?.value;
        } else {
            return values[0]?.value;
        }
    }

    /**
     * @description Gets all values of a specific attribute.
     * @template T The data type of the attribute.
     * @param {string} name
     * @returns {Iterable<AttributeValue<T>>}
     * @memberof Vertex
     */
    getAttributeValues<T = any>(name: string): Iterable<AttributeValue<T>> {
        if (!name) {
            throw new ReferenceError(`Invalid name. name is '${name}'`);
        }

        const attributeIRI = this._graph.expandIRI(name);
        if (!this._attributes.has(attributeIRI)) {
            return Iterable.empty();
        }

        return new Iterable(this._attributes.get(attributeIRI)!.values());
    }

    /**
     * @description Gets all vertices that have an outgoing edge to this vertex.
     * @param {string} [label] Optional edge label used to filter edges with the specifed label.
     * @returns {Iterable<{ label: string; fromVertex: types.Vertex }>}
     * @memberof Vertex
     */
    getIncoming(label?: string): Iterable<Edge> {
        return this._graph.getIncomingEdges(this._iri, label);
    }

    /**
     * @description Gets all vertices that this vertex has an outgoing edge to.
     * @param {string} [label] Optional edge label used to filter edges with the specified label.
     * @returns {Iterable<{ label: string; toVertex: types.Vertex }>}
     * @memberof Vertex
     */
    getOutgoing(label?: string): Iterable<Edge> {
        return this._graph.getOutgoingEdges(this._iri, label);
    }

    /**
     * @description Gets the type vertices of this vertex instnace.
     * @returns {Iterable<Vertex>}
     * @memberof Vertex
     */
    getTypes(): Iterable<Vertex> {
        return this._graph.getOutgoingEdges(this._iri, JsonldKeywords.type).map(x => x.to);
    }

    /**
     * @description Checks if an attribute has been defined on the vertex.
     * @param {string} name The name or IRI of the attribute to check.
     * @returns {boolean} True if the attribute exists, else false.
     * @memberof Vertex
     */
    hasAttribute(name: string): boolean {
        if (!name) {
            throw new ReferenceError(`Invalid name. name is '${name}'`);
        }

        return this._attributes.has(this._graph.expandIRI(name));
    }

    /**
     * @description Checks if an attribute with the specific value exists.
     * @param {string} name The name or IRI of the attribute to check.
     * @param {*} value The specific value to check.
     * @param {string} [language] Optional locale when specified only checks if the value exists for the specified locale.
     * @returns {boolean} True if the value exists, else false.
     * @memberof Vertex
     */
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    hasAttributeValue(name: string, value: any, language?: string): boolean {
        if (!name) {
            throw new ReferenceError(`Invalid name. name is '${name}'`);
        }
        if (value === null || value === undefined) {
            throw new ReferenceError(`Invalid value. value is '${value}'`);
        }
        if (language && typeof value !== 'string') {
            throw new TypeError(
                `Invalid value. Language speciifc attribute values must be strings. Found type ${typeof value}`
            );
        }

        const attributeIRI = this._graph.expandIRI(name);
        const values = this._attributes.get(attributeIRI);
        if (values) {
            return language
                ? values.some(x => x.language === language && x.value === value)
                : values.some(x => x.value === value);
        } else {
            return false;
        }
    }

    /**
     * @description Checks if the vertex has an incoming edge with the specified label.
     * @param {string} label The label of the edge to check.
     * @param {(Vertex | string)} [vertex] Optional. When specified only checks for incoming edges from the specified vertex instance or IRI.
     * @returns {boolean} True if an edge is found, else false.
     * @memberof Vertex
     */
    hasIncoming(label?: string, vertex?: Vertex | string): boolean {
        if (!label) {
            return !!this._graph.getIncomingEdges(this._iri).first();
        } else {
            let edges = this._graph.getIncomingEdges(this._iri, label);
            if (vertex) {
                const inIRI =
                    typeof vertex === 'string'
                        ? this._graph.expandIRI(vertex)
                        : vertex.iri;

                edges = edges.filter(x => x.from.iri === inIRI);
            }
            return !!edges.first();
        }
    }

    /**
     * @description Checks if the vertex has an outgoing edge with the specified label.
     * @param {string} [label] The label of the edge to check.
     * @param {(Vertex | string)} [vertex] Optional. When specified only checks for outgoing edges to the specified vertex instance or IRI.
     * @returns {boolean}
     * @memberof Vertex
     */
    hasOutgoing(label?: string, vertex?: Vertex | string): boolean {
        if (!label) {
            return !!this._graph.getOutgoingEdges(this._iri).first();
        } else {
            let edges = this._graph.getOutgoingEdges(this._iri, this._graph.expandIRI(label));
            if (vertex) {
                const outIRI =
                    typeof vertex === 'string'
                        ? this._graph.expandIRI(vertex)
                        : vertex.iri;

                edges = edges.filter(x => x.to.iri === outIRI);
            }
            return !!edges.first();
        }
    }

    /**
     * @description Checks if the vertex is of a specified type.
     * @param {string} typeId The id of the type.
     * @returns {boolean} True if the vertex has an outgoing @type relationship to the specified type vertex.
     * @memberof Vertex
     */
    isType(typeId: string): boolean {
        if (!typeId) {
            throw new ReferenceError(`Invalid typeId. typeId is '${typeId}'`);
        }

        const typeIRI = this._graph.expandIRI(typeId);
        return this.getTypes().some(x => x.iri === typeIRI);
    }

    /**
     * @description Removes incoming edges.
     * @param {string} [label] Optional label filter to only remove edges with the specified label.
     * @param {(string | types.VertexSelector<this>)} [filter] Optional vertex filter to only remove edges that satisfy the filter.
     * @returns {this}
     * @memberof Vertex
     */
    removeIncoming(label?: string, filter?: string): this
    removeIncoming(label?: string, filter?: VertexSelector): this
    removeIncoming(label?: string, filter?: string | VertexSelector): this {
        let edges = this._graph.getIncomingEdges(this._iri);
        if (label) {
            const edgeIRI = this._graph.expandIRI(label);
            edges = edges.filter(x => x.iri === edgeIRI);
        }

        if (filter && typeof filter === 'string') {
            const fromIRI = this._graph.expandIRI(filter);
            edges = edges.filter(x => x.from.iri === fromIRI);
        }

        if (filter && typeof filter === 'function') {
            edges = edges.filter(x => filter(x.from));
        }

        for (const edge of edges) {
            this._graph.removeEdge(edge);
        }

        return this;
    }

    /**
     * @description Removes outgoing edges.
     * @param {string} [label] Optional label filter to only remove edges with the specified label.
     * @param {(string | types.VertexSelector<this>)} [filter] Optional vertex filter to only remove edges that satisfy the filter.
     * @returns {this}
     * @memberof Vertex
     */
    removeOutgoing(label?: string, filter?: string): this
    removeOutgoing(label?: string, filter?: VertexSelector): this
    removeOutgoing(label?: string, filter?: string | VertexSelector): this {
        let edges = this._graph.getOutgoingEdges(this._iri);
        if (label) {
            const edgeIRI = this._graph.expandIRI(label);
            edges = edges.filter(x => x.iri === edgeIRI);
        }

        if (filter && typeof filter === 'string') {
            const fromIRI = this._graph.expandIRI(filter);
            edges = edges.filter(x => x.to.iri === fromIRI);
        }

        if (filter && typeof filter === 'function') {
            edges = edges.filter(x => filter(x.to));
        }

        for (const edge of edges) {
            this._graph.removeEdge(edge);
        }

        return this;
    }

    /**
     * @description Removes type
     * @param {...string[]} typeIds
     * @returns {this}
     * @memberof Vertex
     */
    removeType(...typeIds: string[]): this {
        if (!typeIds || typeIds.length === 0) {
            return this;
        }

        const typeIRIs = typeIds.map(x => this._graph.expandIRI(x));
        const outgoingTypes = this._graph.getOutgoingEdges(this._iri, JsonldKeywords.type);
        for (const typeEdge of outgoingTypes) {
            if (typeIRIs.some(x => x === typeEdge.to.iri)) {
                this._graph.removeEdge(typeEdge);
            }
        }

        return this;
    }

    /**
     * @description Sets an attribute value, replacing any existing value(s)
     * @param {string} name The name of the attribute to set.
     * @param {*} value The value of the attribute to set.
     * @returns {this}
     * @memberof Vertex
     */
    setAttributeValue(name: string, value: any): this;
    /**
     * @description Sets an attribute value, replacing any existing value(s).
     * @param {string} name The name of the attribute value
     * @param {string} value The value to set.
     * @param {string} language The locale of the value.
     * @returns {this}
     * @memberof Vertex
     */
    setAttributeValue(name: string, value: string, language: string): this;
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    setAttributeValue(name: string, value: any, language?: string): this {
        if (!name) {
            throw new ReferenceError(`Invalid name. name is '${name}'`);
        }

        if (value === null || value === undefined) {
            throw new ReferenceError(`Invalid value. value cannot be ${value}`);
        }

        if (language && value && typeof value !== 'string') {
            throw new TypeError(
                `Invalid value. Language speciifc attribute values must be strings. Found type ${typeof value}`
            );
        }

        const attributeIRI = this._graph.expandIRI(name);
        const values = this._attributes.get(attributeIRI);
        const type = typeof value === 'object' ? '@json' : undefined;
        if (!values || !language) {
            this._attributes.set(attributeIRI, [
                {
                    value,
                    language,
                    type
                }
            ]);
        } else if (language) {
            const langValue = values.find(x => x.language === language);
            if (langValue) {
                langValue.value = value;
            } else {
                values.push({
                    value,
                    language,
                    type
                });
            }
        }

        return this;
    }

    setIncoming(label: string, fromVertex: Vertex): this;
    setIncoming(label: string, fromVertex: string, createIfNotExists?: boolean): this;
    setIncoming(label: string, fromVertex: string | Vertex, createIfNotExists = false): this {
        if (!label) {
            throw new ReferenceError(`Invalid label. label is '${label}'`);
        }

        if (!fromVertex) {
            throw new ReferenceError(`Invalid from vertex. fromVertex is ${fromVertex}`);
        }

        const labelIRI = this._graph.expandIRI(label);
        const sourceIRI =
            typeof fromVertex === 'string'
                ? this._graph.expandIRI(fromVertex)
                : fromVertex.iri;

        if (this._iri === sourceIRI) {
            throw new errors.CyclicEdgeError(labelIRI, this._iri);
        }

        if (!this._graph.hasVertex(sourceIRI)) {
            if (createIfNotExists) {
                this._graph.createVertex(sourceIRI);
            } else {
                throw new errors.VertexNotFoundError(sourceIRI);
            }
        }

        if (this._graph.hasEdge(labelIRI, sourceIRI, this._iri)) {
            throw new errors.DuplicateEdgeError(labelIRI, sourceIRI, this._iri);
        }

        this._graph.createEdge(labelIRI, sourceIRI, this._iri);
        return this;
    }

    setOutgoing(label: string, toVertex: Vertex): this;
    setOutgoing(label: string, toVertex: string, createIfNotExists?: boolean): this;
    setOutgoing(label: string, toVertex: string | Vertex, createIfNotExists = false): this {
        if (!label) {
            throw new ReferenceError(`Invalid label. label is '${label}'`);
        }
        if (!toVertex) {
            throw new ReferenceError(`Invalid to vertex. toVertex is ${toVertex}`);
        }

        const labelIRI = this._graph.expandIRI(label);
        const targetIRI =
            typeof toVertex === 'string'
                ? this._graph.expandIRI(toVertex)
                : toVertex.iri;

        if (this._iri === targetIRI) {
            throw new errors.CyclicEdgeError(labelIRI, this._iri);
        }

        if (!this._graph.hasVertex(targetIRI)) {
            if (createIfNotExists) {
                this._graph.createVertex(targetIRI);
            } else {
                throw new errors.VertexNotFoundError(targetIRI);
            }
        }

        if (this._graph.hasEdge(labelIRI, this._iri, targetIRI)) {
            throw new errors.DuplicateEdgeError(labelIRI, targetIRI, this._iri);
        }

        this._graph.createEdge(labelIRI, this._iri, targetIRI);
        return this;
    }

    setType(...types: string[] | Vertex[]): this {
        if (!types || types.length === 0) {
            return this;
        }

        const typesToAdd = new Set<string>();
        const existingTypes = new Set(
            this.getOutgoing(JsonldKeywords.type).map(x => x.to.iri)
        );

        for (const type of types) {
            const typeId =
                typeof type === 'string'
                    ? this._graph.expandIRI(type)
                    : type.id;

            if (!existingTypes.has(typeId)) {
                typesToAdd.add(typeId);
            }
        }

        for (const typeId of typesToAdd) {
            this.setOutgoing(JsonldKeywords.type, typeId, true);
        }

        return this;
    }

    /**
     * @description Formats the vertex to a JSON object.
     * @template T
     * @param {(string | string[] | object | object[])} contexts The context(s) to use for compacting and formatting the JSON output.
     * @param {VertexFormatOptions} [options={}] Formatting options.
     * @returns {Promise<T>}
     * @memberof Vertex
     */
    async toJson<T = any>(
        contexts: string | string[] | any | any[],
        options: VertexFormatOptions = {}): Promise<T> {

        const contextLoader = async (url: string): Promise<any> => {
            const normalizedUrl = url.toLowerCase();
            const context = await this._graph.getContext(normalizedUrl);
            if (context) {
                return {
                    contextUrl: undefined,
                    documentUrl: url,
                    document: context
                };
            } else {
                throw new errors.ContextNotFoundError(url);
            }
        }

        if (options.frame) {
            const frame = Object.assign({}, options.frame);
            frame['@id'] = this.iri;
            return formatter.toJson([this], contexts, contextLoader, Object.assign({}, options, { frame }));
        } else {
            return formatter.toJson([this], contexts, contextLoader, options);
        }
    }
}
