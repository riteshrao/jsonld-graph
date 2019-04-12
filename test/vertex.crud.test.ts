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
            vertex = graph.createVertex('urn:person:johnd');
            vertex
                .addAttributeValue('urn:hr:firstName', 'John')
                .addAttributeValue('urn:hr:lastName', 'Doe')
                .setOutgoing('urn:hr:relatedTo', 'urn:person:jilld', true)
                .setOutgoing('urn:hr:relatedTo', 'urn:person:janed', true)
                .setIncoming('urn:hr:worksFor', 'urn:person:jaked', true)
                .setIncoming('urn:hr:worksFor', 'urn:person:jimmyd', true);

            vertex.id = 'urn:person:changed';
        });

        it('should have changed id', () => {
            expect(vertex.id).to.equal('urn:person:changed');
        });

        it('should have updated outgoing references', () => {
            const outgoing = [...vertex.getOutgoing('urn:hr:relatedTo')];
            expect(outgoing.length).to.equal(2);
            expect(outgoing.some(x => x.toVertex.id === 'urn:person:jilld')).to.be.true;
            expect(outgoing.some(x => x.toVertex.id === 'urn:person:janed')).to.be.true;
        });

        it('should have updated incoming references', () => {
            const incoming = [...vertex.getIncoming('urn:hr:worksFor')];
            expect(incoming.length).to.equal(2);
            expect(incoming.some(x => x.fromVertex.id === 'urn:person:jaked')).to.be.true;
            expect(incoming.some(x => x.fromVertex.id === 'urn:person:jimmyd')).to.be.true;
        });

        it('should retain attributes', () => {
            expect(vertex.hasAttributeValue('urn:hr:firstName', 'John')).to.be.true;
            expect(vertex.hasAttributeValue('urn:hr:lastName', 'Doe')).to.be.true;
        });
    });

    describe('.isBlankNode', () => {
        it('should return true for blank node id', () => {
            expect(graph.createVertex(`${BlankNodePrefix}-test`).isBlankNode).to.be.true;
        });

        it('should return false for non-blank node id', () => {
            expect(graph.createVertex('urn:person:johnd').isBlankNode).to.be.false;
        });
    });

    describe('.instances', () => {
        beforeEach(() => {
            graph.createVertex('urn:hr:class')
                .setIncoming(JsonldKeywords.type, 'urn:instances:instanceA', true)
                .setIncoming(JsonldKeywords.type, 'urn:instances:instanceB', true);
        });

        it('should return all instances of class', () => {
            const instances = [...graph.getVertex('urn:hr:class').instances];
            expect(instances.length).to.equal(2);
            expect(instances.some(x => x.id === 'urn:instances:instanceA')).to.be.true;
            expect(instances.some(x => x.id === 'urn:instances:instanceB')).to.be.true;
        });

        it('should return empty for no instances', () => {
            const instances = [...graph.getVertex('urn:instances:instanceA').instances];
            expect(instances.length).to.equal(0);
        });
    });

    describe('.types', () => {
        beforeEach(() => {
            graph.createVertex('urn:instances:instanceA')
                .setOutgoing(JsonldKeywords.type, 'urn:classes:classA', true)
                .setOutgoing(JsonldKeywords.type, 'urn:classes:classB', true);
        });

        it('should get all types of instance', () => {
            const types = [...graph.getVertex('urn:instances:instanceA').types];
            expect(types.length).to.equal(2);
            expect(types.some(x => x.id === 'urn:classes:classA')).to.be.true;
            expect(types.some(x => x.id === 'urn:classes:classB')).to.be.true;
        });
    });

    describe('.metadata', () => {
        beforeEach(() => {
            graph.createVertex('urn:instances:instanceA');
        });

        it('should allow storing and retrieving arbitrary metadata', () => {
            const vertex = graph.getVertex('urn:instances:instanceA');
            vertex.metadata.foo = 'test';
            expect(vertex.metadata.foo).to.equal('test');
            expect(graph.getVertex('urn:instances:instanceA').metadata.foo).to.equal('test');
        });
    });

    describe('.attributes', () => {
        beforeEach(() => {
            graph.createVertex('urn:person:johnd')
                .addAttributeValue('urn:entity:firstName', 'John')
                .addAttributeValue('urn:entity:lastName', 'Doe');
        });

        it('should get all attributes of vertex', () => {
            const attributes = [...graph.getVertex('urn:person:johnd').attributes];
            expect(attributes.length).to.equal(2);
            expect(attributes.some(([name, value]) => name === 'urn:entity:firstName' && value === 'John')).to.be.true;
            expect(attributes.some(([name, value]) => name === 'urn:entity:lastName' && value === 'Doe')).to.be.true;
        });
    });

    describe('.addAttributeValue', () => {
        let vertex: Vertex;

        beforeEach(() => {
            vertex = graph.createVertex('urn:person:johnd');
        });

        it('should be able to add attribute value', () => {
            vertex.addAttributeValue('urn:entity:firstName', 'John');
            expect(vertex.getAttributeValue('urn:entity:firstName')).to.equal('John');
        });

        it('should append to existing values', () => {
            vertex
                .addAttributeValue('urn:entity:firstName', 'John')
                .addAttributeValue('urn:entity:firstName', 'test');

            expect(vertex.getAttributeValue<string[]>('urn:entity:firstName').length).to.equal(2);
            expect(vertex.getAttributeValue<string[]>('urn:entity:firstName').some(x => x === 'John')).to.be.true;
            expect(vertex.getAttributeValue<string[]>('urn:entity:firstName').some(x => x === 'test')).to.be.true;
        });
    });

    describe('.deleteAttributeValue', () => {
        it('should delete attribute', () => {
            const vertex = graph.createVertex('urn:person:johnd');
            vertex
                .addAttributeValue('urn:entity:firstName', 'John')
                .addAttributeValue('urn:entity:firstName', 'doe');

            vertex.deleteAttribute('urn:entity:firstName');
            expect(vertex.getAttributeValue('urn:entity:firstName')).to.be.undefined;
        });
    });

    describe('.hasAttribute', () => {
        it('should return true for defined attributes', () => {
            const vertex = graph.createVertex('urn:person:johnd');
            vertex.addAttributeValue('urn:entity:firstName', 'John');
            expect(vertex.hasAttribute('urn:entity:firstName')).to.be.true;
        });

        it('should return for undefined attribute', () => {
            const vertex = graph.createVertex('urn:person:johnd');
            expect(vertex.hasAttribute('urn:entity:firstName')).to.be.false;
        });
    });

    describe('hasAttributeValue', () => {
        it('should return true when attribute value matches', () => {
            const vertex = graph.createVertex('urn:person:johnd');
            vertex.addAttributeValue('urn:entity:firstName', 'John');

            expect(vertex.hasAttributeValue('urn:entity:firstName', 'John')).to.be.true;
        });

        it('should return true when attribute contains value', () => {
            const vertex = graph.createVertex('urn:person:johnd');
            vertex.addAttributeValue('urn:entity:firstName', 'John');
            vertex.addAttributeValue('urn:entity:firstName', 'john');

            expect(vertex.hasAttributeValue('urn:entity:firstName', 'John')).to.be.true;
            expect(vertex.hasAttributeValue('urn:entity:firstName', 'john')).to.be.true;
        });

        it('should return false when attribute value does not match', () => {
            const vertex = graph.createVertex('urn:person:johnd');
            vertex.addAttributeValue('urn:entity:firstName', 'John');

            expect(vertex.hasAttributeValue('urn:entity:firstName', 'john')).to.be.false;
        });

        it('should return false when attribute does not contains value', () => {
            const vertex = graph.createVertex('urn:person:johnd');
            vertex.addAttributeValue('urn:entity:firstName', 'John');
            vertex.addAttributeValue('urn:entity:firstName', 'john');

            expect(vertex.hasAttributeValue('urn:entity:firstName', '_john_')).to.be.false;
        });
    });

    describe('.removeAttributeValue', () => {
        it('should remove value from list', () => {
            const vertex = graph.createVertex('urn:person:johnd');
            vertex.addAttributeValue('urn:entity:firstName', 'John');
            vertex.addAttributeValue('urn:entity:firstName', 'jj');
            expect(vertex.getAttributeValue('urn:entity:firstName')).to.be.instanceOf(Array);
            expect(vertex.getAttributeValue<string[]>('urn:entity:firstName').length).to.equal(2);

            vertex.removeAttributeValue('urn:entity:firstName', 'jj');
            expect(vertex.getAttributeValue('urn:entity:firstName')).to.not.be.instanceOf(Array);
            expect(vertex.getAttributeValue('urn:entity:firstName')).to.equal('John');
        });

        it('should delete attribute value when all values are removed', () => {
            const vertex = graph.createVertex('urn:person:johnd');
            vertex.addAttributeValue('urn:entity:firstName', 'John');
            vertex.addAttributeValue('urn:entity:firstName', 'jj');
            expect(vertex.getAttributeValue('urn:entity:firstName')).to.be.instanceOf(Array);
            expect(vertex.getAttributeValue<string[]>('urn:entity:firstName').length).to.equal(2);

            vertex.removeAttributeValue('urn:entity:firstName', 'John');
            vertex.removeAttributeValue('urn:entity:firstName', 'jj');

            expect(vertex.hasAttribute('urn:entity:firstName')).to.be.false;
        });

        it('should convert array to bare value when only one value remains', () => {
            const vertex = graph.createVertex('urn:person:johnd');
            vertex.addAttributeValue('urn:entity:firstName', 'John');
            vertex.addAttributeValue('urn:entity:firstName', 'jj');
            expect(vertex.getAttributeValue('urn:entity:firstName')).to.be.instanceOf(Array);

            vertex.removeAttributeValue('urn:entity:firstName', 'jj');
            expect(vertex.getAttributeValue('urn:entity.firstName')).not.to.be.instanceOf(Array);
        });

        it('should delete attribute when value is removed', () => {
            const vertex = graph.createVertex('urn:person:johnd');
            vertex.addAttributeValue('urn:person:johnd', 'John');
            expect(vertex.hasAttribute('urn:person:johnd')).to.be.true;

            vertex.removeAttributeValue('urn:person:johnd', 'John');
            expect(vertex.hasAttribute('urn:person:johnd')).to.be.false;
        });
    });

    describe('.replaceAttributeValue', () => {
        it('should replace existing value', () => {
            const vertex = graph.createVertex('urn:person:johnd');
            vertex.addAttributeValue('urn:entity:firstName', 'John');
            vertex.replaceAttributeValue('urn:entity:firstName', 'test');
            expect(vertex.getAttributeValue('urn:entity:firstName')).to.equal('test');
        });
    });

    describe('.getOutgoing', () => {
        beforeEach(() => {
            graph.createVertex('urn:person:johnd')
                .setOutgoing('urn:hr:relatedTo', 'urn:person:jilld', true)
                .setOutgoing('urn:hr:relatedTo', 'urn:person:janed', true)
                .setOutgoing('urn:hr:worksFor', 'urn:person:jaked', true);

            graph.getVertex('urn:person:jilld').addAttributeValue('urn:hr:livesAt', 'WA');
            graph.getVertex('urn:person:janed').addAttributeValue('urn:hr:livesAt', 'CA');
        });

        it('should be able to get all outgoing vertices', () => {
            const outgoing = [...graph.getVertex('urn:person:johnd').getOutgoing()];
            expect(outgoing.length).to.equal(3);
            expect(outgoing.some(x => x.label === 'urn:hr:relatedTo' && x.toVertex.id === 'urn:person:jilld'));
            expect(outgoing.some(x => x.label === 'urn:hr:relatedTo' && x.toVertex.id === 'urn:person:janed'));
            expect(outgoing.some(x => x.label === 'urn:hr:worksFor' && x.toVertex.id === 'urn:person:jaked'));
        });

        it('should be able to get filtered outgoing vertices matching edge label', () => {
            const outgoing = [...graph.getVertex('urn:person:johnd').getOutgoing('urn:hr:relatedTo')];
            expect(outgoing.length).to.equal(2);
            expect(outgoing.some(x => x.label === 'urn:hr:relatedTo' && x.toVertex.id === 'urn:person:jilld'));
            expect(outgoing.some(x => x.label === 'urn:hr:relatedTo' && x.toVertex.id === 'urn:person:janed'));
        });
    });

    describe('.getIncoming', () => {
        beforeEach(() => {
            graph.createVertex('urn:person:johnd')
                .setIncoming('urn:hr:relatedTo', 'urn:person:jilld', true)
                .setIncoming('urn:hr:relatedTo', 'urn:person:janed', true)
                .setIncoming('urn:hr:worksFor', 'urn:person:jaked', true);

            graph.getVertex('urn:person:jilld').addAttributeValue('urn:hr:livesAt', 'WA');
            graph.getVertex('urn:person:janed').addAttributeValue('urn:hr:livesAt', 'CA');
        });

        it('should be able to get all outgoing vertices', () => {
            const outgoing = [...graph.getVertex('urn:person:johnd').getIncoming()];
            expect(outgoing.length).to.equal(3);
            expect(outgoing.some(x => x.label === 'urn:hr:relatedTo' && x.fromVertex.id === 'urn:person:jilld'));
            expect(outgoing.some(x => x.label === 'urn:hr:relatedTo' && x.fromVertex.id === 'urn:person:janed'));
            expect(outgoing.some(x => x.label === 'urn:hr:worksFor' && x.fromVertex.id === 'urn:person:jaked'));
        });

        it('should be able to get filtered outgoing vertices matching edge label', () => {
            const outgoing = [...graph.getVertex('urn:person:johnd').getIncoming('urn:hr:relatedTo')];
            expect(outgoing.length).to.equal(2);
            expect(outgoing.some(x => x.label === 'urn:hr:relatedTo' && x.fromVertex.id === 'urn:person:jilld'));
            expect(outgoing.some(x => x.label === 'urn:hr:relatedTo' && x.fromVertex.id === 'urn:person:janed'));
        });
    });
});