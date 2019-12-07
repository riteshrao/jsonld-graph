/**
 * @description Attribute value type.
 * @export
 * @interface AttributeValue
 * @template T
 */
export interface AttributeValue<T = any> {
    /**
     * @description Optional language of string values.
     * @type {string}
     * @memberof AttributeValue
     */
    language?: string;
    /**
     * @description The attribute value.
     * @type {T}
     * @memberof AttributeValue
     */
    value: T;
}

/**
 * @description JSON formatting options.
 * @export
 * @interface JsonFormatOptions
 */
export interface JsonFormatOptions {
    /**
     * @description The base URI of the document.
     * @type {string}
     * @memberof JsonFormatOptions
     */
    base?: string;
    /**
     * @description The context(s) to use for for framing.
     * @type {(*[])}
     * @memberof JsonFormatOptions
     */
    context?: any | any[];
    /**
     * @description The JSON-LD frame to use for formatting the JSON output.
     * @type {*}
     * @memberof JsonFormatOptions
     */
    frame?: any;
}

/**
 * @description Graph Edge.
 * @export
 * @interface Edge
 */
export interface Edge<V extends Vertex> {
    label: string;
    from: V;
    to: V;
}

/**
 * @description Graph vertex.
 * @export
 * @interface Vertex
 */
export interface Vertex {
    id: string;
}

/**
 * @description Factory for creating types in the graph.
 * @export
 * @interface GraphFactory
 */
export interface GraphTypesFactory<V extends Vertex, E extends Edge<V>> {
    /**
     * @description Creates a new edge instance.
     * @param {string} label The edge label.
     * @param {Vertex} from The outgoing vertex.
     * @param {Vertex} to The incoming vertex.
     * @param {JsonldGraph} graph The graph for which the vertex should be created.
     * @returns {Edge}
     * @memberof GraphFactory
     */
    createEdge(label: string, from: V, to: V, graph: JsonldGraph<V, E>): E;

    /**
     * @description Creates a new vertex.
     * @param {string} id The id of the vertex.
     * @param {JsonldGraph} graph The graph for which the vertex should be created.
     * @returns {Vertex}
     * @memberof GraphFactory
     */
    createVertex(id: string, graph: JsonldGraph<V, E>): V;
}

/**
 * @description Graph options.
 * @export
 * @interface JsonldGraphOptions
 */
export interface GraphOptions<V extends Vertex, E extends Edge<V>> {
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
    typeFactory?: GraphTypesFactory<V, E>;
}

/**
 * @description Graph interface
 * @export
 * @interface JsonldGraph
 */
