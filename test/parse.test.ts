import 'mocha';
import * as fs from 'fs';

import { expect } from 'chai';
import { JsonldGraph } from '../src';

describe('JsonldGraph parse', () => {
    let graph: JsonldGraph;

    before(async () => {
        const context = JSON.parse(fs.readFileSync('./sample/context.json', { encoding: 'utf8' }));
        const persons = JSON.parse(fs.readFileSync('./sample/persons.json', { encoding: 'utf8' }));
        const planets = JSON.parse(fs.readFileSync('./sample/planets.json', { encoding: 'utf8' }));

        graph = new JsonldGraph([
            { uri: 'http://alt.universe.net/context.json', context }
        ]);

        await graph.load(persons);
        await graph.load(planets);

        graph.addPrefix('persons', 'http://alt.universe.net/graph/Person');
        graph.addPrefix('planets', 'http://alt.universe.net/graph/Planet');
        graph.addPrefix('entity', 'http://alt.universe.net/classes/Entity');
        graph.addPrefix('person', 'http://alt.universe.net/classes/Person');
        graph.addPrefix('planet', 'http://alt.universe.net/classes/Planet');
        graph.addPrefix('class', 'http://alt.universe.net/classes/');
    });

    it('works', async () => {
        expect(graph.vertexCount).to.be.greaterThan(0);
        expect(graph.edgeCount).to.be.greaterThan(0);

        // Get a specific vertex and validate that it got parsed correctly.
        const yoda = graph.getVertex('persons:yoda');
        expect(yoda).to.be.ok;
        expect(yoda.getAttributeValue('entity:name')).to.equal('yoda');
        expect(yoda.getAttributeValue('entity:displayName')).to.equal('Yoda');
        expect(yoda.getAttributeValue('person:birthYear')).to.equal('896BBY');

        // Get a specific vertex and its outgoing relationship
        const luke_residences = graph.getVertex('persons:luke_skywalker')
            .getOutgoing('person:residence')
            .map(x => x.toVertex.id)
            .items();

        expect(luke_residences.length).to.equal(1);
        expect(luke_residences[0]).to.equal('planets:Tatooine');

        // Inverse of above, get the incoming relationships for a specific vertex
        const tatooine_residents = graph.getVertex(luke_residences[0])
            .getIncoming('person:residence')
            .map(x => x.fromVertex.id)
            .items();

        expect(tatooine_residents.length).to.be.greaterThan(0);
        expect(tatooine_residents.some(x => x === 'persons:luke_skywalker')).to.be.true;

        // Get filtered edges 
        const residents_in_mountains = graph
            .getEdges('person:residence')
            .filter(x => x.toVertex.hasAttributeValue('planet:terrain', 'mountains'))
            .map(x => x.fromVertex.id)
            .items();

        expect(residents_in_mountains.length).to.be.greaterThan(0);
        expect(residents_in_mountains.some(x => x === 'persons:r2_d2')).to.be.true;

        // Find types instances and find all types that refer to it
        const types_relating_to_planet_type = graph.getVertex('class:Planet')
            .instances
            .mapMany(x => x.getIncoming())
            .mapMany((x) => x.fromVertex.types)
            .map(x => x.id)
            .distinct()
            .items();

            console.log(types_relating_to_planet_type);
        expect(types_relating_to_planet_type.length).to.be.greaterThan(0);
        expect(types_relating_to_planet_type.some(x => x === 'class:Person')).to.be.true;
    });
});