import Iterable from 'jsiterable';
import * as jsonld from 'jsonld';
import { RemoteDocument } from 'jsonld/jsonld-spec';
import { JsonldKeywords, BlankNodePrefix } from './constants';
import Edge from './edge';
import Errors from './errors';
import GraphTypesFactory from './factory';
import IdentityMap from './identityMap';
import * as types from './types';
import Vertex from './vertex';
import cloneDeep from 'lodash.clonedeep';

type Loader = (url: string) => Promise<RemoteDocument>;
const PREFIX_REGEX = /^[a-zA-z][a-zA-Z0-9]*$/;

/**
 * @description Represents a graph of JSON-LD triples
 * @export
 * @class JsonldGraph
 * @extends {EventEmitter}
 * @implements {JsonldGraph}
 */
export default class JsonldGraph<V extends types.Vertex = Vertex, E extends types.Edge<V> = Edge<V>>
    implements types.JsonldGraph<V, E> {
    private static IX_EDGES_KEY = (label: string) => `[e]::${label}`;
    private static IX_NODE_INCOMING_ALL = (id: string) => `[v]::${id}_[in]`;
    private static IX_NODE_INCOMING_EDGES = (id: string, label: string) =>
        `[v]::${id}_[in]_[e]::${label}`;
    private static IX_NODE_OUTGOING_ALL = (id: string) => `[v]::${id}_[out]`;
    private static IX_NODE_OUTGOING_EDGES = (id: string, label: string) =>
        `[v]::${id}_[out]_[e]::${label}`;
    private static IX_BLANK_NODES = `[v]::BLANK_NODES`;
    private static IX_BLANK_TYPES = `[v]::BLANK_TYPES`;

    private readonly _edges = new Map<string, E>();
    private readonly _vertices = new Map<string, V>();
    private readonly _indexMap = new Map<string, Set<string>>();
    private readonly _prefixes = new Map<string, string>();
    private readonly _contexts = new Map<string, any>();
    private readonly _options: types.GraphOptions<V, E>;
    private readonly _remoteLoader: Loader;
    private readonly _documentLoader: Loader;
    private readonly _typeFactory: types.GraphTypesFactory<V, E>;
    private readonly _loadRemoteContexts: boolean;

    /**
     * Creates an instance of JsonldGraph.
     * @param {types.GraphOptions} [options] Graph options.
     * @memberof JsonldGraph
     */
    constructor(options: types.GraphOptions<V, E> = {}) {
        this._loadRemoteContexts = options.remoteContexts || false;
        this._typeFactory = options.typeFactory || (new GraphTypesFactory() as any);

        this._remoteLoader =
            typeof process !== undefined && process.versions && process.versions.node
                ? (jsonld as any).documentLoaders.node()
                : (jsonld as any).documentLoaders.xhr();

        this._documentLoader = async url => {
            const normalizedUrl = url.toLowerCase();
            if (this._contexts.has(normalizedUrl)) {
                return Promise.resolve<RemoteDocument>({
                    contextUrl: url,
                    documentUrl: url,
                    document: this._contexts.get(normalizedUrl)
                });
            }

            if (this._loadRemoteContexts) {
                return this._remoteLoader(url);
            }

            throw new Errors.ContextNotFoundError(url);
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
            for (const id of this._indexMap.get(JsonldGraph.IX_BLANK_NODES)!) {
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
            for (const id of this._indexMap.get(JsonldGraph.IX_BLANK_TYPES)) {
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
    addContext(url: string, context: object): void {
        if (!url) {
            throw new ReferenceError(`Invalid url. url is '${url}'`);
        }

        if (!context) {
            throw new ReferenceError(`Invalid context. context is ${context}`);
        }

        if (typeof context !== 'object') {
            throw new ReferenceError(
                `Invalid context. Expected context to be a JSON object, but got ${typeof context}`
            );
        }

        const normalizedUrl = url.toLowerCase();
        if (this._contexts.has(normalizedUrl)) {
            throw new Errors.DuplicateContextError(url);
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
    createEdge(
        label: string,
        fromVertex: string | V,
        toVertex: string | V,
        createIncoming: boolean = false
    ): E {
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
        let incomingV = typeof toVertex === 'string' ? this.getVertex(toVertex) : toVertex;

        if (!outgoingV) {
            throw new Errors.VertexNotFoundError(fromVertex as string);
        }

        if (!incomingV && !createIncoming) {
            throw new Errors.VertexNotFoundError(fromVertex as string);
        }

        if (incomingV && incomingV.id === outgoingV.id) {
            throw new Errors.CyclicEdgeError(label, outgoingV.id);
        }

        const normalizedEdgeLabel = this.expandIRI(label, true);
        const expandedOutgoingId = this.expandIRI(outgoingV.id);
        const expandedIncomingId = this.expandIRI(
            incomingV ? incomingV.id : (toVertex as string),
            true
        );

        const edgeId = this._formatEdgeId(
            normalizedEdgeLabel,
            expandedOutgoingId,
            expandedIncomingId
        );

        if (this._edges.has(edgeId)) {
            throw new Errors.DuplicateEdgeError(label, outgoingV.id, incomingV!.id);
        }

        if (!incomingV && createIncoming) {
            incomingV = this.createVertex(expandedIncomingId);
        }

        const edge = this._typeFactory.createEdge(normalizedEdgeLabel, outgoingV, incomingV!, this);
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

        if (this.hasVertex(id)) {
            throw new Errors.DuplicateVertexError(id);
        }

        const expandedId = this.expandIRI(id, true);
        const expandedTypeIds = types && types.map(typeId => this.expandIRI(typeId, true));
        const vertex = this._typeFactory.createVertex(expandedId, expandedTypeIds, this);
        this._vertices.set(expandedId, vertex);
        return vertex;
    }

    /**
     * @description Expands a compacted IRI.
     * @param {string} iri The compacted IRI to expand.
     * @returns {string}
     * @memberof JsonldGraph
     */
    expandIRI(iri: string, validate: boolean = false): string {
        if (!iri) {
            throw new ReferenceError(`Invalid iri. iri is '${iri}'`);
        }

        const prefixIndex = iri.indexOf(':');
        if (prefixIndex <= 0) {
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
    getEdges(label?: string): Iterable<E> {
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
    getIncomingEdges(vertex: string, label?: string): Iterable<E> {
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
        const that = this;
        return new Iterable(function* incomingIterator() {
            const visited = new Set<string>();
            for (const edgeId of index) {
                const edge = that._edges.get(edgeId);
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
    getOutgoingEdges(vertex: string, label?: string): Iterable<E> {
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
        const that = this;
        return new Iterable(function* incomingIterator() {
            const visited = new Set<string>();
            for (const edgeId of index) {
                const edge = that._edges.get(edgeId);
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
     * @description Loads a JSON-LD document into the graph.
     * @param {(any | any[])} inputs A JSON object or an array of JSON objects to load.
     * @param {types.GraphLoadOptions} [options] Optons used to load inputs.
     * @memberof JsonldGraph
     */
    async load(inputs: any | any[], options?: types.GraphLoadOptions): Promise<void> {
        if (!inputs) {
            throw new ReferenceError(`Invalid inputs. inputs is '${inputs}'`);
        }

        const triples = await this._flattenTriples(inputs, options);
        this._loadTriples(triples instanceof Array ? triples : [triples], options);
        if (options?.normalize) {
            this.normalize();
        }
    }

    /**
     * @description Normalizes blank type and id vertices in the graph.
     * @memberof JsonldGraph
     */
    normalize(): void {
        if (this._options?.blankTypeResolver) {
            const blankTypes = this._indexMap.get(JsonldGraph.IX_BLANK_TYPES)!;
            for (const id of blankTypes) {
                const vertex = this.getVertex(id);
                if (vertex) {
                    this._options.blankTypeResolver!(vertex);
                    if ([...vertex.getTypes()].length > 0) {
                        blankTypes.delete(id);
                    }
                }
            }
        }

        if (this._options?.blankIdResolver) {
            const blankNodes = this._indexMap.get(JsonldGraph.IX_BLANK_NODES)!;
            for (const id of blankNodes) {
                const vertex = this.getVertex(id);
                if (vertex) {
                    this._options.blankIdResolver!(vertex);
                    if (!vertex.id.startsWith(BlankNodePrefix)) {
                        blankNodes.delete(id);
                    }
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
    removeEdge(edge: E): void {
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

        let vertexIRI =
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
            throw new Errors.InvalidPrefixError(
                prefix,
                'Invalid prefix. Prefixes can only contain alpha-numeric characters'
            );
        }

        if (this._prefixes.has(prefix)) {
            throw new Errors.DuplicatePrefixError(prefix);
        }

        for (const [, mappedId] of this._prefixes) {
            if (mappedId.toLowerCase() === iri.toLowerCase()) {
                throw new Errors.DuplicatePrefixIRIError(prefix, iri);
            }
        }

        this._prefixes.set(prefix, iri);
    }

    /**
     * @description Returns a JSON-LD representation of all the vertices in the graph.
     * @template T
     * @param {JsonFormatOptions} options JSON formatting options.
     * @returns {Promise<T>}
     * @memberof JsonldGraph
     */
    async toJson<T extends object = object>(options?: types.JsonFormatOptions): Promise<T> {
        const triples: object[] = [];
        for (const vertex of this.getVertices()) {
            triples.push(this._toTriple(vertex));
        }

        if (options?.frame) {
            const frame: object = options ? cloneDeep(options.frame!) : {};
            this._expandIdReferences(frame);
            if (options?.context && !frame[JsonldKeywords.context]) {
                frame[JsonldKeywords.context] = options.context!;
            }

            return jsonld.frame(triples, frame, {}) as Promise<T>;
        } else {
            return jsonld.compact(triples, options?.context, {
                base: options?.base,
                expandContext: options?.context,
                documentLoader: this._documentLoader,
                skipExpansion: true
            }) as Promise<T>;
        }
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
            throw new Errors.InvalidIRIError(iri, 'IRI scheme not specified');
        }

        let authority = iri.slice(schemeIndex + 1);
        if (!authority || authority.length === 0) {
            throw new Errors.InvalidIRIError(iri, 'IRI authority not specified');
        }

        if (authority.startsWith('//')) {
            authority = authority.slice(2);
        }

        if (authority.startsWith('/') || authority.startsWith(':')) {
            throw new Errors.InvalidIRIError(iri, 'Malformed IRI authority');
        }

        if (authority.length === 0) {
            throw new Errors.InvalidIRIError(iri, 'IRI authority not specified');
        }
    }

    private _addEdgeIndices(edge: E) {
        const edgeId = this._formatEdgeId(
            this.expandIRI(edge.label),
            this.expandIRI(edge.from.id),
            this.expandIRI(edge.to.id)
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

    private _expandIdReferences(source: object) {
        if (source instanceof Array) {
            for (const element of source) {
                this._expandIdReferences(element);
            }
        } else {
            const keys = Object.getOwnPropertyNames(source);
            for (const key of keys) {
                if (key === JsonldKeywords.id) {
                    if (source[key] instanceof Array) {
                        for (const element of source[key]) {
                            source[key].splice(
                                source[key].indexOf(element),
                                1,
                                this.expandIRI(element)
                            );
                        }
                    } else if (typeof source[key] === 'string') {
                        source[key] = this.expandIRI(source[key]);
                    }
                } else if (source[key] instanceof Array || typeof source[key] === 'object') {
                    this._expandIdReferences(source[key]);
                }
            }
        }
    }

    private _flattenTriples(
        inputs: any | any[],
        options?: types.GraphLoadOptions
    ): Promise<object | object[]> {
        return jsonld.flatten(inputs, null, {
            base: options?.base,
            documentLoader: this._documentLoader,
            expandContext: options?.contexts
        });
    }

    private _formatEdgeId(label: string, fromVertex: string, toVertex: string): string {
        return `${label}:${fromVertex}:${toVertex}`;
    }

    private _generateEdgeIndexKeys(edge: E): string[] {
        const labelIRI = this.expandIRI(edge.label);
        const fromVertexIRI = this.expandIRI(edge.from.id);
        const toVertexIRI = this.expandIRI(edge.to.id);

        return [
            JsonldGraph.IX_EDGES_KEY(labelIRI),
            JsonldGraph.IX_NODE_INCOMING_ALL(toVertexIRI),
            JsonldGraph.IX_NODE_INCOMING_EDGES(toVertexIRI, labelIRI),
            JsonldGraph.IX_NODE_OUTGOING_ALL(fromVertexIRI),
            JsonldGraph.IX_NODE_OUTGOING_EDGES(fromVertexIRI, labelIRI)
        ];
    }

    private _loadPredicate(
        predicate: string,
        objects: object[],
        vertex: V,
        identityMap: IdentityMap,
        options?: types.GraphLoadOptions
    ): void {
        for (const obj of objects) {
            if (obj[JsonldKeywords.list]) {
                return this._loadPredicate(
                    predicate,
                    obj[JsonldKeywords.list],
                    vertex,
                    identityMap,
                    options
                );
            }

            if (obj[JsonldKeywords.id]) {
                const objectId = identityMap.get(obj);
                this.createEdge(predicate, vertex.id, objectId, true);
            }

            if (obj[JsonldKeywords.value] !== null && obj[JsonldKeywords.value] !== undefined) {
                if (options?.merge) {
                    vertex.setAttributeValue(
                        predicate,
                        obj[JsonldKeywords.value],
                        obj[JsonldKeywords.language]
                    );
                } else {
                    vertex.appendAttributeValue(
                        predicate,
                        obj[JsonldKeywords.value],
                        obj[JsonldKeywords.language]
                    );
                }
            }
        }
    }

    private _loadPredicates(
        triple: object,
        vertex: V,
        identityMap: IdentityMap,
        options?: types.GraphLoadOptions
    ): void {
        const predicates = Object.keys(triple).filter(
            x => x !== JsonldKeywords.id && x !== JsonldKeywords.type
        );

        for (const predicate of predicates) {
            this._loadPredicate(predicate, triple[predicate], vertex, identityMap, options);
        }
    }

    private _loadTriples(triples: object[], options?: types.GraphLoadOptions): void {
        const identityMap = new IdentityMap();
        for (const triple of triples) {
            const vertexId = identityMap.get(triple);
            const types = triple[JsonldKeywords.type] || [];
            const vertex = this.hasVertex(vertexId)
                ? this.getVertex(vertexId)!
                : this.createVertex(vertexId, types);

            for (const type of types) {
                this.createEdge(JsonldKeywords.type, vertexId, type, true);
            }

            if (vertexId.startsWith(BlankNodePrefix)) {
                this._indexMap.get(JsonldGraph.IX_BLANK_NODES)!.add(vertexId);
            }

            if (!types || types.length === 0) {
                this._indexMap.get(JsonldGraph.IX_BLANK_TYPES)!.add(vertexId);
            }

            this._loadPredicates(triple, vertex, identityMap, options);
        }
    }

    private _removeEdgeIndices(edge: E) {
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

    private _toTriple(vertex: V): object {
        const triple: object = {
            [JsonldKeywords.id]: this.expandIRI(vertex.id)
        };

        for (const {name, values} of vertex.getAttributes()) {
            triple[this.expandIRI(name)] = values.map(x => {
                const value = { [JsonldKeywords.value]: x.value };
                if (x.language) {
                    value[JsonldKeywords.language] = x.language;
                }

                return value;
            });
        }

        for (const { label, toVertex } of vertex.getOutgoing()) {
            const predicate = this.expandIRI(label);
            const objectId = this.expandIRI(toVertex.id);
            if (!triple[predicate]) {
                triple[predicate] = [];
            }

            if (predicate === JsonldKeywords.type) {
                triple[predicate].push(objectId);
            } else {
                triple[predicate].push({
                    [JsonldKeywords.id]: objectId
                });
            }
        }

        return triple;
    }
}
