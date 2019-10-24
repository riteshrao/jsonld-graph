import clonedeep from 'lodash.clonedeep';
import { EventEmitter } from 'events';
import Iterable from 'jsiterable';

import { JsonldKeywords } from './constants';
import Errors from './errors';
import IdentityMap from './identityMap';
import IRI from './iri';
import JsonldProcessor from './jsonldProcessor';
import StrictEventEmitter from './eventEmitter';
import JsonFormatOptions from './formatOptions';

interface IndexEvents {
    /**
     * @description Event raised when an edge gets created.
     * @memberof IndexEvents
     */
    edgeCreated(edge: IndexEdge): void;
    /**
     * @description Event raised when an edge is deleted.
     * @memberof IndexEvents
     */
    edgeDeleted(edge: IndexEdge): void;
    /**
     * @description Event raised when node is created.
     * @memberof IndexEvents
     */
    nodeCreated(node: IndexNode): void;
    /** Event raised when the id of a node in the index changes.
     * @description
     * @memberof IndexEvents
     */
    nodeIdChanged(node: IndexNode, previousId: string): void;
    /**
     * @description Event raised when a node gets deleted.
     * @memberof IndexEvents
     */
    nodeDeleted(node: IndexNode): void;
}

type IndexEventEmitter = StrictEventEmitter<EventEmitter, IndexEvents>;

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
 * @description Node in an index.
 * @export
 * @class IndexNode
 */
export class IndexNode {
    private _nodeId: string;
    private _nodeIndex: string;
    private readonly _index: GraphIndex;
    private readonly _attributes = new Map<string, { '@value': any; '@language'?: string }[]>();

    /**
     * @description Metadata object for tracking.
     * @memberof IndexNode
     */
    readonly metadata = {};

    /**
     * @description Creates an instance of IndexNode.
     * @param {string} id The id of the node.
     * @param {GraphIndex} The index the node belongs to.
     * @param {GraphIndex} index The index containing this node.
     * @memberof IndexNode
     */
    constructor(id: string, index: GraphIndex) {
        if (!id) {
            throw new ReferenceError(`Invalid id. id is ${id}`);
        }

        if (!index) {
            throw new ReferenceError(`Invalid index. index is ${index}`);
        }

        this._nodeId = id;
        this._index = index;
    }

    /**
     * @description Gets the id of the node.
     * @readonly
     * @memberof IndexNode
     */
    get id() {
        return this._index.iri.compact(this._nodeId);
    }

    /**
     * @description Sets the id of the node.
     * @memberof IndexNode
     */
    set id(id: string) {
        if (!id) {
            throw new ReferenceError(`Invalid newId. newId is ${id}`);
        }

        const expandedId = this._index.iri.expand(id);
        if (this._index.iri.equal(this._nodeId, expandedId)) {
            return;
        }

        if (this._index.hasNode(expandedId)) {
            throw new Errors.IndexNodeDuplicateError(id);
        }

        // Change the id of the node and re-add it to the index with the new id.
        const previousId = this._nodeId;
        const outgoingEdges = [...this._index.getNodeOutgoing(this._nodeId)];
        const incomingEdges = [...this._index.getNodeIncoming(this._nodeId)];
        this._index.removeNode(this);

        this._nodeId = expandedId;
        this._index.addNode(this);

        // Recreate the outgoing edges from the new node.
        for (const { edge } of outgoingEdges) {
            this._index.createEdge(edge.label, this._nodeId, edge.toNodeId);
        }

        // Recreate incoming edges to the new node.
        for (const { edge } of incomingEdges) {
            this._index.createEdge(edge.label, edge.fromNodeId, this._nodeId);
        }

        this._index.emit('nodeIdChanged', this, previousId);
    }

    /**
     * @description Gets the @index attribute of this node.
     * @memberof IndexNode
     */
    get index() {
        return this._nodeIndex;
    }

    /**
     * @description Sets the @index attribute of this node.
     * @memberof IndexNode
     */
    set index(value: string) {
        this._nodeIndex = value;
    }

    /**
     * @description Gets all the attributes defined on the node.
     * @readonly
     * @type {Iterable<[string, any]>}
     * @memberof IndexNode
     */
    get attributes(): Iterable<[string, AttributeValue[]]> {
        return new Iterable(this._attributes.entries()).map(([key, val]) => {
            return [
                this._index.iri.compact(key),
                val.map(x => {
                    return {
                        value: x['@value'],
                        language: x['@language']
                    };
                })
            ];
        });
    }

