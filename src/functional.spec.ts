import { ContextNotFoundError } from "./errors";
import JsonldGraph from './graph';
import Vertex from './vertex';

const context = {
    '@context': {
        '@version': 1.1,
        '@language': 'en',
        '@vocab': 'urn:example:org:hr:classes:',
        entity: 'urn:example:org:hr:classes:entity:',
        employee: 'urn:example:org:hr:classes:employee:',
        fname: { '@id': 'entity:first_name', '@language': null },
        lname: { '@id': 'entity:last_name', '@language': null },
        level: 'employee:level',
        dispname: { '@id': 'entity:disp_name', '@container': '@language' },
        mgr: { '@id': 'employee:manager', '@type': '@id', '@container': '@set' },
        data: { '@id': 'entity:data', '@type': '@json' },
        contacts: { '@id': 'entity:contacts', '@container': '@set' },
        addrType: { '@id': 'entity:contact:type', '@language': null },
        street: { '@id': 'entity:contact:street', '@language': null },
        city: { '@id': 'entity:contact:city', '@language': null },
        state: { '@id': 'entity:contact:state', '@language': null },
        zip: { '@id': 'entity:contact:zip', '@language': null }
    }
}

describe.each([graphCreator, graphLoader])('E2E', (source) => {

    let graph: JsonldGraph;

    beforeAll(async () => {
        graph = await source();
    });

    describe('query', () => {
        it('can query for all vertices', () => {
            expect(graph.vertexCount).toEqual(8);
            expect(graph.hasVertex('class:Person')).toEqual(true);
            expect(graph.hasVertex('class:Manager')).toEqual(true);
            expect(graph.hasVertex('class:Contact:Address')).toEqual(true);
            expect(graph.hasVertex('i:johnd')).toEqual(true);
            expect(graph.hasVertex('i:janed')).toEqual(true);
            expect(graph.hasVertex('i:jilld')).toEqual(true);
            expect(graph.hasVertex('i:johnd:contact:primary')).toEqual(true);
            expect(graph.hasVertex('i:johnd:contact:secondary')).toEqual(true);
        });

        it('can query for all vertex of type', () => {
            const persons = graph.getVertex('class:Person')!.getIncoming('@type').map(x => x.from.id).items();
            expect(persons.length).toEqual(3);
            expect(persons.some(x => x === 'i:johnd')).toEqual(true);
            expect(persons.some(x => x === 'i:janed')).toEqual(true);
            expect(persons.some(x => x === 'i:jilld')).toEqual(true);

            const managers = graph.getVertex('class:Manager')!.getIncoming('@type').map(x => x.from.id).items();
            expect(managers.length).toEqual(1);
            expect(managers[0]).toEqual('i:janed');
        });

        it('can filter vertices based on attribute value', () => {
            const employees = graph.getVertices()
                .filter(x => x.getAttributeValue('class:employee:level') === 2)
                .map(x => x.id)
                .items();

            expect(employees.length).toEqual(2);
            expect(employees.some(x => x === 'i:janed')).toEqual(true);
            expect(employees.some(x => x === 'i:jilld')).toEqual(true);
        });
    });

    describe('format vertex', () => {
        let target: Vertex;

        beforeAll(() => {
            target = graph.getVertex('urn:example:org:hr:johnd')!;
        });

        it('should work', async () => {
            const json = await target.toJson('urn:example:org:hr');
            assertPersonJSON(json, target);
        });

        it('can strip out context', async () => {
            const json = await target.toJson('urn:example:org:hr', { stripContext: true });
            expect(json['@context']).toBeUndefined();
        });

        it('can strip ids from embeds', async () => {
            const json = await target.toJson('urn:example:org:hr', { blankReferences: true });
            expect(json['@id']).toEqual(target.iri);
            for (const contacts of json.contacts) {
                expect(contacts['@id']).toBeUndefined();
            }

            for (const managers of json.mgr) {
                expect(managers['@id']).toBeUndefined();
            }
        });

        it('can frame output', async () => {
            const json = await target.toJson('urn:example:org:hr', {
                stripContext: true,
                frame: {
                    '@explicit': '@true',
                    fname: {},
                    lname: {},
                    mgr: { '@embed': '@never' }
                }
            });

            expect(Object.keys(json).length).toEqual(5);
            expect(json['@id']).toEqual(target.iri);
            expect(json.fname).toEqual(target.getAttributeValue('class:entity:first_name'));
            expect(json.lname).toEqual(target.getAttributeValue('class:entity:last_name'));
            expect(json.mgr.length).toEqual(1);
            expect(json.mgr[0]).toEqual(target.getOutgoing('class:employee:manager').first().to.iri);
        });

        it('can frame using inline context', async () => {
            const json = await target.toJson(
                {
                    '@context': {
                        'firstName': 'urn:example:org:hr:classes:entity:first_name',
                        'lastName': 'urn:example:org:hr:classes:entity:last_name'
                    }
                },
                {
                    frame: {
                        '@explicit': '@true',
                        firstName: {},
                        lastName: {}
                    }
                }
            );

            expect(json.firstName).toEqual(target.getAttributeValue('class:entity:first_name'));
            expect(json.lastName).toEqual(target.getAttributeValue('class:entity:last_name'));
        });

        it('should throw an error when the specific context is not found', async () => {
            try {
                await target.toJson('urn:not:found');
                fail('Expected error to be thrown.');
            } catch (err) {
                expect(err.details.cause).toBeInstanceOf(ContextNotFoundError);
            }
        });
    });

    describe('format graph', () => {
        it('should work', async () => {
            const json = await graph.toJson('urn:example:org:hr');

            expect(json['@context']).toEqual('urn:example:org:hr');
            expect(json['@graph'].length).toEqual(2);
            expect(json['@graph'].some((x: any) => x['@id'] === 'urn:example:org:hr:jilld')).toEqual(true);

            assertPersonJSON(
                json['@graph'].find((x: any) => x['@id'] === 'urn:example:org:hr:johnd'),
                graph.getVertex('urn:example:org:hr:johnd')!);

            assertPersonJSON(
                json['@graph'].find((x: any) => x['@id'] === 'urn:example:org:hr:jilld'),
                graph.getVertex('urn:example:org:hr:jilld')!);
        });

        it('can strip out context', async () => {
            const json = await graph.toJson('urn:example:org:hr', { stripContext: true });
            expect(json['@context']).toBeUndefined();
        });

        it('can strip ids from embeds', async () => {
            const json = await graph.toJson('urn:example:org:hr', { blankReferences: true });
            for (const person of json['@graph']) {
                if (person.contacts) {
                    for (const contact of person.contacts) {
                        expect(contact['@id']).toBeUndefined();
                    }
                }

                if (person.mgr) {
                    for (const mgr of person.mgr) {
                        expect(mgr['@id']).toBeUndefined();
                    }
                }
            }
        });

        it('can frame output', async () => {
            const json = await graph.toJson('urn:example:org:hr', {
                stripContext: true,
                frame: {
                    '@explicit': '@true',
                    '@type': 'urn:example:org:hr:classes:Contact:Address',
                    'entity:contact:state': {},
                    'entity:contact:zip': {}
                }
            });

            expect(json['@graph'].length).toEqual(2);
            expect(Object.keys(json['@graph'][0]).length).toEqual(4);
            expect(Object.keys(json['@graph'][0]).some(x => x === '@id')).toEqual(true);
            expect(Object.keys(json['@graph'][0]).some(x => x === '@type')).toEqual(true);
            expect(Object.keys(json['@graph'][0]).some(x => x === 'state')).toEqual(true);
            expect(Object.keys(json['@graph'][0]).some(x => x === 'zip')).toEqual(true);
        });

        it('should throw an error when the specific context is not found', async () => {
            try {
                await graph.toJson('urn:not:found');
                fail('Expected error to be thrown.');
            } catch (err) {
                expect(err.details.cause).toBeInstanceOf(ContextNotFoundError);
            }
        });
    })
});

