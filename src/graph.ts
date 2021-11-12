import Iterable from 'jsiterable';
import * as jsonld from 'jsonld';
import { RemoteDocument } from 'jsonld/jsonld-spec';
import shortid from 'shortid';
import { BlankNodePrefix, JsonldKeywords } from './constants';
import Edge, { SerializedEdge } from './edge';
import * as errors from './errors';
import * as formatter from './formatter';
import Vertex, { SerializedVertex } from './vertex';

type Loader = (url: string) => Promise<RemoteDocument>;
const PREFIX_REGEX = /^[a-zA-z][a-zA-Z0-9]*$/;

/**
 * @description Factory interface for creating vertex instances.
 * @export
 * @interface GraphVertexFactory
 */
export interface GraphVertexFactory<V extends Vertex = Vertex> {
    (iri: string, types: string[], graph: JsonldGraph<V>): V;
}

/**
 * @description Graph options.
 * @export
 * @interface JsonldGraphOptions
 */
export interface GraphOptions<V extends Vertex = Vertex> {
    /**
     * @description True to enable loading contexts from remote sources, else false.
     * @type {boolean}
     * @memberof GraphOptions
     */
    remoteContexts?: boolean;
    /**
     * @description Factory used to create graph edges and vertices.
     * @type {types.GraphTypesFactory}
     * @memberof JsonldGraphOptions
     */
    vertexFactory?: GraphVertexFactory<V>;
    /**
     * @description Resolver function that can resolve the type of blank type ertex nodes.
     * @type {VertexResolver<V>}
     * @memberof GraphOptions
     */
    blankTypeResolver?: (vertex: Vertex) => string[] | undefined;
    /**
     * @description Resolver function that can resolve the id of blank id vertex nodes.
     * @type {VertexResolver<V>}
     * @memberof GraphOptions
     */
    blankIriResolver?: (vertex: Vertex) => string | undefined;
    /**
     * @description Conflict resolver that can resolve @type of anode being merged
     * @memberof GraphOptions
     */
    typeConflictResolver?: (source: string[], target: string[]) => string[] | undefined;
}

/**
 * @description Graph load options.
 * @export
 * @interface GraphLoadOptions
 */
export interface GraphLoadOptions {
    /**
     * @description The base IRI of inputs.
     * @type {string}
     * @memberof GraphLoadOptions
     */
    base?: string;
    /**
     * @description Contexts to apply to inputs that don't explicitly specify an @context
     * @type {(string | string [] | object | object[])}
     * @memberof GraphLoadOptions
     */
    contexts?: string | string[] | any | any[];
    /**
     * @description True to merge attributes of existing vertices, else append attribute values.
     * @type {boolean}
     * @memberof GraphLoadOptions
     */
    merge?: boolean;
    /**
     * @description Normalize all blank id and blank type vetices after load.
     * @type {boolean}
     * @memberof GraphLoadOptions
     */
    normalize?: boolean;
    /**
     * @description Optional callback function to invoke for translating an identity
     * @memberof GraphLoadOptions
     */
    identityTranslator?: (id: string) => string;

    /**
     * @description Optional callback that validates explicit @ids found in the document being laoded.
     * @memberof GraphLoadOptions
     */
    identityValidator?: (id: string) => boolean;
    /**
     * @description Set to true to only allow unique @id definitions.
     * @type {boolean}
     * @memberof GraphLoadOptions
     */
    unique?: boolean;
}

export interface SerializedGraph {
    vertices: SerializedVertex[];
    edges: SerializedEdge[];
    indices: Record<string, string[]>;
}

/**
 * @description Represents a graph of JSON-LD triples
 * @export
 * @class JsonldGraph
 * @extends {EventEmitter}
 * @implements {JsonldGraph}
 */
export default class JsonldGraph<V extends Vertex = Vertex> {
    private static IX_EDGES_KEY = (label: string): string => `[e]::${label}`;
    private static IX_NODE_INCOMING_ALL = (id: string): string => `[v]::${id}_[in]`;
    private static IX_NODE_INCOMING_EDGES = (id: string, label: string): string =>
        `[v]::${id}_[in]_[e]::${label}`;
    private static IX_NODE_OUTGOING_ALL = (id: string): string => `[v]::${id}_[out]`;
    private static IX_NODE_OUTGOING_EDGES = (id: string, label: string): string =>
        `[v]::${id}_[out]_[e]::${label}`;
    private static IX_BLANK_NODES = `[v]::BLANK_NODES`;
    private static IX_BLANK_TYPES = `[v]::BLANK_TYPES`;

    private _edges = new Map<string, Edge<V>>();
    private _vertices = new Map<string, V>();
    private _indexMap = new Map<string, Set<string>>();
    private _prefixes = new Map<string, string>();
    private _contexts = new Map<string, any>();
    private readonly _options: GraphOptions;
    private readonly _remoteLoader: Loader;
    private readonly _documentLoader: Loader;
    private readonly _vertexFactory: GraphVertexFactory<V>;