    /**
     * @description Adds an attribute value.
     * @param {string} name The name of the attribute.
     * @param {*} value The value to add
     * @returns {this}
     * @memberof IndexNode
     */
    addAttributeValue(name: string, value: any, language?: string): this {
        if (!name) {
            throw new ReferenceError(`Invalid name. name is ${name}`);
        }

        if (value === null || value === undefined) {
            throw new ReferenceError(`Invalid value. value is ${value}`);
        }

        if (language && typeof value !== 'string') {
            throw new TypeError(
                `Invalid argument type. Language attribute values must be strings, but instead found ${typeof value}`
            );
        }

        const normalizedName = this._index.iri.expand(name);
        if (this._attributes.has(normalizedName)) {
            const values = this._attributes.get(normalizedName);
            if (language) {
                // If an existing value for the specified language is already set, then replace the value, else add a new one.
                const existing = values.find(x => x['@language'] === language);
                if (existing) {
                    existing['@value'] = value;
                } else {
                    values.push({ '@language': language, '@value': value });
                }
            } else {
                values.push({ '@value': value });
            }
        } else {
            if (language) {
                this._attributes.set(normalizedName, [
                    {
                        '@language': language,
                        '@value': value
                    }
                ]);
            } else {
                this._attributes.set(normalizedName, [
                    {
                        '@value': value
                    }
                ]);
            }
        }

        return this;
    }

    /**
     * @description Deletes a attribute and its value.
     * @param {string} name The name of the attribute to delete.
     * @param {string} [language] The optional language whose value should be deleted.
     * @returns {this}
     * @memberof IndexNode
     */
    deleteAttribute(name: string, language?: string): this {
        if (!name) {
            throw new ReferenceError(`Invalid name. name is ${name}`);
        }

        const normalizedName = this._index.iri.expand(name);
        if (language) {
            const currentValues = this._attributes.get(normalizedName);
            if (currentValues) {
                const valueIndex = currentValues.findIndex(x => x['@language'] === language);
                if (valueIndex >= 0) {
                    currentValues.splice(valueIndex, 1);
                }
            }
        } else {
            this._attributes.delete(this._index.iri.expand(name));
        }

        return this;
    }

    /**
     * @description Gets an attribute value.
     * @template T
     * @param {string} name The name of the attribute value to get.
     * @returns {T}
     * @memberof IndexNode
     */
    getAttributeValues<T = any>(name: string): AttributeValue<T>[] {
        if (!name) {
            throw new ReferenceError(`Invalid name. name is ${name}`);
        }

        const normalizedName = this._index.iri.expand(name);
        const values = this._attributes.get(normalizedName);
        if (!values) {
            return [];
        }

        return values.map(x => {
            return {
                value: x['@value'],
                language: x['@language']
            };
        });
    }

    /**
     * @description Checks if an attribute has been defined on the node.
     * @param {string} name The name of the attribute to check.
     * @returns {boolean} True if the attribute has been defined, else false.
     * @memberof IndexNode
     */
    hasAttribute(name: string): boolean {
        if (!name) {
            throw new ReferenceError(`Invalid name. name is ${name}`);
        }

        return this._attributes.has(this._index.iri.expand(name));
    }

    /**
     * @description Checks if an attribute has been defined and has the specified value.
     * @param {string} name The name of the attribute to check.
     * @param {*} value The value of the attribute to check.
     * @param {string} [language] Optional language.
     * @returns {boolean} True if the attribute has been defined and has the specified value.
     * @memberof IndexNode
     */
    hasAttributeValue(name: string, value: any, language?: string): boolean {
        if (!name) {
            throw new ReferenceError(`Invalid name. name is '${name}'`);
        }

        if (!value) {
            throw new ReferenceError(`Invalid value. value is '${value}'`);
        }

        if (language && typeof value !== 'string') {
            throw new TypeError(
                `Invalid argument type. Language attribute values must be strings, but instead found ${typeof value}`
            );
        }

        const normalizedName = this._index.iri.expand(name);
        const values = this._attributes.get(normalizedName);
        if (values) {
            return language
                ? values.some(x => x['@language'] === language && x['@value'] === value)
                : values.some(x => x['@value'] === value);
        } else {
            return false;
        }
    }

    /**
     * @description Removes an attribute value.
     * @param {string} name The name of the attribute whose value should be removed.
     * @param {string} value The value to remove.
     * @param {string} [language] Optional language to remove the value from.
     * @returns {this}
     * @memberof IndexNode
     */
    removeAttributeValue(name: string, value: any): this {
        if (!name) {
            throw new ReferenceError(`Invalid name. name is '${name}'`);
        }
        if (!value) {
            throw new ReferenceError(`Invalid value. value is '${value}'`);
        }

        const normalizedName = this._index.iri.expand(name);
        if (!this._attributes.has(normalizedName)) {
            return;
        }

        const currentValues = this._attributes.get(normalizedName);
        if (!currentValues) {
            return this;
        }

        let valueIndex = currentValues.findIndex(x => x['@value'] === value);
        while (valueIndex >= 0) {
            currentValues.splice(valueIndex, 1);
            valueIndex = currentValues.findIndex(x => x['@value'] === value);
        }

        if (currentValues.length === 0) {
            // Removal of all values of an attribute equals deletion of the attribute.
            this._attributes.delete(normalizedName);
        }

        return this;
    }