async function graphCreator(): Promise<JsonldGraph> {
    const graph = new JsonldGraph();
    graph.addContext('urn:example:org:hr', context);
    graph.setPrefix('class', 'urn:example:org:hr:classes:');
    graph.setPrefix('i', 'urn:example:org:hr:');
    graph.createVertex('urn:example:org:hr:johnd')
        .setType('class:Person')
        .setAttributeValue('class:entity:first_name', 'John')
        .setAttributeValue('class:entity:last_name', 'Doe')
        .setAttributeValue('class:entity:disp_name', 'John Doe', 'en')
        .setAttributeValue('class:entity:disp_name', 'John Doe', 'fr')
        .setAttributeValue('class:employee:level', 1)
        .setAttributeValue('class:entity:data', {
            joinDate: '2001-01-01',
            lastUdate: '2002=02-03'
        });

    graph.createVertex('urn:example:org:hr:johnd:contact:primary')
        .setType('class:Contact:Address')
        .setAttributeValue('class:entity:contact:type', 'primary')
        .setAttributeValue('class:entity:contact:street', '123 Sunshine Street')
        .setAttributeValue('class:entity:contact:city', 'LA')
        .setAttributeValue('class:entity:contact:state', 'CA')
        .setAttributeValue('class:entity:contact:zip', 102992);

    graph.createVertex('urn:example:org:hr:johnd:contact:secondary')
        .setType('class:Contact:Address')
        .setAttributeValue('class:entity:contact:type', 'secondary')
        .setAttributeValue('class:entity:contact:street', '123 Sunshine Street')
        .setAttributeValue('class:entity:contact:city', 'LA')
        .setAttributeValue('class:entity:contact:state', 'CA')
        .setAttributeValue('class:entity:contact:zip', 102992);

    graph.createVertex('urn:example:org:hr:janed')
        .setType('class:Person', 'class:Manager')
        .setAttributeValue('class:entity:first_name', 'Jane')
        .setAttributeValue('class:entity:last_name', 'Doe')
        .setAttributeValue('class:entity:disp_name', 'Jane Doe', 'en')
        .setAttributeValue('class:employee:level', 2);

    graph.createVertex('urn:example:org:hr:jilld')
        .setType('class:Person')
        .setAttributeValue('class:entity:first_name', 'Jill')
        .setAttributeValue('class:entity:last_name', 'Doe')
        .setAttributeValue('class:entity:disp_name', 'Jill Doe', 'fr')
        .setAttributeValue('class:employee:level', 2);

    graph.createEdge('class:entity:contacts', 'urn:example:org:hr:johnd', 'urn:example:org:hr:johnd:contact:primary');
    graph.createEdge('class:entity:contacts', 'urn:example:org:hr:johnd', 'urn:example:org:hr:johnd:contact:secondary');
    graph.createEdge('class:employee:manager', 'urn:example:org:hr:johnd', 'urn:example:org:hr:janed');
    graph.createEdge('class:employee:manager', 'urn:example:org:hr:jilld', 'urn:example:org:hr:janed');

    return graph;
}

