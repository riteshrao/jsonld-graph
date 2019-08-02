import shortid from 'shortid';
import { JsonldKeywords, BlankNodePrefix } from './constants';

/**
 * @description Node identity map that keeps a map of blank node ids to unique node ids.
 * @export
 * @class IdentityMap
 */
export class IdentityMap {
    private readonly _map = new Map<string, string>();

    /**
     * @description Gets the mapped id for a node.
     * @param {*} node
     * @returns {string}
     * @memberof IdentityMap
     */
    get(node: any): string {
        if (!node) {
            return null;
        }

        const nodeId: string = node[JsonldKeywords.id];
        if (!nodeId || !nodeId.startsWith(BlankNodePrefix)) {
            return nodeId;
        }

        if (this._map.has(nodeId)) {
            return this._map.get(nodeId);
        }

        const newNodeId = `${BlankNodePrefix}-${shortid()}`;
        this._map.set(nodeId, newNodeId);
        return newNodeId;
    }
}

export default IdentityMap;