    /**
     * @description Sets an attribute value, replacing any existing value.
     * @param {string} name The name of the attribute to set.
     * @param {*} value The value to set.
     * @param {string} [language] Optional language to set the value for.
     * @returns {this}
     * @memberof IndexNode
     */
    setAttributeValue(name: string, value: any, language?: string): this {
        if (!name) {
            throw new ReferenceError(`Invalid label. label is ${name}`);
        }

        if (value === null || value === undefined) {
            throw new ReferenceError(`Invalid value. value is ${value}`);
        }

        if (language && typeof value !== 'string') {
            throw new TypeError(
                `Invalid argument type. Language attribute values must be strings, but instead found ${typeof value}`
            );
        }

        const normalizedName = this._index.iri.expand(name);
        if (language) {
            // If an existing value for the specified language is already set, then replace the value, else add a new one.
            const values = this._attributes.get(normalizedName) || [];
            const existing = values.find(x => x['@language'] === language);
            if (existing) {
                existing['@value'] = value;
            } else {
                values.push({ '@language': language, '@value': value });
            }
        } else {
            this._attributes.set(normalizedName, [{ '@value': value }]);
        }

        return this;
    }

    /**
     * @description Returns a JSON representation of the node.
     * @param {JsonFormatOptions} [options={}] Formatting options for the node.
     * @returns {Promise<any>}
     * @memberof IndexNode
     */
    async toJson(options: JsonFormatOptions = {}): Promise<any> {
        options.frame = Object.assign(options.frame || {}, {
            [JsonldKeywords.id]: this._nodeId
        });

        const json = await this._index.toJson(options);
        return json['@graph'][0];
    }

    /**
     * @description Converts the vertex into a triple form.
     * @returns {*} JSON object containing the triple
     * @memberof IndexNode
     */
    toTriple(): any {
        const triple: any = {
            [JsonldKeywords.id]: this._nodeId
        };

        for (const [attributeName, values] of this._attributes) {
            triple[this._index.iri.expand(attributeName)] = values;
        }

        for (const { edge, node } of this._index.getNodeOutgoing(this._nodeId)) {
            const edgeLabelId = this._index.iri.expand(edge.label);
            const edgeNodeId = node._nodeId;

            if (!triple[edgeLabelId]) {
                triple[edgeLabelId] = [];
            }

            if (edgeLabelId === JsonldKeywords.type) {
                triple[edgeLabelId].push(edgeNodeId);
            } else {
                triple[edgeLabelId].push({
                    [JsonldKeywords.id]: edgeNodeId
                });
            }
        }

        return triple;
    }
}

/**
 * @description Edge in an index.
 * @export
 * @class IndexEdge
 */
export class IndexEdge {
    private readonly _label: string;
    private readonly _fromNodeId: string;
    private readonly _toNodeId: string;
    private readonly _index: GraphIndex;

    /**
     *Creates an instance of IndexEdge.
     * @param {string} label The edge label.
     * @param {string} fromNodeId The outgoing node id.
     * @param {string} toNodeId The incoming node id.
     * @param {GraphIndex} index The index containing this edge.
     * @memberof IndexEdge
     */
    constructor(label: string, fromNodeId: string, toNodeId: string, index: GraphIndex) {
        if (!label) {
            throw new ReferenceError(`Invalid label. label is ${label}`);
        }

        if (!fromNodeId) {
            throw new ReferenceError(`Invalid fromNodeId. fromNodeId is ${fromNodeId}`);
        }

        if (!toNodeId) {
            throw new ReferenceError(`Invalid toNodeId. toNodeId is ${toNodeId}`);
        }

        if (!index) {
            throw new ReferenceError(`Invalid index. index is ${index}`);
        }

        this._label = label;
        this._fromNodeId = fromNodeId;
        this._toNodeId = toNodeId;
        this._index = index;
    }

    /**
     * @description Gets the id of the index.
     * @readonly
     * @type {string}
     * @memberof IndexEdge
     */
    get id(): string {
        return IndexEdge.toId(this._label, this._fromNodeId, this._toNodeId);
    }

    /**
     * @description Gets the label of the edge.
     * @readonly
     * @type {string}
     * @memberof IndexEdge
     */
    get label(): string {
        return this._index.iri.compact(this._label);
    }

    /**
     * @description Gets the outgoing node id of the edge.
     * @readonly
     * @type {string}
     * @memberof IndexEdge
     */
    get fromNodeId(): string {
        return this._index.iri.compact(this._fromNodeId);
    }

    /**
     * @description Gets the incoming node id of the edge.
     * @readonly
     * @type {string}
     * @memberof IndexEdge
     */
    get toNodeId(): string {
        return this._index.iri.compact(this._toNodeId);
    }

