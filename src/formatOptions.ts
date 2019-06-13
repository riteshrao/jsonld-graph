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
