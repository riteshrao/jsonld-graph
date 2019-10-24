import 'mocha';
import GraphIndex from './graphIndex';
import { expect } from 'chai';
import Errors from './errors';

describe('GraphIndex', () => {
    describe('.addIRIPrefix', () => {
        let index: GraphIndex;

        beforeEach(() => {
            index = new GraphIndex();
        });

        it('should throw when prefix is null, undefined or empty', () => {
            expect(() => index.addIRIPrefix(null, 'http://foo/bar')).to.throw(ReferenceError);
            expect(() => index.addIRIPrefix(undefined, 'http://foo/bar')).to.throw(ReferenceError);
            expect(() => index.addIRIPrefix('', 'http://foo/bar')).to.throw(ReferenceError);
        });

        it('should throw when prefix has invalid characters', () => {
            expect(() => index.addIRIPrefix('foo$bar', 'http://foo/bar')).to.throw(
                Errors.InvalidPrefixError
            );
            expect(() => index.addIRIPrefix('urn:bar:baz', 'http://foo/bar')).to.throw(
                Errors.InvalidPrefixError
            );
        });

        it('should throw when id is null, undefined or empty', () => {
            expect(() => index.addIRIPrefix('test', null)).to.throw(ReferenceError);
            expect(() => index.addIRIPrefix('test', undefined)).to.throw(ReferenceError);
            expect(() => index.addIRIPrefix('test', '')).to.throw(ReferenceError);
        });

        it('should throw when id is an unsupported IRI', () => {
            expect(() => index.addIRIPrefix('test', 'http://')).to.throw(Errors.InvalidIRIError);
            expect(() => index.addIRIPrefix('test', 'foo://bar.com')).to.throw(
                Errors.InvalidIRIError
            );
            expect(() => index.addIRIPrefix('test', 'mailto://foo.bar.com')).to.throw(
                Errors.InvalidIRIError
            );
        });

        it('should add prefix', () => {
            index.addIRIPrefix('test', 'urn:foo:bar');
            expect(index.hasPrefix('urn:foo:bar')).to.be.true;
            expect(index.getPrefix('urn:foo:bar')).to.equal('test');
        });

        it('should throw duplicate error for duplicate prefixes', () => {
            index.addIRIPrefix('test', 'urn:foo:bar');
            expect(() => index.addIRIPrefix('test', 'urn:bar:baz')).to.throw(
                Errors.DuplicatePrefixError
            );
        });

        it('should throw duplicate error for multiple prefixes for same IRI', () => {
            index.addIRIPrefix('foo', 'urn:duplicate:iri');
            expect(() => index.addIRIPrefix('bar', 'urn:duplicate:iri')).to.throw(
                Errors.DuplicatePrefixIRIError
            );
        });
    });

    describe('.addEdge', () => {
        let index: GraphIndex;

        beforeEach(() => {
            index = new GraphIndex();
            index.addVertex({ id: 'http://example/instanceA' });
            index.addVertex({ id: 'http://example/instanceB' });
        });

        it('should throw when edge is null or undefined', () => {
            expect(() => index.addEdge(null)).to.throw(ReferenceError);
            expect(() => index.addEdge(undefined)).to.throw(ReferenceError);
        });

        it('should throw when edge is not valid', () => {
            const cases = [
                {
                    fromVertexIRI: 'http://example/instanceA',
                    toVertexIRI: 'http://example/instanceB'
                },
                {
                    label: '',
                    fromVertexIRI: 'http://example/instanceA',
                    toVertexIRI: 'http://example/instanceB'
                },
                {
                    label: 'test',
                    fromVertexIRI: '',
                    toVertexIRI: 'http://example/instanceB'
                },
                {
                    label: 'test',
                    fromVertexIRI: 'http://example/instanceA',
                    toVertexIRI: ''
                }
            ];

            cases.forEach((testCase: any) => {
                expect(() => index.addEdge(testCase)).to.throw(ReferenceError);
            });
        });

        it('should throw when from vertex is not found', () => {
            const edge = {
                label: 'test',
                fromVertexIRI: 'http://example/notfound1',
                toVertexIRI: 'http://example/instanceB'
            };

            expect(() => index.addEdge(edge)).to.throw(Errors.VertexNotFoundError);
        });

        it('should throw when to vertex is not found', () => {
            const edge = {
                label: 'test',
                fromVertexIRI: 'http://example/instanceA',
                toVertexIRI: 'http://example/notfound'
            };

            expect(() => index.addEdge(edge)).to.throw(Errors.VertexNotFoundError);
        });

        it('should throw when edge is cyclical', () => {
            const edge = {
                label: 'test',
                fromVertexIRI: 'http://example/instanceA',
                toVertexIRI: 'http://example/instanceA'
            };

            expect(() => index.addEdge(edge)).to.throw(Errors.CyclicEdgeError);
        });

        it('should add edge', () => {
            const edge = {
                label: 'test',
                fromVertexIRI: 'http://example/instanceA',
                toVertexIRI: 'http://example/instanceB'
            };

            index.addEdge(edge);
            expect(index.edgeCount).to.equal(1);
        });

        it('should throw when edge is duplicate', () => {
            const edge = {
                label: 'test',
                fromVertexIRI: 'http://example/instanceA',
                toVertexIRI: 'http://example/instanceB'
            };

            index.addEdge(edge);
            expect(() => index.addEdge(edge)).to.throw(Errors.DuplicateEdgeError);
        });
    });

    describe('.addVertex', () => {
        let index: GraphIndex;

        beforeEach(() => {
            index = new GraphIndex();
        });

        it('should throw when vertex is null or undefined', () => {
            expect(() => index.addVertex(null)).to.throw(ReferenceError);
            expect(() => index.addVertex(undefined)).to.throw(ReferenceError);
        });

        it('should add vertex to the graph', () => {
            const vertex = { id: 'urn:foo:bar' } as any;
            index.addVertex(vertex);
            expect(index.vertexCount).to.equal(1);
            expect(index.getVertex('urn:foo:bar')).to.be.equal(vertex);
        });

        it('should throw duplicate error when vertex is already added', () => {
            const vertex = { id: 'urn:foo:bar' } as any;
            index.addVertex(vertex);
            expect(() => index.addVertex(vertex)).to.throw(Errors.DuplicateVertexError);
        });
    });

    describe('.compactIRI', () => {
        let index: GraphIndex;

        before(() => {
            index = new GraphIndex();
            index.addIRIPrefix('test', 'http://example.com');
        });

        it('should throw when iri is null, undefined or empty', () => {
            expect(() => index.compactIRI(null)).to.throw(ReferenceError);
            expect(() => index.compactIRI(undefined)).to.throw(ReferenceError);
            expect(() => index.compactIRI('')).to.throw(ReferenceError);
        });

        it('should throw when IRI is not valid', () => {
            expect(() => index.compactIRI('not a iri')).to.throw(Errors.InvalidIRIError);
        });

        it('should return same IRI when not mapped with a prefix', () => {
            expect(index.compactIRI('urn:foo:bar')).to.equal('urn:foo:bar');
        });

        it('should return compact IRI with prefix for mapped IRI', () => {
            expect(index.compactIRI('http://example.com/instance')).to.equal('test:instance');
        });

        it('should return IRI for exact prefix match', () => {
            expect(index.compactIRI('http://example.com')).to.equal('http://example.com');
        });
    });

    describe('.expandIRI', () => {
        let index: GraphIndex;

        before(() => {
            index = new GraphIndex();
            index.addIRIPrefix('test', 'http://test/');
        });

        it('should throw when iri is null, undefined or empty', () => {
            expect(() => index.expandIRI(null)).to.throw(ReferenceError);
            expect(() => index.expandIRI(undefined)).to.throw(ReferenceError);
            expect(() => index.expandIRI('')).to.throw(ReferenceError);
        });

        it('should return same iri when iri does not have a prefix', () => {
            expect(index.expandIRI('http://foo/bar')).to.equal('http://foo/bar');
            expect(index.expandIRI('something')).to.equal('something');
        });

        it('should return same iri when prefix is not defined', () => {
            expect(index.expandIRI('foo:test:bar')).to.equal('foo:test:bar');
        });

        it('should expand iri', () => {
            expect(index.expandIRI('test:foo/bar')).to.eq('http://test/foo/bar');
        });
    });

    describe('.getEdge', () => {
        let index: GraphIndex;

        before(() => {
            index = new GraphIndex();
            index.addVertex({ id: 'http://example/instanceA' });
            index.addVertex({ id: 'http://example/instanceB' });
            index.addEdge({
                label: 'test',
                fromId: 'http://example/instanceA',
                toId: 'http://example/instanceB'
            });
        });

        it('should throw for null, undefined or empty arguments', () => {
            const args = [
                [null, 'foo', 'bar'],
                [undefined, 'foo', 'bar'],
                ['', 'foo', 'bar'],
                ['foo', null, 'bar'],
                ['foo', undefined, 'bar'],
                ['foo', '', 'bar'],
                ['foo', 'bar', null],
                ['foo', 'bar', undefined],
                ['foo', 'bar', '']
            ];

            args.forEach(([label, from, to]) => {
                expect(() => index.getEdge(label, from, to)).to.throw(ReferenceError);
            });
        });

        it('should return undefined when edge is not added', () => {
            expect(index.getEdge('foo', 'bar', 'baz')).to.be.undefined;
        });

        it('should return edge', () => {
            expect(index.getEdge(
                'test', 
                'http://example/instanceA', 
                'http://example/instanceB')).to.be.ok;
        });
    });

    describe('.getEdges', () => {
        let index: GraphIndex;

        beforeEach(() => {
            index = new GraphIndex();
            index.addVertex({ id: 'http://example/instanceA' });
            index.addVertex({ id: 'http://example/instanceB' });
            index.addEdge({
                label: 'edgeA',
                fromId: 'http://example/instanceA',
                toId: 'http://example/instanceB'
            });
            index.addEdge({
                label: 'edgeB',
                fromId: 'http://example/instanceA',
                toId: 'http://example/instanceB'
            });
        });

        it('should return all edges when label is not specified', () => {
            const edges = [...index.getEdges()];
            expect(edges.length).to.equal(2);
            expect(edges.some(x => x.label === 'edgeA')).to.be.true;
        });

        it('should return edges matching specified label', () => {
            const edges = [...index.getEdges('edgeA')];
            expect(edges.length).to.equal(1);
            expect(edges[0].label).to.equal('edgeA');
        });
    });

    describe('.getEdgeIncoming', () => {
        let index: GraphIndex;

        beforeEach(() => {
            index = new GraphIndex();
            index.addVertex({ id: 'http://example/outgoing' });
            index.addVertex({ id: 'http://example/incomingA' });
            index.addVertex({ id: 'http://example/incomingB' });
            
            index.addEdge({
                label: 'test', 
                fromId: 'http://example/outgoing',
                toId: 'http://example/incomingA'
            });
            
            index.addEdge({
                label: 'test',
                fromId: 'http://example/outgoing',
                toId: 'http://example/incomingB'
            });
        });

        it('should throw when label is null, undefined or empty', () => {
            expect(() => [...index.getEdgeIncoming(null)]).to.throw(ReferenceError);
            expect(() => [...index.getEdgeIncoming(null)]).to.throw(ReferenceError);
            expect(() => [...index.getEdgeIncoming(null)]).to.throw(ReferenceError);
        });

        it('should return empty when no incoming edges exist with the specified label', () => {
            const incoming = [...index.getEdgeIncoming('foo')];
            expect(incoming.length).to.equal(0);
        });

        it('should return all vertices with the incoming edge', () => {
            const incoming = [...index.getEdgeIncoming('test')];
            expect(incoming.length).to.equal(2);
            expect(incoming.some(x => x.id === 'http://example/incomingA')).to.equal(true);
            expect(incoming.some(x => x.id === 'http://example/incomingB')).to.equal(true);
        });
    });

    describe('.getEdgeOutgoing', () => {
        let index: GraphIndex;

        beforeEach(() => {
            index = new GraphIndex();
            index.addVertex({ id: 'http://example/outgoing' });
            index.addVertex({ id: 'http://example/incomingA' });
            index.addVertex({ id: 'http://example/incomingB' });
            
            index.addEdge({
                label: 'test', 
                fromId: 'http://example/outgoing',
                toId: 'http://example/incomingA'
            });
            
            index.addEdge({
                label: 'test',
                fromId: 'http://example/outgoing',
                toId: 'http://example/incomingB'
            });
        });

        it('should throw when label is null, undefined or empty', () => {
            expect(() => [...index.getEdgeOutgoing(null)]).to.throw(ReferenceError);
            expect(() => [...index.getEdgeOutgoing(null)]).to.throw(ReferenceError);
            expect(() => [...index.getEdgeOutgoing(null)]).to.throw(ReferenceError);
        });

        it('should return empty when no incoming edges exist with the specified label', () => {
            const incoming = [...index.getEdgeOutgoing('foo')];
            expect(incoming.length).to.equal(0);
        });

        it('should return all vertices with the incoming edge', () => {
            const incoming = [...index.getEdgeOutgoing('test')];
            expect(incoming.length).to.equal(1);
            expect(incoming[0].id).to.equal('http://example/outgoing');
        });
    });

    describe('.getPrefix', () => {
        let index: GraphIndex;

        beforeEach(() => {
            index = new GraphIndex();
            index.addIRIPrefix('test', 'http://example/prefix/');
        });

        it('should throw when iri is null, undefined or empty', () => {
            expect(() => index.getPrefix(null)).to.throw(ReferenceError);
            expect(() => index.getPrefix(undefined)).to.throw(ReferenceError);
            expect(() => index.getPrefix('')).to.throw(ReferenceError);
        });

        it('should return null when no prefix matches iri', () => {
            expect(index.getPrefix('http://foo/bar')).to.be.null;
        });

        it('should return prefix for exact match', () => {
            expect(index.getPrefix('http://example/prefix/')).to.equal('test');
        });

        it('should return prefix for substring match', () => {
            expect(index.getPrefix('http://example/prefix/test/1')).to.equal('test');
        });
    });
});
