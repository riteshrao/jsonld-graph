// tslint:disable-next-line:no-import-side-effect
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
            graph
                .createVertex('urn:hr:class')
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
            graph
                .createVertex('urn:instances:instanceA')
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
            graph
                .createVertex('urn:person:johnd')
                .addAttributeValue('urn:entity:firstName', 'John')
                .addAttributeValue('urn:entity:firstName', 'ååron', 'fr')
                .addAttributeValue('urn:entity:lastName', 'Doe');
        });

        it('should get all attributes of vertex', () => {
            const attributes = [...graph.getVertex('urn:person:johnd').attributes];

            const [, firstNameValues] = attributes.find(([key]) => key === 'urn:entity:firstName');
            expect(firstNameValues.length).to.equal(2);
            expect(firstNameValues[0].value).to.equal('John');
            expect(firstNameValues[0].language).to.be.undefined;
            expect(firstNameValues[1].value).to.equal('ååron');
            expect(firstNameValues[1].language).to.equal('fr');
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

        it('should be able to add localized attribute values', () => {
            vertex.addAttributeValue('urn:entity:firstName', 'John', 'en');
            vertex.addAttributeValue('urn:entity:firstName', 'Jåke', 'fr');
            expect(vertex.getAttributeValues('urn:entity:firstName').length).to.equal(2);
            expect(vertex.getAttributeValues('urn:entity:firstName').some(x => x.language === 'en')).to.equal(true);
        });

        it('should append to existing values', () => {
            vertex.addAttributeValue('urn:entity:firstName', 'John').addAttributeValue('urn:entity:firstName', 'test');

            expect(vertex.getAttributeValues<string>('urn:entity:firstName').length).to.equal(2);
            expect(vertex.getAttributeValues<string>('urn:entity:firstName').some(x => x.value === 'John')).to.be.true;
            expect(vertex.getAttributeValues<string>('urn:entity:firstName').some(x => x.value === 'test')).to.be.true;
        });

        it('should only retain one localized value', () => {
            vertex.addAttributeValue('urn:entity:firstName', 'John', 'en');
            vertex.addAttributeValue('urn:entity:firstName', 'Jake', 'en');
            expect(vertex.getAttributeValues('urn:entity:firstName').length).to.equal(1);
            expect(vertex.getAttributeValues('urn:entity:firstName')[0].language).to.equal('en');
            expect(vertex.getAttributeValues('urn:entity:firstName')[0].value).to.equal('Jake');
        });
    });

    describe('.deleteAttribute', () => {
        let vertex: Vertex;

        beforeEach(() => {
            vertex = graph.createVertex('urn:person:johnd');
            vertex
                .addAttributeValue('urn:entity:firstName', 'Jake')
                .addAttributeValue('urn:entity:firstName', 'Jåke', 'fr');
        });

        it('should delete attribute and all its values', () => {
            vertex.deleteAttribute('urn:entity:firstName');
            expect(vertex.attributes.count()).to.equal(0);
        });

        it('should delete language specific value', () => {
            vertex.deleteAttribute('urn:entity:firstName', 'fr');
            expect(vertex.attributes.count()).to.equal(1);
            expect(vertex.getAttributeValue('urn:entity:firstName')).to.equal('Jake');
            expect(vertex.hasAttributeValue('urn:entity:firstName', 'Jåke')).to.equal(false);
            expect(vertex.getAttributeValues('urn:entity:firstName').length).to.equal(1);
        });
    });

    describe('.getAttributeValue', () => {
        let vertex: Vertex;

        beforeEach(() => {
            vertex = graph.createVertex('urn:person:johnd');
            vertex
                .addAttributeValue('urn:entity:name', 'John Doe')
                .addAttributeValue('urn:entity:title', 'Manager')
                .addAttributeValue('urn:entity:title', 'Månager', 'fr')
                .addAttributeValue('urn:entity:title', 'Menedzser', 'hr')
                .addAttributeValue('urn:entity:address', '123 Sunny Lane')
                .addAttributeValue('urn:entity:address', '234 Foo bar');
        });

        it('should get value for single attribute value', () => {
            expect(vertex.getAttributeValue('urn:entity:name')).to.equal('John Doe');
        });

        it('should get first value for multi language attribute value', () => {
            expect(vertex.getAttributeValue('urn:entity:title')).to.equal('Manager');
        });

        it('should get specific language value for attribute', () => {
            expect(vertex.getAttributeValue('urn:entity:title', 'fr')).to.equal('Månager');
            expect(vertex.getAttributeValue('urn:entity:title', 'hr')).to.equal('Menedzser');
        });
    });

    describe('.hasAttribute', () => {
        let vertex: Vertex;

        beforeEach(() => {
            vertex = graph.createVertex('urn:person:johnd');
        });

        it('should return true for defined attributes', () => {
            vertex.addAttributeValue('urn:entity:firstName', 'John');
            expect(vertex.hasAttribute('urn:entity:firstName')).to.be.true;
        });

        it('should return for undefined attribute', () => {
            expect(vertex.hasAttribute('urn:entity:firstName')).to.be.false;
        });
    });

    describe('hasAttributeValue', () => {
        let vertex: Vertex;

        beforeEach(() => {
            vertex = graph.createVertex('urn:person:johnd');
        });
        it('should return true when attribute value matches', () => {
            vertex.addAttributeValue('urn:entity:firstName', 'John');

            expect(vertex.hasAttributeValue('urn:entity:firstName', 'John')).to.be.true;
        });

        it('should return true when attribute contains value', () => {
            vertex.addAttributeValue('urn:entity:firstName', 'John');
            vertex.addAttributeValue('urn:entity:firstName', 'john');

            expect(vertex.hasAttributeValue('urn:entity:firstName', 'John')).to.be.true;
            expect(vertex.hasAttributeValue('urn:entity:firstName', 'john')).to.be.true;
        });

        it('should return false when attribute value does not match', () => {
            vertex.addAttributeValue('urn:entity:firstName', 'John');

            expect(vertex.hasAttributeValue('urn:entity:firstName', 'john')).to.be.false;
        });

        it('should return false when attribute does not contains value', () => {
            vertex.addAttributeValue('urn:entity:firstName', 'John');
            vertex.addAttributeValue('urn:entity:firstName', 'john');

            expect(vertex.hasAttributeValue('urn:entity:firstName', '_john_')).to.be.false;
        });

        it('should return true when attribute contains localized value', () => {
            vertex.addAttributeValue('urn:entity:title', 'Manager', 'en');
            vertex.addAttributeValue('urn:entity:title', 'Månager', 'fr');

            expect(vertex.hasAttributeValue('urn:entity:title', 'Manager')).to.be.true;
            expect(vertex.hasAttributeValue('urn:entity:title', 'Månager')).to.be.true;
        });

        it('should return false when localized attribute value does not match', () => {
            vertex.addAttributeValue('urn:entity:title', 'Manager', 'en');
            vertex.addAttributeValue('urn:entity:title', 'Månager', 'fr');
            expect(vertex.hasAttributeValue('urn:entity:title', 'Månager', 'en')).to.be.false;
        });

        it('should return false when localized attribute value does not exist', () => {
            vertex.addAttributeValue('urn:entity:title', 'Manager', 'en');
            expect(vertex.hasAttributeValue('urn:entity:title', 'Manager', 'fr')).to.be.false;
        });
    });

    describe('.removeAttributeValue', () => {
        let vertex: Vertex;

        beforeEach(() => {
            vertex = graph.createVertex('urn:person:johnd');
        });

        it('should remove value from list', () => {
            vertex.addAttributeValue('urn:entity:firstName', 'John');
            vertex.addAttributeValue('urn:entity:firstName', 'jj');

            expect(vertex.getAttributeValues('urn:entity:firstName').length).to.equal(2);
            expect(vertex.getAttributeValues('urn:entity:firstName').length).to.equal(2);

            vertex.removeAttributeValue('urn:entity:firstName', 'jj');
            expect(vertex.getAttributeValues('urn:entity:firstName').length).to.equal(1);
            expect(vertex.getAttributeValue('urn:entity:firstName')).to.equal('John');
        });

        it('should delete attribute value when all values are removed', () => {
            vertex.addAttributeValue('urn:entity:firstName', 'John');
            vertex.addAttributeValue('urn:entity:firstName', 'jj');
            expect(vertex.getAttributeValues('urn:entity:firstName').length).to.equal(2);

            vertex.removeAttributeValue('urn:entity:firstName', 'John');
            vertex.removeAttributeValue('urn:entity:firstName', 'jj');

            expect(vertex.hasAttribute('urn:entity:firstName')).to.be.false;
        });

        it('should remove all occurrences of attribute value', () => {
            vertex.addAttributeValue('urn:entity:title', 'Manager', 'en');
            vertex.addAttributeValue('urn:entity:title', 'Manager', 'fr');
            vertex.addAttributeValue('urn:entity:title', 'Manager');
            vertex.addAttributeValue('urn:entity:title', 'Foo');

            vertex.removeAttributeValue('urn:entity:title', 'Manager');
            expect(vertex.getAttributeValues('urn:entity:title').length).to.equal(1);
            expect(vertex.getAttributeValue('urn:entity:title')).to.equal('Foo');
        });
    });

    describe('.replaceAttributeValue', () => {
        let vertex: Vertex;

        beforeEach(() => {
            vertex = graph.createVertex('urn:person:johnd');
        });

        it('should replace existing value', () => {
            vertex.addAttributeValue('urn:entity:firstName', 'John');
            vertex.replaceAttributeValue('urn:entity:firstName', 'test');
            expect(vertex.getAttributeValue('urn:entity:firstName')).to.equal('test');
        });

        it('should replace localized value', () => {
            vertex.addAttributeValue('urn:entity:title', 'Manager');
            vertex.addAttributeValue('urn:entity:title', 'Manager', 'en');
            vertex.addAttributeValue('urn:entity:title', 'Manager', 'fr');

            vertex.replaceAttributeValue('urn:entity:title', 'Månager', 'fr');
            const values = vertex.getAttributeValues('urn:entity:title');
            expect(values.length).to.equal(3);
            expect(values.some(x => x.language === 'fr' && x.value === 'Månager')).to.be.true;
            expect(values.some(x => x.language === 'en' && x.value === 'Manager')).to.be.true;
        });
    });

    describe('.getOutgoing', () => {
        beforeEach(() => {
            graph
                .createVertex('urn:person:johnd')
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
            graph
                .createVertex('urn:person:johnd')
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
