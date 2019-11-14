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
    private readonly _graph: GraphType;

    /**
     * Creates an instance of GraphTypesFactory.
     * @param {GraphType} graph The JSON ld graph type.
     * @memberof GraphTypesFactory
     */
    constructor(graph: GraphType) {
        if (!graph) {
            throw new ReferenceError(`Invalid graph. graph is ${graph}`);
        }

        this._graph = graph;
    }

    /**
     * @description Creates a new edge.
     * @param {string} label The label of the edge.
     * @param {types.Vertex} from The outgoing vertex of the edge.
     * @param {types.Vertex} to The incoming vertex of the edge.
     * @returns {Edge}
     * @memberof GraphTypesFactory
     */
    createEdge(label: string, from: Vertex, to: Vertex): Edge<Vertex> {
        throw new Error('Method not implemented.');
    }

    /**
     * @description Creates a new vertex.
     * @param {string} id The id of the vertex.
     * @returns {Vertex}
     * @memberof GraphTypesFactory
     */
    createVertex(id: string): Vertex {
        throw new Error('Method not implemented.');
    }
}
