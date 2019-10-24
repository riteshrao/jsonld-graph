// Cut down implementation of StrictEventEmitter from rbuckton (https://github.com/bterlson/strict-event-emitter-types/issues/5)
declare const meta: unique symbol;

type Base<M> = { [P in Extract<keyof M, string | symbol>]: (...args: any[]) => void };
type Args<M, E extends keyof M> = M[E] extends (...args: infer A) => void ? A : never;
type Listener<M, E extends keyof M, T> = (this: T, ...args: Args<M, E>) => void;
type Evented<On, Emit> = { [meta]?: [On, Emit] };

interface Methods<On, Emit> {
    addListener<E extends keyof On>(event: E, listener: Listener<On, E, this>): this;
    addListener(event: never, listener: (...args: any[]) => void): this;
    removeListener<E extends keyof On>(event: E, listener: Listener<On, E, this>): this;
    removeListener(event: never, listener: (...args: any[]) => void): this;
    prependListener<E extends keyof On>(event: E, listener: Listener<On, E, this>): this;
    prependListener(event: never, listener: (...args: any[]) => void): this;
    prependOnceListener<E extends keyof On>(event: E, listener: Listener<On, E, this>): this;
    prependOnceListener(event: never, listener: (...args: any[]) => void): this;
    on<E extends keyof On>(event: E, listener: Listener<On, E, this>): this;
    on(event: never, listener: (...args: any[]) => void): this;
    once<E extends keyof On>(event: E, listener: Listener<On, E, this>): this;
    once(event: never, listener: (...args: any[]) => void): this;
    emit<E extends keyof Emit>(event: E, ...args: Args<Emit, E>): boolean;
    emit(event: never, ...args: any[]): boolean;
}

export type StrictEventEmitter<
    T extends NodeJS.EventEmitter,
    On extends Base<On>,
    Emit extends Base<Emit> | On = On
> = Evented<On, Emit> & Methods<On, Emit> & Pick<T, Exclude<keyof T, keyof Methods<never, never> | typeof meta>>;

export default StrictEventEmitter;

export type Events<T extends Evented<any, any>> = T[typeof meta][number];
export type EventNames<T extends Evented<any, any>> = keyof Events<T>;
export type OnEvents<T extends Evented<any, any>> = T[typeof meta][0];
export type OnEventNames<T extends Evented<any, any>> = keyof OnEvents<T>;
export type EmitEvents<T extends Evented<any, any>> = T[typeof meta][1];
export type EmitEventNames<T extends Evented<any, any>> = keyof EmitEvents<T>;
