import * as types from './types';

/**
 * @description Edge in a {@link JsonldGraph}
 * @export
 * @class GraphEdge
 */
export default class Edge<V extends types.Vertex> implements types.Edge<V> {
    /**
     * Creates an instance of Edge.
     * @param {string} label The label of the edge.
     * @param {V} from The outgoing vertex.
     * @param {V} to The incoming vertex.
     * @memberof Edge
     */
    constructor(public readonly label: string, public readonly from: V, public readonly to: V) {
        if (!label) {
            throw new ReferenceError(`Invalid label. label is '${label}'`);
        }
        if (!from) {
            throw new ReferenceError(`Invalid from vertex. from vertex is ${from}`);
        }
        if (!to) {
            throw new ReferenceError(`Invalid to vertex. to vertex is ${to}`);
        }
    }
}
