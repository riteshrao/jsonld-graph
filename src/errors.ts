class GraphError extends Error {
    constructor(message: string) {
        super(message);
        Error.captureStackTrace(this, this.constructor);
    }
}

export namespace Errors {
    /**
     * @description Error thrown when an input document cannot be parsed.
     * @export
     * @class DocumentParseError
     * @extends {GraphError}
     */
    export class DocumentParseError extends GraphError {
        /**
         *Creates an instance of DocumentParseError.
         * @param {*} innerError The parse error.
         * @memberof DocumentParseError
         */
        constructor(public innerError: any) {
            super(`Failed to parse input. Error: ${innerError}`);
            this.name = 'DocumentParseError';
        }
    }

    /**
     * @description Error thrown when a duplicate prefix is detected.
     * @export
     * @class DuplicatePrefixError
     * @extends {GraphError}
     */
    export class DuplicatePrefixError extends GraphError {
        /**
         * Creates an instance of DuplicatePrefixError.
         * @param {string} prefix The duplicate prefix name.
         * @memberof DuplicatePrefixError
         */
        constructor(public readonly prefix: string) {
            super(`The prefix ${prefix} has already been defined.`);
        }
    }

    /**
     * @description Error thrown when multiple prefixes are detected for a URI
     * @export
     * @class DuplicatePrefixUriError
     * @extends {GraphError}
     */
    export class DuplicatePrefixUriError extends GraphError {
        /**
         * Creates an instance of DuplicatePrefixUriError.
         * @param {string} prefix The prefix that has already been registered for the URI.
         * @param {string} uri The URI for which a prefix has already been registered.
         * @memberof DuplicatePrefixUriError
         */
        constructor(public readonly prefix: string, public readonly uri: string) {
            super(`A prefix for uri ${uri} has already been registered with prefix ${prefix}`);
        }
    }

    /**
     * @description Error thrown when an referenced context is not found.
     * @export
     * @class ContextNotFoundError
     * @extends {GraphError}
     */
    export class ContextNotFoundError extends GraphError {
        /**
         *Creates an instance of ContextNotFoundError.
         * @param {string} uri The uri of the context that was not found.
         * @memberof ContextNotFoundError
         */
        constructor(public readonly uri: string) {
            super(
                `Referenced context ${uri} was not found and remote contexts are disabled. Did you forget to add a context?`
            );
            this.name = 'ContextNotFoundError';
        }
    }

    /**
     * @description Error thrown when a context was not found or specified for an operation context.
     * @export
     * @class ContextNotSpecifiedError
     * @extends {GraphError}
     */
    export class ContextNotSpecifiedError extends GraphError {
        /**
         *Creates an instance of ContextNotSpecifiedError.
         * @param {string} operationContext The operation context the error occurred.
         * @memberof ContextNotSpecifiedError
         */
        constructor(public operationContext: string) {
            super(`A context was not specified implicitly or explicitly for operation ${operationContext}`);
            this.name = 'ContextNotSpecifiedError';
        }
    }

    /**
     * @description Error thrown when a duplicate context was found.
     * @export
     * @class DuplicateContextError
     * @extends {GraphError}
     */
    export class DuplicateContextError extends GraphError {
        /**
         *Creates an instance of DuplicateContextError.
         * @param {string} uri The uri of the duplicate context.
         * @memberof DuplicateContextError
         */
        constructor(public readonly uri: string) {
            super(`Another context with uri ${uri} already exists.`);
            this.name = 'DuplicateContextError';
        }
    }

    /**
     * @description Error thrown when a edge is cyclical.
     * @export
     * @class IndexEdgeCyclicalError
     * @extends {GraphError}
     */
    export class IndexEdgeCyclicalError extends GraphError {
        /**
         *Creates an instance of IndexEdgeCyclicalError.
         * @param {string} label The label of the edge.
         * @param {string} nodeId The id of the node that is referred to as both the outgoing and incoming.
         * @memberof IndexEdgeCyclicalError
         */
        constructor(public readonly label: string, public readonly nodeId: string) {
            super(`Cyclical index edge ${label} with outgoing and incoming node ${nodeId}`);
            this.name = 'IndexEdgeCyclicalError';
        }
    }

