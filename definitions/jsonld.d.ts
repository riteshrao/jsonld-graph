declare module 'jsonld' {

    interface CallbackFunc {
        (err: any, result: any): void;
    }

    export type ContextDocument = {
        url: string;
        documentUrl: string;
        document: any;
    }

    export interface DocumentLoader {
        (url: string, callback: (err: any, contextDoc?: ContextDocument) => void): void;
    }

    interface BaseOptions {
        /**
        * @description The base IRI to use.
        * @type {string}
        * @memberof CompactOptions
        */
        base?: string;
        /**
         * @description The context to expand with.
         * @type {*}
         * @memberof BaseOptions
         */
        expandContext?: any;
        /**
         * @description The document loader to use.
         * @type {DocumentLoader}
         * @memberof BaseOptions
         */
        documentLoader?: DocumentLoader;
    }

    export interface CompactOptions extends BaseOptions {
        /**
         * @description True to compact arrays to single values when appropriate, false not to.
         * @type {boolean}
         * @default true
         * @memberof CompactOptions
         */
        compactArrays?: boolean;
        /**
         * @description True to compact IRI's to be relative to the document base, false to keep absolute.
         * @type {boolean}
         * @default true
         * @memberof CompactOptions
         */
        compactToRelative?: boolean;
        /**
         * @description True to always output top level graph.
         * @type {boolean}
         * @default false
         * @memberof CompactOptions
         */
        graph?: boolean;
        /**
         * @description True to assume the input is expanded and skip expansion, false not to.
         * @type {boolean}
         * @default false
         * @memberof CompactOptions
         */
        skipExpansion?: boolean;
        /**
         * @description A function that can be used to custom map un-mappable values (or to throw an error when they are detected). If
         * this function returns `undefined` then the default behavior will be used.
         * @type {Function}
         * @memberof CompactOptions
         */
        expansionMap?: Function;
        /**
         * @description True if compaction is occurring during a framing operation.
         * @type {boolean}
         * @default false
         * @memberof CompactOptions
         */
        framing?: boolean;
        /**
          * @description A function that can be used to custom map un-mappable values (or to throw an error when they are detected). If
         * this function returns `undefined` then the default behavior will be used.
         * @type {DocumentLoader}
         * @memberof CompactOptions
         */
        compactionMap?: DocumentLoader;
    }

    export interface ExpandOptions extends BaseOptions {
        /**
         * @description True to keep free floating nodes, false not to (default: false)
         * @type {boolean}
         * @default false
         * @memberof ExpandOptions
         */
        keepFloatingNodes?: boolean;
        /**
         * @description A function that can be used to custom map un-mappable values (or to throw an error when they are detected). If
         * this function returns `undefined` then the default behavior will be used.
         * @type {Function}
         * @memberof CompactOptions
         */
        expansionMap?: Function;
    }

    export interface FrameOptions extends BaseOptions {
        /**
         * @description Default embed mode.
         * @type {('@last' | '@always' | '@never' | '@link')}
         * @default '@last'
         * @memberof FrameOptions
         */
        embed?: '@last' | '@always' | '@never' | '@link';
        /**
         * @description Default @explicit flag
         * @type {boolean}
         * @default false
         * @memberof FrameOptions
         */
        explicit?: boolean;
        /**
         * @description Default @requireAll flag
         * @type {boolean}
         * @default false
         * @memberof FrameOptions
         */
        requireAll?: boolean;
        /**
         * @description Default @omit flag.
         * @type {boolean}
         * @default false
         * @memberof FrameOptions
         */
        omitDefault?: boolean;
    }

    export interface NormalizeOptions extends BaseOptions {
        algorithm?: 'URDNA2015' | 'URGNA2012';
        inputFormat?: any;
        format?: any;
    }

    export interface MergeOptions extends BaseOptions {
        issuer?: any;
        mergeNodes?: boolean;
    }

    export function compact(input: any): Promise<any>;
    export function compact(input: any, context: any): Promise<any>;
    export function compact(input: any, context: any, options: CompactOptions): Promise<any>;

    export function expand(input: any): Promise<any>;
    export function expand(input: any, options: ExpandOptions): Promise<any>;

    export function flatten(input: any): Promise<any[]>;
    export function flatten(input: any, context: any): Promise<any[]>;
    export function flatten(input: any, context: any, options: BaseOptions): Promise<any[]>;

    export function frame(input: any, frame: any): Promise<void>;
    export function frame(input: any, frame: any, options: FrameOptions): Promise<any>;

    export function merge(inputs: any[]): Promise<any>;
    export function merge(inputs: any[], context: any): Promise<any>;
    export function merge(inputs: any[], context: any, options: MergeOptions): Promise<any>;

    export var documentLoaders: { node: () => DocumentLoader, xhr: () => DocumentLoader };
}