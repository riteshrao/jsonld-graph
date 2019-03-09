import { JsonldKeywords } from './constants';
import Errors from './errors';
import IdentityMap from './identityMap';
import JsonldProcessor from './jsonldProcessor';
import { EventEmitter } from 'events';
import StrictEventEmitter from './eventEmitter';
import { JsonFormatOptions } from './formatOptions';

interface IndexEvents {
    /**
     * @description Event raised when an edge gets created.
     * @memberof IndexEvents
     */
    edgeCreated: (edge: IndexEdge) => void;
    /**
     * @description Event raised when an edge is deleted.
     * @memberof IndexEvents
     */
    edgeDeleted: (edge: IndexEdge) => void;
    /**
     * @description Event raised when node is created.
     * @memberof IndexEvents
     */
    nodeCreated: (node: IndexNode) => void;
    /** Event raised when the id of a node in the index changes.
     * @description
     * @memberof IndexEvents
     */
    nodeIdChanged: (node: IndexNode, previousId: string) => void;
    /**
     * @description Event raised when a node gets deleted.
     * @memberof IndexEvents
     */
    nodeDeleted: (node: IndexNode) => void;
}

type IndexEventEmitter = StrictEventEmitter<EventEmitter, IndexEvents>;

/**
 * @description Node in an index.
 * @export
 * @class IndexNode
 */
export class IndexNode {
    private readonly _attributes = new Map<string, any>()

    /**
     * @description Creates an instance of IndexNode.
     * @param {string} id The id of the node.
     * @param {GraphIndex} index The index containing this node.
     * @memberof IndexNode
     */
    constructor(public readonly id: string) { }

    /**
     * @description
     * @readonly
     * @type {IterableIterator<[string, any]>}
     * @memberof IndexNode
     */
    get attributes(): IterableIterator<[string, any]> {
        return this._attributes.entries();
    }

    /**
     * @description Adds an attribute value.
     * @param {string} name The name of the attribute.
     * @param {*} value The value to add
     * @returns {this}
     * @memberof IndexNode
     */
    addAttributeValue(name: string, value: any): this {
        if (!name) {
            throw new ReferenceError(`Invalid name. name is ${name}`);
        }

        if (value === null || value === undefined) {
            throw new ReferenceError(`Invalid value. value is ${value}`);
        }

        if (this._attributes.has(name) && this._attributes.get(name) instanceof Array) {
            this._attributes.get(name).push(value);
        } else if (this._attributes.has(name)) {
            const values = [this._attributes.get(name), value];
            this._attributes.set(name, values);
        } else {
            this._attributes.set(name, value);
        }

        return this;
    }

    /**
     * @description Deletes a specific attribute.
     * @param {string} name The name of the attribute to delete.
     * @returns {this}
     * @memberof IndexNode
     */
    deleteAttribute(name: string): this {
        if (!name) {
            throw new ReferenceError(`Invalid name. name is ${name}`);
        }
        this._attributes.delete(name)
        return this;
    }

    /**
     * @description Gets an attribute value.
     * @template T
     * @param {string} name The name of the attribute value to get.
     * @returns {T}
     * @memberof IndexNode
     */
    getAttribute<T = string>(name: string): T {
        if (!name) {
            throw new ReferenceError(`Invalid name. name is ${name}`);
        }

        return this._attributes.get(name);
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
        return this._attributes.has(name);
    }

    /**
     * @description Replace an attribute value
     * @param {string} name The name of the attribute to replace.
     * @param {*} value The value to replace.
     * @returns {this}
     * @memberof IndexNode
     */
    replaceAttribute(name: string, value: any): this {
        if (!name) {
            throw new ReferenceError(`Invalid label. label is ${name}`);
        }

        if (value === null || value === undefined) {
            throw new ReferenceError(`Invalid value. value is ${value}`);
        }

        this._attributes.set(name, value);
        return this;
    }
}

/**
 * @description Edge in an index.
 * @export
 * @class IndexEdge
 */
export class IndexEdge {
    /**
     *Creates an instance of IndexEdge.
     * @param {string} label The edge label.
     * @param {string} fromNodeId The outgoing node id.
     * @param {string} toNodeId The incoming node id.
     * @param {GraphIndex} index The index containing this edge.
     * @memberof IndexEdge
     */
    constructor(
        public readonly label: string,
        public readonly fromNodeId: string,
        public readonly toNodeId: string) { }


