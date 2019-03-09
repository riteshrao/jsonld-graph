import 'mocha';
import { expect } from 'chai';

import { JsonldGraph, Vertex, JsonldKeywords, BlankNodePrefix } from '../src';

describe('vertex', () => {
    let graph: JsonldGraph;

    beforeEach(() => {
        graph = new JsonldGraph();
    });

    describe('setting id', () => {
        let vertex: Vertex;

        beforeEach(() => {
            vertex = graph.createVertex('upn:johnd');
            vertex
                .setOutgoing('relatedTo', 'upn:jilld', true)
                .setOutgoing('relatedTo', 'upn:janed', true)
                .setIncoming('worksFor', 'upn:jaked', true)
                .setIncoming('worksFor', 'upn:jimmyd', true);

            vertex.id = 'upn:changed';
        });

        it('should have changed id', () => {
            expect(vertex.id).to.equal('upn:changed');
        });

        it('should have updated outgoing references', () => {
            const outgoing = [...vertex.getOutgoing('relatedTo')];
            expect(outgoing.length).to.equal(2);
            expect(outgoing.some(x => x.toVertex.id === 'upn:jilld')).to.be.true;
            expect(outgoing.some(x => x.toVertex.id === 'upn:janed')).to.be.true;
        });

        it('should have updated incoming references', () => {
            const incoming = [...vertex.getIncoming('worksFor')];
            expect(incoming.length).to.equal(2);
            expect(incoming.some(x => x.fromVertex.id === 'upn:jaked')).to.be.true;
            expect(incoming.some(x => x.fromVertex.id === 'upn:jimmyd')).to.be.true;
        });
    });

    describe('.isBlankNode', () => {
        it('should return true for blank node id', () => {
            expect(graph.createVertex(`${BlankNodePrefix}-test`).isBlankNode).to.be.true;
        });

        it('should return false for non-blank node id', () => {
            expect(graph.createVertex('upn:johnd').isBlankNode).to.be.false;
        });
    });

    describe('.instances', () => {
        beforeEach(() => {
            graph.createVertex('upn:class')
                .setIncoming(JsonldKeywords.type, 'instanceA', true)
                .setIncoming(JsonldKeywords.type, 'instanceB', true);
        });

        it('should return all instances of class', () => {
            const instances = [...graph.getVertex('upn:class').instances];
            expect(instances.length).to.equal(2);
            expect(instances.some(x => x.id === 'instanceA')).to.be.true;
            expect(instances.some(x => x.id === 'instanceB')).to.be.true;
        });

        it('should return empty for no instances', () => {
            const instances = [...graph.getVertex('instanceA').instances];
            expect(instances.length).to.equal(0);
        });
    });

    describe('.types', () => {
        beforeEach(() => {
            graph.createVertex('upn:instance')
                .setOutgoing(JsonldKeywords.type, 'upn:classA', true)
                .setOutgoing(JsonldKeywords.type, 'upn:classB', true);
        });

        it('should get all types of instance', () => {
            const types = [...graph.getVertex('upn:instance').types];
            expect(types.length).to.equal(2);
            expect(types.some(x => x.id === 'upn:classA')).to.be.true;
            expect(types.some(x => x.id === 'upn:classB')).to.be.true;
        });
    });

    describe('.attributes', () => {
        beforeEach(() => {
            graph.createVertex('upn:johnd')
                .addAttributeValue('firstName', 'John')
                .addAttributeValue('lastName', 'Doe');
        });

        it('should get all attributes of vertex', () => {
            const attributes = [...graph.getVertex('upn:johnd').attributes];
            expect(attributes.length).to.equal(2);
            expect(attributes.some(([name, value]) => name === 'firstName' && value === 'John')).to.be.true;
            expect(attributes.some(([name, value]) => name === 'lastName' && value === 'Doe')).to.be.true;
        });
    });

    describe('.addAttributeValue', () => {
        let vertex: Vertex;

        beforeEach(() => {
            vertex = graph.createVertex('upn:johnd');
        });

        it('should be able to add attribute value', () => {
            vertex.addAttributeValue('firstName', 'John');
            expect(vertex.getAttributeValue('firstName')).to.equal('John');
        });

        it('should append to existing values', () => {
            vertex
                .addAttributeValue('firstName', 'John')
                .addAttributeValue('firstName', 'test');

            expect(vertex.getAttributeValue<string[]>('firstName').length).to.equal(2);
            expect(vertex.getAttributeValue<string[]>('firstName').some(x => x === 'John')).to.be.true;
            expect(vertex.getAttributeValue<string[]>('firstName').some(x => x === 'test')).to.be.true;
        });
    });

    describe('.deleteAttributeValue', () => {
        it('should delete attribute', () => {
            const vertex = graph.createVertex('upn:johnd');
            vertex
                .addAttributeValue('firstName', 'John')
                .addAttributeValue('firstName', 'doe');

            vertex.deleteAttribute('firstName');
            expect(vertex.getAttributeValue('firstName')).to.be.undefined;
        });
    });

    describe('.hasAttribute', () => {
        it('should return true for defined attributes', () => {
            const vertex = graph.createVertex('upn:johnd');
            vertex.addAttributeValue('firstName', 'John');
            expect(vertex.hasAttribute('firstName')).to.be.true;
        });

        it('should return for undefined attribute', () => {
            const vertex = graph.createVertex('upn:johnd');
            expect(vertex.hasAttribute('firstName')).to.be.false;
        });
    });

    describe('.replaceAttributeValue', () => {
        it('should replace existing value', () => {
            const vertex = graph.createVertex('upn:johnd');
            vertex.addAttributeValue('firstName', 'John');
            vertex.replaceAttributeValue('firstName', 'test');
            expect(vertex.getAttributeValue('firstName')).to.equal('test');
        });
    });

    describe('.getOutgoing', () => {
        beforeEach(() => {
            graph.createVertex('upn:johnd')
                .setOutgoing('relatedTo', 'upn:jilld', true)
                .setOutgoing('relatedTo', 'upn:janed', true)
                .setOutgoing('worksFor', 'upn:jaked', true);

            graph.getVertex('upn:jilld').addAttributeValue('livesAt', 'WA');
            graph.getVertex('upn:janed').addAttributeValue('livesAt', 'CA');
        });

        it('should be able to get all outgoing vertices', () => {
            const outgoing = [...graph.getVertex('upn:johnd').getOutgoing()];
            expect(outgoing.length).to.equal(3);
            expect(outgoing.some(x => x.label === 'relatedTo' && x.toVertex.id === 'upn:jilld'));
            expect(outgoing.some(x => x.label === 'relatedTo' && x.toVertex.id === 'upn:janed'));
            expect(outgoing.some(x => x.label === 'worksFor' && x.toVertex.id === 'upn:jaked'));
        });

        it('should be able to get filtered outgoing vertices matching edge label', () => {
            const outgoing = [...graph.getVertex('upn:johnd').getOutgoing('relatedTo')];
            expect(outgoing.length).to.equal(2);
            expect(outgoing.some(x => x.label === 'relatedTo' && x.toVertex.id === 'upn:jilld'));
            expect(outgoing.some(x => x.label === 'relatedTo' && x.toVertex.id === 'upn:janed'));
        });
    });

    describe('.getIncoming', () => {
        beforeEach(() => {
            graph.createVertex('upn:johnd')
                .setIncoming('relatedTo', 'upn:jilld', true)
                .setIncoming('relatedTo', 'upn:janed', true)
                .setIncoming('worksFor', 'upn:jaked', true);

            graph.getVertex('upn:jilld').addAttributeValue('livesAt', 'WA');
            graph.getVertex('upn:janed').addAttributeValue('livesAt', 'CA');
        });

        it('should be able to get all outgoing vertices', () => {
            const outgoing = [...graph.getVertex('upn:johnd').getIncoming()];
            expect(outgoing.length).to.equal(3);
            expect(outgoing.some(x => x.label === 'relatedTo' && x.fromVertex.id === 'upn:jilld'));
            expect(outgoing.some(x => x.label === 'relatedTo' && x.fromVertex.id === 'upn:janed'));
            expect(outgoing.some(x => x.label === 'worksFor' && x.fromVertex.id === 'upn:jaked'));
        });

        it('should be able to get filtered outgoing vertices matching edge label', () => {
            const outgoing = [...graph.getVertex('upn:johnd').getIncoming('relatedTo')];
            expect(outgoing.length).to.equal(2);
            expect(outgoing.some(x => x.label === 'relatedTo' && x.fromVertex.id === 'upn:jilld'));
            expect(outgoing.some(x => x.label === 'relatedTo' && x.fromVertex.id === 'upn:janed'));
        });
    });
});