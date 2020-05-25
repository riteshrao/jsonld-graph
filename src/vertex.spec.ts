import Vertex from './vertex';
import JsonldGraph from './graph';
import * as errors from './errors';
import Iterable from 'jsiterable';

jest.mock('./graph');

describe('Vertex', () => {
    let graph: JsonldGraph;

    beforeEach(() => {
        graph = new JsonldGraph();
        jest.spyOn(graph, 'expandIRI').mockImplementation((id: string) => {
            if (id.startsWith('test:')) {
                return id.replace('test:', 'http://example.org/test/');
            } else {
                return id;
            }
        });

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
        it('should throw when constructor arguments is invalid', () => {
            const args = [
                [null as any, graph],
                [undefined as any, graph],
                ['', graph],
                ['urn:test:instance', null],
                ['urn:test:instance', undefined]
            ]

            for (const [id, graph] of args) {
                expect(() => new Vertex(id, graph)).toThrow(ReferenceError);
            }
        });
    })

    describe('.isBlankNode', () => {
        it('should return true when id starts with a blank node prefix', () => {
            const vertex = new Vertex('_:b1', {} as any);
            expect(vertex.isBlankNode).toEqual(true);
        });

        it('should return false when id does not start with blank node prefix', () => {
            const vertex = new Vertex('test:1', {} as any);
            expect(vertex.isBlankNode).toEqual(false);
        });
    });

    describe('.appendAttributeValue', () => {
        let vertex: Vertex;

        beforeEach(() => {
            vertex = new Vertex('http://example.org/instace/a', graph);
        });

        it('should throw reference error when arguments are invalid', () => {
            const args = [
                [null as any, 100],
                [undefined as any, 100],
                ['' as any, 100],
                ['test:1', null],
                ['test:2', undefined]
            ];

            for (const [name, value] of args) {
                expect(() => vertex.appendAttributeValue(name, value)).toThrow(ReferenceError);
            }
        });

        it('should throw type error when language is specified and value is not string', () => {
            expect(() => vertex.appendAttributeValue('test:1', 1, "en")).toThrow(TypeError);
        });

        it('should add new attribute', () => {
            vertex.appendAttributeValue('test:1', '100');
            vertex.appendAttributeValue('http://example.org/test/2', 100);
            const attributes = [...vertex.getAttributes()];
            expect(attributes.length).toEqual(2);
            expect(attributes[0].name).toEqual('test:1');
            expect(attributes[0].values.length).toEqual(1);
            expect(attributes[0].values[0].value).toEqual('100');
            expect(attributes[1].name).toEqual('test:2');
            expect(attributes[1].values.length).toEqual(1);
            expect(attributes[1].values[0].value).toEqual(100);
        });

        it('should append value to existing attribute', () => {
            vertex.appendAttributeValue('test:1', '100');
            vertex.appendAttributeValue('test:1', '200');
            vertex.appendAttributeValue('http://example.org/test/1', 300);
            const attributes = [...vertex.getAttributes()];
            expect(attributes.length).toEqual(1);
            expect(attributes[0].name).toEqual('test:1');
            expect(attributes[0].values.length).toEqual(3);
            expect(attributes[0].values[0].value).toEqual('100');
            expect(attributes[0].values[1].value).toEqual('200');
            expect(attributes[0].values[2].value).toEqual(300);
        });

        it('should add new localized attribute value', () => {
            vertex.appendAttributeValue('test:1', 'a', 'en');
            vertex.appendAttributeValue('http://example.org/test/1', 'b', 'fr');
            const attributes = [...vertex.getAttributes()];
            expect(attributes.length).toEqual(1)
            expect(attributes[0].name).toEqual('test:1');
            expect(attributes[0].values.length).toEqual(2);
            expect(attributes[0].values[0].value).toEqual('a');
            expect(attributes[0].values[0].language).toEqual('en');
            expect(attributes[0].values[1].value).toEqual('b');
            expect(attributes[0].values[1].language).toEqual('fr');
        });

        it('should append new localized attribute value', () => {
            vertex.appendAttributeValue('test:1', 'a');
            vertex.appendAttributeValue('test:1', 'a', 'en');
            vertex.appendAttributeValue('http://example.org/test/1', 'a', 'fr');
            const attributes = [...vertex.getAttributes()];
            expect(attributes.length).toEqual(1)
            expect(attributes[0].name).toEqual('test:1');
            expect(attributes[0].values.length).toEqual(3);
            expect(attributes[0].values[0].value).toEqual('a');
            expect(attributes[0].values[1].value).toEqual('a');
            expect(attributes[0].values[1].language).toEqual('en');
            expect(attributes[0].values[2].value).toEqual('a');
            expect(attributes[0].values[2].language).toEqual('fr');
        });

        it('should replace existing localized attribute value', () => {
            vertex.appendAttributeValue('test:1', 'a', 'en');
            vertex.appendAttributeValue('test:1', 'b', 'en');
            const attributes = [...vertex.getAttributes()];
            expect(attributes.length).toEqual(1)
            expect(attributes[0].name).toEqual('test:1');
            expect(attributes[0].values.length).toEqual(1);
            expect(attributes[0].values[0].value).toEqual('b');
            expect(attributes[0].values[0].language).toEqual('en');
        });
    });

    describe('.deleteAttribute', () => {
        let vertex: Vertex;

        beforeEach(() => {
            vertex = new Vertex('http://example.org/instance/a', graph);
            vertex.appendAttributeValue('test:attribute', 'a');
            vertex.appendAttributeValue('test:attribute', 'b');
        });

        it('should throw when attribute name is null, empty or undefined', () => {
            expect(() => vertex.deleteAttribute(null as any)).toThrow(ReferenceError);
            expect(() => vertex.deleteAttribute(undefined as any)).toThrow(ReferenceError);
            expect(() => vertex.deleteAttribute('')).toThrow(ReferenceError);
        });

        it('should delete all values of attribute using short id', () => {
            vertex.deleteAttribute('test:attribute');
            expect(vertex.hasAttribute('test:attribute'));
        });

        it('should delete all values of attribute using qualified iri', () => {
            vertex.deleteAttribute('http://example.org/test/attribute');
            expect(vertex.hasAttribute('test:attribute')).toEqual(false);
            expect(vertex.hasAttribute('http://example.org/test/attribute')).toEqual(false);
        });
    });

    describe('.deleteAttributeValue', () => {
        let vertex: Vertex;

        beforeEach(() => {
            vertex = new Vertex('http://example.org/instances/a', graph);
            vertex.appendAttributeValue('test:simple', 'a');
            vertex.appendAttributeValue('test:simple', 'b');
            vertex.appendAttributeValue('test:simple', 'a', 'en');
            vertex.appendAttributeValue('test:simple', 'b', 'de');
            vertex.appendAttributeValue('test:simple', 'c', 'fr');
        });

        it('should throw when attribute name is null, undefined or empty', () => {
            expect(() => vertex.deleteAttributeValue(null as any, 'a')).toThrow(ReferenceError);
            expect(() => vertex.deleteAttributeValue(undefined as any, 'a')).toThrow(ReferenceError);
            expect(() => vertex.deleteAttributeValue('', 'a')).toThrow(ReferenceError);
        });

        it('should throw when value is null or undefined', () => {
            expect(() => vertex.deleteAttributeValue('test:simple', null as any)).toThrow(ReferenceError);
            expect(() => vertex.deleteAttributeValue('test:simple', undefined as any)).toThrow(ReferenceError);
        });

        it('should throw when language is not a valid string', () => {
            expect(() => vertex.deleteAttributeValue('test:simple', 'c', 1 as any)).toThrow(TypeError);
        });

        it('should remove all matching values', () => {
            vertex.deleteAttributeValue('test:simple', 'a');
            expect(vertex.hasAttributeValue('test:simple', 'a')).toEqual(false);
            expect(vertex.hasAttributeValue('test:simple', 'a', 'en')).toEqual(false);
            expect(vertex.hasAttributeValue('test:simple', 'b')).toEqual(true);
            expect(vertex.hasAttributeValue('test:simple', 'b', 'de')).toEqual(true);
            expect(vertex.hasAttributeValue('test:simple', 'c')).toEqual(true);
        });

        it('should remove only language specific value', () => {
            vertex.deleteAttributeValue('test:simple', 'a', 'en');
            expect(vertex.hasAttributeValue('test:simple', 'a', 'en')).toEqual(false);
            expect(vertex.hasAttributeValue('test:simple', 'a')).toEqual(true);
        });

        it('should remove nothing when no value matches', () => {
            vertex.deleteAttributeValue('test:simple', 'foo');
            vertex.deleteAttributeValue('test:simple', 'bar', 'fr');
            expect(vertex.getAttributes().count()).toEqual(1);
            expect(vertex.getAttributeValues('test:simple').count()).toEqual(5);
        });
    });

    describe('.getAttributeValue', () => {
        let vertex: Vertex;

        beforeEach(() => {
            vertex = new Vertex('http://example.org/instance/a', graph);
            vertex.appendAttributeValue('test:a', 1);
            vertex.appendAttributeValue('test:b', 2);
            vertex.appendAttributeValue('test:lang', 'a', 'en');
            vertex.appendAttributeValue('test:lang', 'b', 'fr');
        });

        it('should throw when name is null, undefined or empty', () => {
            expect(() => vertex.getAttributeValue(null as any)).toThrow(ReferenceError);
            expect(() => vertex.getAttributeValue(undefined as any)).toThrow(ReferenceError);
            expect(() => vertex.getAttributeValue('')).toThrow(ReferenceError);
        });

        it('should return undefined for non existent attribute', () => {
            expect(vertex.getAttributeValue('test:x')).toBeUndefined();
        });

        it('should return the first attribute value', () => {
            expect(vertex.getAttributeValue('test:a')).toEqual(1);
            expect(vertex.getAttributeValue('test:lang')).toEqual('a');
        });

        it('should return the first language specific value', () => {
            expect(vertex.getAttributeValue('test:lang', 'fr')).toEqual('b')
        });
    });

    describe('.getAttributeValues', () => {
        let vertex: Vertex;

        beforeEach(() => {
            vertex = new Vertex('http://example.org/instance/a', graph);
            vertex.appendAttributeValue('test:a', 1);
            vertex.appendAttributeValue('test:a', 2);
            vertex.appendAttributeValue('test:lang', 'a', 'en');
            vertex.appendAttributeValue('test:lang', 'b', 'fr');
        });

        it('should throw reference error when attribute name is null, undefined or empty', () => {
            expect(() => vertex.getAttributeValues(null as any)).toThrow(ReferenceError);
            expect(() => vertex.getAttributeValues(undefined as any)).toThrow(ReferenceError);
            expect(() => vertex.getAttributeValues('')).toThrow(ReferenceError);
        });

        it('should return empty when attribute does not exist', () => {
            expect([...vertex.getAttributeValues('test:x')].length).toEqual(0);
        });

        it('should return all attribute values', () => {
            const values = [...vertex.getAttributeValues('test:a')];
            expect(values.length).toEqual(2);
            expect(values[0].value).toEqual(1);
            expect(values[1].value).toEqual(2);
        });

        it('should return all localized attribute values', () => {
            const values = [...vertex.getAttributeValues('test:lang')];
            expect(values.length).toEqual(2);
            expect(values[0].language).toEqual('en');
            expect(values[0].value).toEqual('a')
            expect(values[1].language).toEqual('fr');
            expect(values[1].value).toEqual('b');
        });
    });

    describe('.getIncoming', () => {
        let vertex: Vertex;
        let typeV: Vertex;
        let outgoingV: Vertex;

        beforeEach(() => {
            vertex = new Vertex('http://example.org/instance/a', graph);
            typeV = new Vertex('http://example.org/instance/type', graph);
            outgoingV = new Vertex('http://example.org/instance/outgoing', graph);
            jest.spyOn(graph, 'getIncomingEdges').mockImplementation((vertex, label) => {
                const labelIRI = label?.replace('test:', 'http://example.org/test/');
                if (vertex !== 'http://example.org/instance/a') {
                    return Iterable.empty();
                }

                if (labelIRI === 'http://example.org/test/types') {
                    return new Iterable([
                        {
                            iri: labelIRI,
                            label,
                            from: typeV,
                            to: vertex
                        }
                    ]) as any;
                } else {
                    return new Iterable([
                        {
                            iri: 'http://example.org/test/types',
                            label: 'test:types',
                            from: typeV,
                            to: vertex
                        },
                        {
                            iri: 'http://example.org/test/outgoing',
                            label: 'test:outgoing',
                            from: outgoingV,
                            to: vertex
                        }
                    ]) as any;
                }
            });
        });

        it('should return empty when vertex has no incoming', () => {
            const incoming = [...outgoingV.getIncoming()];
            expect(incoming.length).toEqual(0);
        });

        it('should return all incoming', () => {
            const incoming = [...vertex.getIncoming()];
            expect(incoming.length).toEqual(2);
            expect(incoming.find(x => x.iri === 'http://example.org/test/types')).not.toBeUndefined();
            expect(incoming.find(x => x.iri === 'http://example.org/test/outgoing')).not.toBeUndefined();
            expect(incoming.find(x => x.iri === 'http://example.org/test/types')?.from).toEqual(typeV);
            expect(incoming.find(x => x.iri === 'http://example.org/test/outgoing')?.from).toEqual(outgoingV);
        });

        it('should return filtered incoming', () => {
            const incoming = [...vertex.getIncoming('test:types')];
            expect(incoming.length).toEqual(1);
            expect(incoming[0].iri).toEqual('http://example.org/test/types');
            expect(incoming[0].label).toEqual('test:types');
            expect(incoming[0].from).toEqual(typeV);
        });
    });

    describe('.getOutgoing', () => {
        let vertex: Vertex;
        let typeV: Vertex;
        let outgoingV: Vertex;

        beforeEach(() => {
            vertex = new Vertex('http://example.org/test/instance/a', graph);
            typeV = new Vertex('http://example.org/test/instance/type', graph);
            outgoingV = new Vertex('http://example.org/test/instance/outgoing', graph);
            jest.spyOn(graph, 'getOutgoingEdges').mockImplementation((id, label) => {
                const labelIRI = label?.replace('test:', 'http://example.org/test/');
                if (id !== 'http://example.org/test/instance/a') {
                    return Iterable.empty();
                }

                if (labelIRI === 'http://example.org/test/types') {
                    return new Iterable([
                        { iri: labelIRI, label, from: vertex, to: typeV }
                    ]) as any;
                } else {
                    return new Iterable([
                        {
                            iri: 'http://example.org/test/types',
                            label: 'test:types',
                            from: vertex,
                            to: typeV
                        },
                        {
                            iri: 'http://example.org/test/outgoing',
                            label: 'test:outgoing',
                            from: vertex,
                            to: outgoingV
                        }
                    ]) as any;
                }
            });
        });

        it('should return empty when vertex has no outgoing', () => {
            const incoming = [...outgoingV.getOutgoing()];
            expect(incoming.length).toEqual(0);
        });

        it('should return all outgoing', () => {
            const incoming = [...vertex.getOutgoing()];
            expect(incoming.length).toEqual(2);
            expect(incoming.find(x => x.iri === 'http://example.org/test/types')).not.toBeUndefined();
            expect(incoming.find(x => x.iri === 'http://example.org/test/outgoing')).not.toBeUndefined();
            expect(incoming.find(x => x.iri === 'http://example.org/test/types')?.to).toEqual(typeV);
            expect(incoming.find(x => x.iri === 'http://example.org/test/outgoing')?.to).toEqual(outgoingV);
        });

        it('should return filtered outgoing', () => {
            const incoming = [...vertex.getOutgoing('test:types')];
            expect(incoming.length).toEqual(1);
            expect(incoming[0].iri).toEqual('http://example.org/test/types');
            expect(incoming[0].label).toEqual('test:types');
            expect(incoming[0].to).toEqual(typeV);
        });
    });

    describe('.getTypes', () => {
        let vertex: Vertex;
        let typeAV: Vertex;
        let typeBV: Vertex;
        let nonTypeV: Vertex;

        beforeEach(() => {
            vertex = new Vertex('http://example.org/test/instance/a', graph);
            typeAV = new Vertex('http://example.org/test/type/a', graph);
            typeBV = new Vertex('http://example.org/test/type/b', graph);
            nonTypeV = new Vertex('http://example.org/test/instance/b', graph);
            jest.spyOn(graph, 'getOutgoingEdges').mockImplementation((id, label) => {
                if (id !== 'http://example.org/test/instance/a') {
                    return Iterable.empty();
                }

                if (label === '@type') {
                    return new Iterable([
                        { iri: '@type', label, from: vertex, to: typeAV },
                        { iri: '@type', label, from: vertex, to: typeBV }
                    ]) as any;
                } else {
                    return new Iterable([
                        {
                            iri: 'http://example.org/test/types',
                            label: 'test:types',
                            from: vertex,
                            to: typeAV
                        },
                        {
                            iri: 'http://example.org/test/types',
                            types: 'test:types',
                            from: vertex,
                            to: typeBV
                        },
                        {
                            iri: 'http://example.org/test/outgoing',
                            label: 'test:ougoing',
                            from: vertex,
                            to: nonTypeV
                        }
                    ]) as any;
                }
            });
        });

        it('should return empty when vertex has no types', () => {
            expect([...nonTypeV.getTypes()].length).toEqual(0);
        });

        it('should return all types', () => {
            const types = [...vertex.getTypes()];
            expect(types.length).toEqual(2);
            expect(types.some(x => x.id === 'test:type/a')).toEqual(true);
            expect(types.some(x => x.id === 'test:type/b')).toEqual(true);
            expect(types.some(x => x.id === 'test:instance/b')).toEqual(false);
        });
    });

    describe('.hasAttribute', () => {
        let vertex: Vertex;

        beforeEach(() => {
            vertex = new Vertex('http://example.org/test/instances/a', graph);
            vertex.setAttributeValue('test:fname', 'John');
            vertex.setAttributeValue('http://example.org/test/lname', 'Doe');
        });

        it('should throw reference error when attribute name is not valid', () => {
            expect(() => vertex.hasAttribute(null as any)).toThrow(ReferenceError);
            expect(() => vertex.hasAttribute(undefined as any)).toThrow(ReferenceError);
            expect(() => vertex.hasAttribute('')).toThrow(ReferenceError);
        });

        it('should return false when attribute does not exist', () => {
            expect(vertex.hasAttribute('test:not:found')).toEqual(false);
        });

        it('should return true when attribute exists', () => {
            expect(vertex.hasAttribute('test:fname')).toEqual(true);
            expect(vertex.hasAttribute('test:lname')).toEqual(true);
        });
    });

    describe('.hasAttributeValue', () => {
        let vertex: Vertex;

        beforeEach(() => {
            vertex = new Vertex('http://example.org/test/instances/a', graph);
            vertex.appendAttributeValue('test:name', 'John');
            vertex.appendAttributeValue('test:name', 'Doe');
            vertex.appendAttributeValue('test:alias', 'jdoe', 'en');
            vertex.appendAttributeValue('test:alias', 'jdoe', 'fr');
            vertex.appendAttributeValue('test:alias', 'djoe', 'es');
        });

        it('should throw reference errror when attribute name or value is not valid', () => {
            const params = [
                [null as any, 'test'],
                [undefined as any, 'test'],
                ['', 'test'],
                ['test:name', undefined as any],
                ['test:name', null as any]
            ];

            for (const [name, value] of params) {
                expect(() => vertex.hasAttributeValue(name, value)).toThrow(ReferenceError);
            }
        });

        it('should throw type error when locale specific value is not of type string', () => {
            expect(() => vertex.hasAttributeValue('test:name', 1 as any, 'en')).toThrow(TypeError);
        });

        it('should return false when attribute does not exist', () => {
            expect(vertex.hasAttributeValue('test:not:found', 'a')).toEqual(false);
        });

        it('should return false when value is attribute value list', () => {
            expect(vertex.hasAttributeValue('test:name', 'bar')).toEqual(false);
        });

        it('should return true for value found in attribute value list', () => {
            expect(vertex.hasAttributeValue('test:name', 'John')).toEqual(true);
            expect(vertex.hasAttributeValue('test:alias', 'jdoe')).toEqual(true);
        });

        it('should return true for value found for locale', () => {
            expect(vertex.hasAttributeValue('test:alias', 'jdoe', 'en')).toEqual(true);
        });

        it('should return false for value not found in locale', () => {
            expect(vertex.hasAttributeValue('test:alias', 'jdoe', 'es')).toEqual(false);
        });
    });

    describe('.hasIncoming', () => {
        let vertex: Vertex;
        let incomingA: Vertex;
        let incomingB: Vertex;

        beforeEach(() => {
            vertex = new Vertex('http://example.org/test/instances/target', graph);
            incomingA = new Vertex('http://example.org/test/instances/inA', graph);
            incomingB = new Vertex('http://example.org/test/instances/inB', graph);

            jest.spyOn(graph, 'getIncomingEdges').mockImplementation((v, label): Iterable<any> => {
                if (v !== 'http://example.org/test/instances/target') {
                    return Iterable.empty();
                }

                const iri = label?.replace('test:', 'http://example.org/test/');
                if (iri === 'http://example.org/test/incoming') {
                    return new Iterable([
                        { iri, label, from: incomingA, to: vertex }
                    ]);
                } else if (!label) {
                    return new Iterable([
                        { iri, label, from: incomingA, to: vertex },
                        { iri, label, from: incomingB, to: vertex },
                    ]);
                } else {
                    return Iterable.empty()
                }
            });
        });

        it('should false if vertex has no incoming edges', () => {
            expect(incomingA.hasIncoming()).toEqual(false);
        });

        it('should return true for vertex with incoming edges', () => {
            expect(vertex.hasIncoming()).toEqual(true);
        });

        it('should return false when vertex has no incoming edges with specified label', () => {
            expect(vertex.hasIncoming('test:foo')).toEqual(false);
        });

        it('should return true when vertex has incoming edges with spcified label', () => {
            expect(vertex.hasIncoming('test:incoming')).toEqual(true);
        });

        it('should return false when vertex has no incoming edges with spcified label and vertex', () => {
            expect(vertex.hasIncoming('test:incoming', 'test:instances/inB')).toEqual(false);
        });

        it('should return true when vertex has incoming edges with spcified label and vertex', () => {
            expect(vertex.hasIncoming('test:incoming', 'test:instances/inA')).toEqual(true);
        });
    });

    describe('.hasOutgoing', () => {
        let vertex: Vertex;
        let targetA: Vertex;
        let targetB: Vertex;

        beforeEach(() => {
            vertex = new Vertex('http://example.org/test/instances/source', graph);
            targetA = new Vertex('http://example.org/test/instances/outA', graph);
            targetB = new Vertex('http://example.org/test/instances/outB', graph);

            jest.spyOn(graph, 'getOutgoingEdges').mockImplementation((v, label): Iterable<any> => {
                if (v !== 'http://example.org/test/instances/source') {
                    return Iterable.empty();
                }

                const iri = label?.replace('test:', 'http://example.org/test/');
                if (iri === 'http://example.org/test/outgoing') {
                    return new Iterable([
                        { iri, label, from: vertex, to: targetA }
                    ]);
                } else if (!label) {
                    return new Iterable([
                        { iri, label, from: vertex, to: targetA },
                        { iri, label, from: vertex, to: targetB },
                    ]);
                } else {
                    return Iterable.empty()
                }
            });
        });

        it('should false if vertex has no outging edges', () => {
            expect(targetA.hasOutgoing()).toEqual(false);
        });

        it('should return true for vertex with outgoing edges', () => {
            expect(vertex.hasOutgoing()).toEqual(true);
        });

        it('should return false when vertex has no outgoing edges with specified label', () => {
            expect(vertex.hasOutgoing('test:foo')).toEqual(false);
        });

        it('should return true when vertex has outgoing edges with spcified label', () => {
            expect(vertex.hasOutgoing('test:outgoing')).toEqual(true);
        });

        it('should return false when vertex has no outgoing edges with spcified label and vertex', () => {
            expect(vertex.hasOutgoing('test:outgoing', 'test:instances/notfound')).toEqual(false);
            expect(vertex.hasOutgoing('test:notfound', 'test:instances/outA')).toEqual(false);
        });

        it('should return true when vertex has incoming edges with spcified label and vertex', () => {
            expect(vertex.hasOutgoing('test:outgoing', 'test:instances/outA')).toEqual(true);
        });
    });

    describe('.isType', () => {
        let vertex: Vertex;
        let typeV: Vertex;

        beforeEach(() => {
            vertex = new Vertex('http://example.org/test/instance/a', graph);
            typeV = new Vertex('http://example.org/test/type/a', graph);
            jest.spyOn(graph, 'getOutgoingEdges').mockImplementation((id) => {
                if (id !== 'http://example.org/test/instance/a') {
                    return Iterable.empty();
                }

                return new Iterable([
                    { label: '@type', from: vertex, to: typeV }
                ]) as any;
            });
        });

        it('should throw when type id is null, undefined or empty string', () => {
            expect(() => vertex.isType(null as any)).toThrow(ReferenceError);
            expect(() => vertex.isType(undefined as any)).toThrow(ReferenceError);
            expect(() => vertex.isType('')).toThrow(ReferenceError);
        });

        it('should return false when vertex has no types', () => {
            expect(typeV.isType("test:type/a")).toEqual(false);
        });

        it('should return true when vertex is of specified type', () => {
            expect(vertex.isType('test:type/a')).toEqual(true);
            expect(vertex.isType('http://example.org/test/type/a')).toEqual(true);
        });
    });

    describe('.removeIncoming', () => {
        let vertex: Vertex;
        let outA: Vertex;
        let outB: Vertex;
        let outC: Vertex;

        beforeEach(() => {
            vertex = new Vertex('http://example.org/test/instance/target', graph);
            outA = new Vertex('http://example.org/test/instance/outA', graph);
            outB = new Vertex('http://example.org/test/instance/outB', graph);
            outC = new Vertex('http://example.org/test/instance/outC', graph);
            jest.spyOn(graph, 'getIncomingEdges').mockImplementation((id) => {
                if (id !== 'http://example.org/test/instance/target') {
                    return Iterable.empty()
                }

                return new Iterable([
                    { iri: 'http://example.org/test/type', label: 'test:type', from: outA, to: vertex },
                    { iri: 'http://example.org/test/incoming', label: 'test:incoming', from: outB, to: vertex },
                    { iri: 'http://example.org/test/incoming', label: 'test:incoming', from: outC, to: vertex },
                ]) as any;
            });
        });

        it('should remove all incoming', () => {
            const removeStub = jest.spyOn(graph, 'removeEdge');
            vertex.removeIncoming();

            expect(removeStub).toHaveBeenCalledTimes(3);
            expect(removeStub).toHaveBeenCalledWith(expect.objectContaining({
                label: 'test:type',
                from: outA,
                to: vertex
            }));

            expect(removeStub).toHaveBeenCalledWith(expect.objectContaining({
                label: 'test:incoming',
                from: outB,
                to: vertex
            }));
        });

        it('should remove all incoming edges with specified label', () => {
            const removeStub = jest.spyOn(graph, 'removeEdge');
            vertex.removeIncoming('test:incoming');

            expect(removeStub).toHaveBeenCalledTimes(2);

            expect(removeStub).toHaveBeenCalledWith(expect.objectContaining({
                label: 'test:incoming',
                from: outB,
                to: vertex
            }));

            expect(removeStub).toHaveBeenCalledWith(expect.objectContaining({
                label: 'test:incoming',
                from: outC,
                to: vertex
            }));
        });

        it('should remove incoming edges matching specified filter', () => {
            const removeStub = jest.spyOn(graph, 'removeEdge');
            vertex.removeIncoming('test:incoming', 'test:instance/outB');
            vertex.removeIncoming('test:incoming', v => v.iri === 'http://example.org/test/instance/outC');

            expect(removeStub).toHaveBeenCalledTimes(2);

            expect(removeStub).toHaveBeenCalledWith(expect.objectContaining({
                label: 'test:incoming',
                from: outB,
                to: vertex
            }));

            expect(removeStub).toHaveBeenCalledWith(expect.objectContaining({
                label: 'test:incoming',
                from: outC,
                to: vertex
            }));
        });
    });

    describe('.removeOutgoing', () => {
        let vertex: Vertex;
        let inA: Vertex;
        let inB: Vertex;
        let inC: Vertex;

        beforeEach(() => {
            vertex = new Vertex('http://example.org/test/instance/source', graph);
            inA = new Vertex('http://example.org/test/instance/inA', graph);
            inB = new Vertex('http://example.org/test/instance/inB', graph);
            inC = new Vertex('http://example.org/test/instance/inC', graph);
            jest.spyOn(graph, 'getOutgoingEdges').mockImplementation((id) => {
                if (id !== 'http://example.org/test/instance/source') {
                    return Iterable.empty()
                }

                return new Iterable([
                    { iri: 'http://example.org/test/type', label: 'test:type', from: vertex, to: inA },
                    { iri: 'http://example.org/test/outgoing', label: 'test:outgoing', from: vertex, to: inB },
                    { iri: 'http://example.org/test/outgoing', label: 'test:outgoing', from: vertex, to: inC },
                ]) as any;
            });
        });

        it('should remove all outgoing', () => {
            const removeStub = jest.spyOn(graph, 'removeEdge');
            vertex.removeOutgoing();

            expect(removeStub).toHaveBeenCalledTimes(3);

            expect(removeStub).toHaveBeenCalledWith(expect.objectContaining({
                label: 'test:type',
                from: vertex,
                to: inA
            }));

            expect(removeStub).toHaveBeenCalledWith(expect.objectContaining({
                label: 'test:outgoing',
                from: vertex,
                to: inB
            }));
        });

        it('should remove all outgoing edges with specified label', () => {
            const removeStub = jest.spyOn(graph, 'removeEdge');
            vertex.removeOutgoing('test:outgoing');

            expect(removeStub).toHaveBeenCalledTimes(2);

            expect(removeStub).toHaveBeenCalledWith(expect.objectContaining({
                label: 'test:outgoing',
                from: vertex,
                to: inB
            }));

            expect(removeStub).toHaveBeenCalledWith(expect.objectContaining({
                label: 'test:outgoing',
                from: vertex,
                to: inC
            }));
        });

        it('should remove outgoing edges matching specified filter', () => {
            const removeStub = jest.spyOn(graph, 'removeEdge');
            vertex.removeOutgoing('test:outgoing', 'test:instance/inB')
            vertex.removeOutgoing('test:outgoing', v => v.id === 'test:instance/inC');

            expect(removeStub).toHaveBeenCalledTimes(2);

            expect(removeStub).toHaveBeenCalledWith(expect.objectContaining({
                label: 'test:outgoing',
                from: vertex,
                to: inB
            }));

            expect(removeStub).toHaveBeenCalledWith(expect.objectContaining({
                label: 'test:outgoing',
                from: vertex,
                to: inC
            }));
        });
    });

    describe('.removeType', () => {
        let vertex: Vertex;
        let typeA: Vertex;
        let typeB: Vertex;

        beforeEach(() => {
            vertex = new Vertex('http://example.org/test/instance/a', graph);
            typeA = new Vertex('http://example.org/test/type/a', graph);
            typeB = new Vertex('http://example.org/test/type/b', graph);
            jest.spyOn(graph, 'getOutgoingEdges').mockImplementation((id, label) => {
                if (id !== 'http://example.org/test/instance/a' || label !== '@type') {
                    return Iterable.empty();
                }

                return new Iterable([
                    { label, from: vertex, to: typeA },
                    { label, from: vertex, to: typeB }
                ]) as any;
            });
        });

        it('should not remove any types', () => {
            const removeStub = jest.spyOn(graph, 'removeEdge');
            vertex.removeType();
            expect(removeStub).toHaveBeenCalledTimes(0);
            expect(vertex.isType('test:type/a')).toEqual(true);
            expect(vertex.isType('test:type/b')).toEqual(true);
        });

        it('should remove type', () => {
            const removeStub = jest.spyOn(graph, 'removeEdge');
            vertex.removeType('test:type/a');

            expect(removeStub).toHaveBeenCalledTimes(1);
            expect(removeStub).toHaveBeenCalledWith(expect.objectContaining({
                label: '@type',
                to: typeA
            }));
        });

        it('should remove multiple types', () => {
            const removeStub = jest.spyOn(graph, 'removeEdge');
            vertex.removeType('test:type/a', 'http://example.org/test/type/b');

            expect(removeStub).toHaveBeenCalledTimes(2);
            expect(removeStub).toHaveBeenCalledWith(expect.objectContaining({
                label: '@type',
                to: typeA
            }));
            expect(removeStub).toHaveBeenCalledWith(expect.objectContaining({
                label: '@type',
                to: typeB
            }));
        });
    });

    describe('.setAttributeValue', () => {
        let vertex: Vertex;

        beforeEach(() => {
            vertex = new Vertex('http://example.org/test/instance/a', graph);
            vertex.appendAttributeValue('test:aliases', 'john');
            vertex.appendAttributeValue('test:aliases', 'jake');
            vertex.appendAttributeValue('test:languages', 'English', 'en');
            vertex.appendAttributeValue('test:languages', 'French', 'fr');
        });

        it('should throw reference error when name or value is not valid', () => {
            const params = [
                [null as any, 'test'],
                [undefined as any, 'test'],
                ['', 'test'],
                ['test', null as any],
                ['test', undefined as any]
            ]

            for (const [name, value] of params) {
                expect(() => vertex.setAttributeValue(name, value)).toThrow(ReferenceError);
            }
        });

        it('should throw type error when language value is not string', () => {
            expect(() => vertex.setAttributeValue('test:a', 100 as any, 'en')).toThrow(TypeError)
        });

        it('should replace all attribute values', () => {
            vertex.setAttributeValue('test:aliases', 'foo');
            expect(vertex.getAttributeValues('test:aliases').count()).toEqual(1)
            expect(vertex.getAttributeValues('test:aliases').first().value).toEqual('foo');
        });

        it('should set new value', () => {
            vertex.setAttributeValue('test:newAttrib', 'bar');
            expect(vertex.hasAttribute('test:newAttrib')).toEqual(true);
            expect(vertex.hasAttributeValue('test:newAttrib', 'bar')).toEqual(true);
        });

        it('should replace only specific language value', () => {
            vertex.setAttributeValue('test:languages', 'British', 'en');
            expect(vertex.getAttributeValues('test:languages').count()).toEqual(2);
            expect(vertex.getAttributeValue('test:languages', 'en')).toEqual('British');
        });

        it('should append new language value', () => {
            vertex.setAttributeValue('test:languages', 'German', 'de');
            expect(vertex.getAttributeValues('test:languages').count()).toEqual(3);
            expect(vertex.hasAttributeValue('test:languages', 'English', 'en')).toEqual(true);
            expect(vertex.hasAttributeValue('test:languages', 'French', 'fr')).toEqual(true);
            expect(vertex.hasAttributeValue('test:languages', 'German', 'de')).toEqual(true);
        });

        it('should set json type for objects', () => {
            vertex.setAttributeValue('test:json:data', { foo: 'bar' });
            expect(vertex.getAttributeValue<object>('test:json:data')).toEqual({ foo: 'bar' });
        });
    });

    describe('.setIncoming', () => {
        let targetV: Vertex;
        let sourceV: Vertex;

        beforeEach(() => {
            targetV = new Vertex('http://example.org/test/instance/target', graph);
            sourceV = new Vertex('http://example.org/test/instance/source', graph);
            jest.spyOn(graph, 'hasVertex')
                .mockImplementation((id) => {
                    switch (id) {
                        case 'http://example.org/test/instance/target':
                        case 'http://example.org/test/instance/source':
                            return true;
                        default:
                            return false;
                    }
                });
        });

        it('should throw when label and to vertex is not valid', () => {
            const params = [
                [null as any, sourceV],
                [undefined as any, sourceV],
                ['', sourceV],
                ['test:incoming', null as any],
                ['test:incoming', undefined as any],
                ['test:incoming', '']
            ]

            for (const [label, source] of params) {
                expect(() => targetV.setIncoming(label, source)).toThrow(ReferenceError)
            }
        });

        it('should throw when target vertex does not exist', () => {
            expect(() => targetV.setIncoming('test:incoming', 'test:instance/foo')).toThrow(errors.VertexNotFoundError);
        });

        it('should throw duplicate edge error when incoming already exisst', () => {
            jest.spyOn(graph, 'hasEdge').mockReturnValue(true);

            expect(() => targetV.setIncoming('test:incoming', 'test:instance/source')).toThrow(errors.DuplicateEdgeError);
            expect(() => targetV.setIncoming('test:incoming', sourceV)).toThrow(errors.DuplicateEdgeError);
        });

        it('should throw cyclic error when incoming is set to itself', () => {
            expect(() => targetV.setIncoming('test:incoming', targetV)).toThrow(errors.CyclicEdgeError);
            expect(() => targetV.setIncoming('test:incoming', 'test:instance/target')).toThrow(errors.CyclicEdgeError);
        });

        it('should create incoming edge', () => {
            const createEdgeStub = jest.spyOn(graph, 'createEdge');
            targetV.setIncoming('test:incoming', sourceV);
            expect(createEdgeStub).toHaveBeenCalledTimes(1);
            expect(createEdgeStub).toHaveBeenCalledWith(
                'http://example.org/test/incoming',
                'http://example.org/test/instance/source',
                'http://example.org/test/instance/target'
            );
        });

        it('should create vertex with incoming edge', () => {
            const createEdgeStub = jest.spyOn(graph, 'createEdge');
            const createVertexStub = jest.spyOn(graph, 'createVertex');

            targetV.setIncoming('test:incoming', 'test:instance/foo', true);
            expect(createVertexStub).toHaveBeenCalledTimes(1);
            expect(createVertexStub).toHaveBeenCalledWith('http://example.org/test/instance/foo');
            expect(createEdgeStub).toHaveBeenCalledWith(
                'http://example.org/test/incoming',
                'http://example.org/test/instance/foo',
                'http://example.org/test/instance/target');
        });
    });

    describe('.setOutgoing', () => {
        let targetV: Vertex;
        let sourceV: Vertex;

        beforeEach(() => {
            targetV = new Vertex('http://example.org/test/instance/target', graph);
            sourceV = new Vertex('http://example.org/test/instance/source', graph);
            jest.spyOn(graph, 'hasVertex').mockImplementation((id) => {
                switch (id) {
                    case 'http://example.org/test/instance/target':
                    case 'http://example.org/test/instance/source':
                        return true;
                    default:
                        return false;
                }
            });
        });

        it('should throw when label and to vertex is not valid', () => {
            const params = [
                [null as any, sourceV],
                [undefined as any, sourceV],
                ['', sourceV],
                ['test:outgoing', null as any],
                ['test:outgoing', undefined as any],
                ['test:outgoing', '']
            ]

            for (const [label, source] of params) {
                expect(() => sourceV.setOutgoing(label, source)).toThrow(ReferenceError)
            }
        });

        it('should throw when target vertex does not exist', () => {
            expect(() => sourceV.setOutgoing('test:outgoing', 'test:instance/foo')).toThrow(errors.VertexNotFoundError);
        });

        it('should throw duplicate edge error when incoming already exisst', () => {
            jest.spyOn(graph, 'hasEdge').mockReturnValue(true);
            expect(() => sourceV.setOutgoing('test:outgoing', 'test:instance/target')).toThrow(errors.DuplicateEdgeError);
            expect(() => sourceV.setOutgoing('test:outgoing', targetV)).toThrow(errors.DuplicateEdgeError);
        });

        it('should throw cyclic error when incoming is set to itself', () => {
            expect(() => sourceV.setOutgoing('test:outgoing', sourceV)).toThrow(errors.CyclicEdgeError);
            expect(() => sourceV.setOutgoing('test:outgoing', 'test:instance/source')).toThrow(errors.CyclicEdgeError);
        });

        it('should create incoming edge', () => {
            const createEdgeStub = jest.spyOn(graph, 'createEdge');
            sourceV.setOutgoing('test:outgoing', targetV);

            expect(createEdgeStub).toHaveBeenCalledTimes(1);
            expect(createEdgeStub).toHaveBeenCalledWith(
                'http://example.org/test/outgoing',
                'http://example.org/test/instance/source',
                'http://example.org/test/instance/target'
            );
        });

        it('should create vertex with incoming edge', () => {
            const createEdgeStub = jest.spyOn(graph, 'createEdge');
            const createVertexStub = jest.spyOn(graph, 'createVertex');

            sourceV.setOutgoing('test:outgoing', 'test:instance/foo', true);
            expect(createVertexStub).toHaveBeenCalledWith('http://example.org/test/instance/foo');
            expect(createEdgeStub).toHaveBeenCalledTimes(1);
            expect(createEdgeStub).toHaveBeenCalledWith(
                'http://example.org/test/outgoing',
                'http://example.org/test/instance/source',
                'http://example.org/test/instance/foo'
            );
        });
    });

    describe('.setType', () => {
        let vertex: Vertex;
        let typeAV: Vertex;
        let typeBV: Vertex;

        beforeEach(() => {
            vertex = new Vertex('http://example.org/test/instance/a', graph);
            typeAV = new Vertex('http://example.org/test/typeA', graph);
            typeBV = new Vertex('http://example.org/test/typeB', graph);
            jest.spyOn(graph, 'getOutgoingEdges').mockImplementation((v, label) => {
                if (v === 'http://example.org/test/instance/a' && label === '@type') {
                    return new Iterable([
                        { label: '@type', from: vertex, to: typeAV }
                    ]) as any;
                } else {
                    return Iterable.empty();
                }
            }) as any;
        });

        it('should add nothing when types is empty', () => {
            const createEdgeStub = jest.spyOn(graph, 'createEdge');
            vertex.setType();
            expect(createEdgeStub).toHaveBeenCalledTimes(0);
        });

        it('should add nothing when vertex is already of specified type', () => {
            const createEdgeStub = jest.spyOn(graph, 'createEdge');
            vertex.setType('http://example.org/test/typeA');
            expect(createEdgeStub).toHaveBeenCalledTimes(0);
        });

        it('should create edge to type vertex', () => {
            const createEdgeStub = jest.spyOn(graph, 'createEdge');
            vertex.setType(typeBV);
            expect(createEdgeStub).toHaveBeenCalledTimes(1);
            expect(createEdgeStub).toHaveBeenCalledWith(
                '@type',
                'http://example.org/test/instance/a',
                'http://example.org/test/typeB'
            );
        });

        it('should create vertex and edge to new type', () => {
            const createEdgeStub = jest.spyOn(graph, 'createEdge');
            const createVertexStub = jest.spyOn(graph, 'createVertex');

            vertex.setType('test:typeC');
            expect(createVertexStub).toHaveBeenCalledTimes(1);
            expect(createVertexStub).toHaveBeenCalledWith('http://example.org/test/typeC');
            expect(createEdgeStub).toHaveBeenCalledTimes(1);
            expect(createEdgeStub).toHaveBeenCalledWith(
                '@type',
                'http://example.org/test/instance/a',
                'http://example.org/test/typeC'
            );
        });
    });
});