async function graphLoader(): Promise<JsonldGraph> {
    const graph = new JsonldGraph({
        blankIriResolver: (v) => {
            if (v.isType('class:Contact:Address')) {
                const parent = v.getIncoming().first().from.iri;
                const addrType = v.getAttributeValue('class:entity:contact:type');
                return `${parent}:contact:${addrType}`;
            } else {
                return v.iri;
            }
        }
    });

    graph.addContext('urn:example:org:hr', context);
    graph.setPrefix('class', 'urn:example:org:hr:classes:');
    graph.setPrefix('i', 'urn:example:org:hr:');

    const document = {
        '@context': 'urn:example:org:hr',
        '@graph': [
            {
                '@id': 'urn:example:org:hr:johnd',
                '@type': 'Person',
                fname: 'John',
                lname: 'Doe',
                dispname: {
                    en: 'John Doe'
                },
                level: 1,
                mgr: 'urn:example:org:hr:janed',
                data: {
                    joinDate: '2001-01-01',
                    lastUdate: '2002=02-03'
                },
                contacts: [
                    {
                        '@type': 'urn:example:org:hr:classes:Contact:Address',
                        addrType: 'primary',
                        street: '123 Sunshine Rd',
                        city: 'LA',
                        state: 'CA',
                        zip: 12343
                    },
                    {
                        '@type': 'urn:example:org:hr:classes:Contact:Address',
                        addrType: 'secondary',
                        street: '456 Sunshine Rd',
                        city: 'LA',
                        state: 'CA',
                        zip: 12343
                    }
                ]
            },
            {
                '@id': 'urn:example:org:hr:jilld',
                '@type': 'Person',
                fname: 'Jill',
                lname: 'Doe',
                dispname: {
                    en: 'Jill Doe',
                    fr: 'Jill Doe'
                },
                level: 2,
                mgr: 'urn:example:org:hr:janed'
            },
            {
                '@id': 'urn:example:org:hr:janed',
                '@type': ['Person', 'Manager'],
                fname: 'Jane',
                lname: 'Doe',
                dispname: 'Jane Doe',
                level: 2
            }
        ]
    };

    await graph.load(document, { normalize: true });
    return graph;
}

function assertPersonJSON(personJSON: any, personVertex: Vertex) {
    expect(personJSON).toBeTruthy();
    expect(personJSON.fname).toEqual(personVertex.getAttributeValue('class:entity:first_name'));
    expect(personJSON.lname).toEqual(personVertex.getAttributeValue('class:entity:last_name'));
    expect(personJSON.dispname.en).toEqual(personVertex.getAttributeValue('class:entity:disp_name', 'en'));
    expect(personJSON.dispname.fr).toEqual(personVertex.getAttributeValue('class:entity:disp_name', 'fr'));
    expect(personJSON.level).toEqual(personVertex.getAttributeValue('class:employee:level'));
    expect(personJSON.data).toEqual(personVertex.getAttributeValue('class:entity:data'));

    for (const { to: contact } of personVertex.getOutgoing('class:entity:contacts')) {
        const contactJSON = personJSON.contacts.find((x: any) => x['@id'] === contact.iri);
        expect(contactJSON).toBeTruthy();
        expect(contactJSON.addrType).toEqual(contact.getAttributeValue('class:entity:contact:type'));
        expect(contactJSON.street).toEqual(contact.getAttributeValue('class:entity:contact:street'));
        expect(contactJSON.city).toEqual(contact.getAttributeValue('class:entity:contact:city'));
        expect(contactJSON.state).toEqual(contact.getAttributeValue('class:entity:contact:state'));
        expect(contactJSON.zip).toEqual(contact.getAttributeValue('class:entity:contact:zip'));
    }

    for (const { to: manager } of personVertex.getOutgoing('class:employee:manager')) {
        const managerJSON = personJSON.mgr.find((x: any) => x['@id'] === manager.iri);
        assertPersonJSON(managerJSON, manager);
    }
}