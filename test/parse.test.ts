// tslint:disable-next-line:no-import-side-effect
import 'mocha';
import * as fs from 'fs';

import { expect } from 'chai';
import { JsonldGraph } from '../src';

describe('JsonldGraph parse', () => {
    it('works', async () => {
        const context = JSON.parse(fs.readFileSync('./sample/context.json', { encoding: 'utf8' }));
        const persons = JSON.parse(fs.readFileSync('./sample/persons.json', { encoding: 'utf8' }));
        const planets = JSON.parse(fs.readFileSync('./sample/planets.json', { encoding: 'utf8' }));

        const graph = new JsonldGraph([{ uri: 'http://alt.universe.net/context.json', context }]);

        graph.addPrefix('persons', 'http://alt.universe.net/graph/Person');
        graph.addPrefix('planets', 'http://alt.universe.net/graph/Planet');
        graph.addPrefix('entity', 'http://alt.universe.net/classes/Entity');
        graph.addPrefix('person', 'http://alt.universe.net/classes/Person');
        graph.addPrefix('planet', 'http://alt.universe.net/classes/Planet');
        graph.addPrefix('class', 'http://alt.universe.net/classes/');

        const personVertices = await graph.load(persons);
        const planetVertices = await graph.load(planets);

        expect(personVertices.size).to.be.greaterThan(0);
        expect(planetVertices.size).to.be.greaterThan(0);
        expect(personVertices.has('persons:luke_skywalker')).to.eq(true);
        expect(planetVertices.has('planets:Aleen')).to.eq(true);
        expect(planetVertices.has('planets:Alderaan')).to.eq(false); // Loaded as part of persons

        expect(graph.vertexCount).to.be.greaterThan(0);
        expect(graph.edgeCount).to.be.greaterThan(0);

        // // Get a specific vertex and validate that it got parsed correctly.
        const yoda = graph.getVertex('persons:yoda');
        expect(yoda).to.be.ok;
        expect(yoda.getAttributeValue('entity:name')).to.equal('yoda');
        expect(yoda.getAttributeValue('entity:displayName')).to.equal('Yoda');
        expect(yoda.getAttributeValue('entity:displayName', 'fr')).to.equal('Yodå');
        expect(yoda.getAttributeValue('person:birthYear')).to.equal('896BBY');

        // Get a specific vertex and its outgoing relationship
        const lukeResidences = graph
            .getVertex('persons:luke_skywalker')
            .getOutgoing('person:residence')
            .map(x => x.toVertex.id)
            .items();

        expect(lukeResidences.length).to.equal(1);
        expect(lukeResidences[0]).to.equal('planets:Tatooine');

        // Inverse of above, get the incoming relationships for a specific vertex
        const tatooineResidents = graph
            .getVertex(lukeResidences[0])
            .getIncoming('person:residence')
            .map(x => x.fromVertex.id)
            .items();

        expect(tatooineResidents.length).to.be.greaterThan(0);
        expect(tatooineResidents.some(x => x === 'persons:luke_skywalker')).to.be.true;

        // Empty string and number test
        const unknownPerson = graph.getVertex('persons:unknown');
        expect(unknownPerson.getAttributeValue('person:code')).to.equal(0);
        expect(unknownPerson.getAttributeValue('entity:name')).to.equal('');
    });
});
