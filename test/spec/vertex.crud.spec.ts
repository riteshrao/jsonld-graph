import * as sinon from 'sinon';
import { expect } from 'chai';
import { Vertex, JsonldGraph, Edge, Errors } from '../../src';
import Iterable from 'jsiterable';

describe('Vertex', () => {
    let graph: JsonldGraph<Vertex, Edge<Vertex>>;

    beforeEach(() => {
        graph = new JsonldGraph();
        sinon.stub(graph, 'expandIRI').callsFake((id: string) => {
            if (id.startsWith('test:')) {
                return id.replace('test:', 'http://example.org/test/');
            } else {
                return id;
            }
        });

        sinon.stub(graph, 'compactIRI').callsFake((id) => {
            if (id.startsWith('http://example.org/test/')) {
                return id.replace('http://example.org/test/', 'test:')
            } else {
                return id;
            }
        });
    });

    afterEach(() => {
        sinon.reset();
    })

    describe('.ctor', () => {
        it('should throw when constructor arguments is invalid', () => {
            const args = [
                [null as any, graph],
                [undefined as any, graph],
                ['', graph]
            ]

            for (const [id, graph] of args) {
                expect(() => new Vertex(id, graph)).to.throw(ReferenceError);
            }
        });
    })

    describe('.isBlankNode', () => {
        it('should return true when id starts with a blank node prefix', () => {
            const vertex = new Vertex('_:b1', {} as any);
            return expect(vertex.isBlankNode).to.be.true;
        });

        it('should return false when id does not start with blank node prefix', () => {
            const vertex = new Vertex('test:1', {} as any);
            return expect(vertex.isBlankNode).to.be.false; 
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
                expect(() => vertex.appendAttributeValue(name, value)).to.throw(ReferenceError);
            }
        });

        it('should throw type error when language is specified and value is not string', () => {
            expect(() => vertex.appendAttributeValue('test:1', 1, "en")).to.throw(TypeError);
        });

        it('should add new attribute', () => {
            vertex.appendAttributeValue('test:1', '100');
            const attributes = [...vertex.getAttributes()];
            expect(attributes.length).to.equal(1);
            expect(attributes[0].name).to.equal('test:1');
            expect(attributes[0].values.length).to.equal(1);
            expect(attributes[0].values[0].value).to.equal('100');
        });

        it('should append value to existing attribute', () => {
            vertex.appendAttributeValue('test:1', '100');
            vertex.appendAttributeValue('test:1', '200');
            const attributes = [...vertex.getAttributes()];
            expect(attributes.length).to.equal(1);
            expect(attributes[0].name).to.equal('test:1');
            expect(attributes[0].values.length).to.equal(2);
            expect(attributes[0].values[0].value).to.equal('100');
            expect(attributes[0].values[1].value).to.equal('200');
        });

        it('should add new localized attribute value', () => {
            vertex.appendAttributeValue('test:1', 'a', 'en');
            const attributes = [...vertex.getAttributes()];
            expect(attributes.length).to.equal(1)
            expect(attributes[0].name).to.equal('test:1');
            expect(attributes[0].values.length).to.equal(1);
            expect(attributes[0].values[0].value).to.equal('a');
            expect(attributes[0].values[0].language).to.equal('en');
        });

        it('should append new localized attribute value', () => {
            vertex.appendAttributeValue('test:1', 'a', 'en');
            vertex.appendAttributeValue('test:1', 'a', 'fr');
            const attributes = [...vertex.getAttributes()];
            expect(attributes.length).to.equal(1)
            expect(attributes[0].name).to.equal('test:1');
            expect(attributes[0].values.length).to.equal(2);
            expect(attributes[0].values[0].value).to.equal('a');
            expect(attributes[0].values[0].language).to.equal('en');
            expect(attributes[0].values[1].value).to.equal('a');
            expect(attributes[0].values[1].language).to.equal('fr');
        });

        it('should replace existing localized attribute value', () => {
            vertex.appendAttributeValue('test:1', 'a', 'en');
            vertex.appendAttributeValue('test:1', 'b', 'en');
            const attributes = [...vertex.getAttributes()];
            expect(attributes.length).to.equal(1)
            expect(attributes[0].name).to.equal('test:1');
            expect(attributes[0].values.length).to.equal(1);
            expect(attributes[0].values[0].value).to.equal('b');
            expect(attributes[0].values[0].language).to.equal('en');
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
            expect(() => vertex.getAttributeValue(null as any)).to.throw(ReferenceError);
            expect(() => vertex.getAttributeValue(undefined as any)).to.throw(ReferenceError);
            expect(() => vertex.getAttributeValue('')).to.throw(ReferenceError);
        });

        it('should return undefined or non existent attribute', () => {
            expect(vertex.getAttributeValue('test:x')).to.be.undefined;
        });

        it('should return the first attribute value', () => {
            expect(vertex.getAttributeValue('test:a')).to.equal(1);
            expect(vertex.getAttributeValue('test:lang')).to.equal('a');
        });

        it('should return the first language specific value', () => {
            expect(vertex.getAttributeValue('test:lang', 'fr')).to.equal('b')
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
            expect(() => vertex.getAttributeValues(null as any)).to.throw(ReferenceError);
            expect(() => vertex.getAttributeValues(undefined as any)).to.throw(ReferenceError);
            expect(() => vertex.getAttributeValues('')).to.throw(ReferenceError);
        });

        it('should return empty when attribute does not exist', () => {
            expect([...vertex.getAttributeValues('test:x')].length).to.equal(0);
        });

        it('should return all attribute values', () => {
            const values = [...vertex.getAttributeValues('test:a')];
            expect(values.length).to.equal(2);
            expect(values[0].value).to.equal(1);
            expect(values[1].value).to.equal(2);
        });

        it('should return all localized attribute values', () => {
            const values = [...vertex.getAttributeValues('test:lang')];
            expect(values.length).to.equal(2);
            expect(values[0].language).to.equal('en');
            expect(values[0].value).to.equal('a')
            expect(values[1].language).to.equal('fr');
            expect(values[1].value).to.equal('b');
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
            sinon.stub(graph, 'getIncomingEdges').callsFake((id, label) => {
                if (id !== 'http://example.org/instance/a') {   
                    return Iterable.empty();
                }

                if (label === 'http://example.org/test/types' || label === 'test:types') {
                    return new Iterable([
                        { label, from: typeV, to: vertex }
                    ]);
                } else {
                    return new Iterable([
                        { label: 'http://example.org/test/types', from: typeV, to: vertex },
                        { label: 'http://example.org/test/outgoing', from: outgoingV, to: vertex }
                    ]);
                }
            });
        });

        it('should return empty when vertex has no incoming', () => {
            const incoming = [...outgoingV.getIncoming()];
            expect(incoming.length).to.equal(0);
        });

        it('should return all incoming', () => {
            const incoming = [...vertex.getIncoming()];
            expect(incoming.length).to.equal(2);
            expect(incoming.find(x => x.label === 'test:types')).to.not.be.undefined;
            expect(incoming.find(x => x.label === 'test:outgoing')).to.not.be.undefined;
            expect(incoming.find(x => x.label === 'test:types')?.fromVertex).to.equal(typeV);
            expect(incoming.find(x => x.label === 'test:outgoing')?.fromVertex).to.equal(outgoingV);
        });

        it('should return filtered incoming', () => {
            const incoming = [...vertex.getIncoming('test:types')];
            expect(incoming.length).to.equal(1);
            expect(incoming[0].label).to.equal('test:types');
            expect(incoming[0].fromVertex).to.equal(typeV);
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
            sinon.stub(graph, 'getOutgoingEdges').callsFake((id, label) => {
                if (id !== 'http://example.org/test/instance/a') {   
                    return Iterable.empty();
                }

                if (label === 'http://example.org/test/types' || label === 'test:types') {
                    return new Iterable([
                        { label, from: vertex, to: typeV }
                    ]);
                } else {
                    return new Iterable([
                        { label: 'http://example.org/test/types', from: vertex, to: typeV },
                        { label: 'http://example.org/test/outgoing', from: vertex, to: outgoingV }
                    ]);
                }
            });
        });

        it('should return empty when vertex has no outgoing', () => {
            const incoming = [...outgoingV.getOutgoing()];
            expect(incoming.length).to.equal(0);
        });

        it('should return all outgoing', () => {
            const incoming = [...vertex.getOutgoing()];
            expect(incoming.length).to.equal(2);
            expect(incoming.find(x => x.label === 'test:types')).to.not.be.undefined;
            expect(incoming.find(x => x.label === 'test:outgoing')).to.not.be.undefined;
            expect(incoming.find(x => x.label === 'test:types')?.toVertex).to.equal(typeV);
            expect(incoming.find(x => x.label === 'test:outgoing')?.toVertex).to.equal(outgoingV);
        });

        it('should return filtered outgoing', () => {
            const incoming = [...vertex.getOutgoing('test:types')];
            expect(incoming.length).to.equal(1);
            expect(incoming[0].label).to.equal('test:types');
            expect(incoming[0].toVertex).to.equal(typeV);
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
            sinon.stub(graph, 'getOutgoingEdges').callsFake((id, label) => {
                if (id !== 'http://example.org/test/instance/a') {   
                    return Iterable.empty();
                }

                if (label === '@type') {
                    return new Iterable([
                        { label, from: vertex, to: typeAV },
                        { label, from: vertex, to: typeBV }
                    ]);
                } else {
                    return new Iterable([
                        { label: 'http://example.org/test/types', from: vertex, to: typeAV },
                        { label: 'http://example.org/test/types', from: vertex, to: typeBV },
                        { label: 'http://example.org/test/outgoing', from: vertex, to: nonTypeV }
                    ]);
                }
            });
        });

        it('should return empty when vertex has no types', () => {
            expect([...nonTypeV.getTypes()].length).to.equal(0); 
        });

        it('should return all types', () => {
            const types = [...vertex.getTypes()];
            expect(types.length).to.equal(2);
            expect(types.some(x => x.id === 'test:type/a')).to.be.true;
            expect(types.some(x => x.id === 'test:type/b')).to.be.true;
            expect(types.some(x => x.id === 'test:instance/b')).to.be.false;
        });
    });

    describe('.hasAttribute', () => {
        let vertex: Vertex;

        beforeEach(() => {
            vertex = new Vertex('http://example.org/test/instances/a', graph);
            vertex.setAttributeValue('test:fname', 'John');
            vertex.setAttributeValue('test:lname', 'Doe');
        });

        it('should throw reference error when attribute name is not valid', () => {
            expect(() => vertex.hasAttribute(null as any)).to.throw(ReferenceError);
            expect(() => vertex.hasAttribute(undefined as any)).to.throw(ReferenceError);
            expect(() => vertex.hasAttribute('')).to.throw(ReferenceError);
        });

        it('should return false when attribute does not exist', () => {
            expect(vertex.hasAttribute('test:not:found')).to.be.false;
        });

        it('should return true when attribute exists', () => {
            expect(vertex.hasAttribute('test:fname')).to.be.true;
            expect(vertex.hasAttribute('http://example.org/test/lname')).to.be.true;
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
                expect(() => vertex.hasAttributeValue(name, value)).to.throw(ReferenceError);
            }
        });

        it('should throw type error when locale specific value is not of type string', () => {
            expect(() => vertex.hasAttributeValue('test:name', 1 as any, 'en')).to.throw(TypeError);
        });

        it('should return false when attribute does not exist', () => {
            expect(vertex.hasAttributeValue('test:not:found', 'a')).to.be.false;
        });

        it('should return false when value is attribute value list', () => {
            expect(vertex.hasAttributeValue('test:name', 'bar')).to.be.false;
        });

        it('should return true for value found in attribute value list', () => {
            expect(vertex.hasAttributeValue('test:name', 'John')).to.be.true;
            expect(vertex.hasAttributeValue('test:alias', 'jdoe')).to.be.true;
        });

        it('should return true for value found for locale', () => {
            expect(vertex.hasAttributeValue('test:alias', 'jdoe', 'en')).to.be.true;
        });

        it('should return false for value not found in locale', () => {
            expect(vertex.hasAttributeValue('test:alias', 'jdoe', 'es')).to.be.false;
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

            sinon.stub(graph, 'getIncomingEdges').callsFake((v, label): Iterable<any> => {
                if (v !== 'http://example.org/test/instances/target') {
                    return Iterable.empty();
                }

                if (label === 'http://example.org/test/incoming') {
                    return new Iterable([
                        { label, from: incomingA, to: vertex }
                    ]);
                } else if (!label) {
                    return new Iterable([
                        { label, from: incomingA, to: vertex },
                        { label, from: incomingB, to: vertex },
                    ]);
                } else {
                    return Iterable.empty()
                }
            });
        });

        it('should false if vertex has no incoming edges', () => {
            expect(incomingA.hasIncoming()).to.be.false; 
        });

        it('should return true for vertex with incoming edges', () => {
            expect(vertex.hasIncoming()).to.be.true;
        });

        it('should return false when vertex has no incoming edges with specified label', () => {
            expect(vertex.hasIncoming('test:foo')).to.be.false;
        });

        it('should return true when vertex has incoming edges with spcified label', () => {
            expect(vertex.hasIncoming('test:incoming')).to.be.true;
        });

        it('should return false when vertex has no incoming edges with spcified label and vertex', () => {
            expect(vertex.hasIncoming('test:incoming', 'test:instances/inB')).to.be.false;
        });

        it('should return true when vertex has incoming edges with spcified label and vertex', () => {
            expect(vertex.hasIncoming('test:incoming', 'test:instances/inA')).to.be.true;
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

            sinon.stub(graph, 'getOutgoingEdges').callsFake((v, label): Iterable<any> => {
                if (v !== 'http://example.org/test/instances/source') {
                    return Iterable.empty();
                }

                if (label === 'http://example.org/test/outgoing') {
                    return new Iterable([
                        { label, from: vertex, to: targetA }
                    ]);
                } else if (!label) {
                    return new Iterable([
                        { label, from: vertex, to: targetA },
                        { label, from: vertex, to: targetB },
                    ]);
                } else {
                    return Iterable.empty()
                }
            });
        });

        it('should false if vertex has no outging edges', () => {
            expect(targetA.hasOutgoing()).to.be.false; 
        });

        it('should return true for vertex with outgoing edges', () => {
            expect(vertex.hasOutgoing()).to.be.true;
        });

        it('should return false when vertex has no outgoing edges with specified label', () => {
            expect(vertex.hasOutgoing('test:foo')).to.be.false;
        });

        it('should return true when vertex has outgoing edges with spcified label', () => {
            expect(vertex.hasOutgoing('test:outgoing')).to.be.true;
        });

        it('should return false when vertex has no outgoing edges with spcified label and vertex', () => {
            expect(vertex.hasOutgoing('test:outgoing', 'test:instances/notfound')).to.be.false;
            expect(vertex.hasOutgoing('test:notfound', 'test:instances/outA')).to.be.false;
        });

        it('should return true when vertex has incoming edges with spcified label and vertex', () => {
            expect(vertex.hasOutgoing('test:outgoing', 'test:instances/outA')).to.be.true;
        });
    });

    describe('.isType', () => {
         let vertex: Vertex;
         let typeV: Vertex;

         beforeEach(() => {
            vertex = new Vertex('http://example.org/test/instance/a', graph);
            typeV = new Vertex('http://example.org/test/type/a', graph);
            sinon.stub(graph, 'getOutgoingEdges').callsFake((id) => {
                if (id !== 'http://example.org/test/instance/a') {   
                    return Iterable.empty();
                }

                return new Iterable([
                    { label: '@type', from: vertex, to: typeV}
                ]);
            });
         });

         it('should return false when vertex has no types', () => {
            expect(typeV.isType("test:type/a")).to.be.false;
         });

         it('should return true when vertex is of specified type', () => {
             expect(vertex.isType('test:type/a')).to.be.true;
             expect(vertex.isType('http://example.org/test/type/a')).to.be.true;
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
            sinon.stub(graph, 'getIncomingEdges').callsFake((id) => {
                if (id !== 'http://example.org/test/instance/target') {
                    return Iterable.empty()
                }

                return new Iterable([
                    { label: 'http://example.org/test/type', from: outA, to: vertex },
                    { label: 'http://example.org/test/incoming', from: outB, to: vertex },
                    { label: 'http://example.org/test/incoming', from: outC, to: vertex },
                ])
            });
        });

        it('should remove all incoming', () => {
            const removeStub = sinon.stub(graph, 'removeEdge');
            vertex.removeIncoming();
            
            expect(removeStub.callCount).to.equal(3);
            
            expect(removeStub.calledWith(sinon.match((edge) => {
                return edge.label === 'http://example.org/test/type' &&
                        edge.from === outA &&
                        edge.to === vertex
            }))).to.be.true;

            expect(removeStub.calledWith(sinon.match((edge) => {
                return edge.label === 'http://example.org/test/incoming' &&
                        edge.from === outB &&
                        edge.to === vertex
            }))).to.be.true;
        });

        it('should remove all incoming edges with specified label', () => {
            const removeStub = sinon.stub(graph, 'removeEdge');
            vertex.removeIncoming('test:incoming');
            
            expect(removeStub.callCount).to.equal(2);
            expect(removeStub.calledWith(sinon.match((edge) => {
                return edge.label === 'http://example.org/test/incoming' &&
                        edge.from === outB &&
                        edge.to === vertex
            }))).to.be.true;

            expect(removeStub.calledWith(sinon.match((edge) => {
                return edge.label === 'http://example.org/test/incoming' &&
                        edge.from === outC &&
                        edge.to === vertex
            }))).to.be.true;
        });

        it('should remove incoming edges matching specified filter', () => {
            const removeStub = sinon.stub(graph, 'removeEdge');
            vertex.removeIncoming('test:incoming', 'test:instance/outB');
            vertex.removeIncoming('test:incoming', v => v.id === 'test:instance/outC');

            expect(removeStub.callCount).to.equal(2);
            expect(removeStub.calledWith(sinon.match((edge) => {
                return edge.label === 'http://example.org/test/incoming' &&
                        edge.from === outB &&
                        edge.to === vertex
            }))).to.be.true;

            expect(removeStub.calledWith(sinon.match((edge) => {
                return edge.label === 'http://example.org/test/incoming' &&
                        edge.from === outC &&
                        edge.to === vertex
            }))).to.be.true;
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
            sinon.stub(graph, 'getOutgoingEdges').callsFake((id) => {
                if (id !== 'http://example.org/test/instance/source') {
                    return Iterable.empty()
                }

                return new Iterable([
                    { label: 'http://example.org/test/type', from: vertex, to: inA },
                    { label: 'http://example.org/test/outgoing', from: vertex, to: inB },
                    { label: 'http://example.org/test/outgoing', from: vertex, to: inC },
                ])
            });
        });

        it('should remove all outgoing', () => {
            const removeStub = sinon.stub(graph, 'removeEdge');
            vertex.removeOutgoing();
            
            expect(removeStub.callCount).to.equal(3);
            
            expect(removeStub.calledWith(sinon.match((edge) => {
                return edge.label === 'http://example.org/test/type' &&
                        edge.from === vertex &&
                        edge.to === inA
            }))).to.be.true;

            expect(removeStub.calledWith(sinon.match((edge) => {
                return edge.label === 'http://example.org/test/outgoing' &&
                        edge.from === vertex &&
                        edge.to === inB
            }))).to.be.true;
        });

        it('should remove all outgoing edges with specified label', () => {
            const removeStub = sinon.stub(graph, 'removeEdge');
            vertex.removeOutgoing('test:outgoing');
            
            expect(removeStub.callCount).to.equal(2);
            expect(removeStub.calledWith(sinon.match((edge) => {
                return edge.label === 'http://example.org/test/outgoing' &&
                        edge.from === vertex &&
                        edge.to === inB
            }))).to.be.true;

            expect(removeStub.calledWith(sinon.match((edge) => {
                return edge.label === 'http://example.org/test/outgoing' &&
                        edge.from === vertex &&
                        edge.to === inC
            }))).to.be.true;
        });

        it('should remove outgoing edges matching specified filter', () => {
            const removeStub = sinon.stub(graph, 'removeEdge');
            vertex.removeOutgoing('test:outgoing', 'test:instance/inB')
            vertex.removeOutgoing('test:outgoing', v => v.id === 'test:instance/inC');

            expect(removeStub.callCount).to.equal(2);
            expect(removeStub.calledWith(sinon.match((edge) => {
                return edge.label === 'http://example.org/test/outgoing' &&
                        edge.from === vertex &&
                        edge.to === inB
            }))).to.be.true;

            expect(removeStub.calledWith(sinon.match((edge) => {
                return edge.label === 'http://example.org/test/outgoing' &&
                        edge.from === vertex &&
                        edge.to === inC
            }))).to.be.true;
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
            sinon.stub(graph, 'getOutgoingEdges').callsFake((id, label) => {
                if (id !== 'http://example.org/test/instance/a' || label !== '@type') {   
                    return Iterable.empty();
                }

                return new Iterable([
                    { label, from: vertex, to: typeA },
                    { label, from: vertex, to: typeB }
                ]);
            });
        });

        it('should not remove any types', () => {
            const removeStub = sinon.stub(graph, 'removeEdge');
            vertex.removeType();
            expect(removeStub.callCount).to.equal(0);
            expect(vertex.isType('test:type/a')).to.be.true;
            expect(vertex.isType('test:type/b')).to.be.true;
        });

        it('should remove type', () => {
            const removeStub = sinon.stub(graph, 'removeEdge');
            vertex.removeType('test:type/a');

            expect(removeStub.callCount).to.equal(1);
            expect(removeStub.calledWith(sinon.match((v) => {
                return v.label === '@type' && v.to === typeA
            }))).to.be.true
        });

        it('should remove multiple types', () => {
            const removeStub = sinon.stub(graph, 'removeEdge');
            vertex.removeType('test:type/a', 'http://example.org/test/type/b');
            
            expect(removeStub.callCount).to.equal(2);
            
            expect(removeStub.calledWith(sinon.match((v) => {
                return v.label === '@type' && v.to === typeA
            }))).to.be.true

            expect(removeStub.calledWith(sinon.match((v) => {
                return v.label === '@type' && v.to === typeB
            }))).to.be.true
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
                expect(() => vertex.setAttributeValue(name, value)).to.throw(ReferenceError);
            }
        });

        it('should throw type error when language value is not string', () => {
            expect(() => vertex.setAttributeValue('test:a', 100 as any, 'en')).to.throw(TypeError)
        });

        it('should replace all attribute values', () => {
            vertex.setAttributeValue('test:aliases', 'foo');
            expect(vertex.getAttributeValues('test:aliases').count()).to.equal(1)
            expect(vertex.getAttributeValues('test:aliases').first().value).to.equal('foo');
        });

        it('should set new value', () => {
            vertex.setAttributeValue('test:newAttrib', 'bar');
            expect(vertex.hasAttribute('test:newAttrib')).to.be.true;
            expect(vertex.hasAttributeValue('test:newAttrib', 'bar')).to.be.true;
        });

        it('should replace only specific language value', () => {
            vertex.setAttributeValue('test:languages', 'British', 'en');
            expect(vertex.getAttributeValues('test:languages').count()).to.equal(2);
            expect(vertex.getAttributeValue('test:languages', 'en')).to.equal('British');
        });

        it('should append new language value', () => {
            vertex.setAttributeValue('test:languages', 'German', 'de');
            expect(vertex.getAttributeValues('test:languages').count()).to.equal(3);
            expect(vertex.hasAttributeValue('test:languages', 'English', 'en')).to.be.true;
            expect(vertex.hasAttributeValue('test:languages', 'French', 'fr')).to.be.true;
            expect(vertex.hasAttributeValue('test:languages', 'German', 'de')).to.be.true;
        });
    });

    describe('.setIncoming', () => {
        let targetV: Vertex;
        let sourceV: Vertex;

        beforeEach(() => {
            targetV = new Vertex('http://example.org/test/instance/target', graph);
            sourceV = new Vertex('http://example.org/test/instance/source', graph);
            sinon.stub(graph, 'hasVertex')
                .withArgs('http://example.org/test/instance/target').returns(true)
                .withArgs('http://example.org/test/instance/source').returns(true);
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
                expect(() => targetV.setIncoming(label, source)).to.throw(ReferenceError)
            }
        });

        it('should throw when target vertex does not exist', () => {
            expect(() => targetV.setIncoming('test:incoming', 'test:instance/foo')).to.throw(Errors.VertexNotFoundError);
        });

        it('should throw duplicate edge error when incoming already exisst', () => {
            sinon.stub(graph, 'hasEdge')
                .withArgs(
                    'http://example.org/test/incoming', 
                    'http://example.org/test/instance/source',
                    'http://example.org/test/instance/target'
                )
                .returns(true);

            expect(() => targetV.setIncoming('test:incoming', 'test:instance/source')).to.throw(Errors.DuplicateEdgeError);
            expect(() => targetV.setIncoming('test:incoming', sourceV)).to.throw(Errors.DuplicateEdgeError);
        });

        it('should throw cyclic error when incoming is set to itself', () => {
            expect(() => targetV.setIncoming('test:incoming', targetV)).to.throw(Errors.CyclicEdgeError);
            expect(() => targetV.setIncoming('test:incoming', 'test:instance/target')).to.throw(Errors.CyclicEdgeError);
        });

        it('should create incoming edge', () => {
            const createEdgeStub = sinon.stub(graph, 'createEdge');
            targetV.setIncoming('test:incoming', sourceV);
            expect(createEdgeStub.callCount).to.equal(1);
            expect(createEdgeStub.calledWith(
                'http://example.org/test/incoming',
                'http://example.org/test/instance/source',
                'http://example.org/test/instance/target'
            )).to.be.true;
        });

        it('should create vertex with incoming edge', () => {
            const createEdgeStub = sinon.stub(graph, 'createEdge');
            const createVertex = sinon.stub(graph, 'createVertex');

            targetV.setIncoming('test:incoming', 'test:instance/foo', true);
            expect(createEdgeStub.callCount).to.equal(1);
            expect(createVertex.calledWith('http://example.org/test/instance/foo')).to.be.true;
            expect(createEdgeStub.calledWith(
                'http://example.org/test/incoming',
                'http://example.org/test/instance/foo',
                'http://example.org/test/instance/target'
            )).to.be.true;
        });
    });

    describe('.setOutgoing', () => {
        let targetV: Vertex;
        let sourceV: Vertex;

        beforeEach(() => {
            targetV = new Vertex('http://example.org/test/instance/target', graph);
            sourceV = new Vertex('http://example.org/test/instance/source', graph);
            sinon.stub(graph, 'hasVertex')
                .withArgs('http://example.org/test/instance/target').returns(true)
                .withArgs('http://example.org/test/instance/source').returns(true);
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
                expect(() => sourceV.setOutgoing(label, source)).to.throw(ReferenceError)
            }
        });

        it('should throw when target vertex does not exist', () => {
            expect(() => sourceV.setOutgoing('test:outgoing', 'test:instance/foo')).to.throw(Errors.VertexNotFoundError);
        });

        it('should throw duplicate edge error when incoming already exisst', () => {
            sinon.stub(graph, 'hasEdge')
                .withArgs(
                    'http://example.org/test/outgoing', 
                    'http://example.org/test/instance/source',
                    'http://example.org/test/instance/target'
                )
                .returns(true);

            expect(() => sourceV.setOutgoing('test:outgoing', 'test:instance/target')).to.throw(Errors.DuplicateEdgeError);
            expect(() => sourceV.setOutgoing('test:outgoing', targetV)).to.throw(Errors.DuplicateEdgeError);
        });

        it('should throw cyclic error when incoming is set to itself', () => {
            expect(() => sourceV.setOutgoing('test:outgoing', sourceV)).to.throw(Errors.CyclicEdgeError);
            expect(() => sourceV.setOutgoing('test:outgoing', 'test:instance/source')).to.throw(Errors.CyclicEdgeError);
        });

        it('should create incoming edge', () => {
            const createEdgeStub = sinon.stub(graph, 'createEdge');
            sourceV.setOutgoing('test:outgoing', targetV);
            expect(createEdgeStub.callCount).to.equal(1);
            expect(createEdgeStub.calledWith(
                'http://example.org/test/outgoing',
                'http://example.org/test/instance/source',
                'http://example.org/test/instance/target'
            )).to.be.true;
        });

        it('should create vertex with incoming edge', () => {
            const createEdgeStub = sinon.stub(graph, 'createEdge');
            const createVertex = sinon.stub(graph, 'createVertex');

            sourceV.setOutgoing('test:outgoing', 'test:instance/foo', true);
            expect(createEdgeStub.callCount).to.equal(1);
            expect(createVertex.calledWith('http://example.org/test/instance/foo')).to.be.true;
            expect(createEdgeStub.calledWith(
                'http://example.org/test/outgoing',
                'http://example.org/test/instance/source',
                'http://example.org/test/instance/foo'
            )).to.be.true;
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
            sinon.stub(graph, 'getOutgoingEdges')
                .withArgs('http://example.org/test/instance/a', '@type')
                .callsFake(() => {
                    return new Iterable([
                        { label: '@type', from: vertex, to: typeAV }
                    ]);
                });
        });

        it('should add nothing when types is empty', () => {
            const createEdgeStub = sinon.stub(graph, 'createEdge');
            vertex.setType();
            expect(createEdgeStub.callCount).to.equal(0)
        });

        it('should add nothing when vertex is already of specified type', () => {
            const createEdgeStub = sinon.stub(graph, 'createEdge');
            vertex.setType('http://example.org/test/typeA');
            expect(createEdgeStub.callCount).to.equal(0)
        });

        it('should create edge to type vertex', () => {
            const createEdgeStub = sinon.stub(graph, 'createEdge');
            vertex.setType(typeBV);
            expect(createEdgeStub.callCount).to.equal(1);
            expect(createEdgeStub.calledWith(
                '@type',
                'http://example.org/test/instance/a',
                'http://example.org/test/typeB'
            )).to.be.true;
        });

        it('should create vertex and edge to new type', () => {
            const createEdgeStub = sinon.stub(graph, 'createEdge');
            const createVertexStub = sinon.stub(graph, 'createVertex');
            
            vertex.setType('test:typeC');
            expect(createVertexStub.callCount).to.equal(1);
            expect(createVertexStub.calledWith('http://example.org/test/typeC')).to.be.true;
            expect(createEdgeStub.callCount).to.equal(1);
            expect(createEdgeStub.calledWith(
                '@type',
                'http://example.org/test/instance/a',
                'http://example.org/test/typeC'
            )).to.be.true;
        });
    });
});