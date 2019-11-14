import { Edge, Vertex } from '../../src/types';

export class FakeVertex implements Vertex {
    public id: string;
}å

export class FakeEdge implements Edge<FakeVertex> {
    public label: string;
    public from: FakeVertex;
    public to: FakeVertex;
}