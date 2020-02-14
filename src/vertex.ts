import * as types from './types';
import { BlankNodePrefix, JsonldKeywords } from './constants';
import Iterable from 'jsiterable';
import Errors from './errors';
import cloneDeep = require('lodash.clonedeep');

type GraphType = types.JsonldGraph<Vertex, types.Edge<Vertex>>;

/**
 * @description Vertex in a graph.
 * @export
 * @class Vertex
 */
export default class Vertex implements types.Vertex {
    private _id: string;
    private readonly _graph: GraphType;
    private readonly _attributes = new Map<string, types.AttributeValue[]>();

    constructor(id: string, graph: GraphType) {
        if (!id) {
            throw new ReferenceError(`Invalid id. id is '${id}'`);
        }
        if (!graph) {
            throw new ReferenceError(`Invalid graph. graph is '${graph}'`);
        }

        this._id = id;
        this._graph = graph;
    }

    /**
     * @description Gets the id of the node.
     * @readonly
     * @type {string}
     * @memberof Node
     */
    get id(): string {
        return this._graph.compactIRI(this._id);
    }

    /**
     * @description Sets the id of the node.
     * @memberof Node
     */
    set id(iri: string) {
        throw new Error('Not implemented');
    }

    /**
     * @description Returns true if the node is a blank node, else false.
     * @readonly
     * @type {boolean}
     * @memberof Vertex
     */
    get isBlankNode(): boolean {
        return this._id.startsWith(BlankNodePrefix);
    }

