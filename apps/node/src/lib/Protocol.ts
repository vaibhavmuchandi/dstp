import { Libp2pNode, RECEIVER_DATA, SENDER_DATA, calculateAverageSpeed } from "common-js"
import { verifyProof } from "common-js"

import { PROTOCOL_EVENTS } from "../utils/events.js"
import { hash } from "../utils/helper.js"


export class DSTPProtocol {
    private node: Libp2pNode
    private rootPool: Map<string, RECEIVER_DATA> // From the client
    private memPool: Map<string, SENDER_DATA> // From the node
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

    private _handleRootMsg(msg: Uint8Array) {
        const data: RECEIVER_DATA = JSON.parse(new TextDecoder().decode(msg))
        this.rootPool.set(data.testHash, data)
        this._confirm(data.testHash)
    }

    private _handleRawMsg(msg: Uint8Array) {
        const data: SENDER_DATA = JSON.parse(new TextDecoder().decode(msg))
        this.memPool.set(data.testHash, data)
    }

    private _confirm(testHash: string) {
        if (this.memPool.get(testHash) && this.rootPool.get(testHash)) {
            const { merkleTree, stamps } = this.memPool.get(testHash)
            const { nounce, proof, speedMbps } = this.rootPool.get(testHash)
            const leaf = merkleTree[0][nounce]
            const isConfirmed = verifyProof(leaf, proof, testHash, nounce, hash)
            if (isConfirmed) {
                console.log('\x1b[32m%s\x1b[0m', 'Data Integrity Done');
                const speed = calculateAverageSpeed(stamps)
                console.log(`Estimated speed: ${speed}, reported speed ${speedMbps}`)
            } else {
                console.log('\x1b[31m%s\x1b[0m', 'Speed Test Rejected');
                this.rejected.add(testHash)
            }
        } else {
            setTimeout(() => {
                this._confirm(testHash)
            }, 5000)
        }
    }
}