    /**
     * @description Gets the id of the index.
     * @readonly
     * @type {string}
     * @memberof IndexEdge
     */
    get id(): string {
        return IndexEdge.toId(this.label, this.fromNodeId, this.toNodeId);
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

        return `${fromNodeId}->${label}->${toNodeId}`
    }
}

/**
 * @description Index store for graph nodes and edges.
 * @export
 * @class GraphIndex
 */
export class GraphIndex extends (EventEmitter as { new(): IndexEventEmitter }) {

    private readonly _nodes = new Map<string, IndexNode>();
    private readonly _edges = new Map<string, IndexEdge>();
    private readonly _index = new Map<string, Set<string>>();
    private readonly _processor: JsonldProcessor;

    private static Index_Edges = (label: string) => `[e]::${label}`;
    private static Index_EdgeIncoming = (label: string) => `[e]::${label}_[in]`;
    private static Index_EdgeOutgoing = (label: string) => `[e]::${label}_[out]`;
    private static Index_NodeIncomingAll = (id: string) => `[v]::${id}_[in]`;
    private static Index_NodeIncomingEdges = (id: string, label: string) => `[v]::${id}_[in]_[e]::${label}`;
    private static Index_NodeOutgoingAll = (id: string) => `ix:[v]:${id}:[out]`;
    private static Index_NodeOutgoingEdges = (id: string, label: string) => `[v]::${id}_[out]_[e]::${label}`;