    /**
     * @description Generates a deterministic id for an edge.
     * @static
     * @param {string} label The label of the edge.
     * @param {string} fromNodeId The outgoing node id of the edge.
     * @param {string} toNodeId The incoming node id of the edge.
     * @returns
     * @memberof IndexEdge
     */
    static toId(label: string, fromNodeId: string, toNodeId: string) {
        if (!label) {
            throw new ReferenceError(`Invalid label. label is ${label}`);
        }
        if (!fromNodeId) {
            throw new ReferenceError(`Invalid fromNodeId. fromNodeId is ${fromNodeId}`);
        }
        if (!toNodeId) {
            throw new ReferenceError(`Invalid toNodeId. toNodeId is ${toNodeId}`);
        }

        return `${fromNodeId}->${label}->${toNodeId}`;
    }
}

/**
 * @description Index store for graph nodes and edges.
 * @export
 * @class GraphIndex
 */
export class GraphIndex extends (EventEmitter as { new (): IndexEventEmitter }) {
    readonly iri = new IRI();

    private readonly _edges = new Map<string, IndexEdge>();
    private readonly _index = new Map<string, Set<string>>();
    private readonly _nodes = new Map<string, IndexNode>();
    private readonly _processor: JsonldProcessor;

    private static IX_EDGES_KEY = (label: string) => `[e]::${label}`;
    private static IX_EDGE_INCOMING_KEY = (label: string) => `[e]::${label}_[in]`;
    private static IX_EDGE_OUTGOING_KEY = (label: string) => `[e]::${label}_[out]`;
    private static IX_NODE_INCOMING_ALL_KEY = (id: string) => `[v]::${id}_[in]`;
    private static IX_NODE_INCOMING_EDGES = (id: string, label: string) => `[v]::${id}_[in]_[e]::${label}`;
    private static IX_NODE_OUTGOING_ALL = (id: string) => `[v]::${id}_[out]`;
    private static IX_NODE_OUTGOING_EDGES = (id: string, label: string) => `[v]::${id}_[out]_[e]::${label}`;

    constructor() {
        super();
        this._processor = new JsonldProcessor({ remoteContexts: false });
    }

    /**
     * @description Gets the contexts registered with the index.
     * @readonly
     * @type {Iterable<[string, any]>}
     * @memberof GraphIndex
     */
    get contexts(): Iterable<[string, any]> {
        return this._processor.contexts;
    }

    /**
     * @description Gets the count of nodes in the index.
     * @readonly
     * @type {number}
     * @memberof GraphIndex
     */
    get nodeCount(): number {
        return this._nodes.size;
    }

    /**
     * @description Gets the count of edges in the index.
     * @readonly
     * @type {number}
     * @memberof GraphIndex
     */
    get edgeCount(): number {
        return this._index.size;
    }

    /**
     * @description Adds a context to the index.
     * @param {string} id The id of the context to add.
     * @param {value} context The context to add.
     * @memberof GraphIndex
     */
    addContext(id: string, context: any): void {
        this._processor.addContext(id, context);
    }

    /**
     * @description Adds a prefix for a canonical URI
     * @param {string} prefix The prefix to add.
     * @param {string} uri The uri the prefix maps to.
     * @memberof GraphIndex
     */
    addPrefix(prefix: string, uri: string) {
        this.iri.addPrefix(prefix, uri);
    }

    /**
     * @description Adds a new node to the index.
     * @param {IndexNode} node The node instance to add.
     * @memberof GraphIndex
     */
    addNode(node: IndexNode) {
        if (!node) {
            throw new ReferenceError(`Invalid node. node is ${node}`);
        }

        if (this._nodes.has(node.id)) {
            throw new Errors.IndexNodeDuplicateError(node.id);
        }

        this._nodes.set(node.id, node);
    }

    /**
     * @description Creates a new edge in the index.
     * @param {string} label The label of the edge to create.
     * @param {string} fromNodeId The edge outgoing node id.
     * @param {string} toNodeId The edge incoming node id.
     * @memberof GraphIndex
     */
    createEdge(label: string, fromNodeId: string, toNodeId: string): IndexEdge {
        if (!label) {
            throw new ReferenceError(`Invalid label. label is ${label}`);
        }
        if (!fromNodeId) {
            throw new ReferenceError(`Invalid fromNodeId. fromNodeId is ${fromNodeId}`);
        }
        if (!toNodeId) {
            throw new ReferenceError(`Invalid toNodeId. toNodeId is ${toNodeId}`);
        }

        const expandedLabel = this.iri.expand(label);
        const expandedFromId = this.iri.expand(fromNodeId);
        const expandedToId = this.iri.expand(toNodeId);

        if (!this._nodes.has(expandedFromId)) {
            throw new Errors.IndexEdgeNodeNotFoundError(label, fromNodeId, 'outgoing');
        }
        if (!this._nodes.has(expandedToId)) {
            throw new Errors.IndexEdgeNodeNotFoundError(label, toNodeId, 'incoming');
        }
        if (expandedFromId === expandedToId) {
            throw new Errors.IndexEdgeCyclicalError(label, toNodeId);
        }

        const edgeId = IndexEdge.toId(expandedLabel, expandedFromId, expandedToId);
        if (this._edges.has(edgeId)) {
            return this._edges.get(edgeId);
        }

        const edge = new IndexEdge(expandedLabel, expandedFromId, expandedToId, this);
        this._edges.set(edge.id, edge);
        this._indexEdge(expandedLabel, expandedFromId, expandedToId);
        this.emit('edgeCreated', edge);
        return edge;
    }

