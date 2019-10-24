import EventEmitter from 'events';
import Edge from './edge';
import Vertex from './vertex';
import Iterable from 'jsiterable';

import * as types from './types';

/**
 * @description Represents a graph of JSON-LD triples
 * @export
 * @class JsonldGraph
 * @extends {EventEmitter}
 * @implements {JsonldGraph}
 */
export class JsonldGraph extends EventEmitter implements JsonldGraph {
    /**
     * Creates an instance of JsonldGraph.
     * @memberof JsonldGraph
     */
    constructor() {
        super();
    }

    get contexts(): Iterable<[string, any]> {
        throw new Error('Not implemented');
    }

    get edgeCount(): number {
        throw new Error('Not implemented');
    }

    get vertexCount(): number {
        throw new Error('Not implemented');
    }

    addContext(uri: string, context: any): void {
        throw new Error('Not implemented');
    }

    addPrefix(prefix: string, uri: string): void {
        throw new Error('Not implemented');
    }

    createNode(iri: string): Node {
        throw new Error('Not implemented');
    }

    getEdges(label?: string): Iterable<Edge> {
        throw new Error('Not implemented');
    }

    getIncoming(edgeLabel: string, nodeSelector?: string | types.NodeSelector): Iterable<Vertex> {
        throw new Error('Not implemented');
    }

    getOutgoing(edgeLabel: string, nodeSelector?: string | types.NodeSelector): Iterable<Vertex> {
        throw new Error('Not implemented');
    }

    getNodes(selector?: types.NodeSelector): Iterable<Vertex> {
        throw new Error('Not implemented');
    }

    getNode(iri: string): Vertex {
        throw new Error('Not implemented');
    }

    hasEdge(label: string, fromNode: string | Vertex, toNode: string | Vertex): boolean {
        throw new Error('Not implemented');
    }

    hasNode(iri: string): boolean {
        throw new Error('Not implemented');
    }

    async load(inputs: any | any[], contexts?: string | string[] | object | object[], base?: string) {
        throw new Error('Not implemented');
    }

    removeContext(uri: string): void {
        throw new Error('Not implemented');
    }

    removeNode(node: string | Vertex): void {
        throw new Error('Not implemented');
    }

    removePrefix(prefix: string): void {
        throw new Error('Not implemented');
    }

    async toJson<T = any>(): Promise<T> {
        throw new Error('Not implemented');
    }
}
