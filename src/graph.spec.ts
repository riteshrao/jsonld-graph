import shortid from 'shortid';
import Edge from './edge';
import * as errors from './errors';
import JsonldGraph from './graph';
import Vertex from './vertex';

describe('JsonldGraph', () => {
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

        it('should throw when context is not a valid object', () => {
            expect(() => graph.addContext('http://context', 'foo' as any)).toThrow(TypeError);
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
            expect(edge.iri).toEqual('urn:test:edge')
            expect(edge.from.id).toEqual('instance:A');
            expect(edge.to.id).toEqual('instance:B');
        });
    });

    describe('.createVertex', () => {
        let graph: JsonldGraph;

        beforeEach(() => {
            graph = new JsonldGraph();
            graph.setPrefix('test', 'http://example.org/test/');
        });

        it('should throw when id is null, undefined or empty', () => {
            expect(() => graph.createVertex(null as any)).toThrow(ReferenceError);
            expect(() => graph.createVertex(undefined as any)).toThrow(ReferenceError);
            expect(() => graph.createVertex('')).toThrow(ReferenceError);
        });

        it('should throw invalid iri when vertex iri is not valid', () => {
            expect(() => graph.createVertex('foo')).toThrow(errors.InvalidIRIError);
            expect(() => graph.createVertex('urn:')).toThrow(errors.InvalidIRIError);
            expect(() => graph.createVertex(':fake:id')).toThrow(errors.InvalidIRIError);
        });

        it('should create vertex', () => {
            const vertex = graph.createVertex('urn:test:vertex');
            expect(vertex).toBeTruthy()
            expect(graph.vertexCount).toEqual(1);
        });

        it('should throw duplicate error when another vertex with same id exists', () => {
            graph.createVertex('urn:test:foo:1');
            expect(() => graph.createVertex('urn:test:foo:1')).toThrow(errors.DuplicateVertexError);
        });

        it('should throw reference error when factory returns null or undefined', () => {
            graph = new JsonldGraph({
                vertexFactory: (): Vertex => {
                    return null as any;
                }
            });

            expect(() => graph.createVertex('urn:test:foo')).toThrow(ReferenceError);
        });
    });

    describe('.getContext', () => {
        let graph: JsonldGraph;

        beforeEach(() => {
            graph = new JsonldGraph();
            graph.addContext('http://example.org/context', { test: true });
        });

        it('should throw when context uri is null, undefined or empty', async () => {
            await expect(graph.getContext(undefined as any)).rejects.toThrow();
            await expect(graph.getContext(null as any)).rejects.toThrow();
            await expect(graph.getContext('')).rejects.toThrow();
        });

        it('should return undefined for unknown context', async () => {
            const context = await graph.getContext('http://example.org/unknown');
            expect(context).toBeUndefined();
        });

        it('should return stored context', async () => {
            const context = await graph.getContext('http://example.org/context');
            expect(context).toEqual({ test: true });
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
                edges[0].iri === 'urn:test:instances:edge:1' &&
                edges[0].label === 'i:edge:1' &&
                edges[0].from.id === 'i:instance:a' &&
                edges[0].to.id === 'i:instance:b'
            ).toEqual(true);
        });

        it('should return edges matching specified label using compact label id', () => {
            const edges = [...graph.getEdges('i:edge:2')];
            expect(edges.length).toEqual(1);
            expect(
                edges[0].iri === 'urn:test:instances:edge:2' &&
                edges[0].label === 'i:edge:2' &&
                edges[0].from.id === 'i:instance:a' &&
                edges[0].to.id === 'i:instance:b'
            ).toEqual(true);
        });
    });

    describe('.getVertex', () => {
        let graph: JsonldGraph;

        beforeEach(() => {
            graph = new JsonldGraph();
            graph.createVertex('http://example.org/test/instanceA');
            graph.setPrefix('test', 'http://example.org/test/');
        });

        it('should throw when id is null, undefined or empty', () => {
            expect(() => graph.getVertex(null as any)).toThrow(ReferenceError);
            expect(() => graph.getVertex(undefined as any)).toThrow(ReferenceError);
            expect(() => graph.getVertex('')).toThrow(ReferenceError);
        });

        it('should return undefined for non existent vertex', () => {
            expect(graph.getVertex('htp://example.org/test/notfound')).toBeUndefined();
            expect(graph.getVertex('test:notfound')).toBeUndefined();
        });

        it('should return vertex', () => {
            const vertex = graph.getVertex('test:instanceA');
            expect(vertex).toBeTruthy();
        });

        it('should return vertex when using compact id', () => {
            const vertex = graph.getVertex('test:instanceA');
            expect(vertex).toBeTruthy()
        });

        it('should return vertex when using qualified iri', () => {
            const vertex = graph.getVertex('http://example.org/test/instanceA');
            expect(vertex).toBeTruthy();
        });

        describe('.getVertices', () => {
            let graph: JsonldGraph;

            beforeEach(() => {
                graph = new JsonldGraph();
                graph.createVertex('urn:test:test:A');
                graph.createVertex('urn:test:test:B');
                graph.setPrefix('instance', 'urn:test:');
            });

            it('should return all vertices in the graph', () => {
                expect(graph.getVertices().count()).toEqual(2);
                expect(graph.getVertices().some(x => x.id === 'instance:test:A')).toEqual(true);
                expect(graph.getVertices().some(x => x.id === 'instance:test:B')).toEqual(true);
            });
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
            expect(
                edges[0].iri === 'urn:test:edge:1' &&
                edges[0].label === 'i:edge:1' &&
                edges[0].from.id === 'i:instance:a').toEqual(true);
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

    describe('.load', () => {
        let expanded: any;

        beforeAll(async () => {
            const sourceGraph = new JsonldGraph();
            sourceGraph.addContext('http://example.org/hr', {
                '@context': {
                    '@vocab': 'http://example.org/hr/classes/',
                    '@version': 1.1,
                    firstName: 'Employee/firstName',
                    lastName: 'Employee/lastName',
                    displayName: 'Entity/displayName',
                    description: { '@id': 'Entity/description', '@container': '@language' },
                    manager: { '@id': 'Employee/manager', '@type': '@id' },
                    manages: { '@id': 'Manager/manages', '@type': '@id' },
                    name: { '@id': 'Entity/name' },
                    empData: { '@id': 'Employee/data', '@type': '@json' },
                    address: { '@id': 'Contact/address', '@container': '@list' },
                    accounts: { '@id': 'Entity/accounts' },
                    street: 'Contact/address/street',
                    city: 'Contact/address/city',
                    state: 'Contact/address/state',
                    zip: 'Contact/address/zip'
                }
            });

            await sourceGraph.parse({
                '@context': [
                    { '@base': 'http://example.org/hr/instances/' },
                    'http://example.org/hr'
                ],
                '@graph': [
                    {
                        '@id': 'http://example.org/hr/instances/johnd',
                        '@type': 'Employee',
                        manager: 'http://example.org/hr/instances/janed',
                        firstName: 'John',
                        lastName: 'Doe'
                    },
                    {
                        '@id': 'http://example.org/hr/instances/janed',
                        '@type': 'Manager',
                        manages: 'http://example.org/hr/instances/johnd',
                        firstName: 'Jane',
                        lastName: 'Doe'
                    }
                ]
            });

            expanded = await sourceGraph.toExpanded();
        });

        it('should work', async () => {
            const graph = new JsonldGraph();
            await graph.load(expanded);

            expect(graph.hasVertex('http://example.org/hr/classes/Employee')).toEqual(true);
            expect(graph.hasVertex('http://example.org/hr/classes/Manager')).toEqual(true);
            expect(graph.hasVertex('http://example.org/hr/instances/johnd')).toEqual(true);
            expect(graph.hasVertex('http://example.org/hr/instances/janed')).toEqual(true);
            expect(graph.getVertex('http://example.org/hr/instances/johnd')?.getAttributeValue('http://example.org/hr/classes/Employee/firstName')).toEqual('John');
            expect(graph.getVertex('http://example.org/hr/instances/johnd')?.getAttributeValue('http://example.org/hr/classes/Employee/lastName')).toEqual('Doe');
            expect(graph.getVertex('http://example.org/hr/instances/janed')?.getAttributeValue('http://example.org/hr/classes/Employee/firstName')).toEqual('Jane');
            expect(graph.getVertex('http://example.org/hr/instances/janed')?.getAttributeValue('http://example.org/hr/classes/Employee/lastName')).toEqual('Doe');
            expect(graph.hasEdge('http://example.org/hr/classes/Employee/manager', 'http://example.org/hr/instances/johnd', 'http://example.org/hr/instances/janed')).toEqual(true);
            expect(graph.hasEdge('http://example.org/hr/classes/Manager/manages', 'http://example.org/hr/instances/janed', 'http://example.org/hr/instances/johnd')).toEqual(true);
        });

    });

    describe('.parse', () => {
        const context = {
            '@context': {
                '@vocab': 'http://example.org/hr/classes/',
                '@version': 1.1,
                firstName: 'Employee/firstName',
                lastName: 'Employee/lastName',
                displayName: 'Entity/displayName',
                description: { '@id': 'Entity/description', '@container': '@language' },
                manager: { '@id': 'Employee/manager', '@type': '@id' },
                manages: { '@id': 'Manager/manages', '@type': '@id' },
                name: { '@id': 'Entity/name' },
                empData: { '@id': 'Employee/data', '@type': '@json' },
                address: { '@id': 'Contact/address', '@container': '@list' },
                accounts: { '@id': 'Entity/accounts' },
                street: 'Contact/address/street',
                city: 'Contact/address/city',
                state: 'Contact/address/state',
                zip: 'Contact/address/zip'
            }
        };

        it('should throw when inputs are not valid', async () => {
            const graph = new JsonldGraph();
            await expect(graph.parse(null)).rejects.toThrow(ReferenceError);
            await expect(graph.parse(undefined)).rejects.toThrow(ReferenceError);
            await expect(graph.parse([])).rejects.toThrow(ReferenceError);
            await expect(graph.parse({ '@context': 'foo' })).rejects.toThrow(errors.DocumentParseError);
        });

        it('can load a single entity', async () => {
            const graph = new JsonldGraph();
            graph.addContext('http://example.org/hr', context);
            graph.setPrefix('vocab', 'http://example.org/hr/classes/');
            graph.setPrefix('hr', 'http://example.org/hr/instances/');

            await graph.parse({
                '@context': [
                    { '@base': 'http://example.org/hr/instances/' },
                    'http://example.org/hr'
                ],
                '@id': 'johnd',
                '@type': 'Employee',
                firstName: 'John',
                lastName: 'Doe'
            });

            expect(graph.hasVertex('hr:johnd')).toEqual(true);
            expect(graph.hasVertex('vocab:Employee')).toEqual(true);

            const johnd = graph.getVertex('hr:johnd');
            expect(johnd).toBeTruthy();
            expect(johnd!.getAttributeValue('vocab:Employee/firstName')).toEqual('John');
            expect(johnd!.getAttributeValue('vocab:Employee/lastName')).toEqual('Doe');
            expect(johnd!.isType('vocab:Employee')).toEqual(true);
        });

        it('can load multiple entities', async () => {
            const graph = new JsonldGraph();
            graph.addContext('http://example.org/hr', context);
            graph.setPrefix('vocab', 'http://example.org/hr/classes/');
            graph.setPrefix('hr', 'http://example.org/hr/instances/');

            await graph.parse({
                '@context': [
                    { '@base': 'http://example.org/hr/instances/' },
                    'http://example.org/hr'
                ],
                '@graph': [
                    {
                        '@id': 'johnd',
                        '@type': 'Employee',
                        firstName: 'John',
                        lastName: 'Doe'
                    },
                    {
                        '@id': 'janed',
                        '@type': 'Employee',
                        firstName: 'Jane',
                        lastName: 'Doe'
                    }
                ]
            });

            expect(graph.hasVertex('hr:johnd')).toEqual(true);
            expect(graph.hasVertex('hr:janed')).toEqual(true);
            expect(graph.hasVertex('vocab:Employee')).toEqual(true);

            const johnd = graph.getVertex('hr:johnd');
            expect(johnd).toBeTruthy();
            expect(johnd!.getAttributeValue('vocab:Employee/firstName')).toEqual('John');
            expect(johnd!.getAttributeValue('vocab:Employee/lastName')).toEqual('Doe');
            expect(johnd!.isType('vocab:Employee')).toEqual(true);

            const janed = graph.getVertex('hr:janed');
            expect(janed).toBeTruthy();
            expect(janed!.getAttributeValue('vocab:Employee/firstName')).toEqual('Jane');
            expect(janed!.getAttributeValue('vocab:Employee/lastName')).toEqual('Doe');
            expect(janed!.isType('vocab:Employee')).toEqual(true);
        });

        it('can load multiple documents', async () => {
            const graph = new JsonldGraph();
            graph.addContext('http://example.org/hr', context);
            graph.setPrefix('vocab', 'http://example.org/hr/classes/');
            graph.setPrefix('hr', 'http://example.org/hr/instances/');

            await graph.parse([
                {
                    '@context': [
                        { '@base': 'http://example.org/hr/instances/' },
                        'http://example.org/hr'
                    ],
                    '@id': 'johnd',
                    '@type': 'Employee',
                    firstName: 'John',
                    lastName: 'Doe'
                },
                {
                    '@context': [
                        { '@base': 'http://example.org/hr/instances/' },
                        'http://example.org/hr'
                    ],
                    '@id': 'janed',
                    '@type': 'Employee',
                    firstName: 'Jane',
                    lastName: 'Doe'
                }
            ]);

            expect(graph.hasVertex('hr:johnd')).toEqual(true);
            expect(graph.hasVertex('hr:janed')).toEqual(true);
            expect(graph.hasVertex('vocab:Employee')).toEqual(true);

            const johnd = graph.getVertex('hr:johnd');
            expect(johnd).toBeTruthy();
            expect(johnd!.getAttributeValue('vocab:Employee/firstName')).toEqual('John');
            expect(johnd!.getAttributeValue('vocab:Employee/lastName')).toEqual('Doe');
            expect(johnd!.isType('vocab:Employee')).toEqual(true);

            const janed = graph.getVertex('hr:janed');
            expect(janed).toBeTruthy();
            expect(janed!.getAttributeValue('vocab:Employee/firstName')).toEqual('Jane');
            expect(janed!.getAttributeValue('vocab:Employee/lastName')).toEqual('Doe');
            expect(janed!.isType('vocab:Employee')).toEqual(true);
        });

        it('can load outgoing and incoming references', async () => {
            const graph = new JsonldGraph();
            graph.addContext('http://example.org/hr', context);
            graph.setPrefix('vocab', 'http://example.org/hr/classes/');
            graph.setPrefix('hr', 'http://example.org/hr/instances/');

            await graph.parse({
                '@context': 'http://example.org/hr',
                '@graph': [
                    {
                        '@id': 'http://example.org/hr/instances/johnd',
                        '@type': 'Employee',
                        'manager': 'http://example.org/hr/instances/janed'
                    },
                    {
                        '@id': 'http://example.org/hr/instances/janed',
                        '@type': 'Manager',
                        'manages': 'http://example.org/hr/instances/johnd'
                    }
                ]
            });

            expect(graph.hasEdge('vocab:Employee/manager', 'hr:johnd', 'hr:janed')).toEqual(true);
            expect(graph.hasEdge('vocab:Manager/manages', 'hr:janed', 'hr:johnd')).toEqual(true);

            const johnd = graph.getVertex('hr:johnd')!;
            const janed = graph.getVertex('hr:janed')!;
            expect(johnd.hasOutgoing('vocab:Employee/manager', janed)).toEqual(true);
            expect(johnd.hasIncoming('vocab:Manager/manages', janed)).toEqual(true);
            expect(janed.hasOutgoing('vocab:Manager/manages', johnd)).toEqual(true);
            expect(janed.hasIncoming('vocab:Employee/manager', johnd)).toEqual(true);
        });

        it('can load multi valued predicates', async () => {
            const graph = new JsonldGraph();
            graph.addContext('http://example.org/hr', context);
            graph.setPrefix('vocab', 'http://example.org/hr/classes/');
            graph.setPrefix('hr', 'http://example.org/hr/instances/');

            await graph.parse({
                '@context': [
                    { '@base': 'http://example.org/hr/instances/' },
                    'http://example.org/hr'
                ],
                '@id': 'johnd',
                firstName: 'John',
                lastName: 'Doe',
                displayName: ['John Doe', 'John D']
            });

            const johnd = graph.getVertex('hr:johnd')!;
            const displayNames = [...johnd.getAttributeValues('vocab:Entity/displayName')];
            expect(displayNames.length).toEqual(2);
            expect(displayNames[0].value).toEqual('John Doe');
            expect(displayNames[1].value).toEqual('John D');
        });

        it('can load language maps', async () => {
            const graph = new JsonldGraph();
            graph.addContext('http://example.org/hr', context);
            graph.setPrefix('vocab', 'http://example.org/hr/classes/');
            graph.setPrefix('hr', 'http://example.org/hr/instances/');

            await graph.parse({
                '@context': [
                    { '@base': 'http://example.org/hr/instances/' },
                    'http://example.org/hr'
                ],
                '@id': 'johnd',
                firstName: 'John',
                lastName: 'Doe',
                description: {
                    en: 'en description',
                    fr: 'fr description'
                }
            });

            const johnd = graph.getVertex('hr:johnd')!;
            expect(johnd.getAttributeValue('vocab:Entity/description', 'en')).toEqual('en description');
            expect(johnd.getAttributeValue('vocab:Entity/description', 'fr')).toEqual('fr description');
        });

        it('can load lists', async () => {
            const graph = new JsonldGraph();
            graph.addContext('http://example.org/hr', context);
            graph.setPrefix('vocab', 'http://example.org/hr/classes/');
            graph.setPrefix('hr', 'http://example.org/hr/instances/');

            await graph.parse({
                '@context': [
                    { '@base': 'http://example.org/hr/instances/' },
                    'http://example.org/hr'
                ],
                '@id': 'johnd',
                firstName: 'John',
                lastName: 'Doe',
                accounts: [
                    {
                        '@id': 'contact/a',
                        '@type': 'Contact',
                        displayName: 'Contact A'
                    },
                    {
                        '@id': 'contact/b',
                        '@type': 'Contact',
                        displayName: 'Contact B'
                    }
                ]
            });

            expect(graph.hasVertex('hr:johnd')).toEqual(true);
            expect(graph.hasVertex('hr:contact/a')).toEqual(true);
            expect(graph.hasVertex('hr:contact/b')).toEqual(true);

            const johnd = graph.getVertex('hr:johnd')!;
            expect(johnd.hasOutgoing('vocab:Entity/accounts')).toEqual(true);

            const accounts = [...johnd.getOutgoing('vocab:Entity/accounts')];
            expect(accounts.length).toEqual(2);
            expect(accounts[0].to.id).toEqual('hr:contact/a');
            expect(accounts[0].to.getAttributeValue('vocab:Entity/displayName')).toEqual('Contact A');
            expect(accounts[1].to.id).toEqual('hr:contact/b');
            expect(accounts[1].to.getAttributeValue('vocab:Entity/displayName')).toEqual('Contact B');
        });

        it('can load json values', async () => {
            const graph = new JsonldGraph();
            graph.addContext('http://example.org/hr', context);
            graph.setPrefix('vocab', 'http://example.org/hr/classes/');
            graph.setPrefix('hr', 'http://example.org/hr/instances/');

            await graph.parse({
                '@context': [
                    { '@base': 'http://example.org/hr/instances/' },
                    'http://example.org/hr'
                ],
                '@id': 'johnd',
                'empData': {
                    field1: 'value1',
                    field2: 'value2'
                }
            });

            const johnd = graph.getVertex('hr:johnd')!;
            const data = johnd.getAttributeValue<{ field1: string; field2: string }>('vocab:Employee/data');
            expect(data).toBeTruthy();
            expect(typeof data).toEqual('object');
            expect(data.field1).toEqual('value1');
            expect(data.field2).toEqual('value2');

            const attrib = johnd.getAttributeValues('vocab:Employee/data').first();
            expect(attrib.type).toEqual('@json');
        });

        it('can merge multiple documents', async () => {
            const graph = new JsonldGraph();
            graph.addContext('http://example.org/hr', context);
            graph.setPrefix('vocab', 'http://example.org/hr/classes/');
            graph.setPrefix('hr', 'http://example.org/hr/instances/');

            const document1 = {
                '@context': [
                    { '@base': 'http://example.org/hr/instances/' },
                    'http://example.org/hr'
                ],
                '@id': 'johnd',
                firstName: 'John',
                lastName: 'Doe',
                description: {
                    'en': 'en desc'
                }
            }

            const document2 = {
                '@context': [
                    { '@base': 'http://example.org/hr/instances/' },
                    'http://example.org/hr'
                ],
                '@id': 'johnd',
                firstName: 'John. D',
                name: 'johnd',
                description: {
                    'fr': 'fr desc'
                }
            }

            await graph.parse([document1, document2], { merge: true });
            const johnd = graph.getVertex('hr:johnd')!;
            expect(johnd.getAttributeValue('vocab:Employee/firstName')).toEqual('John. D');
            expect(johnd.getAttributeValue('vocab:Entity/name')).toEqual('johnd');
            expect(johnd.getAttributeValue('vocab:Entity/description', 'en')).toEqual('en desc');
            expect(johnd.getAttributeValue('vocab:Entity/description', 'fr')).toEqual('fr desc');
        });

        it('can load using base context', async () => {
            const graph = new JsonldGraph();
            graph.addContext('http://example.org/hr', context);
            graph.setPrefix('vocab', 'http://example.org/hr/classes/');
            graph.setPrefix('hr', 'http://example.org/hr/instances/');

            const document = {
                '@context': 'http://example.org/hr',
                '@id': 'johnd',
                firstName: 'John',
                lastName: 'Doe',
            };

            await graph.parse(document, { base: 'http://example.org/hr/instances/' });
            expect(graph.hasVertex('http://example.org/hr/instances/johnd')).toEqual(true);
            expect(graph.hasVertex('hr:johnd')).toEqual(true);
        });

        it('can load using supplied context', async () => {
            const graph = new JsonldGraph();
            graph.addContext('http://example.org/hr', context);
            graph.setPrefix('vocab', 'http://example.org/hr/classes/');
            graph.setPrefix('hr', 'http://example.org/hr/instances/');

            const document = {
                '@id': 'http://example.org/hr/instances/johnd',
                firstName: 'John',
                lastName: 'Doe',
            };

            const customContext = {
                '@context': {
                    firstName: 'http://example.org/other/fname',
                    lastName: 'http://example.org/other/lname'
                }
            };

            await graph.parse(document, { contexts: customContext });

            expect(graph.getVertex('hr:johnd')?.hasAttribute('http://example.org/other/fname')).toEqual(true);
            expect(graph.getVertex('hr:johnd')?.hasAttribute('http://example.org/other/lname')).toEqual(true);
        });

        it('can normalize blank types', async () => {
            const document = {
                '@context': [
                    { '@base': 'http://example.org/hr/instances/' },
                    'http://example.org/hr'
                ],
                '@id': 'johnd',
                firstName: 'John',
                lastName: 'Doe',
                manager: {
                    '@id': 'janed',
                    firstName: 'Jane',
                    lastName: 'Doe'
                }
            };

            const graph = new JsonldGraph({
                blankTypeResolver: (vertex): string[] => {
                    const incoming = vertex.getIncoming().first();
                    if (incoming && incoming.label === 'vocab:Employee/manager') {
                        return ['vocab:Manager'];
                    }
                    return ['vocab:Employee'];
                }
            });
            graph.addContext('http://example.org/hr', context);
            graph.setPrefix('vocab', 'http://example.org/hr/classes/');
            graph.setPrefix('hr', 'http://example.org/hr/instances/');

            await graph.parse(document, { normalize: true });

            expect(graph.getVertex('hr:johnd')?.isType('vocab:Employee')).toEqual(true);
            expect(graph.getVertex('hr:janed')?.isType('vocab:Manager')).toEqual(true);
            expect(graph.blankTypes.count()).toEqual(0);
        });

        it('can normalize blank ids', async () => {
            const document = {
                '@context': [
                    { '@base': 'http://example.org/hr/instances/' },
                    'http://example.org/hr'
                ],
                '@id': 'johnd',
                firstName: 'John',
                lastName: 'Doe',
                address: {
                    street: 'Sunshine Street',
                    city: 'LA',
                    state: 'CA',
                    zip: '11111'
                },
                manager: {
                    name: 'janed',
                    firstName: 'Jane',
                    lastName: 'Doe',
                    address: {
                        street: 'Sunshine Street',
                        city: 'LA',
                        state: 'CA',
                        zip: '11111'
                    }
                }
            };

            const graph = new JsonldGraph({
                blankIriResolver: (vertex): string => {
                    const name = vertex.getAttributeValue("vocab:Entity/name") || shortid();
                    const parent = vertex.getIncoming().first();
                    if (!parent) {
                        return name;
                    } else {
                        return `${parent.from.id}:${name}`
                    }
                }
            });

            graph.addContext('http://example.org/hr', context);
            graph.setPrefix('vocab', 'http://example.org/hr/classes/');
            graph.setPrefix('hr', 'http://example.org/hr/instances/');

            await graph.parse(document, { normalize: true });

            expect(graph.hasVertex('hr:johnd:janed')).toEqual(true);

            expect(graph
                .getVertex('hr:johnd')!
                .getOutgoing('vocab:Contact/address')
                .first()
                .to.id.startsWith('hr:johnd')).toEqual(true);

            expect(graph
                .getVertex('hr:johnd:janed')!
                .getOutgoing('vocab:Contact/address')
                .first()
                .to.id.startsWith('hr:johnd:janed')).toEqual(true);

            expect(graph.blankNodes.count()).toEqual(0);
        });

        it('can resolve conflicts on blank id normalization', async () => {
            const document = {
                '@context': [
                    { '@base': 'http://example.org/hr/instances/' },
                    'http://example.org/hr'
                ],
                '@graph': [
                    {
                        '@id': 'johnd',
                        firstName: 'John',
                        lastName: 'Doe',
                        address: {
                            street: 'Sunshine Street',
                            city: 'LA',
                            state: 'CA',
                            zip: '11111'
                        },
                        manager: {
                            name: 'janed',
                            firstName: 'Jane',
                            lastName: 'Doe',

                        }
                    },
                    {
                        name: 'janed',
                        address: {
                            street: 'Sunshine Street',
                            city: 'LA',
                            state: 'CA',
                            zip: '11111'
                        }
                    }
                ]

            };

            const graph = new JsonldGraph({
                blankIriResolver: (vertex): string | undefined => {
                    const name = vertex.getAttributeValue("vocab:Entity/name") || shortid();
                    return 'http://example.org/hr/instances/' + name;
                }
            });

            graph.addContext('http://example.org/hr', context);
            graph.setPrefix('vocab', 'http://example.org/hr/classes/');
            graph.setPrefix('hr', 'http://example.org/hr/instances/');

            await graph.parse(document, { normalize: true });
            const janed = graph.getVertex('hr:janed');
            expect(janed).toBeDefined();
            expect(janed!.getAttributeValue('vocab:Entity/name')).toEqual('janed');
            expect(janed!.getAttributeValue('vocab:Employee/firstName')).toEqual('Jane');
            expect(janed!.getAttributeValue('vocab:Employee/lastName')).toEqual('Doe');
            expect(janed!.hasOutgoing('vocab:Contact/address')).toEqual(true);
            expect(janed!.hasIncoming('vocab:Employee/manager', 'hr:johnd')).toEqual(true);
            expect(graph.blankNodes.count()).toEqual(0);
        });

        it('can resolve conflicts types on blank id normalization', async () => {
            const document = {
                '@context': [
                    { '@base': 'http://example.org/hr/instances/' },
                    'http://example.org/hr'
                ],
                '@graph': [
                    {
                        '@id': 'johnd',
                        firstName: 'John',
                        lastName: 'Doe',
                        address: {
                            street: 'Sunshine Street',
                            city: 'LA',
                            state: 'CA',
                            zip: '11111'
                        },
                        manager: {
                            '@type': 'Person',
                            name: 'janed',
                            firstName: 'Jane',
                            lastName: 'Doe',

                        }
                    },
                    {
                        '@type': ['Manager', 'Employee'],
                        name: 'janed',
                        address: {
                            street: 'Sunshine Street',
                            city: 'LA',
                            state: 'CA',
                            zip: '11111'
                        }
                    }
                ]
            };

            const graph = new JsonldGraph({
                blankIriResolver: (vertex): string | undefined => {
                    const name = vertex.getAttributeValue("vocab:Entity/name") || shortid();
                    return 'http://example.org/hr/instances/' + name;
                },
                typeConflictResolver: (source: string[], target: string[]) => {
                    return source
                        .filter(x => !x.includes('Employee'))
                        .concat(target.filter(x => !x.includes('Employee')));
                }
            });

            graph.addContext('http://example.org/hr', context);
            graph.setPrefix('vocab', 'http://example.org/hr/classes/');
            graph.setPrefix('hr', 'http://example.org/hr/instances/');

            await graph.parse(document, { normalize: true });

            const janed = graph.getVertex('hr:janed');
            expect(janed!.isType('vocab:Person')).toEqual(true);
            expect(janed!.isType('vocab:Manager')).toEqual(true);
            expect(janed!.isType('vocab:Employee')).toEqual(false);
        });

        it('can load multiple references', async () => {
            const graph = new JsonldGraph();
            graph.addContext('http://example.org/hr', context);
            graph.setPrefix('vocab', 'http://example.org/hr/classes/');
            graph.setPrefix('hr', 'http://example.org/hr/instances/');

            await graph.parse({
                '@context': 'http://example.org/hr',
                '@graph': [
                    {
                        '@id': 'http://example.org/hr/instances/johnd',
                        '@type': 'Employee',
                        'manager': {
                            '@id': 'http://example.org/hr/instances/jaked',
                            manager: [
                                'http://example.org/hr/instances/jilld'
                            ]
                        }
                    },
                    {
                        '@id': 'http://example.org/hr/instances/janed',
                        '@type': 'Manager',
                        'manager': {
                            '@id': 'http://example.org/hr/instances/jaked',
                            manager: [
                                'http://example.org/hr/instances/jilld'
                            ]
                        }
                    }
                ]
            });

            expect(graph.hasVertex('http://example.org/hr/instances/jaked'));
            expect(graph.getVertex('http://example.org/hr/instances/jaked')?.hasOutgoing('vocab:manager', 'http://example.org/hr/instances/jilld'));
        });

        it('can translate @ids', async () => {
            const graph = new JsonldGraph();
            graph.addContext('http://example.org/hr', context);
            graph.setPrefix('vocab', 'http://example.org/hr/classes/');
            graph.setPrefix('hr', 'http://example.org/hr/instances/');

            const translator = (id: string) => {
                if (id.includes('johnd')) {
                    return 'http://example.org/hr/instances/newjohn'
                } else {
                    return id;
                }
            }
            await graph.parse({
                '@context': 'http://example.org/hr',
                '@graph': [
                    {
                        '@id': 'http://example.org/hr/instances/johnd',
                        '@type': 'Employee',
                        'manager': {
                            '@id': 'http://example.org/hr/instances/jaked',
                            manager: [
                                'http://example.org/hr/instances/jilld'
                            ]
                        }
                    },
                    {
                        '@id': 'http://example.org/hr/instances/janed',
                        '@type': 'Manager',
                        'manager': {
                            '@id': 'http://example.org/hr/instances/jaked',
                            manager: [
                                'http://example.org/hr/instances/jilld'
                            ]
                        }
                    }
                ]
            }, {
                identityTranslator: translator
            });

            expect(graph.hasVertex('http://example.org/hr/instances/newjohn')).toEqual(true);
            expect(graph.hasVertex('http://example.org/hr/instances/johnd')).toEqual(false);
        });

        it('can translate @type', async () => {
            const graph = new JsonldGraph();
            graph.addContext('http://example.org/hr', context);
            graph.setPrefix('vocab', 'http://example.org/hr/classes/');
            graph.setPrefix('hr', 'http://example.org/hr/instances/');

            const translator = (id: string) => {
                if (id === 'http://example.org/hr/classes/Employee') {
                    return id = 'http://example.org/hr/classes/NewEmployee'
                } else {
                    return id;
                }
            }

            await graph.parse({
                '@context': 'http://example.org/hr',
                '@graph': [
                    {
                        '@id': 'http://example.org/hr/instances/johnd',
                        '@type': 'Employee',
                        'manager': {
                            '@id': 'http://example.org/hr/instances/jaked',
                            manager: [
                                'http://example.org/hr/instances/jilld'
                            ]
                        }
                    },
                    {
                        '@id': 'http://example.org/hr/instances/janed',
                        '@type': 'Manager',
                        'manager': {
                            '@id': 'http://example.org/hr/instances/jaked',
                            manager: [
                                'http://example.org/hr/instances/jilld'
                            ]
                        }
                    }
                ]
            }, {
                identityTranslator: translator
            });

            expect(graph.getVertex('hr:johnd')?.isType('vocab:NewEmployee')).toEqual(true);
            expect(graph.getVertex('hr:janed')?.isType('vocab:Manager')).toEqual(true);
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
        let edge: Edge;
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

    describe('.renameVertex', () => {
        let graph: JsonldGraph;

        beforeEach(() => {
            graph = new JsonldGraph();
            graph.setPrefix('test', 'urn:test:');
            graph.createVertex('test:instanceA');

            const instanceB = graph.createVertex('test:instanceB');
            instanceB.setOutgoing('test:out', 'test:instanceC', true);
            instanceB.setIncoming('test:in', 'test:instanceA');
            instanceB.appendAttributeValue('test:displayName', 'first');
            instanceB.appendAttributeValue('test:displayName', 'second');
            instanceB.appendAttributeValue('test:description', 'test', 'en');
            instanceB.appendAttributeValue('test:description', 'test', 'fr');
        });

        it('should throw when input arguments is invalid', () => {
            const tests = [
                [null as any, 'test:foo'],
                [undefined as any, 'test:foo'],
                ['', 'test:foo'],
                ['test:instanceB', null as any],
                ['test:instanceB', undefined as any],
                ['test:instanceB', ''],
            ];

            for (const [target, newId] of tests) {
                expect(() => graph.renameVertex(target, newId)).toThrow(ReferenceError);
            }
        });

        it('should throw not found error when target vertex does not exist', () => {
            expect(() => graph.renameVertex('test:notfound', 'urn:foo')).toThrow(errors.VertexNotFoundError);
        })

        it('should throw duplicate error when new id already exists', () => {
            expect(() => graph.renameVertex('test:instanceB', 'test:instanceA')).toThrow(errors.DuplicateVertexError);
        });

        it('should rename vertex to new id', () => {
            const v = graph.renameVertex('test:instanceB', 'test:instanceD');
            expect(v.id).toEqual('test:instanceD');
            expect(v.getAttributes().count()).toEqual(2);
            expect(v.hasAttributeValue('test:displayName', 'first')).toEqual(true);
            expect(v.hasAttributeValue('test:displayName', 'second')).toEqual(true);
            expect(v.hasAttributeValue('test:description', 'test', 'en')).toEqual(true);
            expect(v.hasAttributeValue('test:description', 'test', 'en')).toEqual(true);
            expect(v.hasOutgoing('test:out', 'test:instanceC')).toEqual(true);
            expect(v.hasIncoming('test:in', 'test:instanceA')).toEqual(true);
            expect(graph.hasVertex('test:instanceB')).toEqual(false);
            expect(graph.hasEdge('test:out', 'test:instanceB', 'test:instanceC')).toEqual(false);
            expect(graph.hasEdge('test:in', 'test:instanceC', 'test:instanceB')).toEqual(false);
        });

        it('should return same vertex when new id is same', () => {
            const instanceB = graph.getVertex('test:instanceB')!;
            const renamed = graph.renameVertex(instanceB, 'test:instanceB');
            expect(renamed).toEqual(instanceB);
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
});