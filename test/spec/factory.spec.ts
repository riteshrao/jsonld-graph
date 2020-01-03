import sinon from 'sinon';
import { expect } from 'chai';
import { GraphTypeFactory, JsonldGraph, Vertex, Edge } from '../../src';

describe('GraphTypeFactory', () => {
    let graph: any;
    let factory: GraphTypeFactory;

    before(() => {
        graph = {};
        factory = new GraphTypeFactory();
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('.createEdge', () => {
        it('should throw reference error when arguments are not valid', () => {
            const args = [
                [null as any, {}, {}],
                [undefined as any, {}, {}],
                ['', {}, {}],
                ['test', null as any, {}],
                ['test', undefined as any, {}],
                ['test', {}, null as any],
                ['test', {}, undefined as any],
            ]
            
            for (const [label, from, to] of args) {
                expect(() => factory.createEdge(label, from, to)).to.throw(ReferenceError);
            }
        });

        it('should create edge instance', () => {
            const fromV: any = {};
            const toV: any = {};
            const edge = factory.createEdge('test', fromV, toV);
            expect(edge).to.be.ok;
            expect(edge).to.be.instanceOf(Edge);
        });
    });

    describe('.createVertex', () => {
        it('should throw when vertex id is null, empty or undefined', () => {
            expect(() => factory.createVertex(null, null, graph)).to.throw(ReferenceError);
            expect(() => factory.createVertex('', null, graph)).to.throw(ReferenceError);
            expect(() => factory.createVertex(undefined, null, graph)).to.throw(ReferenceError);
        });

        it('should throw when graph is null or undefined', () => {
            expect(() => factory.createVertex('foo', null, null)).to.throw(ReferenceError);
            expect(() => factory.createVertex('foo', null, undefined)).to.throw(ReferenceError);
        });

        it('should have created vertex without types', () => {
            const stub = sinon.stub(Vertex.prototype, 'setType');
            const vertex = factory.createVertex('foo', null, graph);
            expect(vertex).to.be.ok;
            expect(stub.callCount).to.equal(0);
        });

        it('should have created vertex with types', () => {
            const stub = sinon.stub(Vertex.prototype, 'setType');
            const vertex = factory.createVertex('foo', ['bar', 'baz'], graph);
            expect(vertex).to.be.ok;
            expect(vertex).to.be.instanceOf(Vertex);
            expect(stub.callCount).to.equal(1);
            expect(stub.calledWith('bar', 'baz')).to.be.true;
        });
    });
});