import * as types from './types';

/**
 * @description Edge in a {@link JsonldGraph}
 * @export
 * @class GraphEdge
 */
export default class Edge<V extends types.Vertex> implements types.Edge<V> {
    private readonly _graph: types.JsonldGraph<V, Edge<V>>;
    constructor(
        public readonly label: string,
        public readonly from: V,
        public readonly to: V,
        graph: types.JsonldGraph<V, Edge<V>>
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

        this._graph = graph;
    }
}