    /**
     * Creates an instance of JsonldGraph.
     * @param {types.GraphOptions} [options] Graph options.
     * @memberof JsonldGraph
     */
    constructor(options: GraphOptions<V> = {}) {
        this._options = options;
        this._vertexFactory = options.vertexFactory || function (iri: string, _: string[], graph: JsonldGraph): Vertex {
            return new Vertex(iri, graph);
        } as any

        if (options.remoteContexts) {
            this._remoteLoader =
                typeof process !== undefined && process.versions && process.versions.node
                    ? (jsonld as any).documentLoaders.node()
                    : (jsonld as any).documentLoaders.xhr();
        }
        
        this._documentLoader = async (url: string): Promise<any> => {
            const normalizedUrl = url.toLowerCase();
            if (this._contexts.has(normalizedUrl)) {
                return Promise.resolve<RemoteDocument>({
                    contextUrl: undefined,
                    documentUrl: url,
                    document: this._contexts.get(normalizedUrl)
                });
            }

            if (this._options?.remoteContexts && this._remoteLoader) {
                return this._remoteLoader(url);
            }

            throw new errors.ContextNotFoundError(url);
        };

        this._indexMap.set(JsonldGraph.IX_BLANK_NODES, new Set());
        this._indexMap.set(JsonldGraph.IX_BLANK_TYPES, new Set());
    }

    /**
     * @description Gets the count of edges in the graph.
     * @readonly
     * @type {number}
     * @memberof JsonldGraph
     */
    get edgeCount(): number {
        return this._edges.size;
    }

    /**
     * @description Gets the count of vertices in the graph.
     * @readonly
     * @type {number}
     * @memberof JsonldGraph
     */
    get vertexCount(): number {
        return this._vertices.size;
    }

    /**
     * @description Gets all contexts added to the graph.
     * @readonly
     * @type {IterableIterator<[string, any]>}
     * @memberof JsonldGraph
     */
    get contexts(): IterableIterator<[string, any]> {
        return this._contexts.entries();
    }

    /**
     * @description Gets all vertices that have blank ids in the graph.
     * @readonly
     * @type {Iterable<V>}
     * @memberof JsonldGraph
     */
    get blankNodes(): Iterable<V> {
        if (!this._indexMap.has(JsonldGraph.IX_BLANK_NODES)) {
            return Iterable.empty();
        }

        const _that = this;
        return new Iterable(function* blankNodesGenerator() {
            for (const id of _that._indexMap.get(JsonldGraph.IX_BLANK_NODES)!) {
                yield _that.getVertex(id)!;
            }
        });
    }

    /**
     * @description Gets all vertices that have blank types in the graph.
     * @readonly
     * @type {Iterable<V>}
     * @memberof JsonldGraph
     */
    get blankTypes(): Iterable<V> {
        if (!this._indexMap.has(JsonldGraph.IX_BLANK_TYPES)) {
            return Iterable.empty();
        }

        const _that = this;
        return new Iterable(function* blankTypesGenerator() {
            for (const id of _that._indexMap.get(JsonldGraph.IX_BLANK_TYPES)!) {
                yield _that.getVertex(id)!;
            }
        });
    }

    /**
     * @description Adds a context to the graph.
     * @param {string} url The url of the context.
     * @param {*} context The context definition JSON.
     * @memberof JsonldGraph
     */
    addContext(url: string, context: any): void {
        if (!url) {
            throw new ReferenceError(`Invalid url. url is '${url}'`);
        }

        if (!context) {
            throw new ReferenceError(`Invalid context. context is ${context}`);
        }

        if (typeof context !== 'object') {
            throw new TypeError(
                `Invalid context. Expected context to be a JSON object, but got ${typeof context}`
            );
        }

        const normalizedUrl = url.toLowerCase();
        if (this._contexts.has(normalizedUrl)) {
            throw new errors.DuplicateContextError(url);
        }

        this._contexts.set(normalizedUrl, context);
    }

    /**
     * @description Compacts an IRI with a mapped prefix.
     * @param {string} iri The IRI to compact.
     * @returns {string}
     * @memberof JsonldGraph
     */
    compactIRI(iri: string): string {
        if (!iri) {
            throw new ReferenceError(`Invalid iri. iri is '${iri}'`);
        }

        this.validateIRI(iri);
        for (const [prefix, mappedIRI] of this._prefixes) {
            if (iri.startsWith(mappedIRI) && mappedIRI.toLowerCase() !== iri.toLowerCase()) {
                let compacted = iri.replace(mappedIRI, '');
                if (compacted.startsWith('/') || compacted.startsWith(':')) {
                    compacted = compacted.slice(1, compacted.length);
                }

                return `${prefix}:${compacted}`;
            }
        }

        return iri;
    }

