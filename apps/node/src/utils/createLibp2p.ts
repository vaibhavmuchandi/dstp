import { createLibp2p } from "libp2p";
import { webSockets } from "@libp2p/websockets";
import { mplex } from "@libp2p/mplex";
import { yamux } from "@chainsafe/libp2p-yamux";
import { noise } from "@chainsafe/libp2p-noise";
import { identify } from "@libp2p/identify";
import { gossipsub } from "@chainsafe/libp2p-gossipsub";
import { ping } from "@libp2p/ping";

import { Libp2pNode } from "./types.js";

export const createLibp2pNode = async (): Promise<Libp2pNode> => {
    const node = await createLibp2p({
        addresses: {
            listen: ['/ip4/0.0.0.0/tcp/44444/ws']
        },
        transports: [
            webSockets()
        ],
        connectionEncryption: [noise()],
        streamMuxers: [yamux(), mplex()],
        services: {
            identify: identify(),
            pubsub: gossipsub({ allowPublishToZeroTopicPeers: true }),
            ping: ping({ protocolPrefix: "/dstp/0.0.0/ping" })
        }
    })
    return node
}
