import { expect } from 'chai';
import { JsonldGraph, Errors } from '../../src';
import { FakeEdge, FakeTypesFactory, FakeVertex } from './fakes';

describe('JsonldGraph', () => {

    describe('.addContext', () => {
        let graph: JsonldGraph;

        beforeEach(() => {
            graph = new JsonldGraph();
        });

        it('should throw when url is not null, undefined or empty', () => {
            expect(() => graph.addContext(null as any, {})).to.throw(ReferenceError);
            expect(() => graph.addContext(undefined as any, {})).to.throw(ReferenceError);
            expect(() => graph.addContext('', {})).to.throw(ReferenceError);
        });

        it('should throw when context is null or undefined', () => {
            expect(() => graph.addContext('http://context', null as any)).to.throw(ReferenceError);
            expect(() => graph.addContext('http://context', undefined as any)).to.throw(ReferenceError);
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
            expect(() => graph.createVertex(null as any)).to.throw(ReferenceError);
            expect(() => graph.createVertex(undefined as any)).to.throw(ReferenceError);
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

            graph.createVertex('urn:test:test:A');
            graph.setPrefix('instance', 'urn:test:');
        });

        it('should throw when id is null, undefined or empty', () => {
            expect(() => graph.getVertex(null as any)).to.throw(ReferenceError);
            expect(() => graph.getVertex(undefined as any)).to.throw(ReferenceError);
            expect(() => graph.getVertex('')).to.throw(ReferenceError);
        });

        it('should return undefined for non existent vertex', () => {
            expect(graph.getVertex('urn:foo:bar')).to.be.undefined;
        });

        it('should return vertex', () => {
            const vertex = graph.getVertex('instance:test:A');
            expect(vertex).to.be.ok;
            expect(vertex!.id).to.equal('instance:test:A');
            expect(vertex).to.be.instanceOf(FakeVertex);
        });

        it('should return vertex when using compact id', () => {
            const vertex = graph.getVertex('instance:test:A');
            expect(vertex).to.be.ok;
            expect(vertex!.id).to.equal('instance:test:A');
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
                [null as any, 'urn:instance:A', 'urn:instance:B'],
                [undefined as any, 'urn:instance:A', 'urn:instance:B'],
                ['', 'urn:instance:A', 'urn:instance:B'],
                ['urn:label:A', null as any, 'urn:instance:B'],
                ['urn:label:A', undefined as any, 'urn:instance:B'],
                ['urn:label:A', '', 'urn:instance:B'],
                ['urn:label:A', 'urn:instance:A', null as any],
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
            expect(() => graph.setPrefix(null as any, 'urn:test')).to.throw(ReferenceError);
            expect(() => graph.setPrefix(undefined as any, 'urn:test')).to.throw(ReferenceError);
            expect(() => graph.setPrefix('', 'urn:test')).to.throw(ReferenceError);
        });

        it('should throw when prefix iri is null, empty or undefined', () => {
            expect(() => graph.setPrefix('test', null as any)).to.throw(ReferenceError);
            expect(() => graph.setPrefix('test', undefined as any)).to.throw(ReferenceError);
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

    describe('.getIncomingEdges', () => {
        let graph: JsonldGraph<FakeVertex, FakeEdge>;

        beforeEach(() => {
            graph = new JsonldGraph({
                typeFactory: new FakeTypesFactory()
            });

            graph.setPrefix('i', 'urn:test:');
            graph.createVertex('i:instance:a');
            graph.createVertex('i:instance:b');
            graph.createVertex('i:instance:c');
            graph.createEdge('i:edge:1', 'i:instance:a', 'i:instance:b');
            graph.createEdge('i:edge:1', 'i:instance:a', 'i:instance:c');
            graph.createEdge('i:edge:2', 'i:instance:a', 'i:instance:c');
        });

        it('should throw when vertex id is not valid', () => {
            expect(() => graph.getIncomingEdges(null as any)).to.throw(ReferenceError);
            expect(() => graph.getIncomingEdges(undefined as any)).to.throw(ReferenceError);
            expect(() => graph.getIncomingEdges('')).to.throw(ReferenceError);
        });

        it('should return empty for non existing vertex', () => {
            const edges = graph.getIncomingEdges('i:not:found');
            expect(edges.count()).to.equal(0);
        });

        it('should return all incoming edges for vertex', () => {
            const edges = graph.getIncomingEdges('i:instance:c');
            expect(edges.count()).to.equal(2);
            expect(edges.some(x => x.label === 'i:edge:1' && x.from.id === 'i:instance:a')).to.be.true;
            expect(edges.some(x => x.label === 'i:edge:2' && x.from.id === 'i:instance:a')).to.be.true;
        });

        it('should return only matching labeled edges for vertex', () => {
            const edges = [...graph.getIncomingEdges('i:instance:c', 'i:edge:1')];
            expect(edges.length).to.equal(1);
            expect(edges[0].label === 'i:edge:1' && edges[0].from.id === 'i:instance:a').to.be.true;
        });
    });

    describe('.getIncomingVertices', () => {
        let graph: JsonldGraph<FakeVertex, FakeEdge>;

        beforeEach(() => {
            graph = new JsonldGraph({
                typeFactory: new FakeTypesFactory()
            });

            graph.setPrefix('i', 'urn:test:');
            graph.createVertex('i:instance:a');
            graph.createVertex('i:instance:b');
            graph.createVertex('i:instance:c');
            graph.createEdge('i:edge:1', 'i:instance:a', 'i:instance:b');
            graph.createEdge('i:edge:1', 'i:instance:a', 'i:instance:c');
            graph.createEdge('i:edge:2', 'i:instance:a', 'i:instance:c');
        });

        it('should throw when label is null, empty or undefined', () => {
            expect(() => graph.getIncomingVertices(null as any)).to.throw(ReferenceError); 
            expect(() => graph.getIncomingVertices('' as any)).to.throw(ReferenceError); 
            expect(() => graph.getIncomingVertices(undefined as any)).to.throw(ReferenceError); 
        });

        it('should return all vertices with incoming edge', () => {
            const vertices = [...graph.getIncomingVertices('urn:test:edge:1')];
            expect(vertices.length).to.equal(2);
            expect(vertices.some(x => x.id === 'i:instance:b')).to.be.true;
            expect(vertices.some(x => x.id === 'i:instance:c')).to.be.true;
        });

        it('should return distinct vertices', () => {
            graph.createEdge('i:edge:1', 'i:instance:c', 'i:instance:b');
            const vertices = [...graph.getIncomingVertices('urn:test:edge:1')];
            expect(vertices.length).to.equal(2);
            expect(vertices.filter(x => x.id === 'i:instance:b').length).to.equal(1);
        });
    });

    describe('.getOutgoingEdges', () => {
        let graph: JsonldGraph<FakeVertex, FakeEdge>;

        beforeEach(() => {
            graph = new JsonldGraph({
                typeFactory: new FakeTypesFactory()
            });

            graph.setPrefix('i', 'urn:test:');
            graph.createVertex('i:instance:a');
            graph.createVertex('i:instance:b');
            graph.createVertex('i:instance:c');
            graph.createEdge('i:edge:1', 'i:instance:a', 'i:instance:b');
            graph.createEdge('i:edge:1', 'i:instance:a', 'i:instance:c');
            graph.createEdge('i:edge:2', 'i:instance:a', 'i:instance:c');
        });

        it('should throw when vertex id is not valid', () => {
            expect(() => graph.getOutgoingEdges(null as any)).to.throw(ReferenceError);
            expect(() => graph.getOutgoingEdges(undefined as any)).to.throw(ReferenceError);
            expect(() => graph.getOutgoingEdges('')).to.throw(ReferenceError);
        });

        it('should return empty for non existing vertex', () => {
            const edges = graph.getOutgoingEdges('i:not:found');
            expect(edges.count()).to.equal(0);
        });

        it('should return all incoming edges for vertex', () => {
            const edges = graph.getOutgoingEdges('i:instance:a');
            expect(edges.count()).to.equal(3);
            expect(edges.some(x => x.label === 'i:edge:1' && x.to.id === 'i:instance:b')).to.be.true;
            expect(edges.some(x => x.label === 'i:edge:1' && x.to.id === 'i:instance:c')).to.be.true;
            expect(edges.some(x => x.label === 'i:edge:2' && x.to.id === 'i:instance:c')).to.be.true;
        });

        it('should return only matching labeled edges for vertex', () => {
            const edges = [...graph.getOutgoingEdges('i:instance:a', 'i:edge:1')];
            expect(edges.length).to.equal(2);
            expect(edges[0].label === 'i:edge:1' && edges[0].to.id === 'i:instance:b').to.be.true;
            expect(edges[1].label === 'i:edge:1' && edges[1].to.id === 'i:instance:c').to.be.true;
        });
    });

    describe('.getOutgoingVertices', () => {
        let graph: JsonldGraph<FakeVertex, FakeEdge>;

        beforeEach(() => {
            graph = new JsonldGraph({
                typeFactory: new FakeTypesFactory()
            });

            graph.setPrefix('i', 'urn:instances');
            graph.createVertex('i:instance:a');
            graph.createVertex('i:instance:b');
            graph.createVertex('i:instance:c');

            graph.createEdge('i:edge:1', 'i:instance:a', 'i:instance:b');
            graph.createEdge('i:edge:1', 'i:instance:b', 'i:instance:c');
        });

        it('should throw when label is null, empty or undefined', () => {
            expect(() => graph.getOutgoingVertices(null as any)).to.throw(ReferenceError);
            expect(() => graph.getOutgoingVertices('')).to.throw(ReferenceError);
            expect(() => graph.getOutgoingVertices(undefined as any)).to.throw(ReferenceError);
        });

        it('should return all outgoing vertices', () => {
            const vertices = [...graph.getOutgoingVertices('i:edge:1')];
            expect(vertices.length).to.equal(2);
            expect(vertices.some(x => x.id === 'i:instance:a')).to.be.true;
            expect(vertices.some(x => x.id === 'i:instance:b')).to.be.true;
        });

        it('should return distinct vertices', () => {
            graph.createEdge('i:edge:1', 'i:instance:a', 'i:instance:c');
            const vertices = [...graph.getOutgoingVertices('i:edge:1')];
            expect(vertices.length).to.equal(2);
            expect(vertices.filter(x => x.id === 'i:instance:a').length).to.equal(1);
        });
    });

    describe('.hasEdge', () => {
        let graph: JsonldGraph<FakeVertex, FakeEdge>;

        beforeEach(() => {
            graph = new JsonldGraph({
                typeFactory: new FakeTypesFactory()
            });

            graph.setPrefix('i', 'urn:test:');
            graph.createVertex('i:instance:a');
            graph.createVertex('i:instance:b');
            graph.createEdge('i:edge:1', 'i:instance:a', 'i:instance:b')
        });

        it('should throw when arguments are null, empty or undefined', () => {
            const parameters = [
                [null as any, 'urn:instance:a', 'urn:instance:b'],
                [undefined as any, 'urn:instance:a', 'urn:instance:b'],
                ['', 'urn:instance:a', 'urn:instance:b'],
                ['urn:edge:1', null as any, 'urn:instance:b'],
                ['urn:edge:1', undefined as any, 'urn:instance:b'],
                ['urn:edge:1', '', 'urn:instance:b'],
                ['urn:edge:1', 'urn:instance:a', null as any],
                ['urn:edge:1', 'urn:instance:a', undefined as any],
                ['urn:edge:1', 'urn:instance:a', '']
            ];

            for (const [label, from, to] of parameters) {
                expect(() => graph.hasEdge(label, from, to)).to.throw(ReferenceError);
            }
        });

        it('should return false when edge does not exist', () => {
            expect(graph.hasEdge('urn:not:found', 'i:instance:a', 'i:instance:b')).to.be.false;
        });

        it('should return true when edge exists', () => {
            expect(graph.hasEdge('i:edge:1', 'i:instance:a', 'i:instance:b')).to.be.true;
        });

        it('should return true when edge exists using vertices', () => {
            const outgoingV = graph.getVertex('i:instance:a')!;
            const incomingV = graph.getVertex('i:instance:b')!;
            expect(graph.hasEdge('i:edge:1', outgoingV, incomingV)).to.be.true;
        });
    });

    describe('.hasVertex', () => {
        let graph: JsonldGraph<FakeVertex, FakeEdge>;

        beforeEach(() => {
            graph = new JsonldGraph({
                typeFactory: new FakeTypesFactory()
            });

            graph.setPrefix('i', 'urn:test:');
            graph.createVertex('urn:test:instance:a');
        });

        it('should throw when vertex id is null, undefined or empty', () => {
            expect(() => graph.hasVertex(null as any)).to.throw(ReferenceError);
            expect(() => graph.hasVertex(undefined as any)).to.throw(ReferenceError); 
            expect(() => graph.hasVertex('')).to.throw(ReferenceError);
        });

        it('should return false when vertex does not exist', () => {
            expect(graph.hasVertex('urn:not:found')).to.be.false;
        });

        it('should return true when vertex exists', () => {
            expect(graph.hasVertex('urn:test:instance:a')).to.be.true;
        });

        it('should return true when vertex exists using prefix id', () => {
            expect(graph.hasVertex('i:instance:a')).to.be.true;
        });
    });

    describe('.removeContext', () => {
        let graph: JsonldGraph;

        beforeEach(() => {
            graph = new JsonldGraph();
            graph.addContext('http://fake/context', { });
        });

        it('should throw when context uri is null, undefined or empty', () => {
            expect(() => graph.removeContext(null as any)).to.throw(ReferenceError);
            expect(() => graph.removeContext(undefined as any)).to.throw(ReferenceError);
            expect(() => graph.removeContext('')).to.throw(ReferenceError);
        });

        it('should not throw when context does not exist', () => {
            expect(() => graph.removeContext('http://not/found')).not.to.throw();
            expect([...graph.contexts].length).to.equal(1);
        });

        it('should remove context from graph', () => {
            graph.removeContext('http://fake/context');
            expect([...graph.contexts].length).to.equal(0);
        });
    });

    describe('.removeEdge', () => {
        let outgoingV: FakeVertex;
        let incomingV: FakeVertex;
        let edge: FakeEdge;
        let graph: JsonldGraph<FakeVertex, FakeEdge>;

        beforeEach(() => {
            graph = new JsonldGraph({
                typeFactory: new FakeTypesFactory()
            });

            graph.setPrefix('i', 'urn:test:');
            outgoingV = graph.createVertex('i:incoming:a');
            incomingV = graph.createVertex('i:outgoing:a');
            edge = graph.createEdge('i:edge:1', outgoingV, incomingV);
        });

        it('should throw when edge is null or undefined', () => {
            expect(() => graph.removeEdge(null as any)).to.throw(ReferenceError);
            expect(() => graph.removeEdge(undefined as any)).to.throw(ReferenceError);
        });

        it('should remove edge and all incoming and outgoing refereces', () => {
            graph.removeEdge(edge);
            expect(graph.edgeCount).to.equal(0);
            expect(graph.vertexCount).to.equal(2);
            expect(graph.getEdges(edge.label).count()).to.equal(0);
            expect(graph.getOutgoingVertices(edge.label).count()).to.equal(0);
            expect(graph.getIncomingVertices(edge.label).count()).to.equal(0);
        });
    });

    describe('.removeVertex', () => {
        let vertex: FakeVertex;
        let graph: JsonldGraph<FakeVertex, FakeEdge>;

        beforeEach(() => {
            graph = new JsonldGraph({
                typeFactory: new FakeTypesFactory()
            });

            graph.setPrefix('i', 'urn:test:');
            vertex = graph.createVertex('i:instance:a');
            graph.createEdge('i:edge:1', vertex, 'i:instance:b', true);
            graph.createEdge('i:edge:2', 'i:instance:b', vertex);
        });

        it('should throw when vertex is null, undefined or empty', () => {
            expect(() => graph.removeVertex(null as any)).to.throw(ReferenceError);
            expect(() => graph.removeVertex(undefined as any)).to.throw(ReferenceError);
            expect(() => graph.removeVertex('')).to.throw(ReferenceError);
        });

        it('should remove vertex instance and all edges', () => {
            graph.removeVertex(vertex);
            expect(graph.hasVertex(vertex.id)).to.be.false;
            expect(graph.getOutgoingVertices('i:edge:1').count()).to.equal(0);
            expect(graph.getIncomingVertices('i:edge:1').count()).to.equal(0);
            expect(graph.getOutgoingVertices('i:edge:2').count()).to.equal(0);
            expect(graph.getIncomingVertices('i:edge:2').count()).to.equal(0);
        });
    });

    describe('.removePrefix', () => {
        let graph: JsonldGraph<FakeVertex, FakeEdge>;

        beforeEach(() => {
            graph = new JsonldGraph({
                typeFactory: new FakeTypesFactory()
            });

            graph.setPrefix('i', 'urn:test:');
            graph.createVertex('i:instance:a');
            graph.createVertex('i:instance:b');
            graph.createEdge('i:edge:1', 'i:instance:a', 'i:instance:b');
        });
        
        it('should throw when preix is null, empty or undefined', () => {
            expect(() => graph.removePrefix(null as any)).to.throw(ReferenceError);
            expect(() => graph.removePrefix(undefined as any)).to.throw(ReferenceError);
            expect(() => graph.removePrefix('')).to.throw(ReferenceError);
        });

        it('should remove prefix', () => {
            graph.removePrefix('i');
            expect(graph.hasVertex('i:instance:a')).to.be.false;
            expect(graph.hasVertex('urn:test:instance:a')).to.be.true;
            expect(graph.hasVertex('i:instance:b')).to.be.false;
            expect(graph.hasVertex('urn:test:instance:b')).to.be.true;
        });
    });
});