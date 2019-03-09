import 'mocha';
import * as fs from 'fs';
import * as path from 'path';

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
    });

    it('should ', async () => {
        expect(graph.vertexCount).to.be.greaterThan(0);
        expect(graph.edgeCount).to.be.greaterThan(0);

        // Get a specific vertex and validate that it got parsed correctly.
        const yoda = graph.getVertex(makeId('Person/yoda'));
        expect(yoda).to.be.ok;
        expect(yoda.getAttributeValue(makeTypeId('Entity/name'))).to.equal('yoda');
        expect(yoda.getAttributeValue(makeTypeId('Entity/displayName'))).to.equal('Yoda');
        expect(yoda.getAttributeValue(makeTypeId('Person/birthYear'))).to.equal('896BBY');

        // Get a specific vertex and its outgoing relationship
        const luke_residences = graph.getVertex(makeId('Person/luke_skywalker'))
            .getOutgoing(makeTypeId('Person/residence'))
            .map(x => x.toVertex.id)
            .items();

        expect(luke_residences.length).to.equal(1);
        expect(luke_residences[0]).to.equal(makeId('Planet/Tatooine'));

        // Inverse of above, get the incoming relationships for
        const tatooine_residents = graph.getVertex(luke_residences[0])
            .getIncoming(makeTypeId('Person/residence'))
            .map(x => x.fromVertex.id)
            .items();

        expect(tatooine_residents.length).to.be.greaterThan(0);
        expect(tatooine_residents.some(x => x === makeId('Person/luke_skywalker'))).to.be.true;

        // Get filtered edges 
        const residents_in_mountains = graph
            .getEdges(makeTypeId('Person/residence'))
            .filter(x => x.toVertex.hasAttributeValue(makeTypeId('Planet/terrain'), 'mountains'))
            .map(x => x.fromVertex.id)
            .items();
 
        expect(residents_in_mountains.length).to.be.greaterThan(0);
        expect(residents_in_mountains.some(x => x === makeId('Person/r2_d2'))).to.be.true;
    });



    function makeId(id: string) {
        return `http://alt.universe.net/graph/${id}`;
    }

    function makeTypeId(id: string) {
        return `http://alt.universe.net/classes/${id}`
    }
});