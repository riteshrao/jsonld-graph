import Iterable from 'jsiterable';

import { BlankNodePrefix, JsonldKeywords } from './constants';
import GraphIndex, { IndexNode } from './graphIndex';
import JsonFormatOptions from './formatOptions';

/**
 * @description Vertex selector function.
 * @export
 * @interface VertexSelector
 */
export interface VertexSelector {
    (vertex: Vertex): boolean;
}

/**
 * @description Vertex filter type that can be used to match vertices based on a supplied filter.
 * @export
 * @class VertexFilter
 */
export class VertexFilter {
    /**
     * @description Creates an instance of VertexFilter.
     * @param {(string | types.VertexSelector)} selector The filter definition to use.
     * @memberof VertexFilter
     */
    constructor(private readonly selector: string | VertexSelector) { }

    /**
     * @description Checks if the filter matches the specified vertex.
     * @param {Vertex} vertex The vertex to check.
     * @returns {boolean} True if the vertex is a match, else false.
     * @memberof VertexFilter
     */
    match(vertex: Vertex): boolean {
        if (!this.selector) {
            return true;
        }

        if (typeof this.selector === 'string') {
            return vertex.id === this.selector;
        }

        return this.selector(vertex);
    }
}

/**
 * @description Represents a vertex in the graph.
 * @export
 * @class Vertex
 */
export class Vertex {

    private _node: IndexNode;
    private readonly _index: GraphIndex;

    /**
     * @description Creates an instance of Vertex.
     * @param {GraphNode} node The graph node this vertex wraps.
     * @memberof Vertex
     */
    constructor(node: IndexNode, index: GraphIndex) {
        if (!node) {
            throw new ReferenceError(`Invalid node. node is ${node}`);
        }

        if (!index) {
            throw new ReferenceError(`Invalid index. index is ${index}`);
        }

        this._node = node;
        this._index = index;
    }

    /**
     * @description Gets the id of the vertex.
     * @type {string}
     * @memberof Vertex
     */
    get id(): string {
        return this._node.id;
    }

    /**
     * @description Sets the id of the vertex.
     * @memberof Vertex
     */
    set id(id: string) {
        this._node = this._index.changeNodeId(this._node, id);
    }

    /**
     * @description Returns true if the vertex is a blank node, else false.
     * @readonly
     * @type {boolean}
     * @memberof Vertex
     */
    get isBlankNode(): boolean {
        return this._node.id.startsWith(BlankNodePrefix);
    }

    /**
     * @description Gets all vertices that have a @type outgoing edge to this vertex.
     * @readonly
     * @type {Iterable<Vertex>}
     * @memberof Vertex
     */
    get instances(): Iterable<Vertex> {
        return this.getIncoming(JsonldKeywords.type).map(({ fromVertex }) => fromVertex);
    }

    /**
     * @description Gets all vertices that this vertex is a @type of.
     * @readonly
     * @type {Iterable<Vertex>}
     * @memberof Vertex
     */
    get types(): Iterable<Vertex> {
        return this.getOutgoing(JsonldKeywords.type).map(({ toVertex }) => toVertex);
    }

    /**
     * @description Gets all attributes defined in the vertex.
     * @readonly
     * @type {Iterable<[string, any]>}
     * @memberof Vertex
     */
    get attributes(): Iterable<[string, any]> {
        return this._node.attributes;
    }

    /**
     * @description Adds an attribute value.
     * @param {string} name The name of the attribute.
     * @param {*} value The value to add.
     * @returns {this}
     * @memberof Vertex
     */
    addAttributeValue(name: string, value: any): this {
        this._node.addAttributeValue(name, value);
        return this;
    }

    /**
     * @description Deletes a specific attribute of the vertex.
     * @param {string} name The attribute name to delete.
     * @returns {this}
     * @memberof Vertex
     */
    deleteAttribute(name: string): this {
        this._node.deleteAttribute(name);
        return this;
    }

    /**
     * @description Gets the value of an attribute.
     * @template T
     * @param {string} name The attribute label to get.
     * @returns {T}
     * @memberof Vertex
     */
    getAttributeValue<T = string>(name: string): T {
        return this._node.getAttribute(name);
    }