    /**
     * @description Creates a new node in the index.
     * @param {string} id The id of the node to create.
     * @returns {IndexNode}
     * @memberof GraphIndex
     */
    createNode(id: string): IndexNode {
        if (!id) {
            throw new ReferenceError(`Invalid id. id is ${id}`);
        }

        const expandedId = this.iri.expand(id);
        if (this._nodes.has(expandedId)) {
            throw new Errors.IndexNodeDuplicateError(id);
        }

        const node = new IndexNode(expandedId, this);
        this._nodes.set(expandedId, node);
        this.emit('nodeCreated', node);
        return node;
    }

    /**
     * @description Gets an edge in the index.
     * @param {string} label The label of the edge ot get.
     * @param {string} fromNodeId The edge outgoing node id.
     * @param {string} toNodeId The edge incoming node id.
     * @returns {IndexEdge}
     * @memberof GraphIndex
     */
    getEdge(label: string, fromNodeId: string, toNodeId: string): IndexEdge {
        if (!label) {
            throw new ReferenceError(`Invalid label. label is ${label}`);
        }
        if (!fromNodeId) {
            throw new ReferenceError(`Invalid fromNodeId. fromNodeId is ${fromNodeId}`);
        }
        if (!toNodeId) {
            throw new ReferenceError(`Invalid toNodeId. toNodeId is ${toNodeId}`);
        }

        return this._edges.get(
            IndexEdge.toId(this.iri.expand(label), this.iri.expand(fromNodeId), this.iri.expand(toNodeId))
        );
    }

    /**
     * @description Gets edges in the index.
     * @param {string} [label] Optional label filter used to only return edges with the matching label.
     * @returns {IterableIterator<IndexEdge>}
     * @memberof GraphIndex
     */
    *getEdges(label?: string): IterableIterator<IndexEdge> {
        if (!label) {
            for (const [, edge] of this._edges) {
                yield edge;
            }
        } else {
            const indexKey = GraphIndex.IX_EDGES_KEY(this.iri.expand(label));
            if (!this._index.has(indexKey)) {
                return;
            }

            for (const edgeId of this._index.get(indexKey)) {
                yield this._edges.get(edgeId);
            }
        }
    }

    /**
     * @description Gets all nodes that have an incoming edge with the specified label.
     * @param {string} label The incoming edge label.
     * @returns {IterableIterator<IndexNode>}
     * @memberof GraphIndex
     */
    *getEdgeIncoming(label: string): IterableIterator<IndexNode> {
        if (!label) {
            throw new ReferenceError(`Invalid label. label is ${label}`);
        }

        const indexKey = GraphIndex.IX_EDGE_INCOMING_KEY(this.iri.expand(label));
        if (!this._index.has(indexKey)) {
            return;
        }

        const visited = new Set<string>();
        for (const edgeId of this._index.get(indexKey)) {
            const edge = this._edges.get(edgeId);
            if (!visited.has(edge.toNodeId)) {
                visited.add(edge.toNodeId);
                yield this._nodes.get(edge.toNodeId);
            }
        }
    }

    /**
     * @description Gets all nodes that haven an outgoing edge with the specified label.
     * @param {string} label The outgoing edge label.
     * @returns {IterableIterator<IndexNode>}
     * @memberof GraphIndex
     */
    *getEdgeOutgoing(label: string): IterableIterator<IndexNode> {
        if (!label) {
            throw new ReferenceError(`Invalid label. label is ${label}`);
        }

        const indexKey = GraphIndex.IX_EDGE_OUTGOING_KEY(this.iri.expand(label));
        if (!this._index.has(indexKey)) {
            return;
        }

        const visited = new Set<string>();
        for (const edgeId of this._index.get(indexKey)) {
            const edge = this._edges.get(edgeId);
            if (!visited.has(edge.fromNodeId)) {
                visited.add(edge.fromNodeId);
                yield this._nodes.get(edge.fromNodeId);
            }
        }
    }

    /**
     * @description Gets a specific node in the index.
     * @param {string} id The id of the node to get.
     * @returns {IndexNode}
     * @memberof GraphIndex
     */
    getNode(id: string): IndexNode {
        if (!id) {
            throw new ReferenceError(`Invalid id. id is ${id}`);
        }

        return this._nodes.get(this.iri.expand(id));
    }

