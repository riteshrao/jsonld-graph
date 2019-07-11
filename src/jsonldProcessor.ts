import Iterable from 'jsiterable';
import * as jsonld from 'jsonld';

import { JsonldKeywords } from './constants';
import Errors from './errors';

// tslint:disable-next-line:no-typeof-undefined
const remoteLoader =
    typeof process !== undefined && process.versions && process.versions.node
        ? jsonld.documentLoaders.node()
        : jsonld.documentLoaders.xhr();

/**
 * @description JsonldProcessor options.
 * @export
 * @interface JsonldProcessorOptions
 */
export interface JsonldProcessorOptions {
    /**
     * @description True to allow remotely loading contexts, else false.
     * @type {boolean}
     * @default true
     * @memberof JsonldProcessorOptions
     */
    remoteContexts?: boolean;
}

export class JsonldProcessor {
    private readonly _options: JsonldProcessorOptions;
    private readonly _contexts = new Map<string, any>();
    private readonly _contextLoader: jsonld.DocumentLoader = (url, callback) => {
        if (this._contexts.has(url)) {
            return callback(null, {
                url: null,
                documentUrl: url,
                document: this._contexts.get(url)
            });
        }

        // Check for lower-case contexts
        if (this._contexts.has(url.toLowerCase())) {
            return callback(null, {
                url: null,
                documentUrl: url,
                document: this._contexts.get(url.toLowerCase())
            });
        }

        if (this._options.remoteContexts) {
            return remoteLoader(url, callback);
        }

        throw new Errors.ContextNotFoundError(url);
    };

    /**
     * @description Gets all contexts registered with the processor.
     * @readonly
     * @type {Iterable<[string, any]>}
     * @memberof JsonldProcessor
     */
    get contexts(): Iterable<[string, any]> {
        return new Iterable(this._contexts);
    }

    /**
     *Creates an instance of JsonldProcessor.
     * @param {JsonldProcessorOptions} [options={}] JsonldProcessor options.
     * @memberof JsonldProcessor
     */
    constructor(options: JsonldProcessorOptions = {}) {
        this._options = options;
    }

    /**
     * @description Adds a context to the processor.
     * @param {string} uri The uri of the context.
     * @param {*} context The context object.
     * @memberof JsonldProcessor
     */
    addContext(uri: string, context: any): void {
        if (!uri) {
            throw new ReferenceError(`Invalid uri. uri is ${uri}`);
        }

        if (!context) {
            throw new ReferenceError(`Invalid context. context is ${context}`);
        }

        if (typeof context !== 'object') {
            throw new ReferenceError(
                `Invalid context. Expected context to be a JSON object, but got ${typeof context}`
            );
        }

        const normalizedUri = uri.toLowerCase();
        if (this._contexts.has(normalizedUri)) {
            throw new Errors.DuplicateContextError(uri);
        }

        this._contexts.set(normalizedUri, context);
    }

    /**
     * @description Performs a JSON-LD compaction.
     * @param {*} document The document to compact. NOTE: The document should already be in expanded form.
     * @param {any|any[]} [contexts]
     * @returns {Promise<any>}
     * @memberof JsonldProcessor
     */
    async compact(document: any, contexts: any | any[] = []): Promise<any> {
        if (!document) {
            throw new ReferenceError(`Invalid document. document is ${document}`);
        }

        if (!document[JsonldKeywords.context] && contexts.length === 0) {
            throw new Errors.ContextNotSpecifiedError('jsonld.compact');
        }

        const compactionContext = contexts && contexts.length > 0 ? contexts : document[JsonldKeywords.context];
        return jsonld.compact(document, compactionContext, {
            compactToRelative: true,
            graph: false,
            documentLoader: this._contextLoader
        });
    }

    /**
     * @description Performs a JSON-LD expansion.
     * @param {*} document The document to expand.
     * @param {any|any[]} [contexts] Optional contexts to use for expansion.
     * @returns {Promise<any>}
     * @memberof JsonldProcessor
     */
    async expand(document: any, contexts: any | any[] = [], base?: string): Promise<any> {
        if (!document) {
            throw new ReferenceError(`Invalid document. document is ${document}`);
        }

        if (!document[JsonldKeywords.context] && contexts.length === 0) {
            throw new Errors.ContextNotSpecifiedError('jsonld.expand');
        }

        return jsonld.expand(document, {
            base,
            expandContext: contexts,
            documentLoader: this._contextLoader
        });
    }

    /**
     * @description Performs a JSON=LD flatten operation.
     * @param {*} document The document to flatten.
     * @param {any|any[]} [contexts] Optional contexts to use for expansion before flattening.
     * @returns {Promise<any[]>}
     * @memberof JsonldProcessor
     */
    async flatten(document: any, contexts: any | any[] = [], base?: string): Promise<any[]> {
        if (!document) {
            throw new ReferenceError(`Invalid document. document is ${document}`);
        }

        if (!document[JsonldKeywords.context] && contexts.length === 0) {
            throw new Errors.ContextNotSpecifiedError('jsonld.flatten');
        }

        return jsonld.flatten(document, null, {
            base,
            expandContext: contexts,
            documentLoader: this._contextLoader
        });
    }

    /**
     * @description Performs a JSON-LD framing operation.
     * @param {*} document The document to frame.
     * @param {*} frame The JSON-LD frame instruction.
     * @param {any|any[]} [contexts] Optional expansion contexts to use for framing.
     * @returns {Promise<any>}
     * @memberof JsonldProcessor
     */
    async frame(document: any, frame: any, contexts: any | any[] = [], base?: string): Promise<any> {
        if (!document) {
            throw new ReferenceError(`Invalid document. document is ${document}`);
        }
        if (!frame) {
            throw new ReferenceError(`Invalid frame. frame is ${frame}`);
        }

        return jsonld.frame(document, frame, {
            base,
            expandContext: contexts,
            documentLoader: this._contextLoader
        });
    }

    /**
     * @description Removes a context from the processor.
     * @param {string} uri The uri of the context to remove.
     * @memberof JsonldProcessor
     */
    removeContext(uri: string): void {
        if (!uri) {
            throw new ReferenceError(`Invalid uri. uri is ${uri}`);
        }

        this._contexts.delete(uri.toLowerCase());
    }
}

export default JsonldProcessor;
