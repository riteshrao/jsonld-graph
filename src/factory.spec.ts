import GraphTypeFactory from './factory';
import Vertex from './vertex';
jest.mock('./vertex');

describe('GraphTypeFactory', () => {
    let graph: any;
    let factory: GraphTypeFactory;

    beforeAll(() => {
        graph = {};
        factory = new GraphTypeFactory();
    });

    afterAll(() => {
        (Vertex as any).clearMock();
    });

    describe('.createVertex', () => {
        it('should throw when vertex id is null, empty or undefined', () => {
            expect(() => factory.createVertex(null as any, graph)).toThrow(ReferenceError);
            expect(() => factory.createVertex('', graph)).toThrow(ReferenceError);
            expect(() => factory.createVertex(undefined as any, graph)).toThrow(ReferenceError);
        });

        it('should throw when graph is null or undefined', () => {
            expect(() => factory.createVertex('foo', null as any)).toThrow(ReferenceError);
            expect(() => factory.createVertex('foo', undefined as any)).toThrow(ReferenceError);
        });

        it('should create vertex', () => {
            const vertex = factory.createVertex('foo', graph);
            expect(vertex).toBeTruthy();
            expect(vertex.setType).toHaveBeenCalledTimes(0)
        });
    });
});