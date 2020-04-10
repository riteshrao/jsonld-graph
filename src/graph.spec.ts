import JsonldGraph from './graph';
import Vertex from './vertex';
import Edge from './edge';
import * as errors from './errors';

describe('JsonldGraph', () => {

    afterAll(() => {
        jest.clearAllMocks();
    });

    describe('.addContext', () => {
        let graph: JsonldGraph;

        beforeEach(() => {
            graph = new JsonldGraph();
        });

        it('should throw when url is not null, undefined or empty', () => {
            expect(() => graph.addContext(null as any, {})).toThrow(ReferenceError);
            expect(() => graph.addContext(undefined as any, {})).toThrow(ReferenceError);
            expect(() => graph.addContext('', {})).toThrow(ReferenceError);
        });

        it('should throw when context is null or undefined', () => {
            expect(() => graph.addContext('http://context', null as any)).toThrow(ReferenceError);
            expect(() => graph.addContext('http://context', undefined as any)).toThrow(ReferenceError);
        });

        it('should add context', () => {
            graph.addContext('http://context', {});
            expect([...graph.contexts].length).toEqual(1);
        });

        it('should throw when adding duplicate context', () => {
            graph.addContext('http://context', {});
            expect(() => graph.addContext('http://context', {})).toThrow(errors.DuplicateContextError);
            expect(() => graph.addContext('http://Context', {})).toThrow(errors.DuplicateContextError);
        });
    });

    describe('.createVertex', () => {
        let graph: JsonldGraph;

        beforeEach(() => {
            graph = new JsonldGraph();
        });

        it('should throw when id is null, undefined or empty', () => {
            expect(() => graph.createVertex(null as any)).toThrow(ReferenceError);
            expect(() => graph.createVertex(undefined as any)).toThrow(ReferenceError);
            expect(() => graph.createVertex('')).toThrow(ReferenceError);
        });

        it('should create vertex', () => {
            const vertex = graph.createVertex('urn:test:vertex');
            expect(vertex).toBeTruthy()
            expect(graph.vertexCount).toEqual(1);
        });
    });

    describe('.getVertex', () => {
        let graph: JsonldGraph;

        beforeEach(() => {
            graph = new JsonldGraph();
            graph.createVertex('urn:test:test:A');
            graph.setPrefix('instance', 'urn:test:');
        });

        it('should throw when id is null, undefined or empty', () => {
            expect(() => graph.getVertex(null as any)).toThrow(ReferenceError);
            expect(() => graph.getVertex(undefined as any)).toThrow(ReferenceError);
            expect(() => graph.getVertex('')).toThrow(ReferenceError);
        });

        it('should return undefined for non existent vertex', () => {
            expect(graph.getVertex('urn:foo:bar')).toBeUndefined();
        });

        it('should return vertex', () => {
            const vertex = graph.getVertex('instance:test:A');
            expect(vertex).toBeTruthy();
        });

        it('should return vertex when using compact id', () => {
            const vertex = graph.getVertex('instance:test:A');
            expect(vertex).toBeTruthy()
        });
    });

    describe('.createEdge', () => {
        let graph: JsonldGraph;

        beforeEach(() => {
            graph = new JsonldGraph();
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
                expect(() => graph.createEdge(label, fromVertex, toVertex)).toThrow(ReferenceError);
            }
        });

        it('should throw when incoming vertex does not exit', () => {
            expect(() => graph.createEdge('urn:test', 'urn:not:found', 'urn:test:instance:B')).toThrow(errors.VertexNotFoundError);
        });

        it('should throw when outgoing vertex does not exist and create incoming is false', () => {
            expect(() => graph.createEdge('urn:test', 'urn:test:instance:A', 'urn:foo:bar')).toThrow(errors.VertexNotFoundError);
        });

        it('should thrown when edge is cyclic', () => {
            expect(() => graph.createEdge('urn:test', 'urn:test:instance:A', 'urn:test:instance:A')).toThrow(errors.CyclicEdgeError);
        });

        it('should create edge', () => {
            const edge = graph.createEdge(
                'urn:test:edge',
                'urn:test:instance:A',
                'urn:test:instance:B'
            );

            expect(graph.edgeCount).toEqual(1);
            expect(edge.label).toEqual('test:edge');
            expect(edge.from.id).toEqual('instance:A');
            expect(edge.to.id).toEqual('instance:B');
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
            )).toThrow(errors.DuplicateEdgeError);
        });

        it('should create edge with compact iris', () => {
            const edge = graph.createEdge(
                'test:edge',
                'instance:A',
                'instance:B'
            );

            expect(edge.label).toEqual('test:edge');
            expect(edge.from.id).toEqual('instance:A');
            expect(edge.to.id).toEqual('instance:B');
        });
    });

    describe('.setPrefix', () => {
        let graph: JsonldGraph;

        beforeEach(() => {
            graph = new JsonldGraph();
        });

        it('should throw when prefix is null, empty or undefined', () => {
            expect(() => graph.setPrefix(null as any, 'urn:test')).toThrow(ReferenceError);
            expect(() => graph.setPrefix(undefined as any, 'urn:test')).toThrow(ReferenceError);
            expect(() => graph.setPrefix('', 'urn:test')).toThrow(ReferenceError);
        });

        it('should throw when prefix iri is null, empty or undefined', () => {
            expect(() => graph.setPrefix('test', null as any)).toThrow(ReferenceError);
            expect(() => graph.setPrefix('test', undefined as any)).toThrow(ReferenceError);
            expect(() => graph.setPrefix('test', '')).toThrow(ReferenceError);
        });

        it('should throw when prefix has invalid characters', () => {
            const prefixes = [
                'test prefix',
                'test_prefix',
                'test$prefix',
                'test#prefix@'
            ];

            for (const prefix of prefixes) {
                expect(() => graph.setPrefix(prefix, 'urn:test')).toThrow(errors.InvalidPrefixError);
            }
        });

        it('should throw when prefix iri is not valid', () => {
            const iris = [
                'no_prefix',
                'empty::host',
                'http://'
            ];

            for (const iri of iris) {
                expect(() => graph.setPrefix('test', iri)).toThrow(errors.InvalidIRIError);
            }
        });

        it('should set prefix', () => {
            graph.setPrefix('test', 'urn:test:');
            expect(graph.expandIRI('test:foo')).toEqual('urn:test:foo');
        });

        it('should throw duplicate prefix error', () => {
            graph.setPrefix('test', 'urn:test:');
            expect(() => graph.setPrefix('test', 'urn:bar:')).toThrow(errors.DuplicatePrefixError);
        });

        it('should throw duplicate prefix iri error', () => {
            graph.setPrefix('test', 'urn:test');
            expect(() => graph.setPrefix('test2', 'urn:test')).toThrow(errors.DuplicatePrefixIRIError);
        });
    });

    describe('.getContexts', () => {
        let graph: JsonldGraph;

        beforeEach(() => {
            graph = new JsonldGraph();
        });

        it('should return empty when no contexts are specified', () => {
            const contexts = [...graph.getContexts()];
            expect(contexts.length).toEqual(0);
        });

        it('should return all contexts', () => {
            graph.addContext('http://test/context/a', { context: 'a' });
            graph.addContext('http://test/context/b', { context: 'b' });

            const contexts = [...graph.getContexts()];
            expect(contexts.length).toEqual(2);
            expect(contexts.some(([uri, definition]) => uri === 'http://test/context/a' && definition.context === 'a')).toEqual(true);
            expect(contexts.some(([uri, definition]) => uri === 'http://test/context/b' && definition.context === 'b')).toEqual(true);
        });
    });

    describe('.getEdges', () => {
        let graph: JsonldGraph;

        beforeEach(() => {
            graph = new JsonldGraph();

            graph.setPrefix('i', 'urn:test:instances:');
            graph.createVertex('i:instance:a');
            graph.createVertex('i:instance:b');
            graph.createEdge('i:edge:1', 'i:instance:a', 'i:instance:b');
            graph.createEdge('i:edge:2', 'i:instance:a', 'i:instance:b');
        });

        it('should return all edges', () => {
            const edges = [...graph.getEdges()];
            expect(edges.length).toEqual(2);
            expect(edges.some(x =>
                x.label === 'i:edge:1' &&
                x.from.id === 'i:instance:a' &&
                x.to.id === 'i:instance:b')).toEqual(true);
        });

        it('should return edges matching specified label', () => {
            const edges = [...graph.getEdges('urn:test:instances:edge:1')];
            expect(edges.length).toEqual(1);
            expect(
                edges[0].label === 'i:edge:1' &&
                edges[0].from.id === 'i:instance:a' &&
                edges[0].to.id === 'i:instance:b'
            ).toEqual(true);
        });

        it('should return edges matching specified label using compact label id', () => {
            const edges = [...graph.getEdges('i:edge:2')];
            expect(edges.length).toEqual(1);
            expect(
                edges[0].label === 'i:edge:2' &&
                edges[0].from.id === 'i:instance:a' &&
                edges[0].to.id === 'i:instance:b'
            ).toEqual(true);
        });
    });

    describe('.getIncomingEdges', () => {
        let graph: JsonldGraph;

        beforeEach(() => {
            graph = new JsonldGraph();

            graph.setPrefix('i', 'urn:test:');
            graph.createVertex('i:instance:a');
            graph.createVertex('i:instance:b');
            graph.createVertex('i:instance:c');
            graph.createEdge('i:edge:1', 'i:instance:a', 'i:instance:b');
            graph.createEdge('i:edge:1', 'i:instance:a', 'i:instance:c');
            graph.createEdge('i:edge:2', 'i:instance:a', 'i:instance:c');
        });

        it('should throw when vertex id is not valid', () => {
            expect(() => graph.getIncomingEdges(null as any)).toThrow(ReferenceError);
            expect(() => graph.getIncomingEdges(undefined as any)).toThrow(ReferenceError);
            expect(() => graph.getIncomingEdges('')).toThrow(ReferenceError);
        });

        it('should return empty for non existing vertex', () => {
            const edges = graph.getIncomingEdges('i:not:found');
            expect(edges.count()).toEqual(0);
        });

        it('should return all incoming edges for vertex', () => {
            const edges = graph.getIncomingEdges('i:instance:c');
            expect(edges.count()).toEqual(2);
            expect(edges.some(x => x.label === 'i:edge:1' && x.from.id === 'i:instance:a')).toEqual(true);
            expect(edges.some(x => x.label === 'i:edge:2' && x.from.id === 'i:instance:a')).toEqual(true);
        });

        it('should return only matching labeled edges for vertex', () => {
            const edges = [...graph.getIncomingEdges('i:instance:c', 'i:edge:1')];
            expect(edges.length).toEqual(1);
            expect(edges[0].label === 'i:edge:1' && edges[0].from.id === 'i:instance:a').toEqual(true);
        });
    });

    describe('.getIncomingVertices', () => {
        let graph: JsonldGraph;

        beforeEach(() => {
            graph = new JsonldGraph();

            graph.setPrefix('i', 'urn:test:');
            graph.createVertex('i:instance:a');
            graph.createVertex('i:instance:b');
            graph.createVertex('i:instance:c');
            graph.createEdge('i:edge:1', 'i:instance:a', 'i:instance:b');
            graph.createEdge('i:edge:1', 'i:instance:a', 'i:instance:c');
            graph.createEdge('i:edge:2', 'i:instance:a', 'i:instance:c');
        });

        it('should throw when label is null, empty or undefined', () => {
            expect(() => graph.getIncomingVertices(null as any)).toThrow(ReferenceError);
            expect(() => graph.getIncomingVertices('' as any)).toThrow(ReferenceError);
            expect(() => graph.getIncomingVertices(undefined as any)).toThrow(ReferenceError);
        });

        it('should return all vertices with incoming edge', () => {
            const vertices = [...graph.getIncomingVertices('urn:test:edge:1')];
            expect(vertices.length).toEqual(2);
            expect(vertices.some(x => x.id === 'i:instance:b')).toEqual(true);
            expect(vertices.some(x => x.id === 'i:instance:c')).toEqual(true);
        });

        it('should return distinct vertices', () => {
            graph.createEdge('i:edge:1', 'i:instance:c', 'i:instance:b');
            const vertices = [...graph.getIncomingVertices('urn:test:edge:1')];
            expect(vertices.length).toEqual(2);
            expect(vertices.filter(x => x.id === 'i:instance:b').length).toEqual(1);
        });
    });

    describe('.getOutgoingEdges', () => {
        let graph: JsonldGraph;

        beforeEach(() => {
            graph = new JsonldGraph();

            graph.setPrefix('i', 'urn:test:');
            graph.createVertex('i:instance:a');
            graph.createVertex('i:instance:b');
            graph.createVertex('i:instance:c');
            graph.createEdge('i:edge:1', 'i:instance:a', 'i:instance:b');
            graph.createEdge('i:edge:1', 'i:instance:a', 'i:instance:c');
            graph.createEdge('i:edge:2', 'i:instance:a', 'i:instance:c');
        });

        it('should throw when vertex id is not valid', () => {
            expect(() => graph.getOutgoingEdges(null as any)).toThrow(ReferenceError);
            expect(() => graph.getOutgoingEdges(undefined as any)).toThrow(ReferenceError);
            expect(() => graph.getOutgoingEdges('')).toThrow(ReferenceError);
        });

        it('should return empty for non existing vertex', () => {
            const edges = graph.getOutgoingEdges('i:not:found');
            expect(edges.count()).toEqual(0);
        });

        it('should return all incoming edges for vertex', () => {
            const edges = graph.getOutgoingEdges('i:instance:a');
            expect(edges.count()).toEqual(3);
            expect(edges.some(x => x.label === 'i:edge:1' && x.to.id === 'i:instance:b')).toEqual(true);
            expect(edges.some(x => x.label === 'i:edge:1' && x.to.id === 'i:instance:c')).toEqual(true);
            expect(edges.some(x => x.label === 'i:edge:2' && x.to.id === 'i:instance:c')).toEqual(true);
        });

        it('should return only matching labeled edges for vertex', () => {
            const edges = [...graph.getOutgoingEdges('i:instance:a', 'i:edge:1')];
            expect(edges.length).toEqual(2);
            expect(edges[0].label === 'i:edge:1' && edges[0].to.id === 'i:instance:b').toEqual(true);
            expect(edges[1].label === 'i:edge:1' && edges[1].to.id === 'i:instance:c').toEqual(true);
        });
    });

    describe('.getOutgoingVertices', () => {
        let graph: JsonldGraph;

        beforeEach(() => {
            graph = new JsonldGraph();

            graph.setPrefix('i', 'urn:instances');
            graph.createVertex('i:instance:a');
            graph.createVertex('i:instance:b');
            graph.createVertex('i:instance:c');

            graph.createEdge('i:edge:1', 'i:instance:a', 'i:instance:b');
            graph.createEdge('i:edge:1', 'i:instance:b', 'i:instance:c');
        });

        it('should throw when label is null, empty or undefined', () => {
            expect(() => graph.getOutgoingVertices(null as any)).toThrow(ReferenceError);
            expect(() => graph.getOutgoingVertices('')).toThrow(ReferenceError);
            expect(() => graph.getOutgoingVertices(undefined as any)).toThrow(ReferenceError);
        });

        it('should return all outgoing vertices', () => {
            const vertices = [...graph.getOutgoingVertices('i:edge:1')];
            expect(vertices.length).toEqual(2);
            expect(vertices.some(x => x.id === 'i:instance:a')).toEqual(true);
            expect(vertices.some(x => x.id === 'i:instance:b')).toEqual(true);
        });

        it('should return distinct vertices', () => {
            graph.createEdge('i:edge:1', 'i:instance:a', 'i:instance:c');
            const vertices = [...graph.getOutgoingVertices('i:edge:1')];
            expect(vertices.length).toEqual(2);
            expect(vertices.filter(x => x.id === 'i:instance:a').length).toEqual(1);
        });
    });

    describe('.hasEdge', () => {
        let graph: JsonldGraph;

        beforeEach(() => {
            graph = new JsonldGraph();

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
                expect(() => graph.hasEdge(label, from, to)).toThrow(ReferenceError);
            }
        });

        it('should return false when edge does not exist', () => {
            expect(graph.hasEdge('urn:not:found', 'i:instance:a', 'i:instance:b')).toEqual(false);
        });

        it('should return true when edge exists', () => {
            expect(graph.hasEdge('i:edge:1', 'i:instance:a', 'i:instance:b')).toEqual(true);
        });

        it('should return true when edge exists using vertices', () => {
            const outgoingV = graph.getVertex('i:instance:a')!;
            const incomingV = graph.getVertex('i:instance:b')!;
            expect(graph.hasEdge('i:edge:1', outgoingV, incomingV)).toEqual(true);
        });
    });

    describe('.hasVertex', () => {
        let graph: JsonldGraph;

        beforeEach(() => {
            graph = new JsonldGraph();

            graph.setPrefix('i', 'urn:test:');
            graph.createVertex('urn:test:instance:a');
        });

        it('should throw when vertex id is null, undefined or empty', () => {
            expect(() => graph.hasVertex(null as any)).toThrow(ReferenceError);
            expect(() => graph.hasVertex(undefined as any)).toThrow(ReferenceError);
            expect(() => graph.hasVertex('')).toThrow(ReferenceError);
        });

        it('should return false when vertex does not exist', () => {
            expect(graph.hasVertex('urn:not:found')).toEqual(false);
        });

        it('should return true when vertex exists', () => {
            expect(graph.hasVertex('urn:test:instance:a')).toEqual(true);
        });

        it('should return true when vertex exists using prefix id', () => {
            expect(graph.hasVertex('i:instance:a')).toEqual(true);
        });
    });

    describe('.removeContext', () => {
        let graph: JsonldGraph;

        beforeEach(() => {
            graph = new JsonldGraph();
            graph.addContext('http://fake/context', {});
        });

        it('should throw when context uri is null, undefined or empty', () => {
            expect(() => graph.removeContext(null as any)).toThrow(ReferenceError);
            expect(() => graph.removeContext(undefined as any)).toThrow(ReferenceError);
            expect(() => graph.removeContext('')).toThrow(ReferenceError);
        });

        it('should not throw when context does not exist', () => {
            expect(() => graph.removeContext('http://not/found')).not.toThrow();
            expect([...graph.contexts].length).toEqual(1);
        });

        it('should remove context from graph', () => {
            graph.removeContext('http://fake/context');
            expect([...graph.contexts].length).toEqual(0);
        });
    });

    describe('.removeEdge', () => {
        let outgoingV: Vertex;
        let incomingV: Vertex;
        let edge: Edge<Vertex>;
        let graph: JsonldGraph;

        beforeEach(() => {
            graph = new JsonldGraph();

            graph.setPrefix('i', 'urn:test:');
            outgoingV = graph.createVertex('i:incoming:a');
            incomingV = graph.createVertex('i:outgoing:a');
            edge = graph.createEdge('i:edge:1', outgoingV, incomingV);
        });

        it('should throw when edge is null or undefined', () => {
            expect(() => graph.removeEdge(null as any)).toThrow(ReferenceError);
            expect(() => graph.removeEdge(undefined as any)).toThrow(ReferenceError);
        });

        it('should remove edge and all incoming and outgoing refereces', () => {
            graph.removeEdge(edge);
            expect(graph.edgeCount).toEqual(0);
            expect(graph.vertexCount).toEqual(2);
            expect(graph.getEdges(edge.label).count()).toEqual(0);
            expect(graph.getOutgoingVertices(edge.label).count()).toEqual(0);
            expect(graph.getIncomingVertices(edge.label).count()).toEqual(0);
        });
    });

    describe('.removeVertex', () => {
        let vertex: Vertex;
        let graph: JsonldGraph;

        beforeEach(() => {
            graph = new JsonldGraph();

            graph.setPrefix('i', 'urn:test:');
            vertex = graph.createVertex('i:instance:a');

            graph.createVertex('i:instance:b');
            graph.createEdge('i:edge:1', vertex, 'i:instance:b');
            graph.createEdge('i:edge:2', 'i:instance:b', vertex);
        });

        it('should throw when vertex is null, undefined or empty', () => {
            expect(() => graph.removeVertex(null as any)).toThrow(ReferenceError);
            expect(() => graph.removeVertex(undefined as any)).toThrow(ReferenceError);
            expect(() => graph.removeVertex('')).toThrow(ReferenceError);
        });

        it('should remove vertex instance and all edges', () => {
            graph.removeVertex(vertex);
            expect(graph.hasVertex(vertex.id)).toEqual(false);
            expect(graph.getOutgoingVertices('i:edge:1').count()).toEqual(0);
            expect(graph.getIncomingVertices('i:edge:1').count()).toEqual(0);
            expect(graph.getOutgoingVertices('i:edge:2').count()).toEqual(0);
            expect(graph.getIncomingVertices('i:edge:2').count()).toEqual(0);
        });
    });

    describe('.removePrefix', () => {
        let graph: JsonldGraph;

        beforeEach(() => {
            graph = new JsonldGraph();

            graph.setPrefix('i', 'urn:test:');
            graph.createVertex('i:instance:a');
            graph.createVertex('i:instance:b');
            graph.createEdge('i:edge:1', 'i:instance:a', 'i:instance:b');
        });

        it('should throw when preix is null, empty or undefined', () => {
            expect(() => graph.removePrefix(null as any)).toThrow(ReferenceError);
            expect(() => graph.removePrefix(undefined as any)).toThrow(ReferenceError);
            expect(() => graph.removePrefix('')).toThrow(ReferenceError);
        });

        it('should remove prefix', () => {
            graph.removePrefix('i');
            expect(graph.hasVertex('i:instance:a')).toEqual(false);
            expect(graph.hasVertex('urn:test:instance:a')).toEqual(true);
            expect(graph.hasVertex('i:instance:b')).toEqual(false);
            expect(graph.hasVertex('urn:test:instance:b')).toEqual(true);
        });
    });
});