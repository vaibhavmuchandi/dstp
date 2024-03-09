import { GossipsubEvents } from "@chainsafe/libp2p-gossipsub/dist/src";
import { Identify } from "@libp2p/identify";
import { Libp2p, PubSub } from "@libp2p/interface";
import { PingService } from "@libp2p/ping"

export type Libp2pNode = Libp2p<{ identify: Identify, pubsub: PubSub<GossipsubEvents>, ping: PingService }>

export type RECEIVER_DATA = {
    merkleRoot: string,
    proof: string[],
    nounce: number,
    speedMbps: number,
    nodeId?: string,
    selfId?: string
}