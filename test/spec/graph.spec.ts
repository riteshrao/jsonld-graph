import { expect } from 'chai';
import { JsonldGraph, Errors, GraphTypeFactory } from '../../src';
import { FakeEdge, FakeTypesFactory, FakeVertex } from './fakes';
import { setPriority } from 'os';

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
            graph.addContext('http://context', {});
            expect([...graph.contexts].length).to.equal(1);
        });

        it('should throw when adding duplicate context', () => {
            graph.addContext('http://context', {});
            expect(() => graph.addContext('http://context', {})).to.throw(Errors.DuplicateContextError);
            expect(() => graph.addContext('http://Context', {})).to.throw(Errors.DuplicateContextError);
        });
    });

    describe('.createVertex', () => {
        let graph: JsonldGraph<FakeVertex, FakeEdge>;

        beforeEach(() => {
            graph = new JsonldGraph({
                typeFactory: new FakeTypesFactory()
            });
        });

        it('should throw when id is null, undefined or empty', () => {
            expect(() => graph.createVertex(null)).to.throw(ReferenceError);
            expect(() => graph.createVertex(undefined)).to.throw(ReferenceError);
            expect(() => graph.createVertex('')).to.throw(ReferenceError);
        });

        it('should create vertex', () => {
            const vertex = graph.createVertex('urn:test:vertex');
            expect(vertex).to.be.ok;
            expect(vertex).to.be.instanceOf(FakeVertex);
            expect(graph.vertexCount).to.equal(1);
        });
    });

    describe('.getVertex', () => {
        let graph: JsonldGraph<FakeVertex, FakeEdge>;

        beforeEach(() => {
            graph = new JsonldGraph({
                typeFactory: new FakeTypesFactory()
            });

            graph.createVertex('urn:instances:test:A');
            graph.setPrefix('instance', 'urn:instances:');
        });

        it('should throw when id is null, undefined or empty', () => {
            expect(() => graph.getVertex(null)).to.throw(ReferenceError);
            expect(() => graph.getVertex(undefined)).to.throw(ReferenceError);
            expect(() => graph.getVertex('')).to.throw(ReferenceError);
        });

        it('should return undefined for non existent vertex', () => {
            expect(graph.getVertex('urn:foo:bar')).to.be.undefined;
        });

        it('should return vertex', () => {
            const vertex = graph.getVertex('instance:test:A');
            expect(vertex).to.be.ok;
            expect(vertex.id).to.equal('instance:test:A');
            expect(vertex).to.be.instanceOf(FakeVertex);
        });

        it('should return vertex when using compact id', () => {
            const vertex = graph.getVertex('instance:test:A');
            expect(vertex).to.be.ok;
            expect(vertex.id).to.equal('instance:test:A');
            expect(vertex).to.be.instanceOf(FakeVertex);
        });
    });

    describe('.createEdge', () => {
        let graph: JsonldGraph<FakeVertex, FakeEdge>;

        beforeEach(() => {
            graph = new JsonldGraph({
                typeFactory: new FakeTypesFactory()
            });

            graph.createVertex('urn:test:instance:A');
            graph.createVertex('urn:test:instance:B');
            graph.setPrefix('instance', 'urn:test:instance:');
            graph.setPrefix('test', 'urn:test:');
        });

        it('should throw when input is not valid', () => {
            const tests = [
                [null, 'urn:instance:A', 'urn:instance:B'],
                [undefined, 'urn:instance:A', 'urn:instance:B'],
                ['', 'urn:instance:A', 'urn:instance:B'],
                ['urn:label:A', null, 'urn:instance:B'],
                ['urn:label:A', undefined, 'urn:instance:B'],
                ['urn:label:A', '', 'urn:instance:B'],
                ['urn:label:A', 'urn:instance:A', null],
                ['urn:label:A', 'urn:instance:A', undefined],
                ['urn:label:A', 'urn:instance:A', '']
            ];

            for (const [label, fromVertex, toVertex] of tests) {
                expect(() => graph.createEdge(label, fromVertex, toVertex)).to.throw(ReferenceError);
            }
        });

        it('should throw when incoming vertex does not exit', () => {
            expect(() => graph.createEdge('urn:test', 'urn:not:found', 'urn:test:instance:B')).to.throw(Errors.VertexNotFoundError);
        });

        it('should throw when outgoing vertex does not exist and create incoming is false', () => {
            expect(() => graph.createEdge('urn:test', 'urn:test:instance:A', 'urn:foo:bar')).to.throw(Errors.VertexNotFoundError);
        });

        it('should thrown when edge is cyclic', () => {
            expect(() => graph.createEdge('urn:test', 'urn:test:instance:A', 'urn:test:instance:A')).to.throw(Errors.CyclicEdgeError);
        });

        it('should create edge', () => {
            const edge = graph.createEdge(
                'urn:test:edge',
                'urn:test:instance:A',
                'urn:test:instance:B'
            );

            expect(graph.edgeCount).to.equal(1);
            expect(edge.label).to.equal('test:edge');
            expect(edge.from.id).to.equal('instance:A');
            expect(edge.to.id).to.equal('instance:B');
        });

        it('should create edge and incoming vertex', () => {
            const edge = graph.createEdge(
                'urn:test:edge',
                'urn:test:instance:A',
                'urn:test:instance:C',
                true
            );

            expect(graph.edgeCount).to.equal(1);
            expect(graph.vertexCount).to.equal(3);
            expect(graph.hasVertex('instance:C')).to.be.true;
            expect(edge.label).to.equal('test:edge');
            expect(edge.from.id).to.equal('instance:A');
            expect(edge.to.id).to.equal('instance:C');
        });

        it('should throw when creating duplicate edge', () => {
            graph.createEdge(
                'urn:test:edge', 
                'urn:test:instance:A', 
                'urn:test:instance:B'
            );

            expect(() => graph.createEdge(
                'urn:test:edge', 
                'urn:test:instance:A', 
                'urn:test:instance:B'
            )).to.throw(Errors.DuplicateEdgeError);
        });

        it('should create edge with compact iris', () => {
            const edge = graph.createEdge(
                'test:edge',
                'instance:A',
                'instance:B'
            );

            expect(edge.label).to.equal('test:edge');
            expect(edge.from.id).to.equal('instance:A');
            expect(edge.to.id).to.equal('instance:B');
        });
    });

    describe('.setPrefix', () => {
        let graph: JsonldGraph;

        beforeEach(() => {
            graph = new JsonldGraph();
        });

        it('should throw when prefix is null, empty or undefined', () => {
            expect(() => graph.setPrefix(null, 'urn:test')).to.throw(ReferenceError);
            expect(() => graph.setPrefix(undefined, 'urn:test')).to.throw(ReferenceError);
            expect(() => graph.setPrefix('', 'urn:test')).to.throw(ReferenceError);
        });

        it('should throw when prefix iri is null, empty or undefined', () => {
            expect(() => graph.setPrefix('test', null)).to.throw(ReferenceError);
            expect(() => graph.setPrefix('test', undefined)).to.throw(ReferenceError);
            expect(() => graph.setPrefix('test', '')).to.throw(ReferenceError);
        });

        it('should throw when prefix has invalid characters', () => {
            const prefixes = [
                'test prefix',
                'test_prefix',
                'test$prefix',
                'test#prefix@'
            ];

            for (const prefix of prefixes) {
                expect(() => graph.setPrefix(prefix, 'urn:test')).to.throw(Errors.InvalidPrefixError);
            }
        });

        it('should throw when prefix iri is not valid', () => {
            const iris = [
                'no_prefix',
                'empty::host',
                'http://'
            ];

            for (const iri of iris) {
                expect(() => graph.setPrefix('test', iri)).to.throw(Errors.InvalidIRIError);
            }
        });

        it('should set prefix', () => {
            graph.setPrefix('test', 'urn:test:');
            expect(graph.expandIRI('test:foo')).to.equal('urn:test:foo');
        });

        it('should throw duplicate prefix error', () => {
            graph.setPrefix('test', 'urn:test:');
            expect(() => graph.setPrefix('test', 'urn:bar:')).to.throw(Errors.DuplicatePrefixError);
        });

        it('should throw duplicate prefix iri error', () => {
            graph.setPrefix('test', 'urn:test');
            expect(() => graph.setPrefix('test2', 'urn:test')).to.throw(Errors.DuplicatePrefixIRIError);
        });
    });

    describe('.getContexts', () => {
        let graph: JsonldGraph;

        beforeEach(() => {
            graph = new JsonldGraph();
        });

        it('should return empty when no contexts are specified', () => {
            const contexts = [...graph.getContexts()];
            expect(contexts.length).to.equal(0);
        });

        it('should return all contexts', () => {
            graph.addContext('http://test/context/a', { context: 'a' });
            graph.addContext('http://test/context/b', { context: 'b' });

            const contexts = [...graph.getContexts()];
            expect(contexts.length).to.equal(2);
            expect(contexts.some(([uri, definition]) => uri === 'http://test/context/a' && definition.context === 'a')).to.be.true;
            expect(contexts.some(([uri, definition]) => uri === 'http://test/context/b' && definition.context === 'b')).to.be.true;
        });
    });

    describe('.getEdges', () => {
        let graph: JsonldGraph<FakeVertex, FakeEdge>;

        beforeEach(() => {
            graph = new JsonldGraph({
                typeFactory: new FakeTypesFactory()
            });

            graph.setPrefix('i', 'urn:test:instances:');
            graph.createVertex('i:instance:a');
            graph.createVertex('i:instance:b');
            graph.createEdge('i:edge:1', 'i:instance:a', 'i:instance:b');
            graph.createEdge('i:edge:2', 'i:instance:a', 'i:instance:b');
        });

        it('should return all edges', () => {
            const edges = [...graph.getEdges()];
            expect(edges.length).to.equal(2);
            expect(edges.some(x => 
                x.label === 'i:edge:1' &&
                x.from.id === 'i:instance:a' &&
                x.to.id === 'i:instance:b')).to.be.true;
        });

        it('should return edges matching specified label', () => {
            const edges = [...graph.getEdges('urn:test:instances:edge:1')];
            expect(edges.length).to.equal(1);
            expect(
                edges[0].label === 'i:edge:1' &&
                edges[0].from.id === 'i:instance:a' &&
                edges[0].to.id === 'i:instance:b'
            ).to.be.true;
        });

        it('should return edges matching specified label using compact label id', () => {
            const edges = [...graph.getEdges('i:edge:2')];
            expect(edges.length).to.equal(1);
            expect(
                edges[0].label === 'i:edge:2' &&
                edges[0].from.id === 'i:instance:a' &&
                edges[0].to.id === 'i:instance:b'
            ).to.be.true;
        });
    });

    describe('.getIncoming', () => {
        let graph: JsonldGraph<FakeVertex, FakeEdge>;

        beforeEach(() => {
            graph = new JsonldGraph({
                typeFactory: new FakeTypesFactory()
            });

            graph.setPrefix('i', 'urn:instances:');
            graph.createVertex('i:instance:a');
            graph.createVertex('i:instance:b');
            graph.createVertex('i:instance:c');
            graph.createEdge('i:edge:1', 'i:instance:a', 'i:instance:b');
            graph.createEdge('i:edge:1', 'i:instance:a', 'i:instance:c');
            graph.createEdge('i:edge:2', 'i:instance:a', 'i:instance:c');
        });

        it('should throw when label is null, empty or undefined', () => {
            expect(() => graph.getIncoming(null)).to.throw(ReferenceError); 
            expect(() => graph.getIncoming('')).to.throw(ReferenceError); 
            expect(() => graph.getIncoming(undefined)).to.throw(ReferenceError); 
        });

        it('should return all vertices with incoming edge', () => {
            const vertices = [...graph.getIncoming('urn:instances:edge:1')];
            expect(vertices.length).to.equal(2);
        });
    });
});