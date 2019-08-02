import { EventEmitter } from 'events';
import Iterable from 'jsiterable';

import Edge from './edge';
import GraphIndex from './graphIndex';
import Vertex, { VertexSelector, VertexFilter } from './vertex';
import StrictEventEmitter from './eventEmitter';
import JsonFormatOptions from './formatOptions';

interface GraphEvents {
    edgeAdded(edge: Edge): void;
    edgeRemoved(edge: Edge): void;
    vertexAdded(vertex: Vertex): void;
    vertexIdChanged(vertex: Vertex, previousId: string): void;
    vertexRemoved(vertex: Vertex): void;
}

type GraphEventEmitter = StrictEventEmitter<EventEmitter, GraphEvents>;

export class JsonldGraph extends (EventEmitter as { new (): GraphEventEmitter }) {
    private readonly _index: GraphIndex;

    /**
     * Creates an instance of JsonLdGraph.
     * @memberof JsonLdGraph
     */
    constructor(contexts?: [{ uri: string; context: any }]) {
        super();
        this._index = new GraphIndex();
        this._index.on('edgeCreated', indexEdge => this.emit('edgeAdded', new Edge(indexEdge, this._index)));
        this._index.on('edgeDeleted', indexEdge => this.emit('edgeRemoved', new Edge(indexEdge, this._index)));
        this._index.on('nodeCreated', indexNode => this.emit('vertexAdded', new Vertex(indexNode, this._index)));
        this._index.on('nodeDeleted', indexNode => this.emit('vertexRemoved', new Vertex(indexNode, this._index)));
        this._index.on('nodeIdChanged', (indexNode, previousId) =>
            this.emit('vertexIdChanged', new Vertex(indexNode, this._index), previousId)
        );

        if (contexts && contexts.length > 0) {
            for (const { uri, context } of contexts) {
                this._index.addContext(uri, context);
            }
        }
    }

    /**
     * @description Gets the contexts registered with the graph.
     * @readonly
     * @type {Iterable<[string, any]>}
     * @memberof JsonldGraph
     */
    get contexts(): Iterable<[string, any]> {
        return this._index.contexts;
    }

    /**
     * @description Gets the count of edges in the graph.
     * @readonly
     * @type {number}
     * @memberof JsonLdGraph
     */
    get edgeCount(): number {
        return this._index.edgeCount;
    }

    /**
     * @description Gets the count of vertices in the graph.
     * @readonly
     * @type {number}
     * @memberof JsonLdGraph
     */
    get vertexCount(): number {
        return this._index.nodeCount;
    }

    /**
     * @description Adds a context.
     * @param {string} uri The uri of the context to add.
     * @param {*} context The context object.
     * @memberof JsonLdGraph
     */
    addContext(uri: string, context: any): void {
        this._index.addContext(uri, context);
    }

    /**
     * @description Adds a prefix to the graph that allows accessing and creating edges & vertices using short ids containing the prefix.
     * @param {string} prefix The prefix to add.
     * @param {string} uri A valid URI that the prefix maps to.
     * @memberof JsonldGraph
     */
    addPrefix(prefix: string, uri: string): void {
        this._index.addPrefix(prefix, uri);
    }

    /**
     * @description Creates a new vertex.
     * @param {string} id Id of the vertex to create.
     * @returns {Vertex}
     * @memberof JsonLdGraph
     */
    createVertex(id: string): Vertex {
        if (!id) {
            throw new ReferenceError(`Invalid id. id is ${id}`);
        }

        const existing = this._index.getNode(id);
        if (existing) {
            return new Vertex(existing, this._index);
        } else {
            const node = this._index.createNode(id);
            return new Vertex(node, this._index);
        }
    }

    /**
     * @description Gets edges in the graph.
     * @param {string} [label] Optional label to filter only edges with the specified label.
     * @returns {Iterable<Edge>}
     * @memberof JsonLdGraph
     */
    getEdges(label?: string): Iterable<Edge> {
        return new Iterable(this._index.getEdges(label)).map(x => new Edge(x, this._index));
    }

    /**
     * @description Gets all vertices with the specified incoming edge.
     * @param {string} edgeLabel The label of the incoming edge.
     * @param {(string | VertexSelector)} [vertexSelector] Optional vertex selector that is used to filter only matching vertices.
     * @returns {Iterable<Vertex>}
     * @memberof JsonLdGraph
     */
    getIncoming(edgeLabel: string, vertexSelector?: string | VertexSelector): Iterable<Vertex> {
        if (!edgeLabel) {
            throw new ReferenceError(`Invalid edgeLabel. edgeLabel is ${edgeLabel}`);
        }

        const filter = new VertexFilter(vertexSelector);
        return new Iterable(this._index.getEdgeIncoming(edgeLabel))
            .map(node => new Vertex(node, this._index))
            .filter(vertex => filter.match(vertex));
    }

