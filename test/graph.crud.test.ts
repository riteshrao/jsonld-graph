import 'mocha';
import { expect } from 'chai';

import { JsonldGraph } from '../src'

describe('graph', () => {
    describe('.createVertex', () => {

        let graph: JsonldGraph;

        beforeEach(() => {
            graph = new JsonldGraph();
        });

        it('should throw when creating vertex with invalid id', () => {
            expect(() => graph.createVertex(null)).to.throw(ReferenceError);
            expect(() => graph.createVertex(undefined)).to.throw(ReferenceError);
            expect(() => graph.createVertex('')).to.throw(ReferenceError);
        });

        it('should create new vertex', () => {
            const vertex = graph.createVertex('urn:test:1');
            expect(vertex).to.be.ok;
            expect(vertex.id).to.equal('urn:test:1');
            expect(graph.vertexCount).to.equal(1);
        });

        it('should not create duplicate vertices', () => {
            graph.createVertex('urn:test:1');
            graph.createVertex('urn:test:1');
            expect(graph.vertexCount).to.equal(1);
        });
    });

    describe('.getEdges', () => {
        let graph: JsonldGraph;

        beforeEach(() => {
            graph = new JsonldGraph();
            graph.createVertex('urn:person:johnd')
                .setOutgoing('urn:hr:relatedTo', 'urn:person:janed', true)
                .setOutgoing('urn:hr:relatedTo', 'urn:person:jilld', true)
                .setOutgoing('urn:hr:worksFor', 'urn:person:jaked', true);

        });

        it('should return all edges in the graph', () => {
            const edges = [...graph.getEdges()];
            expect(edges.length).to.equal(3);
            expect(edges.some(x => x.label === 'urn:hr:relatedTo' && x.toVertex.id === 'urn:person:janed')).to.be.true;
            expect(edges.some(x => x.label === 'urn:hr:relatedTo' && x.toVertex.id === 'urn:person:jilld')).to.be.true;
            expect(edges.some(x => x.label === 'urn:hr:worksFor' && x.toVertex.id === 'urn:person:jaked')).to.be.true;
        });

        it('should return edges with specified label', () => {
            const edges = [...graph.getEdges('urn:hr:relatedTo')];
            expect(edges.length).to.equal(2);
            expect(edges.some(x => x.label === 'urn:hr:relatedTo' && x.toVertex.id === 'urn:person:janed')).to.be.true;
            expect(edges.some(x => x.label === 'urn:hr:relatedTo' && x.toVertex.id === 'urn:person:jilld')).to.be.true;
            expect(edges.some(x => x.label !== 'urn:hr:relatedTo')).to.be.false;
        });
    });

    describe('.getIncoming', () => {
        let graph: JsonldGraph;

        beforeEach(() => {
            graph = new JsonldGraph();
            graph.createVertex('urn:person:johnd')
                .setOutgoing('urn:hr:relatedTo', 'urn:person:janed', true)
                .setOutgoing('urn:hr:relatedTo', 'urn:person:jilld', true)
                .setOutgoing('urn:hr:worksFor', 'urn:person:jaked', true);

            graph.getVertex('urn:person:janed')
                .setOutgoing('urn:hr:worksFor', 'urn:person:jaked', true);

        });

        it('should return vertices with matching incoming edges', () => {
            const vertices = [...graph.getIncoming('urn:hr:relatedTo')];
            expect(vertices.length).to.equal(2);
            expect(vertices.some(x => x.id === 'urn:person:janed')).to.be.true;
            expect(vertices.some(x => x.id === 'urn:person:jilld')).to.be.true;
        });

        it('should return filtered vertices with matching incoming edges', () => {
            const vertices = [...graph.getIncoming('urn:hr:relatedTo', x => x.id.includes('janed'))];
            expect(vertices.length).to.equal(1);
            expect(vertices[0].id).to.equal('urn:person:janed');
        });

        it('should return unique vertices with matching incoming edges', () => {
            const vertices = [...graph.getIncoming('urn:hr:worksFor')];
            expect(vertices.length).to.equal(1);
            expect(vertices[0].id).to.equal('urn:person:jaked');
        });
    });

    describe('.getOutgoing', () => {
        let graph: JsonldGraph;

        beforeEach(() => {
            graph = new JsonldGraph();
            graph.createVertex('urn:person:johnd')
                .setOutgoing('urn:hr:relatedTo', 'urn:person:janed', true)
                .setOutgoing('urn:hr:relatedTo', 'urn:person:jilld', true)
                .setOutgoing('urn:hr:worksFor', 'urn:person:jake', true);

            graph.getVertex('urn:person:janed')
                .setOutgoing('urn:hr:worksFor', 'urn:person:jake', true);

        });

        it('should return vertices with matching outgoing edges', () => {
            const vertices = [...graph.getOutgoing('urn:hr:worksFor')];
            expect(vertices.length).to.equal(2);
            expect(vertices.some(x => x.id === 'urn:person:johnd')).to.be.true;
            expect(vertices.some(x => x.id === 'urn:person:janed')).to.be.true;
        });

        it('should return filtered vertices with matching incoming edges', () => {
            const vertices = [...graph.getOutgoing('urn:hr:worksFor', x => x.id.includes('janed'))];
            expect(vertices.length).to.equal(1);
            expect(vertices[0].id).to.equal('urn:person:janed');
        });

        it('should return unique vertices with matching incoming edges', () => {
            const vertices = [...graph.getOutgoing('urn:hr:relatedTo')];
            expect(vertices.length).to.equal(1);
            expect(vertices[0].id).to.equal('urn:person:johnd');
        });
    });

    describe('.getVertex', () => {
        let graph: JsonldGraph;

        beforeEach(() => {
            graph = new JsonldGraph();
            graph.createVertex('urn:person:johnd');
        });

        it('should get vertex by id', () => {
            const vertex = graph.getVertex('urn:person:johnd');
            expect(vertex).to.be.ok;
            expect(vertex.id).to.equal('urn:person:johnd');
        });

        it('should return null when vertex doesnt not exit', () => {
            const vertex = graph.getVertex('urn:does_not_exist');
            expect(vertex).to.be.null;
        });
    });

    describe('.getVertices', () => {
        let graph: JsonldGraph;

        beforeEach(() => {
            graph = new JsonldGraph();
            graph.createVertex('urn:person:johnd');
            graph.createVertex('urn:person:janed');
        });

        it('should return all vertices in the graph', () => {
            const results = [...graph.getVertices()];
            expect(results.length).to.equal(2);
            expect(results.some(x => x.id === 'urn:person:johnd')).to.be.true;
            expect(results.some(x => x.id === 'urn:person:janed')).to.be.true;
        });

        it('should return filtered vertices', () => {
            const results = [...graph.getVertices(x => x.id.includes('john'))];
            expect(results.length).to.equal(1);
            expect(results.some(x => x.id === 'urn:person:johnd')).to.be.true;
            expect(results.some(x => x.id === 'urn:person:janed')).to.be.false;
        });
    });

    describe('.hasEdge', () => {
        let graph: JsonldGraph;

        beforeEach(() => {
            graph = new JsonldGraph();
            graph.createVertex('urn:person:johnd')
                .setOutgoing('urn:hr:relatedTo', 'urn:person:janed', true)
                .setIncoming('urn:hr:worksFor', 'urn:person:jilld', true);
        });

        it('should return true for existing edge', () => {
            expect(graph.hasEdge('urn:hr:relatedTo', 'urn:person:johnd', 'urn:person:janed')).to.be.true;
        });

        it('should return false for non-existing edge', () => {
            expect(graph.hasEdge('urn:hr:worksFor', 'urn:person:johnd', 'urn:person:jilld')).to.be.false;
        });
    });

    describe('.hasVertex', () => {
        let graph: JsonldGraph;

        beforeEach(() => {
            graph = new JsonldGraph();
            graph.createVertex('urn:person:johnd');
        });

        it('should return true when vertex exists', () => {
            expect(graph.hasVertex('urn:person:johnd')).to.be.true;
        });

        it('should return false when vertex does not exist', () => {
            expect(graph.hasVertex('urn:person:janed')).to.be.false;
        });
    });

    describe('.removeVertex', () => {
        let graph: JsonldGraph;

        beforeEach(() => {
            graph = new JsonldGraph();
            graph.createVertex('urn:person:johnd');
            graph.createVertex('urn:person:janed');
        });

        it('should remove vertex with id', () => {
            graph.removeVertex('urn:person:johnd');
            expect(graph.vertexCount).to.equal(1);
            expect(graph.hasVertex('urn:person:johnd')).to.be.false;
        });

        it('should remove vertex with reference', () => {
            const vertex = graph.getVertex('urn:person:johnd');
            graph.removeVertex(vertex);
            expect(graph.vertexCount).to.equal(1);
            expect(graph.hasVertex('urn:person:johnd')).to.be.false;
        });

        it('should remove vertex using prefixes', () => {
            graph.addPrefix('test', 'urn:person:test');
            graph.createVertex('test:personA')

            expect(graph.getVertex('test:personA')).to.be.ok;
            
            graph.removeVertex('test:personA');
            expect(graph.getVertex('test:personA')).not.to.be.ok;
        })
    });

    describe('events', () => {
        let graph: JsonldGraph;

        beforeEach(() => {
            graph = new JsonldGraph();
        });

        it('should raise vertex added event when vertex is created', (done) => {
            graph.on('vertexAdded', (vertex) => {
                expect(vertex.id).to.equal('urn:person:johnd');
                done();
            });

            graph.createVertex('urn:person:johnd');
        });

        it('should raise vertex removed event when vertex is deleted', (done) => {
            graph.on('vertexRemoved', (vertex) => {
                expect(vertex.id).to.equal('urn:person:johnd');
                done();
            });

            graph.createVertex('urn:person:johnd');
            graph.removeVertex('urn:person:johnd');
        });

        it('should raise edge added event when edge is created', (done) => {
            graph.on('edgeAdded', (edge) => {
                expect(edge.label).to.equal('urn:hr:relatedTo');
                expect(edge.fromVertex.id).to.equal('urn:person:johnd');
                expect(edge.toVertex.id).to.equal('urn:person:jilld');
                done();
            });

            graph.createVertex('urn:person:johnd').setOutgoing('urn:hr:relatedTo', 'urn:person:jilld', true);
        });

        it('should raise edge removed event when edge is deleted', (done) => {
            graph.on('edgeRemoved', (edge) => {
                expect(edge.label).to.equal('urn:hr:relatedTo');
                expect(edge.fromVertex.id).to.equal('urn:person:johnd');
                expect(edge.toVertex.id).to.equal('urn:person:jilld');
                done();
            });

            graph
                .createVertex('urn:person:johnd')
                .setOutgoing('urn:hr:relatedTo', 'urn:person:jilld', true)
                .removeOutgoing('urn:hr:relatedTo');
        });

        it('should raise edge removed events for all removed vertex edges', (done) => {
            let removeCount = 0;
            graph.on('edgeRemoved', (edge) => {
                removeCount++;
                expect(edge.label).to.equal('urn:hr:relatedTo');
                expect(edge.fromVertex.id).to.equal('urn:person:johnd');
                if (removeCount === 2) {
                    done();
                }
            });

            graph.createVertex('urn:person:johnd')
                .setOutgoing('urn:hr:relatedTo', 'urn:person:jilld', true)
                .setOutgoing('urn:hr:relatedTo', 'urn:person:janed', true)
                .setOutgoing('urn:hr:worksFor', 'urn:person:jaked', true)
                .removeOutgoing('urn:hr:relatedTo');
        });

        it('should raise vertex id changed event', (done) => {
            graph.on('vertexIdChanged', (vertex, previousId) => {
                expect(vertex.id).to.equal('urn:person:changed');
                expect(previousId).to.equal('urn:person:johnd');
                done();
            });

            graph.createVertex('urn:person:johnd').id = 'urn:person:changed';
        });
    });
});