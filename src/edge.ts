import * as types from './types';

/**
 * @description Edge in a {@link JsonldGraph}
 * @export
 * @class GraphEdge
 */
export default class Edge<V extends types.Vertex> implements types.Edge<V> {
    private readonly _label: string;
    private readonly _graph: types.JsonldGraph<V>;

    /**
     * Creates an instance of Edge.
     * @param {string} label The label of the edge.
     * @param {V} from The outgoing vertex.
     * @param {V} to The incoming vertex.
     * @memberof Edge
     */
    constructor(
        label: string,
        public readonly from: V,
        public readonly to: V,
        graph: types.JsonldGraph<V>
    ) {
        if (!label) {
            throw new ReferenceError(`Invalid label. label is '${label}'`);
        }
        if (!from) {
            throw new ReferenceError(`Invalid from vertex. from vertex is ${from}`);
        }
        if (!to) {
            throw new ReferenceError(`Invalid to vertex. to vertex is ${to}`);
        }
        if (!graph) {
            throw new ReferenceError(`Invalid graph. graph is ${graph}`);
        }

        this._label = label;
        this._graph = graph;
    }

    get label(): string {
        return this._graph.compactIRI(this._label);
    }
}