    /**
     * @description Gets all vertices with the specified outgoing edge.
     * @param {string} edgeLabel The label of the outgoing edge.
     * @param {(string | VertexSelector)} [vertexSelector] Optional vertex selector that is used to filter only matching vertices.
     * @returns {Iterable<Vertex}
     * @memberof JsonLdGraph
     */
    getOutgoing(edgeLabel: string, vertexSelector?: string | VertexSelector): Iterable<Vertex> {
        if (!edgeLabel) {
            throw new ReferenceError(`Invalid edgeLabel. edgeLabel is ${edgeLabel}`);
        }

        const filter = new VertexFilter(vertexSelector);
        return new Iterable(this._index.getEdgeOutgoing(edgeLabel))
            .map(node => new Vertex(node, this._index))
            .filter(vertex => filter.match(vertex));
    }

    /**
     * @description Gets all vertices in the graph.
     * @param {VertexSelector} [vertexSelector] Optional vertex selector that is used to filter only matching vertices.
     * @returns {Iterable<Vertex>}
     * @memberof JsonLdGraph
     */
    getVertices(vertexSelector?: VertexSelector): Iterable<Vertex> {
        const filter = new VertexFilter(vertexSelector);
        return new Iterable(this._index.getNodes())
            .map(node => new Vertex(node, this._index))
            .filter(vertex => filter.match(vertex));
    }

    /**
     * @description Gets a specific vertex in the graph.
     * @param {string} id Id of the vertex to get.
     * @returns {Vertex}
     * @memberof JsonLdGraph
     */
    getVertex(id: string): Vertex {
        if (!id) {
            throw new ReferenceError(`Invalid id. id is ${id}`);
        }

        const node = this._index.getNode(id);
        if (!node) {
            return null;
        } else {
            return new Vertex(node, this._index);
        }
    }

    /**
     * @description Checks if a edge exists.
     * @param {string} label The label of the edge.
     * @param {string} fromVertexId The outgoing vertex id.
     * @param {string} toVertexId The incoming vertex id.
     * @returns {boolean}
     * @memberof JsonLdGraph
     */
    hasEdge(label: string, fromVertexId: string, toVertexId: string): boolean {
        return this._index.hasEdge(label, fromVertexId, toVertexId);
    }

    /**
     * @description Checks if a vertex exists.
     * @param {string} id The id of the vertex to check.
     * @returns {boolean}
     * @memberof JsonLdGraph
     */
    hasVertex(id: string): boolean {
        return this._index.hasNode(id);
    }

    /**
     * @description Loads one or more documents into the graph.
     * @param {(any | any[])} inputs Input documents to load into the graph.
     * @param {string|string[]|object|object[]} [contexts] Optional contexts to use for importing the documents.
     * @param {string} [base] Optional base IRI of the inputs.
     * @returns {Promise<Set<string>>} A set containing all vertices that were created / added as part of the load.
     * @memberof JsonLdGraph
     */
    async load(
        inputs: any | any[],
        contexts?: string | string[] | object | object[],
        base?: string
    ): Promise<Set<string>> {
        return this._index.load(inputs, contexts, base);
    }

    /**
     * @description Merges a set of JSON-LD documents into the graph.
     * @param {(any | any[])} inputs The inputs to merge.
     * @param {string[]} [contexts] The contexts to merge.
     * @param {string} [base] The base IRI of the document.
     * @returns {Promise<Set<string>>} A set containing all vertices that were created / added as part of the load.
     * @memberof JsonLdGraph
     */
    async merge(
        inputs: any | any[],
        contexts?: string | string[] | object | object[],
        base?: string
    ): Promise<Set<string>> {
        return this._index.merge(inputs, contexts, base);
    }

    /**
     * @description Removes a context.
     * @param {string} uri The uri of the context to remove.
     * @returns {void}
     * @memberof JsonLdGraph
     */
    removeContext(uri: string): void {
        return this._index.removeContext(uri);
    }

    /**
     * @description Removes a prefix previously added to the graph.
     * @param {string} prefix The prefix to remove from the graph.
     * @returns {void}
     * @memberof JsonldGraph
     */
    removePrefix(prefix: string): void {
        return this._index.removePrefix(prefix);
    }

    /**
     * @description Removes a vertex from the graph.
     * @param {(string | Vertex)} vertex The vertex id or vertex instance to remove from the graph.
     * @memberof JsonLdGraph
     */
    removeVertex(vertex: string | Vertex): void {
        if (!vertex) {
            throw new ReferenceError(`Invalid vertex. vertex is ${vertex}`);
        }

        const nodeId = typeof vertex === 'string' ? vertex : vertex.id;
        this._index.removeNode(nodeId);
    }

    /**
     * @description Gets a JSON representation of the graph.
     * @param {string[]} contexts Contexts to use for compaction.
     * @param {*} [frame] Optional frame to use for formatting the JSON output.
     * @returns {Promise<any>}
     * @memberof JsonLdGraph
     */
    /* tslint:disable:promise-function-async*/
    toJson(options?: JsonFormatOptions): Promise<any> {
        return this._index.toJson(options);
    }
}

export default JsonldGraph;