export interface JsonldGraph<V extends Vertex, E extends Edge<V>> {
    /**
     * @description Gets the no. of edges in the graph.
     * @type {number}
     * @memberof JsonldGraph
     */
    readonly edgeCount: number;
    /**
     * @description Gets the no. of vertices in the graph.
     * @type {number}
     * @memberof JsonldGraph
     */
    readonly vertexCount: number;
    /**
     * @description Adds a context to the graph.
     * @param {string} uri The URI of the context.
     * @param {object} context The context definition JSON.
     * @memberof JsonldGraph
     */
    addContext(uri: string, context: object): void;
    /**
     * @description Adds a IRI prefix to the graph.
     * @param {string} prefix The prefix to add.
     * @param {string} iri The IRI that the prefix maps to.
     * @memberof JsonldGraph
     */
    setPrefix(prefix: string, iri: string): void;
    /**
     * @description Compacts an IRI with a prefix.
     * @param {string} id The id 
     * @returns {string}
     * @memberof JsonldGraph
     */
    compactIRI(id: string): string;
    /**
     * @description Creates a new edge.
     * @param {string} label The label of the edge.
     * @param {(string | V)} from The outgoing vertex id or instance.
     * @param {(string | V)} to The incoming vertex id or instance.
     * @returns {E}
     * @memberof JsonldGraph
     */
    createEdge(label: string, from: string | V, to: string | V): E;
    /**
     * @description Creates a new vertex using the vertex factory.
     * @param {string} id The id of the vertex to create.
     * @returns {V}
     * @memberof JsonldGraph
     */
    createVertex(id: string): V;
    /**
     * @description
     * @param {string} id
     * @returns {string}
     * @memberof JsonldGraph
     */
    expandIRI(id: string): string;
    /**
     * @description Gets all contexts added to the graph.
     * @returns {Iterable<[string, any]>} A tuple where the first element in the tuple is the context IRI and the second element is the context definition.
     * @memberof JsonldGraph
     * 
     */
    getContexts(): Iterable<[string, any]>;
    /**
     * @description Gets edges in the graph.
     * @param {string} [label] Optional label filter to only return edges with the specified label.
     * @returns {Iterable<E>}
     * @memberof JsonldGraph
     */
    getEdges(label?: string): Iterable<E>;
    /**
     * @description Gets all vertices that have an incoming edge with the specified label.
     * @param {string} label The label of the incoming edge.
     * @param {VertexFilter<V>} [filter] Optional vertex filter used to return only vertices that match the filter.
     * @returns {Iterable<V>}
     * @memberof JsonldGraph
     */
    getIncoming(label: string): Iterable<V>;
    /**
     * @description Gets all vertices that have an outgoing edge with the specified label.
     * @param {string} label The label of the outgoing edge.
     * @param {VertexFilter<V>} [filter] Optional vertex filter used to return only vertices that match the filter condition.
     * @returns {Iterable<V>}
     * @memberof JsonldGraph
     */
    getOutgoing(label: string): Iterable<V>;
    /**
     * @description Gets vertices in the graph.
     * @returns {Iterable<V>}
     * @memberof JsonldGraph
     */
    getVertices(): Iterable<V>;
    /**
     * @description Gets a vertex in the graph.
     * @param {string} id The id of the vertex to get.
     * @returns {V}
     * @memberof JsonldGraph
     */
    getVertex(id: string): V | undefined;
    /**
     * @description Checks if an edge exists in the graph.
     * @param {string} label The label of the edge.
     * @param {(string | V)} from The outgoing vertex id or instance.
     * @param {(string | V)} to The incoming vertex id or instance.
     * @returns {boolean} True if the edge exits.
     * @memberof JsonldGraph
     */
    hasEdge(label: string, from: string | V, to: string | V): boolean;
    /**
     * @description Checks if a vertex exists in the graph.
     * @param {string} id The id of the vertex to check.
     * @returns {boolean} True if the vertex exists, else false.
     * @memberof JsonldGraph
     */
    hasVertex(id: string): boolean;
    /**
     * @description Loads a JSON-LD document into the graph.
     * @param {(any | any[])} input A JSON object or any array of JSON objects to load.
     * @param {(string | string[] | object | object[])} [contexts] Optional contexts to apply to the input(s) if not explicitly speciifed.
     * @param {string} [base] The base IRI of the input(s).
     * @returns {Promise<void>}
     * @memberof JsonldGraph
     */
    load(
        inputs: any | any[],
        contexts?: string | string[] | object | object[],
        base?: string
    ): Promise<void>;
    /**
     * @description Removes an edge from the graph.
     * @param {Edge<V>} edge The edge instance to remove.
     * @memberof JsonldGraph
     */
    removeEdge(edge: Edge<V>): void;
    /**
     * @description Removes a context from the graph.
     * @param {string} uri The URI of the context to remove.
     * @memberof JsonldGraph
     */
    removeContext(uri: string): void;
    /**
     * @description Removes a vertex from the graph.
     * @param {(string | Vertex)} vertex The id of the vertex or vertex instance to remove.
     * @memberof JsonldGraph
     */
    removeVertex(vertex: string | Vertex): void;
    /**
     * @description Removes a mapped prefix from the graph.
     * @param {string} prefix
     * @memberof JsonldGraph
     */
    removePrefix(prefix: string): void;
    /**
     * @description Returns a JSON-LD representation of all the vertices in the graph.
     * @template T
     * @param {JsonFormatOptions} [options]
     * @returns {Promise<T>}
     * @memberof JsonldGraph
     */
    toJson<T = any>(options?: JsonFormatOptions): Promise<T>;
}
