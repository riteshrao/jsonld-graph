// tslint:disable-next-line:no-import-side-effect
import 'mocha';
import { expect } from 'chai';
import { JsonldGraph } from '../src';

describe('JSON formatting', () => {
    describe('expanded graph', () => {
        let graph: JsonldGraph;
        let context: any;

        before(() => {
            context = {
                '@context': {
                    '@vocab': 'http://test/classes/',
                    firstName: 'Entity/firstName',
                    lastName: 'Entity/lastName',
                    relatedTo: { '@id': 'Entity/relatedTo', '@type': '@id' },
                    worksFor: { '@id': 'Entity/worksFor', '@type': '@id' },
                    title: { '@id': 'Entity/title', '@container': '@language' }
                }
            };

            graph = new JsonldGraph();
            graph.addContext('http://persons/context.json', context);
            graph
                .createVertex('http://persons/johnd')
                .setType('http://test/classes/Person', 'http://test/classes/Manager')
                .addAttributeValue('http://test/classes/Entity/firstName', 'John')
                .addAttributeValue('http://test/classes/Entity/lastName', 'Doe')
                .addAttributeValue('http://test/classes/Entity/title', 'Manager', 'en')
                .addAttributeValue('http://test/classes/Entity/title', 'Månager', 'fr')
                .setOutgoing('http://test/classes/Entity/relatedTo', 'http://persons/janed', true)
                .setIncoming('http://test/classes/Entity/worksFor', 'http://persons/jaked', true);

            graph
                .createVertex('http://persons/janed')
                .setType('http://test/classes/Person', 'http://test/classes/Employee')
                .addAttributeValue('http://test/classes/Entity/firstName', 'Jane')
                .addAttributeValue('http://test/classes/Entity/lastName', 'Doe')
                .setOutgoing('http://test/classes/Entity/worksFor', 'http://persons/jilld', true);

            graph
                .createVertex('http://persons/jilld')
                .setType('http://test/classes/Person', 'http://test/classes/Manager')
                .addAttributeValue('http://test/classes/Entity/firstName', 'Jill')
                .addAttributeValue('http://test/classes/Entity/lastName', 'Doe')
                .setIncoming('http://test/classes/Entity/relatedTo', 'http://persons/johnd');

            graph
                .createVertex('http://persons/jaked')
                .setType('http://test/classes/Person')
                .addAttributeValue('http://test/classes/Entity/firstName', 'Jake')
                .addAttributeValue('http://test/classes/Entity/lastName', 'Doe');
        });

        it('should format the full graph', async () => {
            const json = await graph.toJson({
                context: 'http://persons/context.json'
            });

            validateFullGraph(json);
        });

        it('should format framed graph', async () => {
            const json = await graph.toJson({
                context: 'http://persons/context.json',
                frame: {
                    '@type': 'Person',
                    relatedTo: {
                        '@embed': '@always',
                        '@type': 'Person',
                        worksFor: {
                            '@embed': '@never'
                        }
                    },
                    worksFor: {
                        '@embed': '@never'
                    }
                }
            });

            validateFramedGraph(json);
        });

        it('should format vertex', async () => {
            const json = await graph
                .getVertex('http://persons/johnd')
                .toJson({ context: 'http://persons/context.json' });

            validateVertex(json);
        });

        it('should format framed vertex', async () => {
            const json = await graph.getVertex('http://persons/johnd').toJson({
                context: 'http://persons/context.json',
                frame: {
                    relatedTo: {
                        '@embed': '@never'
                    },
                    worksFor: {
                        '@embed': '@never'
                    }
                }
            });

            validateFramedVertex(json);
        });
    });

    describe('compact graph', () => {
        let graph: JsonldGraph;
        let context: any;

        before(() => {
            context = {
                '@context': {
                    '@vocab': 'http://test/classes/',
                    firstName: 'Entity/firstName',
                    lastName: 'Entity/lastName',
                    relatedTo: { '@id': 'Entity/relatedTo', '@type': '@id' },
                    worksFor: { '@id': 'Entity/worksFor', '@type': '@id' },
                    title: { '@id': 'Entity/title', '@container': '@language' }
                }
            };

            graph = new JsonldGraph();
            graph.addPrefix('vocab', 'http://test/classes');
            graph.addPrefix('persons', 'http://persons');
            graph.addContext('http://persons/context.json', context);

            graph
                .createVertex('persons:johnd')
                .setType('vocab:Person', 'vocab:Manager')
                .addAttributeValue('vocab:Entity/firstName', 'John')
                .addAttributeValue('vocab:Entity/lastName', 'Doe')
                .addAttributeValue('vocab:Entity/title', 'Manager', 'en')
                .addAttributeValue('vocab:Entity/title', 'Månager', 'fr')
                .setOutgoing('vocab:Entity/relatedTo', 'persons:janed', true)
                .setIncoming('vocab:Entity/worksFor', 'persons:jaked', true);

            graph
                .createVertex('persons:janed')
                .setType('vocab:Person', 'vocab:Employee')
                .addAttributeValue('vocab:Entity/firstName', 'Jane')
                .addAttributeValue('vocab:Entity/lastName', 'Doe')
                .setOutgoing('vocab:Entity/worksFor', 'persons:jilld', true);

            graph
                .createVertex('persons:jilld')
                .setType('vocab:Person', 'vocab:Manager')
                .addAttributeValue('vocab:Entity/firstName', 'Jill')
                .addAttributeValue('vocab:Entity/lastName', 'Doe')
                .setIncoming('vocab:Entity/relatedTo', 'http://persons/johnd', true);

            graph
                .createVertex('persons:jaked')
                .setType('vocab:Person')
                .addAttributeValue('vocab:Entity/firstName', 'Jake')
                .addAttributeValue('vocab:Entity/lastName', 'Doe');
        });

        it('should format the full graph', async () => {
            const json = await graph.toJson({
                base: 'http://persons/',
                context: 'http://persons/context.json'
            });

            validateFullGraph(json);
        });

        it('should format framed graph', async () => {
            const json = await graph.toJson({
                context: 'http://persons/context.json',
                frame: {
                    '@type': 'Person',
                    relatedTo: {
                        '@embed': '@always',
                        '@type': 'Person',
                        worksFor: {
                            '@embed': '@never'
                        }
                    },
                    worksFor: {
                        '@embed': '@never'
                    }
                }
            });
            validateFramedGraph(json);
        });

        it('should format framed graph with compact ids', async () => {
            const json = await graph.toJson({
                context: 'http://persons/context.json',
                frame: {
                    '@id': ['persons:johnd', 'http://persons/janed'],
                    relatedTo: {
                        '@embed': '@never'
                    },
                    worksFor: {
                        '@embed': '@never'
                    }
                }
            });

            let vertex: any;
            expect(json['@graph'].length).to.equal(2);
            vertex = json['@graph'].find((x: any) => x['@id'] === 'http://persons/johnd');
            expect(vertex).to.be.ok;
            expect(vertex['@type'].length).to.equal(2);
            expect(vertex['@type'].some((x: any) => x === 'Person')).to.be.true;
            expect(vertex['@type'].some((x: any) => x === 'Manager')).to.be.true;
            expect(vertex.firstName).to.equal('John');
            expect(vertex.lastName).to.equal('Doe');
            expect(vertex.relatedTo.length).to.equal(2);

            vertex = json['@graph'].find((x: any) => x['@id'] === 'http://persons/janed');
            expect(vertex).to.be.ok;
            expect(vertex['@type'].length).to.equal(2);
            expect(vertex['@type'].some((x: any) => x === 'Person')).to.be.true;
            expect(vertex['@type'].some((x: any) => x === 'Employee')).to.be.true;
            expect(vertex.firstName).to.equal('Jane');
            expect(vertex.lastName).to.equal('Doe');
            expect(vertex.worksFor).to.equal('http://persons/jilld');
        });

        it('should format vertex', async () => {
            const json = await graph
                .getVertex('http://persons/johnd')
                .toJson({ context: 'http://persons/context.json' });
            validateVertex(json);
        });

        it('should format framed vertex', async () => {
            const json = await graph.getVertex('http://persons/johnd').toJson({
                context: 'http://persons/context.json',
                frame: {
                    relatedTo: {
                        '@embed': '@never'
                    },
                    worksFor: {
                        '@embed': '@never'
                    }
                }
            });

            validateFramedVertex(json);
        });
    });

    function validateFullGraph(json: any) {
        expect(json).to.be.ok;
        expect(json['@graph'].length).to.equal(4);

        let vertex: any;
        vertex = json['@graph'].find((x: any) => x['@id'] === 'http://persons/johnd');

        expect(vertex).to.be.ok;
        expect(vertex['@type'].length).to.equal(2);
        expect(vertex['@type'].some((x: any) => x === 'Person')).to.be.true;
        expect(vertex['@type'].some((x: any) => x === 'Manager')).to.be.true;
        expect(vertex.firstName).to.equal('John');
        expect(vertex.lastName).to.equal('Doe');
        expect(vertex.relatedTo.length).to.equal(2);
        expect(vertex.relatedTo.some((x: any) => x === 'http://persons/janed')).to.be.true;
        expect(vertex.relatedTo.some((x: any) => x === 'http://persons/jilld')).to.be.true;
        expect(vertex.title).to.be.ok;
        expect(vertex.title.en).to.equal('Manager');
        expect(vertex.title.fr).to.equal('Månager');

        vertex = json['@graph'].find((x: any) => x['@id'] === 'http://persons/janed');
        expect(vertex).to.be.ok;
        expect(vertex['@type'].length).to.equal(2);
        expect(vertex['@type'].some((x: any) => x === 'Person')).to.be.true;
        expect(vertex['@type'].some((x: any) => x === 'Employee')).to.be.true;
        expect(vertex.firstName).to.equal('Jane');
        expect(vertex.lastName).to.equal('Doe');
        expect(vertex.worksFor).to.equal('http://persons/jilld');

        vertex = json['@graph'].find((x: any) => x['@id'] === 'http://persons/jilld');
        expect(vertex).to.be.ok;
        expect(vertex['@type'].length).to.equal(2);
        expect(vertex['@type'].some((x: any) => x === 'Person')).to.be.true;
        expect(vertex['@type'].some((x: any) => x === 'Manager')).to.be.true;
        expect(vertex.firstName).to.equal('Jill');
        expect(vertex.lastName).to.equal('Doe');

        vertex = json['@graph'].find((x: any) => x['@id'] === 'http://persons/jaked');
        expect(vertex).to.be.ok;
        expect(vertex['@type']).to.equal('Person');
        expect(vertex.firstName).to.equal('Jake');
        expect(vertex.lastName).to.equal('Doe');
    }

    function validateFramedGraph(json: any) {
        expect(json).to.be.ok;
        expect(json['@graph'].length).to.equal(4);

        let vertex: any;
        vertex = json['@graph'].find((x: any) => x['@id'] === 'http://persons/johnd');
        expect(vertex).to.be.ok;
        expect(vertex['@type'].length).to.equal(2);
        expect(vertex['@type'].some((x: any) => x === 'Person')).to.be.true;
        expect(vertex['@type'].some((x: any) => x === 'Manager')).to.be.true;
        expect(vertex.firstName).to.equal('John');
        expect(vertex.lastName).to.equal('Doe');
        expect(vertex.relatedTo.length).to.equal(2);
        expect(vertex.relatedTo.some((x: any) => x['@id'] === 'http://persons/janed')).to.be.true;
        expect(vertex.relatedTo.find((x: any) => x['@id'] === 'http://persons/janed').firstName).to.equal('Jane');
        expect(vertex.relatedTo.find((x: any) => x['@id'] === 'http://persons/janed').lastName).to.equal('Doe');
        expect(vertex.relatedTo.find((x: any) => x['@id'] === 'http://persons/janed')['@type'].includes('Person')).to.be.true;
        expect(vertex.relatedTo.find((x: any) => x['@id'] === 'http://persons/janed')['@type'].includes('Employee')).to.be.true;
        expect(vertex.relatedTo.find((x: any) => x['@id'] === 'http://persons/janed').worksFor).to.equal('http://persons/jilld');
        expect(vertex.title).to.be.ok;
        expect(vertex.title.en).to.equal('Manager');
        expect(vertex.title.fr).to.equal('Månager');

        expect(vertex.relatedTo.some((x: any) => x['@id'] === 'http://persons/jilld')).to.be.true;
        expect(vertex.relatedTo.find((x: any) => x['@id'] === 'http://persons/jilld').firstName).to.equal('Jill');
        expect(vertex.relatedTo.find((x: any) => x['@id'] === 'http://persons/jilld').lastName).to.equal('Doe');
        expect(vertex.relatedTo.find((x: any) => x['@id'] === 'http://persons/jilld')['@type'].includes('Person')).to.be.true;
        expect(vertex.relatedTo.find((x: any) => x['@id'] === 'http://persons/jilld')['@type'].includes('Manager')).to.be.true;

        vertex = json['@graph'].find((x: any) => x['@id'] === 'http://persons/janed');
        expect(vertex).to.be.ok;
        expect(vertex['@type'].length).to.equal(2);
        expect(vertex['@type'].some((x: any) => x === 'Person')).to.be.true;
        expect(vertex['@type'].some((x: any) => x === 'Employee')).to.be.true;
        expect(vertex.firstName).to.equal('Jane');
        expect(vertex.lastName).to.equal('Doe');
        expect(vertex.worksFor).to.equal('http://persons/jilld');

        vertex = json['@graph'].find((x: any) => x['@id'] === 'http://persons/jilld');
        expect(vertex).to.be.ok;
        expect(vertex['@type'].length).to.equal(2);
        expect(vertex['@type'].some((x: any) => x === 'Person')).to.be.true;
        expect(vertex['@type'].some((x: any) => x === 'Manager')).to.be.true;
        expect(vertex.firstName).to.equal('Jill');
        expect(vertex.lastName).to.equal('Doe');

        vertex = json['@graph'].find((x: any) => x['@id'] === 'http://persons/jaked');
        expect(vertex).to.be.ok;
        expect(vertex['@type']).to.equal('Person');
        expect(vertex.firstName).to.equal('Jake');
        expect(vertex.lastName).to.equal('Doe');
    }

    function validateVertex(json: any) {
        expect(json).to.be.ok;
        expect(json['@id']).to.equal('http://persons/johnd');
        expect(json['@type'].length).to.equal(2);
        expect(json['@type'].some((x: any) => x === 'Person')).to.be.true;
        expect(json['@type'].some((x: any) => x === 'Manager')).to.be.true;
        expect(json.firstName).to.equal('John');
        expect(json.lastName).to.equal('Doe');
        expect(json.relatedTo.length).to.equal(2);
        expect(json.title).to.be.ok;
        expect(json.title.en).to.equal('Manager');
        expect(json.title.fr).to.equal('Månager');

        let vertex: any;

        vertex = json.relatedTo.find((x: any) => x['@id'] === 'http://persons/janed');
        expect(vertex).to.be.ok;
        expect(vertex['@type'].length).to.equal(2);
        expect(vertex['@type'].some((x: any) => x === 'Person')).to.be.true;
        expect(vertex['@type'].some((x: any) => x === 'Employee')).to.be.true;
        expect(vertex.firstName).to.equal('Jane');
        expect(vertex.lastName).to.equal('Doe');
        expect(vertex.worksFor).to.equal('http://persons/jilld');

        vertex = json.relatedTo.find((x: any) => x['@id'] === 'http://persons/jilld');
        expect(vertex).to.be.ok;
        expect(vertex['@type'].length).to.equal(2);
        expect(vertex['@type'].some((x: any) => x === 'Person')).to.be.true;
        expect(vertex['@type'].some((x: any) => x === 'Manager')).to.be.true;
        expect(vertex.firstName).to.equal('Jill');
        expect(vertex.lastName).to.equal('Doe');
    }

    function validateFramedVertex(json: any) {
        expect(json).to.be.ok;
        expect(json['@id']).to.equal('http://persons/johnd');
        expect(json['@type'].length).to.equal(2);
        expect(json['@type'].some((x: any) => x === 'Person')).to.be.true;
        expect(json['@type'].some((x: any) => x === 'Manager')).to.be.true;
        expect(json.firstName).to.equal('John');
        expect(json.lastName).to.equal('Doe');
        expect(json.relatedTo.length).to.equal(2);
        expect(json.relatedTo.some((x: any) => x === 'http://persons/janed')).to.be.true;
        expect(json.relatedTo.some((x: any) => x === 'http://persons/jilld')).to.be.true;
        expect(json.title).to.be.ok;
        expect(json.title.en).to.equal('Manager');
        expect(json.title.fr).to.equal('Manager');
    }
});
