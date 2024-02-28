import { DSTPClient, createLibp2pNode } from "client"
import { multiaddr } from "@multiformats/multiaddr";

const nodeAddr = multiaddr("/ip4/122.167.191.234/tcp/44444/ws/p2p/12D3KooWKfRkhci6oPf43AKpkHGoCM38mtbAfc6UyKv2rgp8NzSN")

async function main() {
    const node = await createLibp2pNode()
    const dstp = DSTPClient.init(node)

    await dstp.uploadTest(nodeAddr)
    await dstp.downloadTest(nodeAddr)
    await dstp.ping(nodeAddr)
}

main()