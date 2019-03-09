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
            const vertex = graph.createVertex('upn:test');
            expect(vertex).to.be.ok;
            expect(vertex.id).to.equal('upn:test');
            expect(graph.vertexCount).to.equal(1);
        });

        it('should not create duplicate vertices', () => {
            graph.createVertex('upn:test');
            graph.createVertex('upn:test');
            expect(graph.vertexCount).to.equal(1);
        });
    });

    describe('.getEdges', () => {
        let graph: JsonldGraph;

        beforeEach(() => {
            graph = new JsonldGraph();
            graph.createVertex('upn:johnd')
                .setOutgoing('relatedTo', 'upn:janed', true)
                .setOutgoing('relatedTo', 'upn:jilld', true)
                .setOutgoing('worksFor', 'upn:jake', true);

        });

        it('should return all edges in the graph', () => {
            const edges = [...graph.getEdges()];
            expect(edges.length).to.equal(3);
            expect(edges.some(x => x.label === 'relatedTo' && x.toVertex.id === 'upn:janed')).to.be.true;
            expect(edges.some(x => x.label === 'relatedTo' && x.toVertex.id === 'upn:jilld')).to.be.true;
            expect(edges.some(x => x.label === 'worksFor' && x.toVertex.id === 'upn:jake')).to.be.true;
        });

        it('should return edges with specified label', () => {
            const edges = [...graph.getEdges('relatedTo')];
            expect(edges.length).to.equal(2);
            expect(edges.some(x => x.label === 'relatedTo' && x.toVertex.id === 'upn:janed')).to.be.true;
            expect(edges.some(x => x.label === 'relatedTo' && x.toVertex.id === 'upn:jilld')).to.be.true;
            expect(edges.some(x => x.label !== 'relatedTo')).to.be.false;
        });
    });

    describe('.getIncoming', () => {
        let graph: JsonldGraph;

        beforeEach(() => {
            graph = new JsonldGraph();
            graph.createVertex('upn:johnd')
                .setOutgoing('relatedTo', 'upn:janed', true)
                .setOutgoing('relatedTo', 'upn:jilld', true)
                .setOutgoing('worksFor', 'upn:jake', true);

            graph.getVertex('upn:janed')
                .setOutgoing('worksFor', 'upn:jake', true);

        });

        it('should return vertices with matching incoming edges', () => {
            const vertices = [...graph.getIncoming('relatedTo')];
            expect(vertices.length).to.equal(2);
            expect(vertices.some(x => x.id === 'upn:janed')).to.be.true;
            expect(vertices.some(x => x.id === 'upn:jilld')).to.be.true;
        });

        it('should return filtered vertices with matching incoming edges', () => {
            const vertices = [...graph.getIncoming('relatedTo', x => x.id.includes('janed'))];
            expect(vertices.length).to.equal(1);
            expect(vertices[0].id).to.equal('upn:janed');
        });

        it('should return unique vertices with matching incoming edges', () => {
            const vertices = [...graph.getIncoming('worksFor')];
            expect(vertices.length).to.equal(1);
            expect(vertices[0].id).to.equal('upn:jake');
        });
    });

    describe('.getOutgoing', () => {
        let graph: JsonldGraph;

        beforeEach(() => {
            graph = new JsonldGraph();
            graph.createVertex('upn:johnd')
                .setOutgoing('relatedTo', 'upn:janed', true)
                .setOutgoing('relatedTo', 'upn:jilld', true)
                .setOutgoing('worksFor', 'upn:jake', true);

            graph.getVertex('upn:janed')
                .setOutgoing('worksFor', 'upn:jake', true);

        });

        it('should return vertices with matching outgoing edges', () => {
            const vertices = [...graph.getOutgoing('worksFor')];
            expect(vertices.length).to.equal(2);
            expect(vertices.some(x => x.id === 'upn:johnd')).to.be.true;
            expect(vertices.some(x => x.id === 'upn:janed')).to.be.true;
        });

        it('should return filtered vertices with matching incoming edges', () => {
            const vertices = [...graph.getOutgoing('worksFor', x => x.id.includes('janed'))];
            expect(vertices.length).to.equal(1);
            expect(vertices[0].id).to.equal('upn:janed');
        });

        it('should return unique vertices with matching incoming edges', () => {
            const vertices = [...graph.getOutgoing('relatedTo')];
            expect(vertices.length).to.equal(1);
            expect(vertices[0].id).to.equal('upn:johnd');
        });
    });

    describe('.getVertex', () => {
        let graph: JsonldGraph;

        beforeEach(() => {
            graph = new JsonldGraph();
            graph.createVertex('upn:johnd');
        });

        it('should get vertex by id', () => {
            const vertex = graph.getVertex('upn:johnd');
            expect(vertex).to.be.ok;
            expect(vertex.id).to.equal('upn:johnd');
        });

        it('should return null when vertex doesnt not exit', () => {
            const vertex = graph.getVertex('upn:does_not_exist');
            expect(vertex).to.be.null;
        });
    });

    describe('.getVertices', () => {
        let graph: JsonldGraph;

        beforeEach(() => {
            graph = new JsonldGraph();
            graph.createVertex('upn:johnd');
            graph.createVertex('upn:janed');
        });

        it('should return all vertices in the graph', () => {
            const results = [...graph.getVertices()];
            expect(results.length).to.equal(2);
            expect(results.some(x => x.id === 'upn:johnd')).to.be.true;
            expect(results.some(x => x.id === 'upn:janed')).to.be.true;
        });

        it('should return filtered vertices', () => {
            const results = [...graph.getVertices(x => x.id.includes('john'))];
            expect(results.length).to.equal(1);
            expect(results.some(x => x.id === 'upn:johnd')).to.be.true;
            expect(results.some(x => x.id === 'upn:janed')).to.be.false;
        });
    });

    describe('.hasEdge', () => {
        let graph: JsonldGraph;

        beforeEach(() => {
            graph = new JsonldGraph();
            graph.createVertex('upn:johnd')
                .setOutgoing('relatedTo', 'upn:janed', true)
                .setIncoming('worksFor', 'upn:jilld', true);
        });

        it('should return true for existing edge', () => {
            expect(graph.hasEdge('relatedTo', 'upn:johnd', 'upn:janed')).to.be.true;
        });

        it('should return false for non-existing edge', () => {
            expect(graph.hasEdge('worksFor', 'upn:johnd', 'upn:jilld')).to.be.false;
        });
    });

    describe('.hasVertex', () => {
        let graph: JsonldGraph;

        beforeEach(() => {
            graph = new JsonldGraph();
            graph.createVertex('upn:johnd');
        });

        it('should return true when vertex exists', () => {
            expect(graph.hasVertex('upn:johnd')).to.be.true;
        });

        it('should return false when vertex does not exist', () => {
            expect(graph.hasVertex('upn:janed')).to.be.false;
        });
    });

    describe('.removeVertex', () => {
        let graph: JsonldGraph;

        beforeEach(() => {
            graph = new JsonldGraph();
            graph.createVertex('upn:johnd');
            graph.createVertex('upn:janed');
        });

        it('should remove vertex with id', () => {
            graph.removeVertex('upn:johnd');
            expect(graph.vertexCount).to.equal(1);
            expect(graph.hasVertex('upn:johnd')).to.be.false;
        });

        it('should remove vertex with reference', () => {
            const vertex = graph.getVertex('upn:johnd');
            graph.removeVertex(vertex);
            expect(graph.vertexCount).to.equal(1);
            expect(graph.hasVertex('upn:johnd')).to.be.false;
        });
    });

    describe('events', () => {
        let graph: JsonldGraph;

        beforeEach(() => {
            graph = new JsonldGraph();
        });

        it('should raise vertex added event when vertex is created', (done) => {
            graph.on('vertexAdded', (vertex) => {
                expect(vertex.id).to.equal('upn:johnd');
                done();
            });

            graph.createVertex('upn:johnd');
        });

        it('should raise vertex removed event when vertex is deleted', (done) => {
            graph.on('vertexRemoved', (vertex) => {
                expect(vertex.id).to.equal('upn:johnd');
                done();
            });

            graph.createVertex('upn:johnd');
            graph.removeVertex('upn:johnd');
        });

        it('should raise edge added event when edge is created', (done) => {
            graph.on('edgeAdded', (edge) => {
                expect(edge.label).to.equal('relatedTo');
                expect(edge.fromVertex.id).to.equal('upn:johnd');
                expect(edge.toVertex.id).to.equal('upn:jilld');
                done();
            });

            graph.createVertex('upn:johnd').setOutgoing('relatedTo', 'upn:jilld', true);
        });

        it('should raise edge removed event when edge is deleted', (done) => {
            graph.on('edgeRemoved', (edge) => {
                expect(edge.label).to.equal('relatedTo');
                expect(edge.fromVertex.id).to.equal('upn:johnd');
                expect(edge.toVertex.id).to.equal('upn:jilld');
                done();
            });

            graph
                .createVertex('upn:johnd')
                .setOutgoing('relatedTo', 'upn:jilld', true)
                .removeOutgoing('relatedTo');
        });

        it('should raise edge removed events for all removed vertex edges', (done) => {
            let removeCount = 0;
            graph.on('edgeRemoved', (edge) => {
                removeCount++;
                expect(edge.label).to.equal('relatedTo');
                expect(edge.fromVertex.id).to.equal('upn:johnd');
                if (removeCount === 2) {
                    done();
                }
            });

            graph.createVertex('upn:johnd')
                .setOutgoing('relatedTo', 'upn:jilld', true)
                .setOutgoing('relatedTo', 'upn:janed', true)
                .setOutgoing('worksFor', 'upn:jaked', true)
                .removeOutgoing('relatedTo');
        });

        it('should raise vertex id changed event', (done) => {
            graph.on('vertexIdChanged', (vertex, previousId) => {
                expect(vertex.id).to.equal('upn:changed');
                expect(previousId).to.equal('upn:johnd');
                done();
            });

            graph.createVertex('upn:johnd').id = 'upn:changed';
        });
    });
});