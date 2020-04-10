import JsonldGraph from "./graph";

describe('.load', () => {
    let graph: JsonldGraph;
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
            empData: { '@id': 'Employee/data', '@type': '@json' },
            address: { '@id': 'Contact/address', '@container': '@index' },
            accounts: { '@id': 'Entity/accounts' },
            street: 'Contact/address/street',
            city: 'Contact/address/city',
            state: 'Contact/address/state',
            zip: 'Contact/address/zip'
        }
    };

    beforeEach(() => {
        graph = new JsonldGraph();
        graph.addContext('http://example.org/hr', context);
        graph.setPrefix('vocab', 'http://example.org/hr/classes/');
        graph.setPrefix('hr', 'http://example.org/hr/instances/');
    });

    it('can load a single entity', async () => {
        await graph.load({
            '@context': 'http://example.org/hr',
            '@id': 'http://example.org/hr/instances/johnd',
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
        await graph.load({
            '@context': 'http://example.org/hr',
            '@graph': [
                {
                    '@id': 'http://example.org/hr/instances/johnd',
                    '@type': 'Employee',
                    firstName: 'John',
                    lastName: 'Doe'
                },
                {
                    '@id': 'http://example.org/hr/instances/janed',
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
        await graph.load([
            {
                '@context': 'http://example.org/hr',
                '@id': 'http://example.org/hr/instances/johnd',
                '@type': 'Employee',
                firstName: 'John',
                lastName: 'Doe'
            },
            {
                '@context': 'http://example.org/hr',
                '@id': 'http://example.org/hr/instances/janed',
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
});