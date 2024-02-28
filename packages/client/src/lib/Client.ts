import { Stream } from "@libp2p/interface";
import { Multiaddr } from "@multiformats/multiaddr"
import { pipe } from "it-pipe"
import { pushable } from "it-pushable"

import { calculateSpeedMbps, calculateSpeedMbpsRealTime } from "../utils/helper.js";
import { Libp2pNode } from "../utils/types.js";

export class DSTPClient {
    private node: Libp2pNode

    constructor(node: Libp2pNode) {
        this.node = node
    }

    static init(node: Libp2pNode) {
        const dstp = new DSTPClient(node)
        return dstp
    }

    async uploadTest(nodeAddr: Multiaddr) {
        await this.node.dial(nodeAddr);
        const stream = await this.node.dialProtocol(nodeAddr, "/dstp/0.0.0/upload-test");
        await this._uploadData(stream);
        stream.close()
    }

    async downloadTest(nodeAddr: Multiaddr) {
        await this.node.dial(nodeAddr)
        const stream = await this.node.dialProtocol(nodeAddr, "/dstp/0.0.0/download-test")
        await this._downloadData(stream)
        stream.close()
    }

    async ping(nodeAddr: Multiaddr) {
        await this.node.dial(nodeAddr)
        const stream = await this.node.dialProtocol(nodeAddr, "/dstp/0.0.0/ping-test")
        await this._pingTest(stream)
        stream.close()
    }

    private async _uploadData(stream: Stream) {
        const chunkSize = 5 * 1024 * 1024;
        const totalSize = 50 * 1024 * 1024;
        const push = pushable<Buffer>();

        let intervalBytesSent = 0;
        const startUploadTime = performance.now();
        let lastReportTime = startUploadTime;

        const pushDataChunks = async () => {
            for (let sent = 0; sent < totalSize; sent += chunkSize) {
                const chunk = Buffer.alloc(Math.min(chunkSize, totalSize - sent));
                push.push(chunk);
                intervalBytesSent += chunk.length;
                await new Promise(resolve => setTimeout(resolve, 1000)); // 10 ms delay to allow pushing of individual chunks
            }
            push.end();
        };

        const interval = setInterval(() => {
            const now = performance.now();
            const intervalDurationSeconds = (now - lastReportTime) / 1000;
            if (intervalBytesSent > 0) {
                const speedMbps = calculateSpeedMbpsRealTime(intervalBytesSent, intervalDurationSeconds);
                console.log(`Current Upload Speed: ${speedMbps.toFixed(2)} Mbps`);
                intervalBytesSent = 0;
                lastReportTime = now;
            }
        }, 1000);

        await pushDataChunks();

        await pipe(
            push,
            stream.sink
        );

        clearInterval(interval);

        const endUploadTime = performance.now() - 10000
        const finalSpeedMbps = calculateSpeedMbps(totalSize, startUploadTime, endUploadTime);
        console.log(`Final Upload Speed: ${finalSpeedMbps.toFixed(2)} Mbps`);
    }

    private async _downloadData(stream: Stream) {
        let totalDownloadedBytes = 0;
        let intervalBytes = 0;
        let lastReportTime = performance.now();
        const startDownloadTime = performance.now();

        await pipe(
            stream.source,
            async function (source) {
                for await (const chunk of source) {
                    totalDownloadedBytes += chunk.length;
                    intervalBytes += chunk.length;
                    const now = performance.now();
                    const intervalDurationSeconds = (now - lastReportTime) / 1000;

                    if (intervalDurationSeconds >= 1) {
                        const intervalSpeedMbps = calculateSpeedMbpsRealTime(intervalBytes, intervalDurationSeconds);
                        console.log(`Current Download Speed: ${intervalSpeedMbps.toFixed(2)} Mbps`);
                        intervalBytes = 0;
                        lastReportTime = now;
                    }
                }
            }
        );

        const endDownloadTime = performance.now()
        const finalSpeedMbps = calculateSpeedMbps(totalDownloadedBytes, startDownloadTime, endDownloadTime);
        console.log(`Final Download Speed: ${finalSpeedMbps.toFixed(2)} Mbps`);

        return
    }

    private async _pingTest(stream: Stream) {
        const pingMessage = new TextEncoder().encode('ping');
        const sendTime = performance.now()
        let endTime;
        await pipe(
            [pingMessage],
            stream.sink
        );
        await pipe(
            stream.source,
            async function () {
                endTime = performance.now()
                const rtt = endTime - sendTime;
                console.log(`Ping RTT: ${rtt} ms`);
            }
        );
        return
    }
}