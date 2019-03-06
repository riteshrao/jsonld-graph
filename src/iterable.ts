
/**
 * @description Graph iterable type.
 * @export
 * @class Iterable
 * @implements {Iterable<T>}
 * @template T
 */
export class Iterable<T> implements Iterable<T> {
    private readonly _source: IterableIterator<T>;

    /**
     * @description Creates an instance of Iterable.
     * @param {IterableIterator<T>} source The source iterable iterator for the iterable.
     * @memberof Iterable
     */
    constructor(source: IterableIterator<T>) {
        this._source = source;
    }

    /**
     * @description Iterator symbol.
     * @returns {Iterator<T>}
     * @memberof Iterable
     */
    [Symbol.iterator](): Iterator<T> {
        return this._source;
    }

    /**
     * @description Returns an iterable that returns only filtered elements from the source.
     * @param {(item: T) => boolean} filter The filter to apply on the source.
     * @returns {Iterable<T>}
     * @memberof Iterable
     */
    filter(filter: (item: T) => boolean): Iterable<T> {
        const _that = this;
        return new Iterable<T>((function* filterGenerator() {
            for (const item of _that._source) {
                if (filter(item)) {
                    yield item;
                }
            }
        })());
    }

    /**
     * @description Gets the first element from the source iterable.
     * @param {(item: T) => boolean} [filter] Optional filter applied to find the first matching element.
     * @returns {T}
     * @memberof Iterable
     */
    first(filter?: (item: T) => boolean): T {
        if (filter) {
            for (const item of this._source) {
                if (filter(item)) {
                    return item;
                }
            }

            return null;
        } else {
            return this._source.next().value || null;
        }
    }

    /**
     * @description Gets an array of items from the source iterable.
     * @returns {T[]}
     * @memberof Iterable
     */
    items(): T[] {
        return [...this._source];
    }

    /**
     * @description Calls a callback for each item in the source and returns the returned value from the callback.
     * @template V
     * @param {(item: T) => V} selector The callback function to invoke for each element in the source.
     * @returns {Iterable<V>}
     * @memberof Iterable
     */
    map<V>(selector: (item: T) => V): Iterable<V> {
        const _that = this;
        return new Iterable<V>((function* mapGenerator() {
            for (const item of _that._source) {
                yield selector(item);
            }
        })());
    }

    /**
     * @description Calls a callback for each item in the source and returns individual result values from the callback.
     * @template V
     * @param {(item: T) => Iterable<V>} selector The callback function to invoke for each element in the source.
     * @returns {Iterable<V>}
     * @memberof Iterable
     */
    mapMany<V>(selector: (item: T) => Iterable<V>): Iterable<V> {
        const _that = this;
        return new Iterable<V>((function* mapManyGenerator() {
            for (const item of _that._source) {
                const iterable = selector(item);
                for (const value of iterable) {
                    yield value;
                }
            }
        })());
    }

    /**
     * @description Determines whether the supplied callback function returns true for any element in the source.
     * @param {(item: T) => boolean} filter The callback function to invoke.
     * @returns {boolean}
     * @memberof Iterable
     */
    some(filter: (item: T) => boolean): boolean {
        for (const item of this._source) {
            if (filter(item)) {
                return true;
            }
        }

        return false;
    }
}

export default Iterable;