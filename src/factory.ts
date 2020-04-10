import Vertex from './vertex';
import * as types from './types';

type GraphType = types.JsonldGraph<Vertex>;

/**
 * @description Default graph type factory.
 * @export
 * @class GraphFactory
 * @implements {types.GraphFactory}
 */
export default class GraphTypesFactory implements types.GraphTypesFactory<Vertex> {
    /**
     * @description Creates a new vertex.
     * @param {string} id The id of the vertex.
     * @param {string[]} typeIds The type ids of the vertex.
     * @returns {Vertex}
     * @memberof GraphTypesFactory
     */
    createVertex(id: string, graph: GraphType): Vertex {
        if (!id) {
            throw new ReferenceError(`Invalid id. id is '${id}'`);
        }

        if (!graph) {
            throw new ReferenceError(`Invalid graph. graph is ${graph}`);
        }

        return new Vertex(id, graph);
    }
}
