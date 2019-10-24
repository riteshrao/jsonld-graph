import Iterable from 'jsiterable';
import * as urijs from 'uri-js';
import { JsonldKeywords } from './constants';
import { Errors } from './errors';
import { Edge, Vertex } from './types';

const PREFIX_REGEX = /^[a-zA-z][a-zA-Z0-9_]*$/;

export default class GraphIndex {
    private readonly _edges = new Map<string, Edge>();
    private readonly _vertices = new Map<string, Vertex>();
    private readonly _index = new Map<string, Set<string>>();
    private readonly _prefixes = new Map<string, string>();

    private static IX_EDGES_KEY = (label: string) => `[e]::${label}`;
    private static IX_NODE_INCOMING_ALL_KEY = (id: string) => `[v]::${id}_[in]`;
    private static IX_NODE_INCOMING_EDGES = (id: string, label: string) =>
        `[v]::${id}_[in]_[e]::${label}`;
    private static IX_NODE_OUTGOING_ALL = (id: string) => `[v]::${id}_[out]`;
    private static IX_NODE_OUTGOING_EDGES = (id: string, label: string) =>
        `[v]::${id}_[out]_[e]::${label}`;

    /**
     * @description Gets the no of edges in the index.
     * @readonly
     * @type {number}
     * @memberof GraphIndex
     */
    get edgeCount(): number {
        return this._edges.size;
    }

    /**
     * @description Gets the no of vertices in the index.
     * @readonly
     * @type {number}
     * @memberof GraphIndex
     */
    get vertexCount(): number {
        return this._vertices.size;
    }

    /**
     * @description Adds an edge to the index.
     * @param {Edge} edge The edge to add to the index.
     * @memberof GraphIndex
     */
    addEdge(edge: Edge): void {
        if (!edge) {
            throw new ReferenceError(`Invalid edge. id is ${edge}`);
        }

        if (!edge.label) {
            throw new ReferenceError(`Invalid edge.label. edge.label is '${edge.label}`);
        }

        if (!edge.fromId) {
            throw new ReferenceError(
                `Invalid edge.fromVertexIRI. edge.fromVertexIRI is '${edge.fromId}`
            );
        }

        if (!edge.toId) {
            throw new ReferenceError(`Invalid edge.toVertexIRI. edge.toVertexIRI is '${edge.toId}`);
        }

        const fromVertexIRI = this.expandIRI(edge.fromId);
        const toVertexIRI = this.expandIRI(edge.toId);

        if (!this._vertices.has(fromVertexIRI)) {
            throw new Errors.VertexNotFoundError(fromVertexIRI);
        }

        if (!this._vertices.has(toVertexIRI)) {
            throw new Errors.VertexNotFoundError(toVertexIRI);
        }

        if (urijs.equal(fromVertexIRI, toVertexIRI)) {
            throw new Errors.CyclicEdgeError(edge.label, edge.fromId);
        }

        const edgeId = this._formatEdgeId(edge.label, fromVertexIRI, toVertexIRI);
        if (this._edges.has(edgeId)) {
            throw new Errors.DuplicateEdgeError(edge.label, edge.fromId, edge.toId);
        }

        this._edges.set(edgeId, edge);
        for (const indexKey of this._generateEdgeIndexKeys(edge)) {
            if (!this._index.has(indexKey)) {
                this._index.set(indexKey, new Set<string>());
            }

            this._index.get(indexKey).add(edgeId);
        }
    }

    /**
     * @description Adds a prefix for an IRI
     * @param {string} prefix The prefix to add.
     * @param {string} iri The IRI mapped to the prefix.
     * @memberof GraphIndex
     */
    addIRIPrefix(prefix: string, iri: string): void {
        if (!prefix) {
            throw new ReferenceError(`Invalid prefix. prefix is '${prefix}'`);
        }

        this.validateIRI(iri);

        if (!prefix.match(PREFIX_REGEX)) {
            throw new Errors.InvalidPrefixError(
                prefix,
                'Invalid prefix. Prefixes must contain only alpha-characters.'
            );
        }

        if (this._prefixes.has(prefix)) {
            throw new Errors.DuplicatePrefixError(prefix);
        }

        for (const [_, mappedId] of this._prefixes) {
            if (urijs.equal(mappedId, iri)) {
                throw new Errors.DuplicatePrefixIRIError(prefix, iri);
            }
        }

        this._prefixes.set(prefix, iri);
    }