    /**
     * @description Gets all nodes in the index.
     * @returns {IterableIterator<IndexNode>}
     * @memberof GraphIndex
     */
    *getNodes(): IterableIterator<IndexNode> {
        for (const [, node] of this._nodes) {
            yield node;
        }
    }

    /**
     * @description Gets a node's incoming edges, along with the incoming node.
     * @param {string} id The node whose incoming edges and nodes are to be retrieved.
     * @param {string} [label] Optional label to filter only those incoming edges that match the specified label.
     * @returns {IterableIterator<{ edge: IndexEdge, node: IndexNode }>}
     * @memberof GraphIndex
     */
    *getNodeIncoming(id: string, label?: string): IterableIterator<{ edge: IndexEdge; node: IndexNode }> {
        if (!id) {
            throw new ReferenceError(`id is invalid. id is ${id}`);
        }
        let indexKey: string;
        if (!label) {
            indexKey = GraphIndex.IX_NODE_INCOMING_ALL_KEY(this.iri.expand(id));
        } else {
            indexKey = GraphIndex.IX_NODE_INCOMING_EDGES(this.iri.expand(id), this.iri.expand(label));
        }

        if (!this._index.has(indexKey)) {
            return;
        }

        for (const edgeId of this._index.get(indexKey)) {
            const edge = this._edges.get(edgeId);
            const node = this._nodes.get(this.iri.expand(edge.fromNodeId));
            yield { edge, node };
        }
    }

    /**
     * @description Gets a node's outgoing edges, along with the outgoing node.
     * @param {string} id The node whose outgoing edges and nodes are to be retrieved.
     * @param {string} [label] Optional label to filter only those outgoing edges that match the specified label.
     * @returns {IterableIterator<{ edge: IndexEdge, node: IndexNode }>}
     * @memberof GraphIndex
     */
    *getNodeOutgoing(id: string, label?: string): IterableIterator<{ edge: IndexEdge; node: IndexNode }> {
        let indexKey: string;
        if (!label) {
            indexKey = GraphIndex.IX_NODE_OUTGOING_ALL(this.iri.expand(id));
        } else {
            indexKey = GraphIndex.IX_NODE_OUTGOING_EDGES(this.iri.expand(id), this.iri.expand(label));
        }

        if (!this._index.has(indexKey)) {
            return;
        }

        for (const edgeId of this._index.get(indexKey)) {
            const edge = this._edges.get(edgeId);
            const node = this._nodes.get(this.iri.expand(edge.toNodeId));
            yield { edge, node };
        }
    }

    /**
     * @description Checks if a specific edge exists.
     * @param {string} label The label of the edge.
     * @param {string} fromNodeId The edge outgoing node id.
     * @param {string} toNodeId The edge incoming node id.
     * @returns {boolean} True if the edge exists, else false.
     * @memberof GraphIndex
     */
    hasEdge(label: string, fromNodeId: string, toNodeId: string): boolean {
        if (!label) {
            throw new ReferenceError(`Invalid label. label is ${label}`);
        }

        if (!fromNodeId) {
            throw new ReferenceError(`Invalid fromNodeId. fromNodeId is ${fromNodeId}`);
        }

        if (!toNodeId) {
            throw new ReferenceError(`Invalid toNodeId. toNodeId is ${toNodeId}`);
        }

        return this._edges.has(
            IndexEdge.toId(this.iri.expand(label), this.iri.expand(fromNodeId), this.iri.expand(toNodeId))
        );
    }

    /**
     * @description Checks if a specific node exists.
     * @param {string} id The id of the node to check for.
     * @returns {boolean} True if the node exists, else false.
     * @memberof GraphIndex
     */
    hasNode(id: string): boolean {
        if (!id) {
            throw new ReferenceError(`Invalid nodeId. nodeId is ${id}`);
        }

        return this._nodes.has(this.iri.expand(id));
    }

    /**
     * @description Loads a set of input JSON-LD documents into the index.
     * @param {(any | any[])} inputs The inputs to load.
     * @param {string|string[]|object|object[]} [contexts] The contexts to load.
     * @param {string} [base] The base IRI of the context.
     * @returns {Promise<Set<string>>}
     * @memberof GraphIndex
     */
    async load(
        inputs: any | any[],
        contexts?: string | string[] | object | object[],
        base?: string
    ): Promise<Set<string>> {
        if (!inputs) {
            throw new ReferenceError(`Invalid inputs. inputs is ${inputs}`);
        }

        const vertexTracker = new Set<string>();
        const documents: any[] = inputs instanceof Array ? inputs : [inputs];
        for (const document of documents) {
            try {
                const triples = await this._processor.flatten(document, contexts, base);
                this._loadTriples(triples, vertexTracker, false);
            } catch (err) {
                throw new Errors.DocumentParseError(err);
            }
        }

        return vertexTracker;
    }