    /**
     * @description Creates a new edge.
     * @param {string} label The label of the edge.
     * @param {(string | V)} fromVertex The outgoing vertex id or instance.
     * @param {(string | V)} toVertex The incoming vertex id or instance.
     * @param {[boolean]} createIncoming True to create the incoming vertex, else false.
     * @memberof JsonldGraph
     */
    createEdge(label: string, fromVertex: string | V, toVertex: string | V): Edge<V> {
        if (!label) {
            throw new ReferenceError(`Invalid label. label is '${label}'`);
        }
        if (!fromVertex) {
            throw new ReferenceError(`Invalid from vertex. from vertex is '${fromVertex}'`);
        }
        if (!toVertex) {
            throw new ReferenceError(`Invalid toVertex. toVertex is '${toVertex}'`);
        }

        const outgoingV = typeof fromVertex === 'string' ? this.getVertex(fromVertex) : fromVertex;
        const incomingV = typeof toVertex === 'string' ? this.getVertex(toVertex) : toVertex;

        if (!outgoingV) {
            throw new errors.VertexNotFoundError(fromVertex as string);
        }

        if (!incomingV) {
            throw new errors.VertexNotFoundError(fromVertex as string);
        }

        if (incomingV && incomingV.id === outgoingV.id) {
            throw new errors.CyclicEdgeError(label, outgoingV.id);
        }

        const edgeIRI = this.expandIRI(label, true);
        const edgeId = this._formatEdgeId(
            edgeIRI,
            outgoingV.iri,
            incomingV.iri
        );

        if (this._edges.has(edgeId)) {
            throw new errors.DuplicateEdgeError(label, outgoingV.id, incomingV!.id);
        }

        const edge = new Edge<V>(edgeIRI, outgoingV!, incomingV!, this);
        this._edges.set(edgeId, edge);
        this._addEdgeIndices(edge);
        return edge;
    }

    /**
     * @description Creates a new vertex using the vertex factory.
     * @param {string} id The id of the vertex to create.
     * @param {string} types Optional type ids of the vertex to create.
     * @returns {V}
     * @memberof JsonldGraph
     */
    createVertex(id: string, ...types: string[]): V {
        if (!id) {
            throw new ReferenceError(`Invalid id. id is '${id}'`);
        }

        const expandedId = this.expandIRI(id, true);
        const expandedTypeIds = types && types.map(typeId => this.expandIRI(typeId, true));

        if (this.hasVertex(expandedId)) {
            throw new errors.DuplicateVertexError(id);
        }

        const vertex = this._vertexFactory(expandedId, types, this);

        if (!vertex) {
            throw new ReferenceError(`Invalid vertex returned from factory. vertex is ${vertex}`);
        }

        this._vertices.set(expandedId, vertex);
        if (expandedTypeIds && expandedTypeIds.length > 0) {
            vertex.setType(...types);
        }

        return vertex;
    }

    /**
     * @description Expands a compacted IRI.
     * @param {string} iri The compacted IRI to expand.
     * @returns {string}
     * @memberof JsonldGraph
     */
    expandIRI(iri: string, validate = false): string {
        if (!iri) {
            throw new ReferenceError(`Invalid iri. iri is '${iri}'`);
        }

        const prefixIndex = iri.indexOf(':');
        if (prefixIndex <= 0) {
            if (validate) {
                this.validateIRI(iri);
            }

            return iri;
        }

        const prefix = iri.substring(0, prefixIndex);
        const component = iri.substring(prefixIndex + 1);
        let expandedIri: string;
        if (this._prefixes.has(prefix)) {
            expandedIri = `${this._prefixes.get(prefix)}${component}`;
        } else {
            expandedIri = iri;
        }

        if (validate) {
            this.validateIRI(expandedIri);
        }

        return expandedIri;
    }

    async getContext(contextUri: string): Promise<any> {
        if (!contextUri) {
            throw new ReferenceError(`Invalid contextUri. contextUri is '${contextUri}`);
        }

        const context = this._contexts.get(contextUri);
        if (context) {
            return Promise.resolve(context);
        }

        if (this._options?.remoteContexts) {
            const result = await this._remoteLoader(contextUri);
            return result.document;
        }

        return undefined;
    }

    /**
     * @description Gets all the contexts associated with the graph.
     * @readonly
     * @type {Iterable<[string, any]>}
     * @memberof JsonldGraph
     */
    getContexts(): Iterable<[string, any]> {
        if (this._contexts.size === 0) {
            return Iterable.empty();
        } else {
            return new Iterable(this._contexts.entries());
        }
    }

    /**
     * @description Gets edges in the graph.
     * @param {string} [label] Optional label filter to only return edges with the specified label.
     * @returns {Iterable<E>}
     * @memberof JsonldGraph
     */
    getEdges(label?: string): Iterable<Edge<V>> {
        if (!label) {
            return new Iterable(this._edges.values());
        } else {
            const expandedLabel = this.expandIRI(label);
            return new Iterable(this._edges.values()).filter(
                x => this.expandIRI(x.label) === expandedLabel
            );
        }
    }

    /**
     * @description Gets all incoming edges to a vertex.
     * @param {string} vertex The vertex id whose incoming edges is returned.
     * @param {string} [label] Optional label used to filter only edges with the specified label.
     * @returns {Iterable<E>} Iterable containing all matching incoming edges
     * @memberof JsonldGraph
     */
    getIncomingEdges(vertex: string, label?: string): Iterable<Edge<V>> {
        if (!vertex) {
            throw new ReferenceError(`Invalid vertex id. vertex id is '${vertex}`);
        }

        const vertexIRI = this.expandIRI(vertex);
        const labelIRI = label && this.expandIRI(label);
        const edgeIds = labelIRI
            ? this._indexMap.get(JsonldGraph.IX_NODE_INCOMING_EDGES(vertexIRI, labelIRI))
            : this._indexMap.get(JsonldGraph.IX_NODE_INCOMING_ALL(vertexIRI));

        if (edgeIds && edgeIds.size > 0) {
            return new Iterable(edgeIds).map(x => this._edges.get(x)!);
        } else {
            return Iterable.empty();
        }
    }

