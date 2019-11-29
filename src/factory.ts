import Vertex from './vertex';
import Edge from './edge';
import * as types from './types';

type GraphType = types.JsonldGraph<Vertex, Edge<Vertex>>;

/**
 * @description Default graph type factory.
 * @export
 * @class GraphFactory
 * @implements {types.GraphFactory}
 */
export default class GraphTypesFactory implements types.GraphTypesFactory<Vertex, Edge<Vertex>> {
    /**
     * @description Creates a new edge.
     * @param {string} label The label of the edge.
     * @param {string} from The outgoing vertex of the edge.
     * @param {string} to The incoming vertex of the edge.
     * @returns {Edge}
     * @memberof GraphTypesFactory
     */
    createEdge(label: string, from: Vertex, to: Vertex): Edge<Vertex> {
        return new Edge(label, from, to);
    }

    /**
     * @description Creates a new vertex.
     * @param {string} id The id of the vertex.
     * @returns {Vertex}
     * @memberof GraphTypesFactory
     */
    createVertex(id: string, graph: GraphType): Vertex {
        return new Vertex(id, graph);
    }
}
