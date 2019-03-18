import * as urijs from 'uri-js';

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
            if (urijs.equal(mappedUri, iri)) {
                throw new Errors.DuplicatePrefixUriError(prefix, iri);
            }
        }

        this.validate(iri);
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

        const parsed = urijs.parse(iri, { iri: true });
        if (!parsed.scheme) {
            throw new Errors.InvalidIriError(iri, 'IRI scheme not specified');
        }

        switch (parsed.scheme) {
            case 'http':
            case 'https':
            case 'urn': {
                for (const [prefix, mappedIRI] of this._prefixes) {
                    if (iri.startsWith(mappedIRI) && !urijs.equal(mappedIRI, iri)) {
                        let compacted = iri.replace(mappedIRI, '');
                        if (compacted.startsWith('/')) {
                            compacted = compacted.slice(1, compacted.length);
                        }
                        if (!compacted || compacted.length === 0) {
                            return iri; // Exact mapped IRI match. No path to compact.
                        }

                        return `${prefix}:${compacted}`;
                    }
                }
                return iri; // No match. Return the full expanded form.
            }
            default: {
                return iri; // Assumed to be already compacted.
            }
        }
    }

    /**
     * @description Checks if two IRI's are equal.
     * @param {string} iriA The IRI to compare.
     * @param {string} iriB The IRI to compare.
     * @returns {boolean} True if both IRI's are equal, else false.
     * @memberof IRI
     */
    equal(iriA: string, iriB: string): boolean {
        return urijs.equal(this.expand(iriA), this.expand(iriB), { iri: true });
    }

    /**
     * @description Performs an expansion of an IRI by fully expanding a prefix. If the IRI is already expanded, the exact same string is returned.
     * @param {string} iri The compact IRI to expand.
     * @returns {string}
     * @memberof IRI
     */
    expand(iri: string, validate: boolean = false): string {
        if (!iri) {
            throw new ReferenceError(`Invalid iri. iri is ${iri}`);
        }
        if (iri.startsWith(BlankNodePrefix) || iri === JsonldKeywords.type || iri === JsonldKeywords.id || this._prefixes.size === 0) {
            return iri;
        }

        const parsed = urijs.parse(iri, { iri: true });
        if (!parsed.scheme) {
            console.log(iri);
            throw new Errors.InvalidIriError(iri, 'IRI scheme not specified');
        }

        let expandedIRI: string;
        switch (parsed.scheme) {
            case 'http':
            case 'https':
            case 'urn': {
                expandedIRI = iri; // Assume already expanded.
                break;
            }
            default: {
                if (!this._prefixes.has(parsed.scheme)) {
                    expandedIRI = iri;
                    break;
                }

                let mappedIRI = this._prefixes.get(parsed.scheme);
                if (!mappedIRI.endsWith('/') && !mappedIRI.endsWith('#')) {
                    mappedIRI = mappedIRI + '/';
                }

                expandedIRI = `${mappedIRI}${parsed.path}`;
                break;
            }
        }

        if (validate) {
            this.validate(expandedIRI);
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

    /**
     * @description Validates an IRI string.
     * @param {string} iri The IRI string to validate.
     * @memberof IRI
     */
    validate(iri: string): void {
        if (!iri) {
            throw new ReferenceError(`Invalid uri. uri is ${iri}`);
        }

        if (iri === JsonldKeywords.type) {
            return;
        }

        const parsed = urijs.parse(iri, { iri: true });

        if (!parsed.scheme) {
            throw new Errors.InvalidIriError(iri, 'IRI scheme not specified');
        }

        switch (parsed.scheme) {
            case 'http':
            case 'https': {
                if (!parsed.host) {
                    throw new Errors.InvalidIriError(iri, 'Host name required for http and https schemes.');
                }
                break;
            }
            case 'urn': {
                const { nid } = (parsed as any);
                if (!nid) {
                    throw new Errors.InvalidIriError(iri, 'nid is required for urn or urn scheme.');
                }
                break;
            }
            default: {
                throw new Errors.InvalidIriError(iri, `Unsupported scheme ${parsed.scheme}. Only 'http', 'https' and 'urn' schemes are supported`);
            }
        }
    }
}

export default IRI;