    /**
     * @description Gets all vertices that have an incoming edge with the specified label.
     * @param {string} label The label of the incoming edge.
     * @returns {Iterable<V>}
     * @memberof JsonldGraph
     */
    getIncomingVertices(label: string): Iterable<V> {
        if (!label) {
            throw new ReferenceError();
        }

        const indexKey = JsonldGraph.IX_EDGES_KEY(this.expandIRI(label));
        const index = this._indexMap.get(indexKey);
        if (!index || index.size === 0) {
            return Iterable.empty();
        }

        // tslint:disable-next-line: no-this-assignment
        const _that = this;
        return new Iterable(function* incomingIterator() {
            const visited = new Set<string>();
            for (const edgeId of index) {
                const edge = _that._edges.get(edgeId);
                if (edge && !visited.has(edge.to.id)) {
                    visited.add(edge.to.id);
                    yield edge.to;
                }
            }
        });
    }

    /**
     * @description Gets all outgoing edges from a vertex.
     * @param {string} vertex The vertex id whose outgoing edges is returned.
     * @param {string} [label] Optional label used to filter only edges with the specified label.
     * @returns {Iterable<E>} Iterable containing all matching outgoing edges.
     * @memberof JsonldGraph
     */
    getOutgoingEdges(vertex: string, label?: string): Iterable<Edge<V>> {
        if (!vertex) {
            throw new ReferenceError(`Invalid vertex id. vertex id is '${vertex}`);
        }

        const vertexIRI = this.expandIRI(vertex);
        const labelIRI = label && this.expandIRI(label);
        const edgeIds = labelIRI
            ? this._indexMap.get(JsonldGraph.IX_NODE_OUTGOING_EDGES(vertexIRI, labelIRI))
            : this._indexMap.get(JsonldGraph.IX_NODE_OUTGOING_ALL(vertexIRI));

        if (edgeIds && edgeIds.size > 0) {
            return new Iterable(edgeIds).map(x => this._edges.get(x)!);
        } else {
            return Iterable.empty();
        }
    }

    /**
     * @description Gets all vertices that have an outgoing edge with the specified label.
     * @param {string} label The label of the outgoing edge.
     * @returns {Iterable<V>}
     * @memberof JsonldGraph
     */
    getOutgoingVertices(label: string): Iterable<V> {
        if (!label) {
            throw new ReferenceError();
        }

        const indexKey = JsonldGraph.IX_EDGES_KEY(this.expandIRI(label));
        const index = this._indexMap.get(indexKey);
        if (!index || index.size === 0) {
            return Iterable.empty();
        }

        // tslint:disable-next-line: no-this-assignment
        const _that = this;
        return new Iterable(function* incomingIterator() {
            const visited = new Set<string>();
            for (const edgeId of index) {
                const edge = _that._edges.get(edgeId);
                if (edge && !visited.has(edge.from.id)) {
                    visited.add(edge.from.id);
                    yield edge.from;
                }
            }
        });
    }

    /**
     * @description Gets vertices in the graph.
     * @param {types.VertexFilter} [filter] Optional vertex filter used to return only vertices that match the filter condition.
     * @returns {Iterable<V>}
     * @memberof JsonldGraph
     */
    getVertices(): Iterable<V> {
        return new Iterable(this._vertices.values());
    }

    /**
     * @description Gets a vertex in the graph.
     * @param {string} id The id of the vertex to get.
     * @returns {Vertex}
     * @memberof JsonldGraph
     */
    getVertex(id: string): V | undefined {
        if (!id) {
            throw new ReferenceError(`Invalid id. id is ${id}`);
        }

        return this._vertices.get(this.expandIRI(id));
    }

    /**
     * @description Checks if an edge exists in the graph.
     * @param {string} label The label of the edge.
     * @param {(string | Vertex)} from The outgoing vertex id.
     * @param {(string | Vertex)} to The incoming vertex id.
     * @returns {boolean} True if the edge exists.
     * @memberof JsonldGraph
     */
    hasEdge(label: string, from: string | V, to: string | V): boolean {
        if (!label) {
            throw new ReferenceError(`Invalid label. label is '${label}'`);
        }

        if (!from) {
            throw new ReferenceError(`Invalid from. from is '${from}'`);
        }

        if (!to) {
            throw new ReferenceError(`Invalid to. to is '${to}'`);
        }

        const labelIRI = this.expandIRI(label);
        const outgoingV = typeof from === 'string' ? this.expandIRI(from) : this.expandIRI(from.id);
        const incomingV = typeof to === 'string' ? this.expandIRI(to) : this.expandIRI(to.id);
        const edgeId = this._formatEdgeId(labelIRI, outgoingV, incomingV);
        return this._edges.has(edgeId);
    }

