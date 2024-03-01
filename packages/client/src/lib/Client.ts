import { Multiaddr } from "@multiformats/multiaddr"
import EventEmitter from "eventemitter3"

import { TSPEEDTEST_EVENTS } from "../utils/events.js";
import { Libp2pNode } from "../utils/types.js";
import { _downloadData, _uploadData, _pingTest } from "./Protocol.js";

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