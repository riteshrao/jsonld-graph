import Edge from './edge';
import JsonldGraph from './graph';

describe('Edge', () => {
    let graph: JsonldGraph;

    beforeEach(() => {
        graph = new JsonldGraph();
        jest.spyOn(graph, 'compactIRI').mockImplementation((id: string) => {
            if (id.startsWith('http://example.org/test/')) {
                return id.replace('http://example.org/test/', 'test:')
            } else {
                return id;
            }
        });
    });

    afterAll(() => {
        jest.resetAllMocks();
    });

    describe('.ctor', () => {
        it('should throw when arguments are invalid', () => {
            const args = [
                [undefined as any, {}, {}, graph],
                [null as any, {}, {}, graph],
                ['', {}, {}, graph],
                ['http:///example.org/test/foo', null, {}, graph],
                ['http:///example.org/test/foo', undefined, {}, graph],
                ['http:///example.org/test/foo', {}, null, graph],
                ['http:///example.org/test/foo', {}, undefined, graph],
                ['http:///example.org/test/foo', {}, {}, null],
                ['http:///example.org/test/foo', null, {}, undefined]
            ];

            for (const [iri, from, to, graph] of args) {
                expect(() => new Edge(iri, from, to, graph)).toThrow(ReferenceError);
            }
        });
    });

    describe('.label', () => {
        it('should return iri when no prefix matches', () => {
            const edge = new Edge('http://example.org/other/label', {} as any, {} as any, graph);
            expect(edge.label).toEqual('http://example.org/other/label');
        });

        it('should return compact iri on prefix match', () => {
            const edge = new Edge('http://example.org/test/label', {} as any, {} as any, graph);
            expect(edge.label).toEqual('test:label');
        });
    });
});