    /**
     * @description Adds a vertex to the index.
     * @param {Vertex} vertex The vertex instance to add to the index.
     * @memberof GraphIndex
     */
    addVertex(vertex: Vertex): void {
        if (!vertex) {
            throw new ReferenceError(`Invalid vertex. vertex is ${vertex}`);
        }

        if (this._vertices.has(vertex.id)) {
            throw new Errors.DuplicateVertexError(vertex.id);
        }

        this._vertices.set(vertex.id, vertex);
    }

    /**
     * @description Compacts an IRI with a mapped prefix.
     * @param {string} iri The IRI string to compact.
     * @returns {string}
     * @memberof GraphIndex
     */
    compactIRI(iri: string): string {
        this.validateIRI(iri);
        for (const [prefix, mappedIRI] of this._prefixes) {
            if (iri.startsWith(mappedIRI) && !urijs.equal(iri, mappedIRI)) {
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
     * @description Expands a compacted IRI.
     * @param {string} iri The compacted IRI to expand.
     * @returns {string}
     * @memberof GraphIndex
     */
    expandIRI(iri: string): string {
        if (!iri) {
            throw new ReferenceError(`Invalid iri. iri is '${iri}'`);
        }

        const prefixIndex = iri.indexOf(':');
        if (prefixIndex <= 0) {
            return iri;
        }

        const prefix = iri.substring(0, prefixIndex);
        const component = iri.substring(prefixIndex + 1);
        if (this._prefixes.has(prefix)) {
            return `${this._prefixes.get(prefix)}${component}`;
        } else {
            return iri;
        }
    }

    /**
     * @description Gets an edge.
     * @param {string} label The label of the edge to get.
     * @param {string} fromVertexIRI The id of the outgoing vertex.
     * @param {string} toVertexIRI The id of the incoming vertex.
     * @returns {Edge} The edge instance or undefined if not found
     * @memberof GraphIndex
     */
    getEdge(label: string, fromVertexIRI: string, toVertexIRI: string): Edge {
        if (!label) {
            throw new ReferenceError(`Invalid label. label is '${label}`);
        }
        if (!fromVertexIRI) {
            throw new ReferenceError(`Invalid fromVertexIRI. fromVertexIRI is '${fromVertexIRI}'`);
        }
        if (!toVertexIRI) {
            throw new ReferenceError(`Invalid toVertexIRI. toVertexIRI is '${toVertexIRI}'`);
        }

        return this._edges.get(
            this._formatEdgeId(label, this.expandIRI(fromVertexIRI), this.expandIRI(toVertexIRI))
        );
    }

    *getEdges(label?: string): IterableIterator<Edge> {
        if (!label) {
            for (const [_, edge] of this._edges) {
                yield edge;
            }
        } else {
            const indexKey = GraphIndex.IX_EDGES_KEY(this.expandIRI(label));
            if (!this._index.has(indexKey)) {
                return;
            }

            for (const edgeId of this._index.get(indexKey)) {
                yield this._edges.get(edgeId);
            }
        }
    }

    *getEdgeIncoming(label: string): IterableIterator<Vertex> {
        if (!label) {
            throw new ReferenceError(`Invalid label. label is '${label}`);
        }

        const indexKey = GraphIndex.IX_EDGES_KEY(label);
        if (!this._index.has(indexKey)) {
            return;
        }

        const visited = new Set<string>();
        for (const edgeKey of this._index.get(indexKey)) {
            const edge = this._edges.get(edgeKey);
            if (!visited.has(edge.toId) && this._vertices.has(edge.toId)) {
                visited.add(edge.toId);
                yield this._vertices.get(edge.toId);
            }
        }
    }

    *getEdgeOutgoing(label: string): IterableIterator<Vertex> {
        if (!label) {
            throw new ReferenceError(`Invalid label. label is '${label}'`);
        }

        const indexKey = GraphIndex.IX_EDGES_KEY(label);
        if (!this._index.has(indexKey)) {
            return;
        }

        const visited = new Set<string>();
        for (const edgeKey of this._index.get(indexKey)) {
            const edge = this._edges.get(edgeKey);
            if (!visited.has(edge.fromId) && this._vertices.has(edge.fromId)) {
                visited.add(edge.fromId);
                yield this._vertices.get(edge.fromId);
            }
        }
    }

    /**
     * @description Gets the prefix for an id, if one exists.
     * @param {string} iri The IRI whose prefix should be returned.
     * @returns {string} The mapped prefix for the id.
     * @memberof GraphIndex
     */
    getPrefix(iri: string): string {
        if (!iri) {
            throw new ReferenceError(`Invalid iri. iri is '${iri}'`);
        }

        return new Iterable(this._prefixes.entries())
            .filter(([, mappedIRI]) => iri.startsWith(mappedIRI))
            .map(([prefix]) => prefix)
            .first();
    }

    /**
     * @description Gets a vertex.
     * @param {string} iri The IRI of the vertex to get.
     * @returns {Vertex} The vertex instance.
     * @memberof GraphIndex
     */
    getVertex(iri: string): Vertex {
        this.validateIRI(iri);
        return this._vertices.get(iri);
    }

    *getVertexIncoming(
        id: string,
        label?: string
    ): IterableIterator<{ edge: Edge; vertex: Vertex }> {
        throw new Error('Not implemented');
    }

    *getVertexOutgoing(
        id: string,
        label?: string
    ): IterableIterator<{ edge: Edge; vertex: Vertex }> {
        throw new Error('Not implemented');
    }

    hasEdge(label: string, fromVertexIRI: string, toVertexIRI: string): boolean {
        throw new Error('Not implemented');
    }

    hasPrefix(iri: string): boolean {
        this.validateIRI(iri);
        return new Iterable(this._prefixes.entries()).some(([_, mappedIRI]) =>
            urijs.equal(mappedIRI, iri)
        );
    }

    hasVertex(iri: string): boolean {
        this.validateIRI(iri);
        return this._vertices.has(iri);
    }

    removeIdPrefix(prefix: string): void {
        throw new Error('Not implemented');
    }

    /**
     * @description Validates that an IRI is a conforming IRI.
     * @param {string} iri
     * @returns {void}
     * @memberof GraphIndex
     */
    validateIRI(iri: string): void {
        if (!iri) {
            throw new ReferenceError(`Invalid iri. iri is '${iri}'`);
        }

        if (iri === JsonldKeywords.type) {
            return;
        }

        const parsed = urijs.parse(iri, { iri: true });
        if (!parsed.scheme) {
            throw new Errors.InvalidIRIError(iri, 'IRI schema not specified');
        }

        switch (parsed.scheme) {
            case 'http':
            case 'https': {
                if (!parsed.host) {
                    throw new Errors.InvalidIRIError(
                        iri,
                        'Host name required for http and https IRI'
                    );
                }
                break;
            }
            case 'urn': {
                const { nid } = parsed as any;
                if (!nid) {
                    throw new Errors.InvalidIRIError(
                        iri,
                        'nid segment is required for the urn scheme IRI'
                    );
                }
                break;
            }
            default: {
                throw new Errors.InvalidIRIError(
                    iri,
                    `Unsupported IRI schema ${parsed.scheme}. Only 'http', 'https' and 'urn' schemes as supported`
                );
            }
        }
    }

    private _formatEdgeId(label: string, fromVertex: string, toVertex: string): string {
        return `${label}->${fromVertex}->${toVertex}`;
    }

    private _generateEdgeIndexKeys(edge: Edge): string[] {
        return [
            GraphIndex.IX_EDGES_KEY(edge.label),
            GraphIndex.IX_NODE_INCOMING_ALL_KEY(edge.toId),
            GraphIndex.IX_NODE_INCOMING_EDGES(edge.toId, edge.label),
            GraphIndex.IX_NODE_OUTGOING_ALL(edge.fromId),
            GraphIndex.IX_NODE_OUTGOING_EDGES(edge.fromId, edge.label)
        ];
    }
}
