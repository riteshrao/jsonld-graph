import GraphIndex, { IndexEdge } from './graphIndex';
import Vertex from './vertex';

/**
 * @description Edge selector function.
 * @export
 * @interface EdgeSelector
 */
export interface EdgeSelector {
    (edge: Edge): boolean;
}

/**
 * @description Edge filter type that can be used to match edges based on a supplied filter.
 * @export
 * @class EdgeFilter
 */
export class EdgeFilter {
    /**
     * @description Creates an instance of EdgeFilter.
     * @param {(string | types.EdgeSelector)} filter The filter definition to use.
     * @memberof EdgeFilter
     */
    constructor(private readonly filter: string | EdgeSelector) { }

    /**
     * @description Checks if the configured filter matches the specified edge.
     * @param {Edge} edge The edge to match.
     * @returns
     * @memberof EdgeFilter
     */
    match(edge: Edge) {
        if (!this.filter) {
            return true;
        }

        if (typeof this.filter === 'string') {
            return edge.label === this.filter;
        }

        return this.filter(edge);
    }
}

/**
 * @description Represents an edge in the graph with outgoing and incoming vertex references.
 * @export
 * @class Edge
 */
export class Edge {

    private readonly _graphEdge: IndexEdge;
    private readonly _index: GraphIndex;

    /**
     * @description Creates an instance of Edge.
     * @param {IndexEdge} indexEdge The edge index this edge wraps.
     * @memberof Edge
     */
    constructor(indexEdge: IndexEdge, index: GraphIndex) {
        if (!indexEdge) {
            throw new ReferenceError(`Invalid graphEdge. graphEdge is ${indexEdge}`);
        }

        if (!index) {
            throw new ReferenceError(`Invalid `);
        }

        this._graphEdge = indexEdge;
        this._index = index;
    }

    /**
     * @description Gets the id of the edge.
     * @readonly
     * @returns {string}
     * @memberof Edge
     */
    get id(): string {
        return this._graphEdge.id;
    }

    /**
     * @description Gets the edge label.
     * @readonly
     * @type {string}
     * @memberof Edge
     */
    get label(): string {
        return this._graphEdge.label;
    }

    /**
     * @description Gets the reference to the outgoing vertex.
     * @readonly
     * @type {Vertex}
     * @memberof Edge
     */
    get fromVertex(): Vertex {
        const node = this._index.getNode(this._graphEdge.fromNodeId);
        return new Vertex(node, this._index);
    }

    /**
     * @description Gets the reference to the incoming vertex.
     * @readonly
     * @type {Vertex}
     * @memberof Edge
     */
    get toVertex(): Vertex {
        const node = this._index.getNode(this._graphEdge.toNodeId);
        return new Vertex(node, this._index);
    }
}

export default Edge;