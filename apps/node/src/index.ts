import DSTPNode from "./lib/Node.js";
import { createLibp2pNode } from "./utils/createLibp2p.js";

async function main() {
    const libp2p = await createLibp2pNode()
    const dstp = DSTPNode.init({ node: libp2p, geoLocation: { country: "IN", state: "KA", city: "BGM" } })
    console.log(`DSTP Node started on ${dstp.node.getMultiaddrs()[0].toString()}`)
}

main().catch(err => console.error(err))