    /**
     * @description Error thrown when a duplicate edge was found.
     * @export
     * @class IndexEdgeDuplicateError
     * @extends {GraphError}
     */
    export class IndexEdgeDuplicateError extends GraphError {
        /**
         *Creates an instance of IndexEdgeDuplicateError.
         * @param {string} label The edge label.
         * @param {string} fromNodeId Id of the outgoing node.
         * @param {string} toNodeId Id of the incoming node.
         * @memberof IndexEdgeDuplicateError
         */
        constructor(
            public readonly label: string,
            public readonly fromNodeId: string,
            public readonly toNodeId: string
        ) {
            super(`Duplicate edge ${label} from node ${fromNodeId} to node ${toNodeId}`);
            this.name = 'IndexEdgeDuplicateError';
        }
    }

    /**
     * @description Error thrown when a node referred to by an index edge doesn't exist.
     * @export
     * @class IndexEdgeNodeNotFoundError
     * @extends {GraphError}
     */
    export class IndexEdgeNodeNotFoundError extends GraphError {
        /**
         *Creates an instance of IndexEdgeNodeNotFoundError.
         * @param {string} label The edge label.
         * @param {string} fromNodeId The id of the outgoing node.
         * @param {string} direction The edge direction.
         * @memberof IndexEdgeNodeNotFoundError
         */
        constructor(
            public readonly label: string,
            public readonly fromNodeId: string,
            public readonly direction: string
        ) {
            super(`Expected ${direction} node with id ${fromNodeId} was not found for edge ${label}`);
            this.name = 'IndexEdgeNotFoundError';
        }
    }

    /**
     * @description Error thrown when a duplicate node in the index is found.
     * @export
     * @class IndexNodeDuplicateError
     * @extends {GraphError}
     */
    export class IndexNodeDuplicateError extends GraphError {
        /**
         * Creates an instance of IndexNodeDuplicateError.
         * @param {string} nodeId The id of the duplicate node.
         * @memberof IndexNodeDuplicateError
         */
        constructor(public readonly nodeId: string) {
            super(`Duplicate index node ${nodeId}`);
            this.name = 'IndexNodeDuplicateError';
        }
    }

    /**
     * @description Error thrown when a index node is not found.
     * @export
     * @class IndexNodeNotFoundError
     * @extends {GraphError}
     */
    export class IndexNodeNotFoundError extends GraphError {
        /**
         * Creates an instance of IndexNodeNotFoundError.
         * @param {string} nodeId Id of the node that was not found.
         * @memberof IndexNodeNotFoundError
         */
        constructor(public readonly nodeId: string) {
            super(`A node with the id ${nodeId} was not found`);
            this.name = 'IndexNodeNotFoundError';
        }
    }

    /**
     * @description Error thrown when an invalid IRI is found.
     * @export
     * @class InvalidIriError
     * @extends {GraphError}
     */
    export class InvalidIriError extends GraphError {
        /**
         * Creates an instance of InvalidIriError.
         * @param {string} iri The invalid iri string.
         * @param {string} error Error details.
         * @memberof InvalidIriError
         */
        constructor(public readonly iri: string, error: string) {
            super(`Invalid iri ${iri}. Error: ${error}`);
        }
    }

    /**
     * @description Error thrown when an invalid prefix format is found.
     * @export
     * @class InvalidPrefixError
     * @extends {GraphError}
     */
    export class InvalidPrefixError extends GraphError {
        /**
         * Creates an instance of InvalidPrefixError.
         * @param {string} prefix The invalid prefix string.
         * @param {string} error Error details.
         * @memberof InvalidPrefixError
         */
        constructor(public readonly prefix: string, error: string) {
            super(`Invalid prefix ${prefix}. Error: ${error}`);
        }
    }
}

export default Errors;
