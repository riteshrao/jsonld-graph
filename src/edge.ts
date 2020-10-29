import JsonldGraph from './graph';
import Vertex from './vertex';

export interface SerializedEdge {
    iri: string;
    from: string;
    to: string;
}

/**
 * @description Edge in a {@link JsonldGraph}
 * @export
 * @class GraphEdge
 */
export default class Edge {
    private readonly _iri: string;
    private readonly _graph: JsonldGraph;

    /**
     * Creates an instance of Edge.
     * @param {string} iri The IRI of the edge.
     * @param {V} from The outgoing vertex.
     * @param {V} to The incoming vertex.
     * @memberof Edge
     */
    constructor(
        iri: string,
        public readonly from: Vertex,
        public readonly to: Vertex,
        graph: JsonldGraph) {
        if (!iri) {
            throw new ReferenceError(`Invalid label. label is '${iri}'`);
        }
        if (!from) {
            throw new ReferenceError(`Invalid from vertex. from vertex is ${from}`);
        }
        if (!to) {
            throw new ReferenceError(`Invalid to vertex. to vertex is ${to}`);
        }
        if (!graph) {
            throw new ReferenceError(`Invalid json`)
        }

        this._iri = iri;
        this._graph = graph;
    }

    /**
     * @description Gets the fully qualified IRI of the edge.
     * @readonly
     * @type {string}
     * @memberof Edge
     */
    get iri(): string {
        return this._iri;
    }

    /**
     * @description Gets the compact edge label. If no configured prefix is found, the fully qualified IRI of the edge is returned.
     * @readonly
     * @type {string}
     * @memberof Edge
     */
    get label(): string {
        return this._graph.compactIRI(this._iri);
    }

    /**
     * @description Serializes the edge.
     * @returns {SerializedEdge}
     * @memberof Edge
     */
    serialize(): SerializedEdge {
        return {
            iri: this._iri,
            from: this.from.iri,
            to: this.to.iri
        }
    }

    /**
     * @description Deserializes an edge.
     * @static
     * @param {SerializedEdge} serialized The serialized representation of the edge to create the edge instance fro.
     * @param {JsonldGraph} graph The graph to associate the edge with.
     * @memberof Edge
     */
    static deserialize(serialized: SerializedEdge, graph: JsonldGraph) {
        const fromV = graph.getVertex(serialized.from)!;
        const toV = graph.getVertex(serialized.to)!;
        return new Edge(serialized.iri, fromV, toV, graph);
    }
}