    /**
     * @description Loads and merges a set of input JSON-LD documents into the index.
     * @param {(any | any[])} inputs The inputs to merge.
     * @param {string|string[]|object|object[]} [contexts] The contexts to merge.
     * @param {string} [base] The base IRI of inputs.
     * @returns {Promise<Set<string>>}
     * @memberof GraphIndex
     */
    async merge(
        inputs: any | any[],
        contexts?: string | string[] | object | object[],
        base?: string
    ): Promise<Set<string>> {
        if (!inputs) {
            throw new ReferenceError(`Invalid inputs. inputs is ${inputs}`);
        }

        const vertexTracker = new Set<string>();
        const documents: any[] = inputs instanceof Array ? inputs : [inputs];
        for (const document of documents) {
            try {
                const triples = await this._processor.flatten(document, contexts, base);
                this._loadTriples(triples, vertexTracker, true);
            } catch (err) {
                throw new Errors.DocumentParseError(err);
            }
        }

        return vertexTracker;
    }

    /**
     * @description Removes a context.
     * @param {string} uri The uri of the context to remove.
     * @memberof GraphIndex
     */
    removeContext(uri: string): void {
        this._processor.removeContext(uri);
    }

    /**
     * @description Removes an edge from the index.
     * @param {(string | IndexEdge)} edge The id or edge instance to remove from the index.
     * @returns {void}
     * @memberof GraphIndex
     */
    removeEdge(edge: string | IndexEdge): void {
        if (!edge) {
            throw new ReferenceError(`Invalid edge. edge is ${edge}`);
        }

        let indexEdge = edge as IndexEdge;
        if (typeof edge === 'string') {
            indexEdge = this._edges.get(this.iri.expand(edge));
            if (!indexEdge) {
                return;
            }
        }

        this._deleteEdgeIndex(
            this.iri.expand(indexEdge.label),
            this.iri.expand(indexEdge.fromNodeId),
            this.iri.expand(indexEdge.toNodeId)
        );

        if (this._edges.delete(indexEdge.id)) {
            this.emit('edgeDeleted', indexEdge);
        }
    }

    /**
     * @description Removes a node from the index.
     * @param {(string | IndexNode)} node The id or node instance to remove from the index.
     * @returns {void}
     * @memberof GraphIndex
     */
    removeNode(node: string | IndexNode): void {
        if (!node) {
            throw new ReferenceError(`Invalid node. node is ${node}`);
        }

        let indexNode = node as IndexNode;
        if (typeof node === 'string') {
            indexNode = this._nodes.get(this.iri.expand(node));
            if (!indexNode) {
                return;
            }
        }

        const incomingEdgesKey = GraphIndex.IX_NODE_INCOMING_ALL_KEY(this.iri.expand(indexNode.id));
        const outgoingEdgesKey = GraphIndex.IX_NODE_OUTGOING_ALL(this.iri.expand(indexNode.id));

        if (this._index.has(incomingEdgesKey)) {
            for (const edgeId of this._index.get(incomingEdgesKey)) {
                this.removeEdge(edgeId);
            }

            this._index.delete(incomingEdgesKey);
        }

        if (this._index.has(outgoingEdgesKey)) {
            for (const edgeId of this._index.get(outgoingEdgesKey)) {
                this.removeEdge(edgeId);
            }

            this._index.delete(outgoingEdgesKey);
        }

        this._nodes.delete(this.iri.expand(indexNode.id));
        this.emit('nodeDeleted', indexNode);
    }

    /**
     * @description Removes a prefix from the index.
     * @param {string} prefix The prefix string to remove.
     * @memberof GraphIndex
     */
    removePrefix(prefix: string) {
        this.iri.removePrefix(prefix);
    }

    /**
     * @description Gets a JSON representation of the index.
     * @param {frame} [any] Optional frame instruction.
     * @returns {Promise<any>}
     * @memberof GraphIndex
     */
    async toJson(options: JsonFormatOptions = {}): Promise<any> {
        const document: any = { [JsonldKeywords.graph]: [] };
        for (const node of this.getNodes()) {
            document[JsonldKeywords.graph].push(node.toTriple());
        }

        const formatOptions = clonedeep(options);

        if (formatOptions.frame) {
            this._expandIdReferences(formatOptions.frame);
            if (formatOptions.context && !formatOptions.frame[JsonldKeywords.container]) {
                formatOptions.frame[JsonldKeywords.context] = options.context;
            }

            return this._processor.frame(document, formatOptions.frame, [], options.base);
        } else if (options.context) {
            const expanded = await this._processor.expand(document, formatOptions.context, options.base);
            return this._processor.compact(expanded, formatOptions.context);
        } else {
            return document;
        }
    }

    private _createEdgeIndexKeys(label: string, fromNodeId: string, toNodeId: string) {
        return [
            GraphIndex.IX_EDGES_KEY(label),
            GraphIndex.IX_EDGE_INCOMING_KEY(label),
            GraphIndex.IX_EDGE_OUTGOING_KEY(label),
            GraphIndex.IX_NODE_INCOMING_ALL_KEY(toNodeId),
            GraphIndex.IX_NODE_INCOMING_EDGES(toNodeId, label),
            GraphIndex.IX_NODE_OUTGOING_ALL(fromNodeId),
            GraphIndex.IX_NODE_OUTGOING_EDGES(fromNodeId, label)
        ];
    }

