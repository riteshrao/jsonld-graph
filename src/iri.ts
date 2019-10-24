import { BlankNodePrefix, JsonldKeywords } from './constants';
import Errors from './errors';

export class IRI {
    private readonly _prefixes = new Map<string, string>();

    addPrefix(prefix: string, iri: string): void {
        if (!prefix) {
            throw new ReferenceError(`Invalid prefix. prefix is ${prefix}`);
        }

        if (!iri) {
            throw new ReferenceError(`Invalid iri. iri is ${iri}`);
        }

        if (prefix.startsWith('http') || prefix.startsWith('https') || prefix.startsWith('urn')) {
            throw new Errors.InvalidPrefixError(prefix, 'Cannot use reserved prefixes `http`, `https` or `urn`');
        }

        if (prefix.startsWith(':') || prefix.endsWith(':')) {
            throw new Errors.InvalidPrefixError(prefix, 'Prefixes cannot start or end with the ":" character1');
        }

        if (this._prefixes.has(prefix)) {
            throw new Errors.DuplicatePrefixError(prefix);
        }

        for (const [, mappedUri] of this._prefixes) {
            if (mappedUri.toLowerCase() === iri.toLowerCase()) {
                throw new Errors.DuplicatePrefixUriError(prefix, iri);
            }
        }

        this._prefixes.set(prefix, iri);
    }

    /**
     * @description Performs a compaction of an IRI by substituting a matching prefix. If the IRI is already compacted, the exact same string is returned.
     * @param {string} iri The IRI to compact.
     * @returns {string}
     * @memberof IRI
     */
    compact(iri: string): string {
        if (!iri) {
            throw new ReferenceError(`Invalid iri. iri is ${iri}`);
        }

        if (iri.startsWith(BlankNodePrefix) || iri === JsonldKeywords.type || this._prefixes.size === 0) {
            return iri;
        }

        for (const [prefix, mappedIRI] of this._prefixes) {
            if (iri.startsWith(mappedIRI) && iri.toLowerCase() !== mappedIRI.toLowerCase()) {
                let compacted = iri.replace(mappedIRI, '');
                if (compacted.startsWith('/') || compacted.startsWith(':')) {
                    compacted = compacted.slice(1, compacted.length);
                }

                return `${prefix}:${compacted}`;
            }
        }

        return iri;
    }

    /**
     * @description Checks if two IRI's are equal.
     * @param {string} iriA The IRI to compare.
     * @param {string} iriB The IRI to compare.
     * @returns {boolean} True if both IRI's are equal, else false.
     * @memberof IRI
     */
    equal(iriA: string, iriB: string): boolean {
        return this.expand(iriA).toLowerCase() === this.expand(iriB).toLowerCase();
    }

    /**
     * @description Performs an expansion of an IRI by fully expanding a prefix. If the IRI is already expanded, the exact same string is returned.
     * @param {string} iri The compact IRI to expand.
     * @returns {string}
     * @memberof IRI
     */
    expand(iri: string): string {
        if (!iri) {
            throw new ReferenceError(`Invalid iri. iri is ${iri}`);
        }
        if (
            iri.startsWith(BlankNodePrefix) ||
            iri === JsonldKeywords.type ||
            iri === JsonldKeywords.id ||
            this._prefixes.size === 0
        ) {
            return iri;
        }

        const prefixIndex = iri.indexOf(':');
        if (prefixIndex <= 0) {
            return iri;
        }

        const prefix = iri.substring(0, prefixIndex);
        const component = iri.substring(prefixIndex + 1);
        let expandedIRI: string;
        if (this._prefixes.has(prefix)) {
            expandedIRI = `${this._prefixes.get(prefix)}${component}`;
        } else {
            expandedIRI = iri;
        }

        return expandedIRI;
    }

    /**w
     * @description Removes a prefix.
     * @param {string} prefix The prefix to remove.
     * @memberof IRI
     */
    removePrefix(prefix: string): void {
        if (!prefix) {
            throw new ReferenceError(`Invalid prefix. prefix is ${prefix}`);
        }

        this._prefixes.delete(prefix);
    }
}

export default IRI;
