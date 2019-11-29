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

    get isBlankNode(): boolean {
        throw new Error('Not implemented');
    }

    get metadata(): any {
        throw new Error('Not implemented');
    }

    addAttributeValue(name: string, value: any, language?: string): this {
        throw new Error('Not implemented');
    }

    getAttributes(): Iterable<[string, types.AttributeValue[]]> {
        throw new Error('Not implemented');
    }

    getAttributeValue<T = string>(name: string): T;
    getAttributeValue(name: string, language: string): string;
    getAttributeValue<T = string>(name: string, language?: string): T {
        throw new Error('Not implemented');
    }

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

    removeIncoming(label?: string, filter?: string | types.VertexFilter<Vertex>): this {
        throw new Error('Not implemented');
    }

    removeOutgoing(label?: string, filter?: string | types.VertexFilter<Vertex>): this {
        throw new Error('Not implemented');
    }

    removeType(...typeIds: string[]): this {
        throw new Error('Not implemented');
    }

    replaceAttributeValue(name: string, value: any, language?: string): this {
        throw new Error('Not implemented');
    }

    removeAttributeValue(name: string, value: any): this {
        throw new Error('Not implemented');
    }

    setIncoming(label: string, fromVertex: Vertex): this;
    setIncoming(label: string, fromVertex: string, createIfNotExists?: boolean): this;
    setIncoming(label: string, fromVertex: string | Vertex, createIfNotExists?: boolean): this {
        throw new Error('Not implemented');
    }

    setOutgoing(label: string, toVertex: Vertex): this;
    setOutgoing(label: string, toVertex: string, createIfNotExists?: boolean): this;
    setOutgoing(label: string, toVertex: string | Vertex, createIfNotExists?: boolean): this {
        throw new Error('Not implemented');
    }

    setType(...types: string[] | Vertex[]): this {
        throw new Error('Not implemented');
    }

    toJson<T = any>(options: types.JsonFormatOptions = {}): Promise<T> {
        throw new Error('Not implemented');
    }
}
