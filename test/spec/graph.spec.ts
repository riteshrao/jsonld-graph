import { expect } from 'chai';
import { JsonldGraph, Errors } from '../../src';

describe('JsonldGraph', () => {
    describe('.addContext', () => {
        let graph: JsonldGraph;

        beforeEach(() => {
            graph = new JsonldGraph();
        });

        it('should throw when url is not null, undefined or empty', () => {
            expect(() => graph.addContext(null, {})).to.throw(ReferenceError);
            expect(() => graph.addContext(undefined, {})).to.throw(ReferenceError);
            expect(() => graph.addContext('', {})).to.throw(ReferenceError);
        });

        it('should throw when context is null or undefined', () => {
            expect(() => graph.addContext('http://context', null)).to.throw(ReferenceError);
            expect(() => graph.addContext('http://context', undefined)).to.throw(ReferenceError);
        });

        it('should add context', () => {
            graph.addContext('http://context', { });
            expect([...graph.contexts].length).to.equal(1);
        });

        it('should throw when adding duplicate context', () => {
            graph.addContext('http://context', { });
            expect(() => graph.addContext('http://context', { })).to.throw(Errors.DuplicateContextError);
            expect(() => graph.addContext('http://Context', { })).to.throw(Errors.DuplicateContextError);
        });
    });
});