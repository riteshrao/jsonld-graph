import { JsonldGraph, Vertex } from ".";
import { ContextNotFoundError } from "./errors";

describe('E2E: CRUD', () => {
    let graph: JsonldGraph;
    const context = {
        '@context': {
            '@version': 1.1,
            '@vocab': 'urn:example:org:hr:classes:',
            entity: 'urn:example:org:hr:classes:entity:',
            employee: 'urn:example:org:hr:classes:employee:',
            fname: 'entity:first_name',
            lname: 'entity:last_name',
            empno: 'employee:empno',
            dispname: { '@id': 'entity:disp_name', '@container': '@language' },
            rank: 'employee:rank',
            mgr: { '@id': 'employee:manager', '@type': '@id', '@container': '@set' },
            data: { '@id': 'entity:data', '@type': '@json' },
            contacts: { '@id': 'entity:contacts', '@container': '@set' },
            addrType: 'entity:contact:type',
            street: 'entity:contact:street',
            city: 'entity:contact:city',
            state: 'entity:contact:state',
            zip: 'entity:contact:zip'
        }
    }

    beforeEach(() => {
        graph = new JsonldGraph();
        graph.addContext('urn:example:org:hr', context);
        graph.setPrefix('hr', 'urn:example:org:hr:classes:');
        graph.createVertex('urn:example:hr:johnd')
            .setType('hr:Person')
            .setAttributeValue('hr:entity:first_name', 'John')
            .setAttributeValue('hr:entity:last_name', 'Doe')
            .setAttributeValue('hr:entity:disp_name', 'John Doe', 'en')
            .setAttributeValue('hr:entity:disp_name', 'John Doe', 'fr')
            .setAttributeValue('hr:employee:empno', 1)
            .setAttributeValue('hr:entity:data', {
                joinDate: '2001-01-01',
                lastUdate: '2002=02-03'
            });

        graph.createVertex('urn:example:hr:johnd:contact:primary')
            .setType('hr:Contact:Address')
            .setAttributeValue('hr:entity:contact:type', 'primary')
            .setAttributeValue('hr:entity:contact:street', '123 Sunshine Street')
            .setAttributeValue('hr:entity:contact:city', 'LA')
            .setAttributeValue('hr:entity:contact:state', 'CA')
            .setAttributeValue('hr:entity:contact:zip', 102992);

        graph.createVertex('urn:example:hr:johnd:contact:secondary')
            .setType('hr:Contact:Address')
            .setAttributeValue('hr:entity:contact:type', 'secondary')
            .setAttributeValue('hr:entity:contact:street', '123 Sunshine Street')
            .setAttributeValue('hr:entity:contact:city', 'LA')
            .setAttributeValue('hr:entity:contact:state', 'CA')
            .setAttributeValue('hr:entity:contact:zip', 102992);

        graph.createVertex('urn:example:hr:janed')
            .setType('hr:Person')
            .setAttributeValue('hr:entity:first_name', 'Jane')
            .setAttributeValue('hr:entity:last_name', 'Doe')
            .setAttributeValue('hr:entity:disp_name', 'Jane Doe', 'en');

        graph.createVertex('urn:example:hr:jilld')
            .setType('hr:Person', 'hr:Manager')
            .setAttributeValue('hr:entity:first_name', 'Jill')
            .setAttributeValue('hr:entity:last_name', 'Doe')
            .setAttributeValue('hr:entity:disp_name', 'Jill Doe', 'fr')

        graph.createEdge('hr:entity:contacts', 'urn:example:hr:johnd', 'urn:example:hr:johnd:contact:primary');
        graph.createEdge('hr:entity:contacts', 'urn:example:hr:johnd', 'urn:example:hr:johnd:contact:secondary');
        graph.createEdge('hr:employee:manager', 'urn:example:hr:johnd', 'urn:example:hr:janed');
        graph.createEdge('hr:employee:manager', 'urn:example:hr:jilld', 'urn:example:hr:janed');
    });

    describe('query', () => {

    });

    describe('formatting', () => {
        describe('vertex', () => {
            let target: Vertex;

            beforeEach(() => {
                target = graph.getVertex('urn:example:hr:johnd')!;
            });

            it('should work', async () => {
                const json = await target.toJson('urn:example:org:hr');
                validatePersonJson(json, target);
            });

            it('can strip out context', async () => {
                const json = await target.toJson('urn:example:org:hr', { stripContext: true });
                expect(json['@context']).toBeUndefined();
            });

            it('can strip ids from embeds', async () => {
                const json = await target.toJson('urn:example:org:hr', { blankReferences: true });
                expect(json['@id']).toEqual(target.id);
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
                expect(json['@id']).toEqual(target.id);
                expect(json.fname).toEqual(target.getAttributeValue('hr:entity:first_name'));
                expect(json.lname).toEqual(target.getAttributeValue('hr:entity:last_name'));
                expect(json.mgr.length).toEqual(1);
                expect(json.mgr[0]).toEqual(target.getOutgoing('hr:employee:manager').first().to.id);
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

                expect(json.firstName).toEqual(target.getAttributeValue('hr:entity:first_name'));
                expect(json.lastName).toEqual(target.getAttributeValue('hr:entity:last_name'));
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

        describe('graph', () => {
            it('should work', async () => {
                const json = await graph.toJson('urn:example:org:hr');
                expect(json['@context']).toEqual('urn:example:org:hr');
                expect(json['@graph'].length).toEqual(2);
                expect(json['@graph'].some((x: any) => x['@id'] === 'urn:example:hr:jilld')).toEqual(true);

                validatePersonJson(
                    json['@graph'].find((x: any) => x['@id'] === 'urn:example:hr:johnd'),
                    graph.getVertex('urn:example:hr:johnd')!);

                validatePersonJson(
                    json['@graph'].find((x: any) => x['@id'] === 'urn:example:hr:jilld'),
                    graph.getVertex('urn:example:hr:jilld')!);
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
        });
    });
});

function validatePersonJson(personJSON: any, personVertex: Vertex) {
    expect(personJSON).toBeTruthy();
    expect(personJSON.fname).toEqual(personVertex.getAttributeValue('hr:entity:first_name'));
    expect(personJSON.lname).toEqual(personVertex.getAttributeValue('hr:entity:last_name'));
    expect(personJSON.dispname.en).toEqual(personVertex.getAttributeValue('hr:entity:disp_name', 'en'));
    expect(personJSON.dispname.fr).toEqual(personVertex.getAttributeValue('hr:entity:disp_name', 'fr'));
    expect(personJSON.empno).toEqual(personVertex.getAttributeValue('hr:employee:empno'));
    expect(personJSON.data).toEqual(personVertex.getAttributeValue('hr:entity:data'));

    for (const { to: contact } of personVertex.getOutgoing('hr:entity:contacts')) {
        const contactJSON = personJSON.contacts.find((x: any) => x['@id'] === contact.iri);
        expect(contactJSON).toBeTruthy();
        expect(contactJSON.addrType).toEqual(contact.getAttributeValue('hr:entity:contact:type'));
        expect(contactJSON.street).toEqual(contact.getAttributeValue('hr:entity:contact:street'));
        expect(contactJSON.city).toEqual(contact.getAttributeValue('hr:entity:contact:city'));
        expect(contactJSON.state).toEqual(contact.getAttributeValue('hr:entity:contact:state'));
        expect(contactJSON.zip).toEqual(contact.getAttributeValue('hr:entity:contact:zip'));
    }

    for (const { to: manager } of personVertex.getOutgoing('hr:employee:manager')) {
        const managerJSON = personJSON.mgr.find((x: any) => x['@id'] === manager.iri);
        validatePersonJson(managerJSON, manager);
    }
}