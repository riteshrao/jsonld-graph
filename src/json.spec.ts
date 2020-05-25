import { JsonldGraph, Vertex } from "./";
import * as jsonld from 'jsonld';
import { ContextNotFoundError } from "./errors";

describe('JSON formatting', () => {
    let graph: JsonldGraph;
    let target: Vertex;
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

        target = graph.createVertex('urn:example:hr:johnd')
            .setType('hr:Person')
            .setAttributeValue('hr:entity:first_name', 'John')
            .setAttributeValue('hr:entity:last_name', 'Doe')
            .setAttributeValue('hr:entity:disp_name', 'John Doe', 'en')
            .setAttributeValue('hr:entity:disp_name', 'John Doe', 'fr')
            .setAttributeValue('hr:employee:empno', 1)
            .setAttributeValue('hr:entity:data', {
                joinDate: '2001-01-01',
                lastUdate: '2002=02-03'
            })

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

        graph.createEdge('hr:entity:contacts', target, 'urn:example:hr:johnd:contact:primary');
        graph.createEdge('hr:employee:manager', target, 'urn:example:hr:janed');
    });

    describe('vertex', () => {
        it('should format simple vertex', async () => {
            const json = await target.toJson('urn:example:org:hr');
            expect(json['@context']).toEqual('urn:example:org:hr');
            expect(json['@id']).toEqual(target.id);
            expect(json.fname).toEqual(target.getAttributeValue('hr:entity:first_name'));
            expect(json.lname).toEqual(target.getAttributeValue('hr:entity:last_name'));
            expect(json.dispname).toBeInstanceOf(Object);
            expect(json.dispname.en).toEqual(target.getAttributeValue('hr:entity:disp_name', 'en'));
            expect(json.dispname.fr).toEqual(target.getAttributeValue('hr:entity:disp_name', 'fr'));
            expect(json.data).toBeInstanceOf(Object);
            expect(json.data).toEqual(target.getAttributeValue('hr:entity:data'));
            expect(json.empno).toEqual(target.getAttributeValue('hr:employee:empno'));
            expect(json.contacts.length).toEqual(1);
            expect(json.mgr.length).toEqual(1);

            for (const contact of target.getOutgoing('hr:entity:contacts').map(x => x.to)) {
                const contactJSON = json.contacts.find((x: any) => x['@id'] === contact.id);
                expect(contactJSON).toBeTruthy();
                expect(contactJSON.addrType).toEqual(contact.getAttributeValue('hr:entity:contact:type'));
                expect(contactJSON.street).toEqual(contact.getAttributeValue('hr:entity:contact:street'));
                expect(contactJSON.city).toEqual(contact.getAttributeValue('hr:entity:contact:city'));
                expect(contactJSON.state).toEqual(contact.getAttributeValue('hr:entity:contact:state'));
                expect(contactJSON.zip).toEqual(contact.getAttributeValue('hr:entity:contact:zip'));
            }

            for (const manager of target.getOutgoing('hr:employee:manager').map(x => x.to)) {
                const managerJSON = json.mgr.find((x: any) => x['@id'] === manager.id);
                expect(managerJSON).toBeTruthy();
                expect(managerJSON.fname).toEqual(manager.getAttributeValue('hr:entity:first_name'));
                expect(managerJSON.lname).toEqual(manager.getAttributeValue('hr:entity:last_name'));
                expect(managerJSON.dispname.en).toEqual(manager.getAttributeValue('hr:entity:disp_name', 'en'));
            }
        });

        it('should strip out context', async () => {
            const json = await target.toJson('urn:example:org:hr', { stripContext: true });
            expect(json['@context']).toBeUndefined();
        });

        it('should strip ids from embeds', async () => {
            const json = await target.toJson('urn:example:org:hr', { anonymousEmbeds: true });
            expect(json['@id']).toEqual(target.id);
            for (const contacts of json.contacts) {
                expect(contacts['@id']).toBeUndefined();
            }

            for (const managers of json.mgr) {
                expect(managers['@id']).toBeUndefined();
            }
        });

        it('should frame output', async () => {
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

        it('should frame using inline context', async () => {
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
            )

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
        it('works', () => {
            return;
        });
    });

    describe('round trip', () => {
        beforeEach(async () => {
            await graph.load({
                '@context': 'urn:example:org:hr',
                '@graph': [
                    {
                        '@id': 'urn:example:org:johnd',
                        fname: 'John',
                        lname: 'Doe',
                        dispname: 'John Doe',
                        rank: 10,
                        data: {
                            'join_dt': '2001-02-01',
                            'last_update': '2002-04-21'
                        },
                        contacts: [
                            {
                                addrType: 'Primary',
                                street: '123 Random Street',
                                city: 'LA',
                                state: 'CA',
                                zip: 10293
                            },
                            {
                                addrType: 'Secondary',
                                street: '234 Random Street',
                                city: 'LA',
                                state: 'CA',
                                zip: 10293
                            }
                        ]
                    }
                ]
            })
        });
    });
});