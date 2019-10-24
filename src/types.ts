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

export interface Edge {
    label: string;
    fromId: string;
    toId: string;
}

export interface Vertex {
    id: string;
}

export interface Graph {}

export interface EdgeSelector {
    (edge: Edge): boolean;
}

export interface NodeSelector {
    (node: Vertex): boolean;
}
