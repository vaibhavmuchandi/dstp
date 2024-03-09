import { Libp2pNode, RECEIVER_DATA, SENDER_DATA } from "../utils/types.js"
import { PROTOCOL_EVENTS } from "../utils/events.js"
import { verifyProof } from "../utils/merkle.js"

export class DSTPProtocol {
    private node: Libp2pNode
    private rootPool: Map<string, RECEIVER_DATA>
    private memPool: Map<string, SENDER_DATA>
    private confirmedPool: Set<string>
    private rejected: Set<string>
    constructor(node: Libp2pNode) {
        this.node = node
        this.rootPool = new Map()
        this.memPool = new Map()
        this.confirmedPool = new Set()
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
                console.log(`received from client`)
                this._handleRootMsg(_evt.detail.data)
            }
            if (_evt.detail.topic == PROTOCOL_EVENTS.ST_RAW) {
                console.log(`received from node`)
                this._handleRawMsg(_evt.detail.data)
            }
        })
    }

    private _handleRootMsg(msg: Buffer) {
        const data: RECEIVER_DATA = JSON.parse(new TextDecoder().decode(msg))
        this.rootPool.set(data.merkleRoot, data)
        this._confirm(data.merkleRoot)
    }

    private _handleRawMsg(msg: Buffer) {
        const data: SENDER_DATA = JSON.parse(new TextDecoder().decode(msg))
        this.memPool.set(data.merkleRoot, data)
    }

    private _confirm(merkleRoot: string) {
        if (this.memPool.get(merkleRoot) && this.rootPool.get(merkleRoot)) {
            const { merkleTree } = this.memPool.get(merkleRoot)
            const { nounce, proof } = this.rootPool.get(merkleRoot)
            const leaf = merkleTree[0][nounce]
            const isConfirmed = verifyProof(leaf, proof, merkleRoot, nounce)
            if (isConfirmed) {
                this.confirmedPool.add(merkleRoot)
            } else {
                this.rejected.add(merkleRoot)
            }
        } else {
            setTimeout(() => {
                this._confirm(merkleRoot)
            }, 5000)
        }
    }
}