    /**
     * @description Gets all incoming vertices to this vertex.
     * @param {string} [edgeLabel] Optional edge label used to filter matching vertices with incoming edges with the specified label.
     * @returns {Iterable<{ label: string, fromVertex: Vertex }>}
     * @memberof Vertex
     */
    getIncoming(edgeLabel?: string): Iterable<{ label: string, fromVertex: Vertex }> {
        return new Iterable(this._index.getNodeIncoming(this._node.id, edgeLabel))
            .map(({ edge, node }) => {
                return {
                    label: edge.label,
                    fromVertex: new Vertex(node, this._index)
                };
            });
    }

    /**
     * @description Gets all outgoing vertices from this vertex.
     * @param {string} [edgeLabel] Optional edge label used to filter matching vertices with outgoing edges with the specified label.
     * @returns {Iterable<{ label: string, toVertex: Vertex }>}
     * @memberof Vertex
     */
    getOutgoing(edgeLabel?: string): Iterable<{ label: string, toVertex: Vertex }> {
        return new Iterable(this._index.getNodeOutgoing(this._node.id, edgeLabel))
            .map(({ edge, node }) => {
                return {
                    label: edge.label,
                    toVertex: new Vertex(node, this._index)
                };
            });
    }

    /**
     * @description Checks if an attribute has been defined on the vertex.
     * @param {string} name The name of the attribute to check.
     * @returns {boolean} True if the attribute has been defined, else false.
     * @memberof Vertex
     */
    hasAttribute(name: string): boolean {
        return this._node.hasAttribute(name);
    }

    /**
     * @description Checks if an attribute exists and if has the specified value.
     * @param {string} name The name of the attribute to check.
     * @param {*} value The value of the attribute to check.
     * @returns {boolean} True if the value exists, else false.
     * @memberof Vertex
     */
    hasAttributeValue(name: string, value: any): boolean {
        if (!this.hasAttribute(name)) {
            return false;
        }

        const attributeValue = this.getAttributeValue<any>(name);
        if (attributeValue instanceof Array) {
            return attributeValue.some(x => x === value);
        } else {
            return attributeValue === value;
        }
    }

    /**
     * @description Checks if the vertex is of a specific @type.
     * @param {string} typeId The type id to check for.
     * @returns {boolean} True if the vertex has a @type outgoing edge to the specified type id, else false.
     * @memberof Vertex
     */
    isType(typeId: string): boolean {
        if (!typeId) {
            throw new ReferenceError(`Invalid typeId. typeId is ${typeId}`);
        }

        return [...this.types.filter(x => x.id === typeId)].length === 1;
    }

    /**
     * @description Removes incoming edges.
     * @param {string} [edgeLabel] Optional edge label used to remove only matching edges.
     * @param {(string | VertexSelector)} [selector] Optional vertex selector used to remove only matching vertices.
     * @returns {this}
     * @memberof Vertex
     */
    removeIncoming(edgeLabel?: string, selector?: string | VertexSelector): this {
        const filter = new VertexFilter(selector);
        for (const { edge, node } of this._index.getNodeIncoming(this._node.id, edgeLabel)) {
            const outgoingVertex = new Vertex(node, this._index);
            if (filter.match(outgoingVertex)) {
                this._index.removeEdge(edge);
            }
        }

        return this;
    }

    /**
     * @description Removes outgoing edges.
     * @param {string} [edgeLabel] Optional edge label used to remove only matching edges.
     * @param {(string | VertexSelector)} [selector] Optional vertex selector used to remove only matching vertices.
     * @returns {this}
     * @memberof Vertex
     */
    removeOutgoing(edgeLabel?: string, selector?: string | VertexSelector): this {
        const filter = new VertexFilter(selector);
        for (const { edge, node } of this._index.getNodeOutgoing(this._node.id, edgeLabel)) {
            const incomingVertex = new Vertex(node, this._index);
            if (filter.match(incomingVertex)) {
                this._index.removeEdge(edge);
            }
        }

        return this;
    }