    /**
     * @description Checks if a vertex exists in the graph.
     * @param {string} id The id of the vertex to check.
     * @returns {boolean} True if the vertex exists, else false.
     * @memberof JsonldGraph
     */
    hasVertex(id: string): boolean {
        if (!id) {
            throw new ReferenceError(`Invalid id. id is `);
        }

        return this._vertices.has(this.expandIRI(id));
    }

    /**
     * @description Loads a set of expanded inputs into the graph.
     * @param {(any | any[])} inputs The inputs to load into the graph.
     * @memberof JsonldGraph
     */
    load(entities: any | any[], options?: GraphLoadOptions): void {
        if (!entities) {
            throw new TypeError(`Invalid entities. entities is ${entities}`);
        }

        const idTracker = new Set<string>();
        if (entities instanceof Array) {
            for (const entity of entities) {
                if (entity['@graph']) {
                    for (const item of entity['@graph']) {
                        this._loadVertex(item, idTracker, options);
                    }
                } else {
                    this._loadVertex(entity, idTracker, options);
                }
            }
        } else {
            if (entities['@graph']) {
                for (const item of entities['@graph']) {
                    this._loadVertex(item, idTracker, options);
                }
            } else {
                this._loadVertex(entities, idTracker, options);
            }
        }
    }

    /**
     * @description Parses and loads JSON-LD inputs into the graph.
     * @param {(any | any[])} inputs A JSON object or an array of JSON objects to load.
     * @param {types.GraphLoadOptions} [options] Optons used to load inputs.
     * @memberof JsonldGraph
     */
    async parse(inputs: any | any[], options?: GraphLoadOptions): Promise<void> {
        if (!inputs || (inputs instanceof Array && inputs.length === 0)) {
            throw new ReferenceError(`Invalid inputs. inputs is '${inputs}'`);
        }

        const expandOptions: jsonld.Options.Expand = { documentLoader: this._documentLoader };
        if (options?.base) {
            expandOptions.base = options.base;
        }

        if (options?.contexts) {
            expandOptions.expandContext = options.contexts;
        }

        let entities: any;
        try {
            entities = (await jsonld.expand(inputs, expandOptions)) as any[];
        } catch (err) {
            throw new errors.DocumentParseError(err);
        }

        this.load(entities, options);

        if (options?.normalize) {
            this._normalize(options)
        }
    }

    /**
     * @description Normalizes blank type and id vertices in the graph.
     * @memberof JsonldGraph
     */
    private _normalize(options: GraphLoadOptions): void {
        if (this._options?.blankTypeResolver) {
            const blankTypes = this._indexMap.get(JsonldGraph.IX_BLANK_TYPES)!;
            for (const id of blankTypes) {
                const vertex = this.getVertex(id);
                if (vertex) {
                    if (vertex.getTypes().first()) {
                        blankTypes.delete(id);
                    } else {
                        const types = this._options.blankTypeResolver(vertex);
                        if (types && types.length > 0) {
                            vertex.setType(...types)
                        }
                        if (vertex.getTypes().first()) {
                            blankTypes.delete(id);
                        }
                    }
                }
            }
        }

        if (this._options?.blankIriResolver) {
            const blankNodes = this._indexMap.get(JsonldGraph.IX_BLANK_NODES)!;
            for (const id of blankNodes) {
                const vertex = this.getVertex(id);
                if (vertex) {
                    this._normalizeBlankNode(vertex, options);
                }
            }
        }
    }

    /**
     * @description Removes a context from the graph.
     * @param {string} uri The URI of the context to remove.
     * @memberof JsonldGraph
     */
    removeContext(uri: string): void {
        if (!uri) {
            throw new ReferenceError(`Invalid context uri. context uri is '${uri}'`);
        }

        this._contexts.delete(uri);
    }

    /**
     * @description Removes an edge in the graph.
     * @param {E} edge The edge instance to remove.
     * @memberof JsonldGraph
     */
    removeEdge(edge: Edge<V>): void {
        if (!edge) {
            throw new ReferenceError(`Invalid edge. edge is '${edge}'`);
        }

        const edgeId = this._formatEdgeId(
            this.expandIRI(edge.label),
            this.expandIRI(edge.from.id),
            this.expandIRI(edge.to.id)
        );

        this._edges.delete(edgeId);
        this._removeEdgeIndices(edge);
    }

    /**
     * @description Removes a vertex from the graph.
     * @param {(string | Vertex)} vertex The IRI or vertex instance to remove.
     * @memberof JsonldGraph
     */
    removeVertex(vertex: string | V): void {
        if (!vertex) {
            throw new ReferenceError(`Invalid vertex. vertex is '${vertex}'`);
        }

        const vertexIRI =
            typeof vertex === 'string' ? this.expandIRI(vertex) : this.expandIRI(vertex.id);
        this._vertices.delete(vertexIRI);

        const incomingEdges = this._indexMap.get(JsonldGraph.IX_NODE_INCOMING_ALL(vertexIRI));
        const outgoingEdges = this._indexMap.get(JsonldGraph.IX_NODE_OUTGOING_ALL(vertexIRI));

        if (incomingEdges) {
            for (const edgeId of incomingEdges) {
                const edge = this._edges.get(edgeId);
                if (edge) {
                    this.removeEdge(edge);
                }
            }
        }

        if (outgoingEdges) {
            for (const edgeId of outgoingEdges) {
                const edge = this._edges.get(edgeId);
                if (edge) {
                    this.removeEdge(edge);
                }
            }
        }
    }

