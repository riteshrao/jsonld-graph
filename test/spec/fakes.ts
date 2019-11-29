import { Edge, Vertex, GraphTypesFactory, JsonldGraph } from '../../src/types';

export class FakeVertex implements Vertex {
    constructor(
        private readonly _id: string, 
        private readonly _graph: JsonldGraph<FakeVertex, FakeEdge>
    ) { }

    get id(): string {
        return this._graph.compactIRI(this._id);
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
    createEdge(label: string, from: FakeVertex, to: FakeVertex, graph: JsonldGraph<FakeVertex, FakeEdge>): FakeEdge {
        return new FakeEdge(label, from, to, graph);
    }

    createVertex(id: string, graph: JsonldGraph<FakeVertex, FakeEdge>): FakeVertex {
        return new FakeVertex(id, graph);
    }
}