    private _deleteEdgeIndex(label: string, fromNodeId: string, toNodeId: string) {
        const edgeId = IndexEdge.toId(label, fromNodeId, toNodeId);
        const indexKeys = this._createEdgeIndexKeys(label, fromNodeId, toNodeId);
        for (const key of indexKeys) {
            if (this._index.has(key)) {
                this._index.get(key).delete(edgeId);
                if (this._index.get(key).size === 0) {
                    this._index.delete(key);
                }
            }
        }
    }

    private _expandIdReferences(source: any) {
        // This function is primarily looking for objects with @id keys and processing the identity references.
        // 1. Start by only accepting Array or object types.
        // 2. If source is an array, loop over elements in the array and recursively call self.
        // 3. If source is an object
        // 4. Get all own property keys. Loop through each key.
        // 4.a.Key is @id, process the value
        // 4.a @id value can either b a string or an array. If string replace the id with expanded id value. If an array then go through and expand each element.
        if (source instanceof Array) {
            for (const element of source) {
                this._expandIdReferences(element);
            }
        } else if (typeof source === 'object') {
            const keys = Object.getOwnPropertyNames(source);
            for (const key of keys) {
                if (key === JsonldKeywords.id) {
                    if (source[key] instanceof Array) {
                        const elements = [...source[key]];
                        for (const element of elements) {
                            if (typeof element === 'string') {
                                source[key].splice(source[key].indexOf(element), 1, this.iri.expand(element));
                            }
                        }
                    } else if (typeof source[key] === 'string') {
                        source[key] = this.iri.expand(source[key]);
                    }
                } else if (source[key] instanceof Array || typeof source[key] === 'object') {
                    this._expandIdReferences(source[key]);
                }
            }
        }
    }

    private _indexEdge(label: string, fromNodeId: string, toNodeId: string) {
        const edgeId = IndexEdge.toId(label, fromNodeId, toNodeId);
        for (const key of this._createEdgeIndexKeys(label, fromNodeId, toNodeId)) {
            if (!this._index.has(key)) {
                this._index.set(key, new Set<string>());
            }

            this._index.get(key).add(edgeId);
        }
    }

    private _loadTriples(triples: any[], vertexTracker: Set<string>, mergeAttributes: boolean = false): void {
        const identityMap = new IdentityMap();

        for (const triple of triples) {
            const id = identityMap.get(triple);
            const types = triple[JsonldKeywords.type] || [];
            let subjectNode: IndexNode;

            if (this.hasNode(id)) {
                subjectNode = this.getNode(id);
            } else {
                subjectNode = this.createNode(id);
                vertexTracker.add(this.iri.compact(id));
            }

            // Add outgoing edges to type nodes.
            for (const typeId of types) {
                if (!this.hasNode(typeId)) {
                    this.createNode(typeId);
                }
                this.createEdge(JsonldKeywords.type, subjectNode.id, typeId);
            }

            // Process each predicate for the object.
            for (const predicate of Object.keys(triple)) {
                this._loadPredicate(
                    identityMap,
                    subjectNode,
                    predicate,
                    triple[predicate],
                    vertexTracker,
                    mergeAttributes
                );
            }
        }
    }

    private _loadPredicate(
        identityMap: IdentityMap,
        subjectNode: IndexNode,
        predicate: string,
        objects: any[],
        vertexTracker: Set<string>,
        mergeAttributes: boolean
    ): void {
        for (const obj of objects) {
            if (obj[JsonldKeywords.list]) {
                // Predicate object is a @list container, Load individual items in the @list array.
                return this._loadPredicate(
                    identityMap,
                    subjectNode,
                    predicate,
                    obj[JsonldKeywords.list],
                    vertexTracker,
                    mergeAttributes
                );
            }

            if (obj[JsonldKeywords.id]) {
                // Predicate object is a reference to another entity, create an edge to model the relationship.
                const objectId = identityMap.get(obj);
                if (!this.hasNode(objectId)) {
                    this.createNode(objectId);
                }

                vertexTracker.add(this.iri.compact(objectId));
                this.createEdge(predicate, subjectNode.id, objectId);
            }

            if (obj[JsonldKeywords.value] !== null && obj[JsonldKeywords.value] !== undefined) {
                // Predicate object is a value. Inline the value as a attribute of the subject vertex.
                if (mergeAttributes) {
                    subjectNode.setAttributeValue(predicate, obj[JsonldKeywords.value], obj[JsonldKeywords.language]);
                } else {
                    subjectNode.addAttributeValue(predicate, obj[JsonldKeywords.value], obj[JsonldKeywords.language]);
                }
            }
        }
    }
}

export default GraphIndex;
