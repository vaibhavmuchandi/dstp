import { Multiaddr } from "@multiformats/multiaddr"
import EventEmitter from "eventemitter3"

import { INTERNAL_EVENTS, PROTOCOL_EVENTS, TSPEEDTEST_EVENTS } from "../utils/events.js";
import { Libp2pNode, RECEIVER_DATA } from "../utils/types.js";
import { _downloadData, _uploadData, _pingTest } from "./ST.js";

export class DSTPClient {
    private node: Libp2pNode
    private EE: EventEmitter

    constructor(node: Libp2pNode) {
        this.node = node
        this.EE = new EventEmitter()
    }

    static init(node: Libp2pNode) {
        const dstp = new DSTPClient(node)
        return dstp
    }

    on(eventName: TSPEEDTEST_EVENTS, listener: (...args: any[]) => void): this {
        this.EE.on(eventName, listener);
        return this;
    }

    async uploadTest(nodeAddr: Multiaddr) {
        await this.node.dial(nodeAddr);
        const stream = await this.node.dialProtocol(nodeAddr, "/dstp/0.0.0/upload-test");
        await _uploadData(stream, this.EE);
        stream.close()
    }

    async downloadTest(nodeAddr: Multiaddr) {
        this.EE.on(INTERNAL_EVENTS.DOWNLOAD_TEST_COMPLETED, (data: RECEIVER_DATA) => {
            data.nodeId = nodeAddr.getPeerId()
            data.selfId = this.node.peerId.toString()
            this.node.services.pubsub.publish(PROTOCOL_EVENTS.ST_ROOT, new TextEncoder().encode(JSON.stringify(data)))
        })
        await this.node.dial(nodeAddr)
        const stream = await this.node.dialProtocol(nodeAddr, "/dstp/0.0.0/download-test")
        await _downloadData(stream, this.EE)
        stream.close()
    }

    async ping(nodeAddr: Multiaddr) {
        await this.node.dial(nodeAddr)
        const stream = await this.node.dialProtocol(nodeAddr, "/dstp/0.0.0/ping-test")
        await _pingTest(stream, this.EE)
        stream.close()
    }

}