    /**
     * @description Removes a mapped prefix from the graph.
     * @param {string} prefix The prefix to remove from the graph.
     * @memberof JsonldGraph
     */
    removePrefix(prefix: string): void {
        if (!prefix) {
            throw new ReferenceError(`Invalid prefix. prefix is '${prefix}'`);
        }

        this._prefixes.delete(prefix);
    }

    /**
     * @description Renames the IRI of an existing vertex.
     * @param {(string | V)} vertex The vertex to rename.
     * @param {string} id The new IRI of the vertex.
     * @returns {V} 
     * @memberof JsonldGraph
     */
    renameVertex(vertex: string | V, id: string): V {
        if (!vertex) {
            throw new ReferenceError(`Invalid vertex. vertex is '${vertex}'`);
        }

        if (!id) {
            throw new ReferenceError(`Invalid id. id is '${id}'`);
        }

        const target = typeof vertex === 'string' ? this.getVertex(vertex) : vertex;
        if (!target) {
            throw new errors.VertexNotFoundError(vertex as string);
        }

        const expandedIRI = this.expandIRI(id, true);
        if (this.expandIRI(target.id) === expandedIRI) {
            return target; // Renamed id is same as original id.
        }

        if (this.hasVertex(expandedIRI)) {
            throw new errors.DuplicateVertexError(id);
        }

        const renamed = this.createVertex(id);
        for (const attrib of target.getAttributes()) {
            for (const val of attrib.values) {
                renamed.appendAttributeValue(attrib.name, val.value, val.language, val.type === '@json')
            }
        }

        for (const outgoing of target.getOutgoing()) {
            this.createEdge(outgoing.label, renamed, outgoing.to)
        }

        for (const incoming of target.getIncoming()) {
            this.createEdge(incoming.label, incoming.from, renamed)
        }

        this._indexMap.get(JsonldGraph.IX_BLANK_TYPES)?.delete(this.expandIRI(target.id));
        this._indexMap.get(JsonldGraph.IX_BLANK_NODES)?.delete(this.expandIRI(target.id));
        this.removeVertex(target);

        return renamed;
    }

    /**
     * @description Sets a prefix for an  IRIh.
     * @param {string} prefix The prefix to add.
     * @param {string} iri The IRI that the prefix maps to.
     * @memberof JsonldGraph
     */
    setPrefix(prefix: string, iri: string): void {
        if (!prefix) {
            throw new ReferenceError(`Invalid prefix. prefix is '${prefix}'`);
        }

        this.validateIRI(iri);
        if (!prefix.match(PREFIX_REGEX)) {
            throw new errors.InvalidPrefixError(
                prefix,
                'Invalid prefix. Prefixes can only contain alpha-numeric characters'
            );
        }

        if (this._prefixes.has(prefix)) {
            throw new errors.DuplicatePrefixError(prefix);
        }

        for (const [, mappedId] of this._prefixes) {
            if (mappedId.toLowerCase() === iri.toLowerCase()) {
                throw new errors.DuplicatePrefixIRIError(prefix, iri);
            }
        }

        this._prefixes.set(prefix, iri);
    }

    /**
     * @description Serializes the graph.
     * @returns {SerializedGraph}
     * @memberof JsonldGraph
     */
    serialize(): SerializedGraph {
        const serialized: SerializedGraph = {
            vertices: [],
            edges: [],
            indices: {}
        };

        for (const [, vertex] of this._vertices) {
            serialized.vertices.push(vertex.serialize())
        }

        for (const [, edge] of this._edges) {
            serialized.edges.push(edge.serialize())
        }

        for (const [key, entries] of this._indexMap) {
            serialized.indices[key] = [...entries];
        }

        return serialized;
    }

    /**
     * @description De-serializes a graph.
     * @static
     * @param {SerializedGraph} serialized The serialized graph to deserialize.
     * @returns {JsonldGraph}
     * @memberof JsonldGraph
     */
    static deserialize<V extends Vertex = Vertex>(serialized: SerializedGraph, options?: GraphOptions<V>): JsonldGraph<V> {
        const graph = new JsonldGraph(options);
        for (const item of serialized.vertices) {
            Vertex.deserialize(item, graph);
        }

        for (const item of serialized.edges) {
            const edge = Edge.deserialize(item, graph);
            const edgeId = graph._formatEdgeId(edge.iri, edge.from.iri, edge.to.iri);
            graph._edges.set(edgeId, edge);
        }

        for (const key of Object.keys(serialized.indices)) {
            const entries = new Set<string>(serialized.indices[key]);
            graph._indexMap.set(key, entries);
        }

        return graph;
    }

