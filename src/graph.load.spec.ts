import JsonldGraph from "./graph";
import shortid from "shortid";

describe('.load', () => {
    const context = {
        '@context': {
            '@vocab': 'http://example.org/hr/classes/',
            '@version': 1.1,
            firstName: 'Employee/firstName',
            lastName: 'Employee/lastName',
            displayName: 'Entity/displayName',
            description: { '@id': 'Entity/description', '@container': '@language' },
            manager: { '@id': 'Employee/manager', '@type': '@id' },
            manages: { '@id': 'Manager/manages', '@type': '@id' },
            name: { '@id': 'Entity/name' },
            empData: { '@id': 'Employee/data', '@type': '@json' },
            address: { '@id': 'Contact/address', '@container': '@list' },
            accounts: { '@id': 'Entity/accounts' },
            street: 'Contact/address/street',
            city: 'Contact/address/city',
            state: 'Contact/address/state',
            zip: 'Contact/address/zip'
        }
    };

    it('throws when inputs are not valid', async () => {
        const graph = new JsonldGraph();
        try {
            await graph.load(null);
            fail('Expected load to fail');
        } catch (err) {
            expect(err).toBeInstanceOf(ReferenceError);
        }

        try {
            await graph.load(undefined);
            fail('Expected load to fail');
        } catch (err) {
            expect(err).toBeInstanceOf(ReferenceError);
        }

        try {
            await graph.load([]);
            fail('Expected load to fail');
        } catch (err) {
            expect(err).toBeInstanceOf(ReferenceError);
        }
    });

    it('can load a single entity', async () => {
        const graph = new JsonldGraph();
        graph.addContext('http://example.org/hr', context);
        graph.setPrefix('vocab', 'http://example.org/hr/classes/');
        graph.setPrefix('hr', 'http://example.org/hr/instances/');

        await graph.load({
            '@context': [
                { '@base': 'http://example.org/hr/instances/' },
                'http://example.org/hr'
            ],
            '@id': 'johnd',
            '@type': 'Employee',
            firstName: 'John',
            lastName: 'Doe'
        });

        expect(graph.hasVertex('hr:johnd')).toEqual(true);
        expect(graph.hasVertex('vocab:Employee')).toEqual(true);

        const johnd = graph.getVertex('hr:johnd');
        expect(johnd).toBeTruthy();
        expect(johnd!.getAttributeValue('vocab:Employee/firstName')).toEqual('John');
        expect(johnd!.getAttributeValue('vocab:Employee/lastName')).toEqual('Doe');
        expect(johnd!.isType('vocab:Employee')).toEqual(true);
    });

    it('can load multiple entities', async () => {
        const graph = new JsonldGraph();
        graph.addContext('http://example.org/hr', context);
        graph.setPrefix('vocab', 'http://example.org/hr/classes/');
        graph.setPrefix('hr', 'http://example.org/hr/instances/');

        await graph.load({
            '@context': [
                { '@base': 'http://example.org/hr/instances/' },
                'http://example.org/hr'
            ],
            '@graph': [
                {
                    '@id': 'johnd',
                    '@type': 'Employee',
                    firstName: 'John',
                    lastName: 'Doe'
                },
                {
                    '@id': 'janed',
                    '@type': 'Employee',
                    firstName: 'Jane',
                    lastName: 'Doe'
                }
            ]
        });

        expect(graph.hasVertex('hr:johnd')).toEqual(true);
        expect(graph.hasVertex('hr:janed')).toEqual(true);
        expect(graph.hasVertex('vocab:Employee')).toEqual(true);

        const johnd = graph.getVertex('hr:johnd');
        expect(johnd).toBeTruthy();
        expect(johnd!.getAttributeValue('vocab:Employee/firstName')).toEqual('John');
        expect(johnd!.getAttributeValue('vocab:Employee/lastName')).toEqual('Doe');
        expect(johnd!.isType('vocab:Employee')).toEqual(true);

        const janed = graph.getVertex('hr:janed');
        expect(janed).toBeTruthy();
        expect(janed!.getAttributeValue('vocab:Employee/firstName')).toEqual('Jane');
        expect(janed!.getAttributeValue('vocab:Employee/lastName')).toEqual('Doe');
        expect(janed!.isType('vocab:Employee')).toEqual(true);
    });

    it('can load multiple documents', async () => {
        const graph = new JsonldGraph();
        graph.addContext('http://example.org/hr', context);
        graph.setPrefix('vocab', 'http://example.org/hr/classes/');
        graph.setPrefix('hr', 'http://example.org/hr/instances/');

        await graph.load([
            {
                '@context': [
                    { '@base': 'http://example.org/hr/instances/' },
                    'http://example.org/hr'
                ],
                '@id': 'johnd',
                '@type': 'Employee',
                firstName: 'John',
                lastName: 'Doe'
            },
            {
                '@context': [
                    { '@base': 'http://example.org/hr/instances/' },
                    'http://example.org/hr'
                ],
                '@id': 'janed',
                '@type': 'Employee',
                firstName: 'Jane',
                lastName: 'Doe'
            }
        ]);

        expect(graph.hasVertex('hr:johnd')).toEqual(true);
        expect(graph.hasVertex('hr:janed')).toEqual(true);
        expect(graph.hasVertex('vocab:Employee')).toEqual(true);

        const johnd = graph.getVertex('hr:johnd');
        expect(johnd).toBeTruthy();
        expect(johnd!.getAttributeValue('vocab:Employee/firstName')).toEqual('John');
        expect(johnd!.getAttributeValue('vocab:Employee/lastName')).toEqual('Doe');
        expect(johnd!.isType('vocab:Employee')).toEqual(true);

        const janed = graph.getVertex('hr:janed');
        expect(janed).toBeTruthy();
        expect(janed!.getAttributeValue('vocab:Employee/firstName')).toEqual('Jane');
        expect(janed!.getAttributeValue('vocab:Employee/lastName')).toEqual('Doe');
        expect(janed!.isType('vocab:Employee')).toEqual(true);
    });

    it('can load outgoing and incoming references', async () => {
        const graph = new JsonldGraph();
        graph.addContext('http://example.org/hr', context);
        graph.setPrefix('vocab', 'http://example.org/hr/classes/');
        graph.setPrefix('hr', 'http://example.org/hr/instances/');

        await graph.load({
            '@context': 'http://example.org/hr',
            '@graph': [
                {
                    '@id': 'http://example.org/hr/instances/johnd',
                    '@type': 'Employee',
                    'manager': 'http://example.org/hr/instances/janed'
                },
                {
                    '@id': 'http://example.org/hr/instances/janed',
                    '@type': 'Manager',
                    'manages': 'http://example.org/hr/instances/johnd'
                }
            ]
        });

        expect(graph.hasEdge('vocab:Employee/manager', 'hr:johnd', 'hr:janed')).toEqual(true);
        expect(graph.hasEdge('vocab:Manager/manages', 'hr:janed', 'hr:johnd')).toEqual(true);

        const johnd = graph.getVertex('hr:johnd')!;
        const janed = graph.getVertex('hr:janed')!;
        expect(johnd.hasOutgoing('vocab:Employee/manager', janed)).toEqual(true);
        expect(johnd.hasIncoming('vocab:Manager/manages', janed)).toEqual(true);
        expect(janed.hasOutgoing('vocab:Manager/manages', johnd)).toEqual(true);
        expect(janed.hasIncoming('vocab:Employee/manager', johnd)).toEqual(true);
    });

    it('can load multi valued predicates', async () => {
        const graph = new JsonldGraph();
        graph.addContext('http://example.org/hr', context);
        graph.setPrefix('vocab', 'http://example.org/hr/classes/');
        graph.setPrefix('hr', 'http://example.org/hr/instances/');

        await graph.load({
            '@context': [
                { '@base': 'http://example.org/hr/instances/' },
                'http://example.org/hr'
            ],
            '@id': 'johnd',
            firstName: 'John',
            lastName: 'Doe',
            displayName: ['John Doe', 'John D']
        });

        const johnd = graph.getVertex('hr:johnd')!;
        const displayNames = [...johnd.getAttributeValues('vocab:Entity/displayName')];
        expect(displayNames.length).toEqual(2);
        expect(displayNames[0].value).toEqual('John Doe');
        expect(displayNames[1].value).toEqual('John D');
    });

    it('can load language maps', async () => {
        const graph = new JsonldGraph();
        graph.addContext('http://example.org/hr', context);
        graph.setPrefix('vocab', 'http://example.org/hr/classes/');
        graph.setPrefix('hr', 'http://example.org/hr/instances/');

        await graph.load({
            '@context': [
                { '@base': 'http://example.org/hr/instances/' },
                'http://example.org/hr'
            ],
            '@id': 'johnd',
            firstName: 'John',
            lastName: 'Doe',
            description: {
                en: 'en description',
                fr: 'fr description'
            }
        });

        const johnd = graph.getVertex('hr:johnd')!;
        expect(johnd.getAttributeValue('vocab:Entity/description', 'en')).toEqual('en description');
        expect(johnd.getAttributeValue('vocab:Entity/description', 'fr')).toEqual('fr description');
    });

    it('can load lists', async () => {
        const graph = new JsonldGraph();
        graph.addContext('http://example.org/hr', context);
        graph.setPrefix('vocab', 'http://example.org/hr/classes/');
        graph.setPrefix('hr', 'http://example.org/hr/instances/');

        await graph.load({
            '@context': [
                { '@base': 'http://example.org/hr/instances/' },
                'http://example.org/hr'
            ],
            '@id': 'johnd',
            firstName: 'John',
            lastName: 'Doe',
            accounts: [
                {
                    '@id': 'contact/a',
                    '@type': 'Contact',
                    displayName: 'Contact A'
                },
                {
                    '@id': 'contact/b',
                    '@type': 'Contact',
                    displayName: 'Contact B'
                }
            ]
        });

        expect(graph.hasVertex('hr:johnd')).toEqual(true);
        expect(graph.hasVertex('hr:contact/a')).toEqual(true);
        expect(graph.hasVertex('hr:contact/b')).toEqual(true);

        const johnd = graph.getVertex('hr:johnd')!;
        expect(johnd.hasOutgoing('vocab:Entity/accounts')).toEqual(true);

        const accounts = [...johnd.getOutgoing('vocab:Entity/accounts')];
        expect(accounts.length).toEqual(2);
        expect(accounts[0].toVertex.id).toEqual('hr:contact/a');
        expect(accounts[0].toVertex.getAttributeValue('vocab:Entity/displayName')).toEqual('Contact A');
        expect(accounts[1].toVertex.id).toEqual('hr:contact/b');
        expect(accounts[1].toVertex.getAttributeValue('vocab:Entity/displayName')).toEqual('Contact B');
    });

    it('can load json values', async () => {
        const graph = new JsonldGraph();
        graph.addContext('http://example.org/hr', context);
        graph.setPrefix('vocab', 'http://example.org/hr/classes/');
        graph.setPrefix('hr', 'http://example.org/hr/instances/');

        await graph.load({
            '@context': [
                { '@base': 'http://example.org/hr/instances/' },
                'http://example.org/hr'
            ],
            '@id': 'johnd',
            'empData': {
                field1: 'value1',
                field2: 'value2'
            }
        });

        const johnd = graph.getVertex('hr:johnd')!;
        const data = johnd.getAttributeValue<{ field1: string; field2: string }>('vocab:Employee/data');
        expect(data).toBeTruthy();
        expect(typeof data).toEqual('object');
        expect(data.field1).toEqual('value1');
        expect(data.field2).toEqual('value2');
    });

    it('can merge multiple documents', async () => {
        const graph = new JsonldGraph();
        graph.addContext('http://example.org/hr', context);
        graph.setPrefix('vocab', 'http://example.org/hr/classes/');
        graph.setPrefix('hr', 'http://example.org/hr/instances/');

        const document1 = {
            '@context': [
                { '@base': 'http://example.org/hr/instances/' },
                'http://example.org/hr'
            ],
            '@id': 'johnd',
            firstName: 'John',
            lastName: 'Doe',
            description: {
                'en': 'en desc'
            }
        }

        const document2 = {
            '@context': [
                { '@base': 'http://example.org/hr/instances/' },
                'http://example.org/hr'
            ],
            '@id': 'johnd',
            firstName: 'John. D',
            name: 'johnd',
            description: {
                'fr': 'fr desc'
            }
        }

        await graph.load([document1, document2], { merge: true });
        const johnd = graph.getVertex('hr:johnd')!;
        expect(johnd.getAttributeValue('vocab:Employee/firstName')).toEqual('John. D');
        expect(johnd.getAttributeValue('vocab:Entity/name')).toEqual('johnd');
        expect(johnd.getAttributeValue('vocab:Entity/description', 'en')).toEqual('en desc');
        expect(johnd.getAttributeValue('vocab:Entity/description', 'fr')).toEqual('fr desc');
    });

    it('can load using base context', async () => {
        const graph = new JsonldGraph();
        graph.addContext('http://example.org/hr', context);
        graph.setPrefix('vocab', 'http://example.org/hr/classes/');
        graph.setPrefix('hr', 'http://example.org/hr/instances/');

        const document = {
            '@context': 'http://example.org/hr',
            '@id': 'johnd',
            firstName: 'John',
            lastName: 'Doe',
        };

        await graph.load(document, { base: 'http://example.org/hr/instances/' });
        expect(graph.hasVertex('http://example.org/hr/instances/johnd')).toEqual(true);
        expect(graph.hasVertex('hr:johnd')).toEqual(true);
    });

    it('can load using supplied context', async () => {
        const graph = new JsonldGraph();
        graph.addContext('http://example.org/hr', context);
        graph.setPrefix('vocab', 'http://example.org/hr/classes/');
        graph.setPrefix('hr', 'http://example.org/hr/instances/');

        const document = {
            '@id': 'http://example.org/hr/instances/johnd',
            firstName: 'John',
            lastName: 'Doe',
        };

        const customContext = {
            '@context': {
                firstName: 'http://example.org/other/fname',
                lastName: 'http://example.org/other/lname'
            }
        };

        await graph.load(document, { contexts: customContext });

        expect(graph.getVertex('hr:johnd')?.hasAttribute('http://example.org/other/fname')).toEqual(true);
        expect(graph.getVertex('hr:johnd')?.hasAttribute('http://example.org/other/lname')).toEqual(true);
    });

    it('can normalize blank types', async () => {
        const document = {
            '@context': [
                { '@base': 'http://example.org/hr/instances/' },
                'http://example.org/hr'
            ],
            '@id': 'johnd',
            firstName: 'John',
            lastName: 'Doe',
            manager: {
                '@id': 'janed',
                firstName: 'Jane',
                lastName: 'Doe'
            }
        };

        const graph = new JsonldGraph({
            blankTypeResolver: (vertex): string[] => {
                const incoming = vertex.getIncoming().first();
                if (incoming && incoming.label === 'vocab:Employee/manager') {
                    return ['vocab:Manager'];
                }
                return ['vocab:Employee'];
            }
        });
        graph.addContext('http://example.org/hr', context);
        graph.setPrefix('vocab', 'http://example.org/hr/classes/');
        graph.setPrefix('hr', 'http://example.org/hr/instances/');

        await graph.load(document, { normalize: true });

        expect(graph.getVertex('hr:johnd')?.isType('vocab:Employee')).toEqual(true);
        expect(graph.getVertex('hr:janed')?.isType('vocab:Manager')).toEqual(true);
        expect(graph.blankTypes.count()).toEqual(0);
    });

    it('can normalize blank ids', async () => {
        const document = {
            '@context': [
                { '@base': 'http://example.org/hr/instances/' },
                'http://example.org/hr'
            ],
            '@id': 'johnd',
            firstName: 'John',
            lastName: 'Doe',
            address: {
                street: 'Sunshine Street',
                city: 'LA',
                state: 'CA',
                zip: '11111'
            },
            manager: {
                name: 'janed',
                firstName: 'Jane',
                lastName: 'Doe',
                address: {
                    street: 'Sunshine Street',
                    city: 'LA',
                    state: 'CA',
                    zip: '11111'
                }
            }
        };

        const graph = new JsonldGraph({
            blankIdResolver: (vertex): string => {
                const name = vertex.getAttributeValue("vocab:Entity/name") || shortid();
                const parent = vertex.getIncoming().first();
                if (!parent) {
                    return name;
                } else {
                    return `${parent.fromVertex.id}:${name}`
                }
            }
        });

        graph.addContext('http://example.org/hr', context);
        graph.setPrefix('vocab', 'http://example.org/hr/classes/');
        graph.setPrefix('hr', 'http://example.org/hr/instances/');

        await graph.load(document, { normalize: true });

        expect(graph.hasVertex('hr:johnd:janed')).toEqual(true);

        expect(graph
            .getVertex('hr:johnd')!
            .getOutgoing('vocab:Contact/address')
            .first()
            .toVertex.id.startsWith('hr:johnd')).toEqual(true);

        expect(graph
            .getVertex('hr:johnd:janed')!
            .getOutgoing('vocab:Contact/address')
            .first()
            .toVertex.id.startsWith('hr:johnd:janed')).toEqual(true);

        expect(graph.blankNodes.count()).toEqual(0);
    });
});