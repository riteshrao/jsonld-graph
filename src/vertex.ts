import * as types from './types';
import Iterable from 'jsiterable';

type GraphType = types.JsonldGraph<Vertex, types.Edge<Vertex>>;

/**
 * @description Vertex in a graph.
 * @export
 * @class Vertex
 */
export default class Vertex implements types.Vertex {
    private _id: string;
    private readonly _graph: GraphType;

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
        throw new Error('Not implemented');
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
        throw new Error('Not implemented');
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
        throw new Error('Not implemented');
    }

    /**
     * @description Gets all attributes of the vertex.
     * @returns {Iterable<[string, types.AttributeValue[]]>}
     * @memberof Vertex
     */
    getAttributes(): Iterable<[string, types.AttributeValue[]]> {
        throw new Error('Not implemented');
    }

    /**
     * @description Gets the value of an attribute.
     * @template T The data type of the value.
     * @param {string} name The name of the attribute whose value is fetched.
     * @returns {T} The first value of the attribute.
     * @memberof Vertex
     */
    getAttributeValue<T = string>(name: string): T;
    /**
     * @description Gets the value of an attribute.
     * @param {string} name The name of the attribute whose value is retrieved.
     * @param {string} language The language identifier of the value to get.
     * @returns {string} The first value of the attribute.
     * @memberof Vertex
     */
    getAttributeValue(name: string, language: string): string;
    getAttributeValue<T = string>(name: string, language?: string): T {
        throw new Error('Not implemented');
    }

    /**
     * @description Gets all values of a specific attribute.
     * @template T The data type of the attribute.
     * @param {string} name
     * @returns {Iterable<types.AttributeValue<T>>}
     * @memberof Vertex
     */
    getAttributeValues<T = string>(name: string): Iterable<types.AttributeValue<T>> {
        throw new Error('Not implemented');
    }

    getIncoming(label?: string): Iterable<{ label: string; fromVertex: Vertex }> {
        throw new Error('Not implemented');
    }

    getOutgoing(label?: string): Iterable<{ label: string; toVertex: Vertex }> {
        throw new Error('Not implemented');
    }

    getTypes(): Iterable<Vertex> {
        throw new Error('Not implemented');
    }

    hasAttribute(name: string): boolean {
        throw new Error('Not implemented');
    }

    hasAttributeValue(name: string, value: any, language?: string): boolean {
        throw new Error('Not implemented');
    }

    isType(typeId: string): boolean {
        throw new Error('Not implemented');
    }

    removeIncoming(label?: string, filter?: string | types.VertexSelector<this>): this {
        throw new Error('Not implemented');
    }

    removeOutgoing(label?: string, filter?: string | types.VertexSelector<this>): this {
        throw new Error('Not implemented');
    }

    removeType(...typeIds: string[]): this {
        throw new Error('Not implemented');
    }

    setAttributeValue(name: string, value: any): this
    setAttributeValue(name: string, value: string, language: string): this
    setAttributeValue(name: string, value: any, language?: string): this {
        throw new Error('Not implemented');
    }

    setIncoming(label: string, fromVertex: Vertex): this;
    setIncoming(label: string, fromVertex: string, createIfNotExists?: boolean): this;
    setIncoming(label: string, fromVertex: string | Vertex, createIfNotExists: boolean = false): this {
        throw new Error('Not implemented');
    }

    setOutgoing(label: string, toVertex: Vertex): this;
    setOutgoing(label: string, toVertex: string, createIfNotExists?: boolean): this;
    setOutgoing(label: string, toVertex: string | Vertex, createIfNotExists: boolean = false): this {
        throw new Error('Not implemented');
    }

    setType(...types: string[] | Vertex[]): this {
        throw new Error('Not implemented');
    }

    toJson<T = any>(options: types.JsonFormatOptions = {}): Promise<T> {
        throw new Error('Not implemented');
    }
}
