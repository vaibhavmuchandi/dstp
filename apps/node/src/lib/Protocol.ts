import { Libp2pNode, RECEIVER_DATA } from "../utils/types.js"
import { PROTOCOL_EVENTS } from "../utils/events.js"

export class DSTPProtocol {
    private node: Libp2pNode
    private memPool: Map<string, RECEIVER_DATA>
    constructor(node: Libp2pNode) {
        this.node = node
    }

    static start(node: Libp2pNode) {
        const dstpProtocol = new DSTPProtocol(node)
        dstpProtocol._startListeners()
        return dstpProtocol
    }

    private _startListeners() {
        this.node.services.pubsub.subscribe(PROTOCOL_EVENTS.ST_ROOT)
        this.node.services.pubsub.subscribe(PROTOCOL_EVENTS.ST_RAW)

        this.node.services.pubsub.addEventListener("message", (_evt) => {
            if (_evt.detail.topic == PROTOCOL_EVENTS.ST_ROOT) {
                this._handleRootMsg(_evt.detail.data)
            }
            if (_evt.detail.topic == PROTOCOL_EVENTS.ST_RAW) {
                this._handleRawMsg(_evt.detail.data)
            }
        })
    }

    private _handleRootMsg(msg: Buffer) {
        const data: RECEIVER_DATA = JSON.parse(new TextDecoder().decode(msg))
        this.memPool.set(data.merkleRoot, data)
    }

    private _handleRawMsg(msg: Buffer) {
        const data: RECEIVER_DATA = JSON.parse(new TextDecoder().decode(msg))
        console.log(data)
    }
}