import Iterable from 'jsiterable';
import { Edge, Vertex, GraphTypesFactory, JsonldGraph, AttributeValue } from '../../src/types';

export class FakeVertex implements Vertex {
    constructor(
        private readonly _id: string,
        private readonly _graph: JsonldGraph<FakeVertex, FakeEdge>
    ) {}

    get id(): string {
        return this._graph.compactIRI(this._id);
    }

    appendAttributeValue(name: string, value: any, language?: string): this {
        throw new Error('Method not implemented.');
    }

    getAttributes(): Iterable<{ name: string, values: AttributeValue<any>[]}> {
        throw new Error('Method not implemented.');
    }

    getAttributeValue<T = string>(name: string): T;
    getAttributeValue(name: string, language: string): string;
    getAttributeValue(name: string, language?: string): any {
        throw new Error('Method not implemented.');
    }

    getAttributeValues<T = string>(
        name: string
    ): Iterable<AttributeValue<T>> {
        throw new Error('Method not implemented.');
    }

    getIncoming(label?: string): Iterable<{ label: string; fromVertex: Vertex }> {
        throw new Error('Method not implemented.');
    }

    getOutgoing(label?: string): Iterable<{ label: string; toVertex: Vertex }> {
        throw new Error('Method not implemented.');
    }

    getTypes(): Iterable<Vertex> {
        throw new Error('Method not implemented.');
    }

    hasAttribute(name: string): boolean {
        throw new Error('Method not implemented.');
    }
    hasAttributeValue(name: string, value: any, language?: string): boolean {
        throw new Error('Method not implemented.');
    }
    isType(typeId: string): boolean {
        throw new Error('Method not implemented.');
    }
    removeIncoming(
        label?: string,
        filter?: string | import('../../src/types').VertexSelector<this>
    ): void {
        throw new Error('Method not implemented.');
    }
    removeOutgoing(
        label?: string,
        filter?: string | import('../../src/types').VertexSelector<this>
    ): void {
        throw new Error('Method not implemented.');
    }
    removeType(...typeIds: string[]): this {
        throw new Error('Method not implemented.');
    }
    setAttributeValue(name: string, value: any): this;
    setAttributeValue(name: string, value: string, language: string): this;
    setAttributeValue(name: string, value: any, language?: string): this {
        throw new Error('Method not implemented.');
    }
    setIncoming(label: string, fromVertex: Vertex): this;
    setIncoming(label: string, fromVertex: string, createIfNotExists?: boolean): this;
    setIncoming(label: string, fromVertex: string | Vertex, createIfNotExists?: boolean): this {
        throw new Error('Method not implemented.');
    }
    setOutgoing(label: string, toVertex: Vertex): this;
    setOutgoing(label: string, toVertex: string, createIfNotExists?: boolean): this;
    setOutgoing(label: string, toVertex: string | Vertex, createIfNotExists?: boolean): this {
        throw new Error('Method not implemented.');
    }
    setType(...types: string[]): this {
        throw new Error('Method not implemented.');
    }
    toJson<T = any>(options: import('../../src/types').JsonFormatOptions): Promise<T> {
        throw new Error('Method not implemented.');
    }
}

export class FakeEdge implements Edge<FakeVertex> {
    constructor(
        private readonly _label: string,
        public from: FakeVertex,
        public to: FakeVertex,
        private readonly _graph: JsonldGraph<FakeVertex, FakeEdge>
    ) {}

    get label(): string {
        return this._graph.compactIRI(this._label);
    }
}

export class FakeTypesFactory implements GraphTypesFactory<FakeVertex, FakeEdge> {
    createEdge(
        label: string,
        from: FakeVertex,
        to: FakeVertex,
        graph: JsonldGraph<FakeVertex, FakeEdge>
    ): FakeEdge {
        return new FakeEdge(label, from, to, graph);
    }

    createVertex(
        id: string,
        typeIds: string[],
        graph: JsonldGraph<FakeVertex, FakeEdge>
    ): FakeVertex {
        return new FakeVertex(id, graph);
    }
}