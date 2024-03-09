
import EventEmitter from "eventemitter3";
import { GeoLocation, Libp2pNode, SENDER_DATA } from "../utils/types.js";
import { DSTPProtocol } from "./Protocol.js";
import { _uploadTest, _downloadTest, _pingTest } from "./ST.js";
import { INTERNAL_EVENTS, PROTOCOL_EVENTS } from "../utils/events.js";

export default class DSTPNode {
    node: Libp2pNode;
    geoLocation: GeoLocation
    protocol: DSTPProtocol
    EE: EventEmitter

    constructor(options: { node: Libp2pNode, geoLocation: GeoLocation }) {
        this.node = options.node;
        this.geoLocation = options.geoLocation;
        this.protocol = DSTPProtocol.start(this.node)
        this.EE = new EventEmitter()
    }

    static init(options: { node: Libp2pNode, geoLocation: GeoLocation }) {
        const dstp = new DSTPNode(options);
        dstp._initProtocol()
        dstp._startListeners()
        return dstp;
    }

    private async _initProtocol() {
        this.node.handle('/dstp/0.0.0/upload-test', _uploadTest)
        this.node.handle('/dstp/0.0.0/download-test', ({ connection, stream }) => _downloadTest(connection, stream, this.EE))
        this.node.handle('/dstp/0.0.0/ping-test', _pingTest)
    }

    private async _startListeners() {
        this.EE.on(INTERNAL_EVENTS.DOWNLOAD_TEST_COMPLETED, (data: SENDER_DATA) => {
            data.selfId = this.node.peerId.toString()
            this.node.services.pubsub.publish(PROTOCOL_EVENTS.ST_RAW, new TextEncoder().encode(JSON.stringify(data)))
        })
    }
}