    toExpanded(): any {
        const expanded = []

        for (const v of this.getVertices()) {
            expanded.push(formatter.expand(v, { compactReferences: true }));
        }

        return {
            '@graph': expanded
        };
    }

    async toJson<T = any>(
        contexts: string | string[] | any | any[],
        options: formatter.JsonFormatOptions = {}): Promise<T> {
        const vertices: Vertex[] = [];

        for (const v of this.getVertices()) {
            if (!this._indexMap.has(JsonldGraph.IX_NODE_INCOMING_ALL(v.iri))) {
                vertices.push(v);
            }
        }

        return formatter.toJson(vertices, contexts, this._documentLoader, options);
    }

    /**
    * @description Validates an IRI.
    * @param {string} iri The IRI to validate.
    * @returns {void}
    * @memberof JsonldGraph
    */
    validateIRI(iri: string): void {
        if (!iri) {
            throw new ReferenceError(`Invalid iri. iri is '${iri}'`);
        }

        if (iri === JsonldKeywords.type) {
            return;
        }

        const schemeIndex = iri.indexOf(':');
        if (schemeIndex <= 0) {
            throw new errors.InvalidIRIError(iri, 'IRI scheme not specified');
        }

        let authority = iri.slice(schemeIndex + 1);
        if (!authority || authority.length === 0) {
            throw new errors.InvalidIRIError(iri, 'IRI authority not specified');
        }

        if (authority.startsWith('//')) {
            authority = authority.slice(2);
        }

        if (authority.startsWith('/') || authority.startsWith(':')) {
            throw new errors.InvalidIRIError(iri, 'Malformed IRI authority');
        }

        if (authority.length === 0) {
            throw new errors.InvalidIRIError(iri, 'IRI authority not specified');
        }
    }

    private _addEdgeIndices(edge: Edge<V>): void {
        const edgeId = this._formatEdgeId(
            edge.iri,
            edge.from.iri,
            edge.to.iri
        );

        for (const indexKey of this._generateEdgeIndexKeys(edge)) {
            if (!this._indexMap.has(indexKey)) {
                const index = new Set<string>([edgeId]);
                this._indexMap.set(indexKey, index);
            } else {
                this._indexMap.get(indexKey)!.add(edgeId);
            }
        }
    }

    private _formatEdgeId(label: string, fromVertex: string, toVertex: string): string {
        return `${label}_${fromVertex}->${toVertex}`;
    }

    private _generateEdgeIndexKeys(edge: Edge<V>): string[] {
        return [
            JsonldGraph.IX_EDGES_KEY(edge.iri),
            JsonldGraph.IX_NODE_INCOMING_ALL(edge.to.iri),
            JsonldGraph.IX_NODE_INCOMING_EDGES(edge.to.iri, edge.iri),
            JsonldGraph.IX_NODE_OUTGOING_ALL(edge.from.iri),
            JsonldGraph.IX_NODE_OUTGOING_EDGES(edge.from.iri, edge.iri)
        ];
    }

    private _loadVertex(entity: any, idTracker: Set<string>, options?: GraphLoadOptions): V {
        let id: string = entity[JsonldKeywords.id] || `${BlankNodePrefix}-${shortid()}`;
        const types: string[] = entity[JsonldKeywords.type] || [];

        if (id.startsWith(BlankNodePrefix)) {
            this._indexMap.get(JsonldGraph.IX_BLANK_NODES)?.add(id)
        } else {
            if (options?.identityValidator && !options.identityValidator(id)) {
                throw new errors.InvalidIRIError(id, 'Identity is not valid identifier');
            }

            if (options?.unique && idTracker.has(id) && Object.keys(entity).length > 1) {
                const existing = this._vertices.get(id);
                if (existing && (
                    existing.getTypes().first() ||
                    existing.getAttributes().first() ||
                    existing.getOutgoing().first())) {
                    throw new errors.DuplicateEntityDefinition(id);
                }
            } else {
                idTracker.add(id);
            }
        }

        if (options?.identityTranslator) {
            if (!id.startsWith(BlankNodePrefix)) {
                id = options.identityTranslator(id) || id;
            }

            for (let i = 0; i < types.length; i++) {
                types[i] = options.identityTranslator(types[i]);
            }
        }

        const vertex = this._getOrCreateVertex(id);
        if (vertex.getTypes().count() > 0 && types.length > 0 && this._options.typeConflictResolver) {
            // Existing type found with @types and new vertex also has types. Resolve the conflict.
            const resolvedTypes = this._options.typeConflictResolver(
                vertex.getTypes().map(x => x.iri).items(),
                types
            )

            if (resolvedTypes !== undefined) {
                for (const existingType of vertex.getTypes().items()) {
                    vertex.removeType(existingType.iri);
                }

                for (const resolved of resolvedTypes) {
                    vertex.setType(resolved);
                }
            }
        } else if (types.length > 0) {
            vertex.setType(...types);
        }

        if (!vertex.getTypes().first()) {
            this._indexMap.get(JsonldGraph.IX_BLANK_TYPES)?.add(id)
        }

        for (const key of Object.keys(entity).filter(x => x !== JsonldKeywords.id && x !== JsonldKeywords.type)) {
            this._loadPredicate(key, entity[key], vertex, idTracker, options);
        }

        return vertex;
    }

