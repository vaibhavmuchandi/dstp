import { DSTPClient, createLibp2pNode } from "client"
import { multiaddr } from "@multiformats/multiaddr";

const nodeAddr = multiaddr("/ip4/122.167.190.28/tcp/44444/ws/p2p/12D3KooWSdggeL27rJWQgiMM62PCjcPDJG3HboZuERphTsQ2SbEp")

async function main() {
    const node = await createLibp2pNode()
    const dstp = DSTPClient.init(node)

    dstp.on("download-speed", (data) => {
        console.log('Current download speed:', data.speedMbps)
    })

    dstp.on("upload-speed", (data) => {
        console.log('Current upload speed:', data.speedMbps)
    })

    dstp.on("download-speed-final", (data) => {
        console.log('Final download speed: ', data.speedMbps)
    })

    dstp.on("upload-speed-final", (data) => {
        console.log('Upload speed final: ', data.speedMbps)
    })

    dstp.on("ping", (data) => {
        console.log('Ping: ', data.ping)
    })

    await dstp.uploadTest(nodeAddr)
    await dstp.downloadTest(nodeAddr)
    await dstp.ping(nodeAddr)
}

main()