    /**
     * @description Appends an attribute vlaue.
     * @param {string} name The name of the attribute to which the value is appended.
     * @param {*} value The value to append.
     * @param {string} [language] Optional language identifier for string values.
     * @returns {this}
     * @memberof Vertex
     */
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
        if (!this._attributes.has(attributeIRI)) {
            this._attributes.set(attributeIRI, [
                {
                    value,
                    language
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
    deleteAttributeValue(name: string, value: any, language?: string): this {
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

        if (!values) {
            return this;
        }

        if (language) {
            const val = values.find(x => x.value === value && x.language === language);
            if (val) {
            }
        } else {
        }

        return this;
    }

    /**
     * @description Gets all attributes of the vertex.
     * @returns {Iterable<[string, types.AttributeValue[]]>}
     * @memberof Vertex
     */
    getAttributes(): Iterable<{ name: string; values: types.AttributeValue[] }> {
        return new Iterable(this._attributes.entries()).map(x => {
            return {
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
     * @returns {Iterable<types.AttributeValue<T>>}
     * @memberof Vertex
     */
    getAttributeValues<T = any>(name: string): Iterable<types.AttributeValue<T>> {
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
     * @returns {Iterable<{ label: string; fromVertex: Vertex }>}
     * @memberof Vertex
     */
    getIncoming(label?: string): Iterable<{ label: string; fromVertex: Vertex }> {
        return this._graph.getIncomingEdges(this._id, label).map(x => {
            return {
                label: this._graph.compactIRI(x.label),
                fromVertex: x.from
            };
        });
    }

    /**
     * @description Gets all vertices that this vertex has an outgoing edge to.
     * @param {string} [label] Optional edge label used to filter edges with the specified label.
     * @returns {Iterable<{ label: string; toVertex: Vertex }>}
     * @memberof Vertex
     */
    getOutgoing(label?: string): Iterable<{ label: string; toVertex: Vertex }> {
        return this._graph.getOutgoingEdges(this._id, label).map(x => {
            return {
                label: this._graph.compactIRI(x.label),
                toVertex: x.to
            };
        });
    }

    /**
     * @description Gets the type vertices of this vertex instnace.
     * @returns {Iterable<Vertex>}
     * @memberof Vertex
     */
    getTypes(): Iterable<Vertex> {
        return this._graph.getOutgoingEdges(this._id, JsonldKeywords.type).map(x => x.to);
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
     * @description Checks if the vertex has any incoming edges.
     * @returns {boolean}
     * @memberof Vertex
     */
    hasIncoming(): boolean;
    /**
     * @description Checks if the vertex has an incoming edge with the specified label.
     * @param {string} label The label of the edge to check.
     * @param {(Vertex | string)} [vertex] Optional. When specified only checks for incoming edges from the specified vertex instance or IRI.
     * @returns {boolean} True if an edge is found, else false.
     * @memberof Vertex
     */
    hasIncoming(label: string, vertex?: Vertex | string): boolean;
    hasIncoming(label?: string, vertex?: Vertex | string): boolean {
        if (!label) {
            return !!this._graph.getIncomingEdges(this._id).first();
        } else {
            let edges = this._graph.getIncomingEdges(this._id, this._graph.expandIRI(label));
            if (vertex) {
                const outV =
                    typeof vertex === 'string'
                        ? this._graph.expandIRI(vertex)
                        : this._graph.expandIRI(vertex.id);

                edges = edges.filter(x => this._graph.expandIRI(x.from.id) === outV);
            }
            return !!edges.first();
        }
    }

    /**
     * @description Checks if the vertex has any outgoing edges.
     * @returns {boolean} True if the vertex has any outgoing edges.
     * @memberof Vertex
     */
    hasOutgoing(): boolean;
    /**
     * @description Checks if the vertex has an outgoing edge with the specified label.
     * @param {string} [label] The label of the edge to check.
     * @param {(Vertex | string)} [vertex] Optional. When specified only checks for outgoing edges to the specified vertex instance or IRI.
     * @returns {boolean}
     * @memberof Vertex
     */
    hasOutgoing(label?: string, vertex?: Vertex | string): boolean;
    hasOutgoing(label?: string, vertex?: Vertex | string): boolean {
        if (!label) {
            return !!this._graph.getOutgoingEdges(this._id).first();
        } else {
            let edges = this._graph.getOutgoingEdges(this._id, this._graph.expandIRI(label));
            if (vertex) {
                const outV =
                    typeof vertex === 'string'
                        ? this._graph.expandIRI(vertex)
                        : this._graph.expandIRI(vertex.id);

                edges = edges.filter(x => this._graph.expandIRI(x.to.id) === outV);
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
        return this.getTypes().some(x => this._graph.expandIRI(x.id) === typeIRI);
    }

    /**
     * @description Removes incoming edges.
     * @param {string} [label] Optional label filter to only remove edges with the specified label.
     * @param {(string | types.VertexSelector<this>)} [filter] Optional vertex filter to only remove edges that satisfy the filter.
     * @returns {this}
     * @memberof Vertex
     */
    removeIncoming(label?: string, filter?: string | types.VertexSelector<this>): this {
        let edges = this._graph.getIncomingEdges(this._id);
        if (label) {
            const labelIRI = this._graph.expandIRI(label);
            edges = edges.filter(x => x.label === labelIRI);
        }

        if (filter && typeof filter === 'string') {
            const fromIRI = this._graph.expandIRI(filter);
            edges = edges.filter(x => this._graph.expandIRI(x.from.id) === fromIRI);
        }

        if (filter && typeof filter !== 'string') {
            edges = edges.filter(x => filter(x.from as this));
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
    removeOutgoing(label?: string, filter?: string | types.VertexSelector<this>): this {
        let edges = this._graph.getOutgoingEdges(this._id);
        if (label) {
            const labelIRI = this._graph.expandIRI(label);
            edges = edges.filter(x => x.label === labelIRI);
        }

        if (filter && typeof filter === 'string') {
            const fromIRI = this._graph.expandIRI(filter);
            edges = edges.filter(x => this._graph.expandIRI(x.to.id) === fromIRI);
        }

        if (filter && typeof filter !== 'string') {
            edges = edges.filter(x => filter(x.to as this));
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
        const outgoingTypes = this._graph.getOutgoingEdges(this._id, JsonldKeywords.type);
        for (const typeEdge of outgoingTypes) {
            if (typeIRIs.some(x => x === this._graph.expandIRI(typeEdge.to.id))) {
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
    setAttributeValue(name: string, value: any, language?: string): this {
        if (!name) {
            throw new ReferenceError(`Invalid name. name is '${name}'`);
        }

        if (value === null || value == undefined) {
            throw new ReferenceError(`Invalid value. value cannot be ${value}`);
        }

        if (language && value && typeof value !== 'string') {
            throw new TypeError(
                `Invalid value. Language speciifc attribute values must be strings. Found type ${typeof value}`
            );
        }

        const attributeIRI = this._graph.expandIRI(name);
        const values = this._attributes.get(attributeIRI);
        if (!values || !language) {
            this._attributes.set(attributeIRI, [
                {
                    value,
                    language
                }
            ]);
        } else if (language) {
            const langValue = values.find(x => x.language === language);
            if (langValue) {
                langValue.value = value;
            } else {
                values.push({
                    value,
                    language
                });
            }
        }

        return this;
    }

    setIncoming(label: string, fromVertex: Vertex): this;
    setIncoming(label: string, fromVertex: string, createIfNotExists?: boolean): this;
    setIncoming(
        label: string,
        fromVertex: string | Vertex,
        createIfNotExists: boolean = false
    ): this {
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
                : this._graph.expandIRI(fromVertex.id);

        if (this._id === sourceIRI) {
            throw new Errors.CyclicEdgeError(labelIRI, this._id);
        }

        if (!this._graph.hasVertex(sourceIRI)) {
            if (createIfNotExists) {
                this._graph.createVertex(sourceIRI);
            } else {
                throw new Errors.VertexNotFoundError(sourceIRI);
            }
        }

        if (this._graph.hasEdge(labelIRI, sourceIRI, this._id)) {
            throw new Errors.DuplicateEdgeError(labelIRI, sourceIRI, this._id);
        }

        this._graph.createEdge(labelIRI, sourceIRI, this._id);
        return this;
    }

    setOutgoing(label: string, toVertex: Vertex): this;
    setOutgoing(label: string, toVertex: string, createIfNotExists?: boolean): this;
    setOutgoing(
        label: string,
        toVertex: string | Vertex,
        createIfNotExists: boolean = false
    ): this {
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
                : this._graph.expandIRI(toVertex.id);

        if (this._id === targetIRI) {
            throw new Errors.CyclicEdgeError(labelIRI, this._id);
        }

        if (!this._graph.hasVertex(targetIRI)) {
            if (createIfNotExists) {
                this._graph.createVertex(targetIRI);
            } else {
                throw new Errors.VertexNotFoundError(targetIRI);
            }
        }

        if (this._graph.hasEdge(labelIRI, this._id, targetIRI)) {
            throw new Errors.DuplicateEdgeError(labelIRI, targetIRI, this._id);
        }

        this._graph.createEdge(labelIRI, this._id, targetIRI);
        return this;
    }

    setType(...types: string[] | Vertex[]): this {
        if (!types || types.length === 0) {
            return this;
        }

        const typesToAdd = new Set<string>();
        const existingTypes = new Set(
            this.getOutgoing(JsonldKeywords.type).map(x => this._graph.expandIRI(x.toVertex.id))
        );

        for (const type of types) {
            const typeId =
                typeof type === 'string'
                    ? this._graph.expandIRI(type)
                    : this._graph.expandIRI(type.id);

            if (!existingTypes.has(typeId)) {
                typesToAdd.add(typeId);
            }
        }

        for (const typeId of typesToAdd) {
            this.setOutgoing(JsonldKeywords.type, typeId, true);
        }

        return this;
    }

    async toJson<T = any>(options: types.JsonFormatOptions = {}): Promise<T> {
        const formatOptions = cloneDeep(options);
        formatOptions.frame = Object.assign(options.frame || {}, {
            [JsonldKeywords.id]: this._id
        });

        const json = await this._graph.toJson(formatOptions);
        return json['@graph'][0];
    }
}