    private _getOrCreateVertex(id: string, ...types: string[]): V {
        if (this.hasVertex(id)) {
            const vertex = this.getVertex(id)!;
            vertex.setType(...types);
            return vertex;
        } else {
            return this.createVertex(id, ...types);
        }
    }

    private _loadPredicate(
        predicate: string,
        values: any[],
        vertex: V,
        idTracker: Set<string>,
        options?: GraphLoadOptions
    ): void {
        for (const value of values) {
            if (value[JsonldKeywords.list]) {
                // Value is a list. Recurse over list and load individual values
                this._loadPredicate(predicate, value[JsonldKeywords.list], vertex, idTracker, options);
                return;
            } else if (
                value[JsonldKeywords.value] !== null &&
                value[JsonldKeywords.value] !== undefined
            ) {
                // Standard primitive value. Set or append an attribute on the vertex.
                if (options?.merge) {
                    vertex.setAttributeValue(
                        predicate,
                        value[JsonldKeywords.value],
                        value[JsonldKeywords.language],
                        value[JsonldKeywords.type] === '@json'
                    );
                } else {
                    vertex.appendAttributeValue(
                        predicate,
                        value[JsonldKeywords.value],
                        value[JsonldKeywords.language],
                        value[JsonldKeywords.type] === '@json'
                    );
                }
            } else {
                // Either the value is an inline anonymous entity or a reference to another entity.
                // In either case a vertex is created for the object and loaded.
                const reference = this._loadVertex(value, idTracker, options);
                if (!this.hasEdge(predicate, vertex, reference)) {
                    this.createEdge(predicate, vertex, reference);
                }
            }
        }
    }

    private _normalizeBlankNode(vertex: V, options: GraphLoadOptions): void {
        for (const incoming of vertex.getIncoming().filter(x => x.from.id.startsWith(BlankNodePrefix))) {
            this._normalizeBlankNode(incoming.from, options)
        }

        const newIri = this._options.blankIriResolver!(vertex);
        if (newIri && newIri !== vertex.iri) {
            if (!this.hasVertex(newIri)) {
                this.renameVertex(vertex, newIri);
            }
            else if (options.unique) {
                throw new errors.DuplicateEntityDefinition(newIri);
            } else {
                // Copy over all attributes and references from the blank node to the existing node.
                const existing = this.getVertex(newIri)!;
                const incomingTypes = vertex.getTypes().items();
                const existingTypes = existing.getTypes().items();
                if (existingTypes.length > 0 && incomingTypes.length > 0) {
                    if (this._options.typeConflictResolver) {
                        const resolvedTypes = this._options.typeConflictResolver(
                            existingTypes.map(x => x.iri),
                            incomingTypes.map(x => x.iri)
                        );

                        if (resolvedTypes !== undefined) {
                            for (const existingType of existingTypes) {
                                existing.removeType(existingType.iri);
                            }

                            for (const resolved of resolvedTypes) {
                                existing.setType(resolved);
                            }
                        }
                    } else {
                        throw new errors.BlankIdNormalizationError(newIri,
                            `Found conflicting @type after normalizing blank id node.\n` +
                            `Existing types: ${existingTypes.map(x => x.iri).join(',')},\n` +
                            `Blank node types: ${incomingTypes.map(x => x.iri).join(',')}`);
                    }
                } else if (existingTypes.length > 0 && incomingTypes.length === 0) {
                    for (const existingType of existingTypes) {
                        existing.setType(existingType);
                    }
                } else if (existingTypes.length === 0 && incomingTypes.length > 0) {
                    for (const incomingType of incomingTypes) {
                        existing.setType(incomingType);
                    }
                }


                for (const attribute of vertex.getAttributes()) {
                    for (const value of attribute.values) {
                        existing.setAttributeValue(attribute.name, value.value, value.language, value.type === JsonldKeywords.json);
                    }
                }

                for (const incoming of vertex.getIncoming()) {
                    if (!existing.hasIncoming(incoming.iri, incoming.from)) {
                        existing.setIncoming(incoming.iri, incoming.from);
                    }
                }

                for (const outgoing of vertex.getOutgoing().filter(x => x.iri !== JsonldKeywords.type)) {
                    if (!existing.hasOutgoing(outgoing.iri, outgoing.to)) {
                        existing.setOutgoing(outgoing.iri, outgoing.to)
                    }
                }

                this.removeVertex(vertex);
                this._indexMap.get(JsonldGraph.IX_BLANK_NODES)?.delete(this.expandIRI(vertex.iri));
            }
        }
    }

    private _removeEdgeIndices(edge: Edge<V>): void {
        const edgeId = this._formatEdgeId(
            this.expandIRI(edge.label),
            this.expandIRI(edge.from.id),
            this.expandIRI(edge.to.id)
        );

        for (const indexKey of this._generateEdgeIndexKeys(edge)) {
            const index = this._indexMap.get(indexKey);
            if (index) {
                index.delete(edgeId);
                if (index.size === 0) {
                    this._indexMap.delete(indexKey);
                }
            }
        }
    }
}
