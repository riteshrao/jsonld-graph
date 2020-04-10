class GraphError extends Error {
    constructor(message: string) {
        super(message);
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

/**
 * @description Error thrown when an input document cannot be parsed.
 * @export
 * @class DocumentParseError
 * @extends {GraphError}
 */
export class DocumentParseError extends GraphError {
    /**
     * Creates an instance of DocumentParseError.
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
export class DuplicatePrefixIRIError extends GraphError {
    /**
     * Creates an instance of DuplicatePrefixUriError.
     * @param {string} prefix The prefix that has already been registered for the URI.
     * @param {string} id The URI for which a prefix has already been registered.
     * @memberof DuplicatePrefixUriError
     */
    constructor(public readonly prefix: string, public readonly id: string) {
        super(`A prefix for id ${id} has already been registered with prefix ${prefix}`);
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
     * Creates an instance of ContextNotFoundError.
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
     * Creates an instance of ContextNotSpecifiedError.
     * @param {string} operationContext The operation context the error occurred.
     * @memberof ContextNotSpecifiedError
     */
    constructor(public operationContext: string) {
        super(
            `A context was not specified implicitly or explicitly for operation ${operationContext}`
        );
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
     * Creates an instance of DuplicateContextError.
     * @param {string} url The url of the duplicate context.
     * @memberof DuplicateContextError
     */
    constructor(public readonly url: string) {
        super(`Another context with url ${url} already exists.`);
        this.name = 'DuplicateContextError';
    }
}

/**
 * @description Error thrown when a edge is cyclical.
 * @export
 * @class CyclicEdgeError
 * @extends {GraphError}
 */
export class CyclicEdgeError extends GraphError {
    /**
     * Creates an instance of CyclicEdgeError.
     * @param {string} label The label of the edge.
     * @param {string} vertexId The id of the vertex that is referred to as both the outgoing and incoming.
     * @memberof CyclicEdgeError
     */
    constructor(public readonly label: string, public readonly vertexId: string) {
        super(`Cyclic edge ${label} with outgoing and incoming node ${vertexId}`);
        this.name = 'CyclicEdgeError';
    }
}

/**
 * @description Error thrown when a duplicate edge was found.
 * @export
 * @class DuplicateEdgeError
 * @extends {GraphError}
 */
export class DuplicateEdgeError extends GraphError {
    /**
     * Creates an instance of DuplicateEdgeError.
     * @param {string} label The edge label.
     * @param {string} fromVertexId Id of the outgoing node.
     * @param {string} toVertexId Id of the incoming node.
     * @memberof DuplicateEdgeError
     */
    constructor(
        public readonly label: string,
        public readonly fromVertexId: string,
        public readonly toVertexId: string
    ) {
        super(`Duplicate edge ${label} from vertex ${fromVertexId} to vertex ${toVertexId}.`);
        this.name = 'DuplicateEdgeError';
    }
}

/**
 * @description Error thrown when a node referred to by an index edge doesn't exist.
 * @export
 * @class EdgeNotFoundError
 * @extends {GraphError}
 */
export class EdgeNotFoundError extends GraphError {
    /**
     * Creates an instance of EdgeNotFoundError.
     * @param {string} label The edge label.
     * @param {string} fromNodeId The id of the outgoing node.
     * @param {string} direction The edge direction.
     * @memberof EdgeNotFoundError
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
 * @description Error thrown when a duplicate vertex is found in an index.
 * @export
 * @class IndexNodeDuplicateError
 * @extends {GraphError}
 */
export class DuplicateVertexError extends GraphError {
    /**
     * Creates an instance of DuplicateVertexError.
     * @param {string} id The id of the duplicate vertex.
     * @memberof IndexNodeDuplicateError
     */
    constructor(public readonly id: string) {
        super(`Duplicate vertex ${id}`);
        this.name = 'DuplicateVertexError';
    }
}

/**
 * @description Error thrown when a vertex is not found.
 * @export
 * @class VertexNotFoundError
 * @extends {GraphError}
 */
export class VertexNotFoundError extends GraphError {
    /**
     * Creates an instance of VertexNotFoundError.
     * @param {string} vertexId Id of the vertex that was not found.
     * @memberof VertexNotFoundError
     */
    constructor(public readonly vertexId: string) {
        super(`A vertex with the id ${vertexId} was not found`);
        this.name = 'VertexNotFoundError';
    }
}

/**
 * @description Error thrown when an invalid IRI is found.
 * @export
 * @class InvalidIriError
 * @extends {GraphError}
 */
export class InvalidIRIError extends GraphError {
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
