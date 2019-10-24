/**
 * @description Node in a {@link JsonldGraph}.
 * @export
 * @class GraphNode
 */
export default class Vertex {
    /**
     * @description Gets the id of the node.
     * @readonly
     * @type {string}
     * @memberof Node
     */
    get id(): string {
        throw new Error('Not implemented');
    }

    /**
     * @description Sets the id of the node.
     * @memberof Node
     */
    set id(iri: string) {
        throw new Error('Not implemented');
    }
}
