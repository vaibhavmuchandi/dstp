
import { GeoLocation, Libp2pNode } from "../utils/types.js";
import { _uploadTest, _downloadTest, _pingTest } from "./Protocol.js";

export default class DSTPNode {
    node: Libp2pNode;
    geoLocation: GeoLocation

    constructor(options: { node: Libp2pNode, geoLocation: GeoLocation }) {
        this.node = options.node;
        this.geoLocation = options.geoLocation;
    }

    static init(options: { node: Libp2pNode, geoLocation: GeoLocation }) {
        const dstp = new DSTPNode(options);
        dstp._initProtocol()
        return dstp;
    }

    private async _initProtocol() {
        this.node.handle('/dstp/0.0.0/upload-test', _uploadTest)
        this.node.handle('/dstp/0.0.0/download-test', _downloadTest)
        this.node.handle('/dstp/0.0.0/ping-test', _pingTest)
    }

}