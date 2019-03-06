import * as shortid from 'shortid';
import Constants from './constants';

/**
 * @description Node identity map that keeps a map of blank node ids to unique node ids.
 * @export
 * @class IdentityMap
 */
export class IdentityMap {
    private readonly map = new Map<string, string>();

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

        const nodeId: string = node[Constants.jsonldKeywords.id];
        if (!nodeId || !nodeId.startsWith(Constants.blankNodePrefix)) {
            return nodeId;
        }

        if (this.map.has(nodeId)) {
            return this.map.get(nodeId);
        }

        const newNodeId = `${Constants.blankNodePrefix}-${shortid()}`;
        this.map.set(nodeId, newNodeId);
        return newNodeId;
    }
}

export default IdentityMap;