    /**
     * @description Removes one or more @type edges.
     * @param {...string[]} typeIds One or more type ids to remove.
     * @returns {this}
     * @memberof Vertex
     */
    removeType(...typeIds: string[]): this {
        if (!typeIds || typeIds.length === 0) {
            for (const typeEdge of this.getOutgoing(JsonldKeywords.type)) {
                this.removeOutgoing(JsonldKeywords.type, typeEdge.toVertex.id);
            }
        } else {
            for (const typeId of typeIds) {
                this.removeOutgoing(JsonldKeywords.type, typeId);
            }
        }

        return this;
    }

    /**
     * @description Replaces an attribute value.
     * @param {string} name The attribute name whose value should be replaced.
     * @param {*} value The value to replace.
     * @returns {this}
     * @memberof Vertex
     */
    replaceAttributeValue(name: string, value: any): this {
        this._node.replaceAttribute(name, value);
        return this;
    }

    /**
     * @description Removes an attribute value.
     * @param {string} name The attribute name whose value should be removed.
     * @param {*} value The value to remove.
     * @returns {this}
     * @memberof Vertex
     */
    removeAttributeValue(name: string, value: any): this {
        this._node.removeAttributeValue(name, value);
        return this;
    }

    /**
     * @description Sets an incoming relationship to another vertex.
     * @param {string} label The label of the incoming edge relationship.
     * @param {string} fromVertexId Id of the vertex to set the incoming relationship from.
     * @param {boolean} [createIfNotExists=false] True to create the incoming vertex if it doesn't exist. If false and the vertex is not found, a VertexNotFoundError is thrown.
     * @returns {this}
     * @memberof Vertex
     */
    setIncoming(label: string, fromVertexId: string, createIfNotExists: boolean = false): this {
        if (!label) {
            throw new ReferenceError(`Invalid label. label is ${label}`);
        }

        if (!fromVertexId) {
            throw new ReferenceError(`Invalid id. id is ${fromVertexId}`);
        }

        if (!this._index.hasNode(fromVertexId) && createIfNotExists) {
            this._index.createNode(fromVertexId);
        }

        this._index.createEdge(label, fromVertexId, this.id);
        return this;
    }

    /**
     * @description Sets an outgoing relationship to another vertex.
     * @param {string} label The label of the outgoing edge relationship.
     * @param {string} toVertexId Id of the vertex to set the outgoing relationship to.
     * @param {boolean} [createIfNotExists=false] True to create the outgoing vertex if not found. If false and the vertex does not exist, a VertexNotFoundError is thrown.
     * @returns {this}
     * @memberof Vertex
     */
    setOutgoing(label: string, toVertexId: string, createIfNotExists: boolean = false): this {
        if (!label) {
            throw new ReferenceError(`Invalid label. label is ${label}`);
        }

        if (!toVertexId) {
            throw new ReferenceError(`Invalid toVertexId. id is ${toVertexId}`);
        }

        if (!this._index.getNode(toVertexId) && createIfNotExists) {
            this._index.createNode(toVertexId);
        }

        this._index.createEdge(label, this.id, toVertexId);
        return this;
    }

    /**
     * @description Sets the @type of the vertex to one more types.
     * @param {...string[]} typeIds One more or type ids to set the @type of the vertex.
     * @returns {this}
     * @memberof Vertex
     */
    setType(...typeIds: string[]): this {
        if (!typeIds || typeIds.length === 0) {
            return;
        }

        const existingTypes = new Set(this.getOutgoing(JsonldKeywords.type).map(({ toVertex }) => toVertex.id));
        const typesToAdd = typeIds.filter((id) => !existingTypes.has(id));
        for (const typeId of typesToAdd) {
            if (!this._index.hasNode(typeId)) {
                this._index.createNode(typeId);
            }

            this.setOutgoing(JsonldKeywords.type, typeId);
        }

        return this;
    }

    /**
     * @description Returns a JSON representation of the vertex.
     * @param {string[]} contexts Contexts to use for compaction.
     * @param {any} [frame] Optional framing instruction for JSON formatting.
     * @returns {Promise<any>}
     * @memberof Vertex
     */
    toJson(options: JsonFormatOptions = {}): Promise<any> {
        return this._node.toJson(options);
    }
}

export default Vertex;