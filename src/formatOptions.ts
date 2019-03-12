/**
 * @description JSON formatting options.
 * @export
 * @interface JsonFormatOptions
 */
export default interface JsonFormatOptions {
    /**
     * @description The base URI of the document.
     * @type {string}
     * @memberof JsonFormatOptions
     */
    base?: string;
    /**
     * @description The context to use for for expansion and compaction.
     * @type {(string | string[])}
     * @memberof JsonFormatOptions
     */
    context?: string | string[];
    /**
     * @description The JSON-LD frame to use for formatting the JSON output.
     * @type {*}
     * @memberof JsonFormatOptions
     */
    frame?: any;
    /**
     * @description The contexts to use for framing.
     * @type {(string | string[])}
     * @memberof JsonFormatOptions
     */
    frameContext?: string | string[];
    /**
     * @description True to skip expansion if the graph already has expanded terms, else false.
     * @type {boolean}
     * @memberof JsonFormatOptions
     */
    skipExpansion?: boolean
}