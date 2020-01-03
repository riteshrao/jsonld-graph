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
        if (!label) {
            throw new ReferenceError(`Invalid label. label is '${label}'`);
        }

        if (!from) {
            throw new ReferenceError(`Invalid from vertex. from is ${from}`);
        }

        if (!to) {
            throw new ReferenceError(`Invalid to vertex. to is ${to}`);
        }

        return new Edge(label, from, to);
    }

    /**
     * @description Creates a new vertex.
     * @param {string} id The id of the vertex.
     * @param {string[]} typeIds The type ids of the vertex.
     * @returns {Vertex}
     * @memberof GraphTypesFactory
     */
    createVertex(id: string, typeIds: string[], graph: GraphType): Vertex {
        if (!id) {
            throw new ReferenceError(`Invalid id. id is '${id}'`);
        }

        if (!graph) {
            throw new ReferenceError(`Invalid graph. graph is ${graph}`);
        }
        const vertex = new Vertex(id, graph);
        if (typeIds && typeIds.length > 0) {
            vertex.setType(...typeIds);
        }

        return vertex;
    }
}