    constructor() {
        super();
        this._processor = new JsonldProcessor({ remoteContexts: false });
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
     * @param {string} uri The uri of the context to add.
     * @param {value} context The context to add.
     * @memberof GraphIndex
     */
    addContext(uri: string, context: any): void {
        this._processor.addContext(uri, context);
    }

    /**
     * @description Changes the id of an existing node.
     * @param {(string | IndexNode)} node The node whose id should be changed.
     * @param {string} newId The new id of the node.
     * @memberof GraphIndex
     */
    changeNodeId(node: string | IndexNode, newId: string): IndexNode {
        if (!node) {
            throw new ReferenceError(`Invalid node. node is ${node}`);
        }

        if (!newId) {
            throw new ReferenceError(`Invalid newId. newId is ${node}`);
        }

        let currentNode: IndexNode = node as IndexNode;
        if (typeof node === 'string') {
            currentNode = this.getNode(node);
            if (!currentNode) {
                throw new Errors.IndexNodeNotFoundError(node);
            }
        }

        if (currentNode.id === newId) {
            return currentNode;
        }

        if (this.hasNode(newId)) {
            throw new Errors.IndexNodeDuplicateError(newId);
        }

        // Create a new node
        const newNode = this.createNode(newId);

        // Recreate the outgoing edges from the new node.
        for (const { edge } of this.getNodeOutgoing(currentNode.id)) {
            this.createEdge(edge.label, newNode.id, edge.toNodeId);
            this.removeEdge(edge);
        }

        // Recreate incoming edges to the new node.
        for (const { edge } of this.getNodeIncoming(currentNode.id)) {
            this.createEdge(edge.label, edge.fromNodeId, newNode.id);
            this.removeEdge(edge);
        }

        // Remove the old node
        this.removeNode(currentNode);
        this.emit('nodeIdChanged', newNode, currentNode.id);
        return newNode;
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
        if (!this._nodes.has(fromNodeId)) {
            throw new Errors.IndexEdgeNodeNotFoundError(label, fromNodeId, 'outgoing');
        }
        if (!this._nodes.has(toNodeId)) {
            throw new Errors.IndexEdgeNodeNotFoundError(label, toNodeId, 'incoming');
        }
        if (fromNodeId === toNodeId) {
            throw new Errors.IndexEdgeCyclicalError(label, toNodeId);
        }

        if (this._edges.has(IndexEdge.toId(label, fromNodeId, toNodeId))) {
            throw new Errors.IndexEdgeDuplicateError(label, fromNodeId, toNodeId);
        }

        const edge = new IndexEdge(label, fromNodeId, toNodeId);
        this._edges.set(edge.id, edge);
        this._indexEdge(edge);
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
        if (this._nodes.has(id)) {
            throw new Errors.IndexNodeDuplicateError(id);
        }

        const node = new IndexNode(id);
        this._nodes.set(id, node);
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

        return this._edges.get(IndexEdge.toId(label, fromNodeId, toNodeId));
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
            const indexKey = GraphIndex.Index_Edges(label);
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

        const indexKey = GraphIndex.Index_EdgeIncoming(label);
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

        const indexKey = GraphIndex.Index_EdgeOutgoing(label);
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

        return this._nodes.get(id);
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
    *getNodeIncoming(id: string, label?: string): IterableIterator<{ edge: IndexEdge, node: IndexNode }> {
        if (!id) {
            throw new ReferenceError(`id is invalid. id is ${id}`);
        }
        let indexKey: string;
        if (!label) {
            indexKey = GraphIndex.Index_NodeIncomingAll(id);
        } else {
            indexKey = GraphIndex.Index_NodeIncomingEdges(id, label);
        }

        if (!this._index.has(indexKey)) {
            return;
        }

        for (const edgeId of this._index.get(indexKey)) {
            const edge = this._edges.get(edgeId);
            const node = this._nodes.get(edge.fromNodeId);
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
    *getNodeOutgoing(id: string, label?: string): IterableIterator<{ edge: IndexEdge, node: IndexNode }> {
        let indexKey: string;
        if (!label) {
            indexKey = GraphIndex.Index_NodeOutgoingAll(id);
        } else {
            indexKey = GraphIndex.Index_NodeOutgoingEdges(id, label);
        }

        if (!this._index.has(indexKey)) {
            return;
        }

        for (const edgeId of this._index.get(indexKey)) {
            const edge = this._edges.get(edgeId);
            const node = this._nodes.get(edge.toNodeId);
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

        return this._edges.has(IndexEdge.toId(label, fromNodeId, toNodeId));
    }

    /**
     * @description Checks if a specific node exists.
     * @param {string} nodeId The id of the node to check for.
     * @returns {boolean} True if the node exists, else false.
     * @memberof GraphIndex
     */
    hasNode(nodeId: string): boolean {
        if (!nodeId) {
            throw new ReferenceError(`Invalid nodeId. nodeId is ${nodeId}`);
        }

        return this._nodes.has(nodeId);
    }

    /**
     * @description Loads a set of input JSON-LD documents into the index.
     * @param {(any | any[])} inputs The inputs to load.
     * @param {string[]} [contexts] The contexts to load.
     * @returns {Promise<void>}
     * @memberof GraphIndex
     */
    async load(inputs: any | any[], contexts?: string[]): Promise<void> {
        if (!inputs) {
            throw new ReferenceError(`Invalid inputs. inputs is ${inputs}`);
        }

        const documents: any[] = (inputs instanceof Array) ? inputs : [inputs];
        for (const document of documents) {
            try {
                const triples = await this._processor.flatten(document, contexts);
                this._loadTriples(triples, false);
            } catch (err) {
                throw new Errors.DocumentParseError(err);
            }
        }
    }

    /**
     * @description Loads and merges a set of input JSON-LD documents into the index.
     * @param {(any | any[])} inputs The inputs to merge.
     * @param {string[]} [contexts] The contexts to merge.
     * @returns {Promise<void>}
     * @memberof GraphIndex
     */
    async merge(inputs: any | any[], contexts?: string[]): Promise<void> {
        if (!inputs) {
            throw new ReferenceError(`Invalid inputs. inputs is ${inputs}`);
        }

        const documents: any[] = (inputs instanceof Array) ? inputs : [inputs];
        for (const document of documents) {
            try {
                const triples = await this._processor.flatten(document, contexts);
                this._loadTriples(triples, true);
            } catch (err) {
                throw new Errors.DocumentParseError(err);
            }
        }
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
            indexEdge = this._edges.get(edge);
            if (!indexEdge) {
                return;
            }
        }

        this._deleteEdgeIndex(indexEdge);
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
            indexNode = this._nodes.get(node);
            if (!indexNode) {
                return;
            }
        }

        const incomingEdgesKey = GraphIndex.Index_NodeIncomingAll(indexNode.id);
        const outgoingEdgesKey = GraphIndex.Index_NodeOutgoingAll(indexNode.id);

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

        this._nodes.delete(indexNode.id);
        this.emit('nodeDeleted', indexNode);
    }

    /**
     * @description Gets a JSON representation of the index.
     * @param {frame} [any] Optional frame instruction.
     * @returns {Promise<any>}
     * @memberof GraphIndex
     */
    async toJson(options: JsonFormatOptions = {}): Promise<any> {
        const entities: any[] = [];

        for (const node of this.getNodes()) {
            const entity: any = { [JsonldKeywords.id]: node.id };

            for (const [key, value] of node.attributes) {
                if (!entity[key]) {
                    entity[key] = [];
                }

                if (value instanceof Array) {
                    for (const item of value) {
                        entity[key].push({ [JsonldKeywords.value]: item });
                    }
                } else {
                    entity[key].push({ [JsonldKeywords.value]: value });
                }
            }

            for (const { edge } of this.getNodeOutgoing(node.id)) {
                if (!entity[edge.label]) {
                    entity[edge.label] = [];
                }

                if (edge.label === JsonldKeywords.type) {
                    entity[edge.label].push(edge.toNodeId)
                } else {
                    entity[edge.label].push({ [JsonldKeywords.id]: edge.toNodeId })
                }
            }

            entities.push(entity);
        }

        let document = { [JsonldKeywords.graph]: entities };
        if (options.frame) {
            if (options.frameContext) {
                options.frame[JsonldKeywords.context] = options.frameContext;
            } else if (options.context) {
                options.frame[JsonldKeywords.context] = options.context;
            }
            
            return this._processor.frame(document, options.frame, options.context, options.base)
        } else if (options.context) {
            const expanded = await this._processor.expand(document, options.context, options.base);
            return this._processor.compact(expanded, options.context);
        } else {
            return document;
        }
    }

    private _indexEdge(edge: IndexEdge) {
        for (const key of GraphIndex.createEdgeIndexKeys(edge)) {
            if (!this._index.has(key)) {
                this._index.set(key, new Set<string>());
            }

            this._index.get(key).add(edge.id);
        }
    }

    private _deleteEdgeIndex(edge: IndexEdge) {
        const indexKeys = GraphIndex.createEdgeIndexKeys(edge);
        for (const key of indexKeys) {
            if (this._index.has(key)) {
                this._index.get(key).delete(edge.id);
                if (this._index.get(key).size === 0) {
                    this._index.delete(key);
                }
            }
        }
    }

    private _loadTriples(triples: any[], mergeAttributes: boolean = false): void {
        const identityMap = new IdentityMap();
        for (const subject of triples) {
            const id = identityMap.get(subject);
            const types = subject[JsonldKeywords.type] || [];
            let subjectNode: IndexNode;

            if (this.hasNode(id)) {
                subjectNode = this.getNode(id);
            } else {
                subjectNode = this.createNode(id);
            }

            // Add outgoing edges to type nodes.
            for (const typeId of types) {
                if (!this.hasNode(typeId)) {
                    this.createNode(typeId);
                }
                this.createEdge(JsonldKeywords.type, subjectNode.id, typeId);
            }

            // Process each predicate for the object.
            for (const predicate in subject) {
                if (predicate === JsonldKeywords.id || predicate === JsonldKeywords.type) {
                    continue;
                }

                // Process each predicate of the subject.
                const objects = subject[predicate];
                for (const obj of objects) {
                    if (obj[JsonldKeywords.id]) {
                        // Predicate object is a reference to another entity, create an edge to model the relationship.
                        const objectId = identityMap.get(obj);
                        if (!this.hasNode(objectId)) {
                            this.createNode(objectId);
                        }

                        this.createEdge(predicate, subjectNode.id, objectId);
                    }

                    if (obj[JsonldKeywords.value]) {
                        // Predicate object is a value. Inline the value as a attribute of the subject vertex.
                        if (mergeAttributes) {
                            subjectNode.replaceAttribute(predicate, obj[JsonldKeywords.value]);
                        } else {
                            subjectNode.addAttributeValue(predicate, obj[JsonldKeywords.value]);
                        }
                    }
                }
            }
        }
    }

    private static createEdgeIndexKeys(edge: IndexEdge) {
        return [
            GraphIndex.Index_Edges(edge.label),
            GraphIndex.Index_EdgeIncoming(edge.label),
            GraphIndex.Index_EdgeOutgoing(edge.label),
            GraphIndex.Index_NodeIncomingAll(edge.toNodeId),
            GraphIndex.Index_NodeIncomingEdges(edge.toNodeId, edge.label),
            GraphIndex.Index_NodeOutgoingAll(edge.fromNodeId),
            GraphIndex.Index_NodeOutgoingEdges(edge.fromNodeId, edge.label)
        ];
    }
}

export default GraphIndex;