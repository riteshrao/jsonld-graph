import shortid from 'shortid';
import { BlankNodePrefix, JsonldKeywords } from './constants';

export class IdentityMap {
    private readonly _map = new Map<string, string>();

    /**
     * @description Gets a the unique id of a triple or a unique blank node identifier for the triple
     * @param {object} triple
     * @returns {(string | undefined)}
     * @memberof IdentityMap
     */
    get(triple: object): string {
        const nodeId: string = triple[JsonldKeywords.id];
        if (nodeId && nodeId.startsWith(BlankNodePrefix)) {
            return nodeId;
        }

        if (this._map.has(nodeId)) {
            return this._map.get(nodeId)!;
        }

        const newNodeId = `${BlankNodePrefix}-${shortid()}`;
        this._map.set(nodeId, newNodeId);
        return newNodeId;
    }
}

export default IdentityMap;