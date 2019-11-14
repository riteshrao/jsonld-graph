import * as types from './types';

/**
 * @description Edge in a {@link JsonldGraph}
 * @export
 * @class GraphEdge
 */
export default class Edge<V extends types.Vertex> implements types.Edge<V> {
    label: string;
    from: V;
    to: V;
}
