import { Stream } from "@libp2p/interface";
import { Multiaddr } from "@multiformats/multiaddr"
import { pipe } from "it-pipe"
import { pushable } from "it-pushable"
import EventEmitter from "eventemitter3"

import { calculateSpeedMbps, calculateSpeedMbpsRealTime } from "../utils/helper.js";
import { SPEEDTEST_EVENTS, TSPEEDTEST_EVENTS } from "../utils/events.js";
import { Libp2pNode } from "../utils/types.js";

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
        await this._uploadData(stream);
        stream.close()
    }

    async downloadTest(nodeAddr: Multiaddr) {
        await this.node.dial(nodeAddr)
        const stream = await this.node.dialProtocol(nodeAddr, "/dstp/0.0.0/download-test")
        await this._downloadData(stream, this)
        stream.close()
    }

    async ping(nodeAddr: Multiaddr) {
        await this.node.dial(nodeAddr)
        const stream = await this.node.dialProtocol(nodeAddr, "/dstp/0.0.0/ping-test")
        await this._pingTest(stream, this)
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
                this.EE.emit(SPEEDTEST_EVENTS.UPLOAD_SPEED, { speedMbps })
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
        this.EE.emit(SPEEDTEST_EVENTS.UPLOAD_SPEED_FINAL, { speedMbps: finalSpeedMbps })
    }

    private async _downloadData(stream: Stream, dstp: DSTPClient) {
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
                        dstp.EE.emit(SPEEDTEST_EVENTS.DOWNLOAD_SPEED, { speedMbps: intervalSpeedMbps })
                        intervalBytes = 0;
                        lastReportTime = now;
                    }
                }
            }
        );

        const endDownloadTime = performance.now()
        const finalSpeedMbps = calculateSpeedMbps(totalDownloadedBytes, startDownloadTime, endDownloadTime);
        this.EE.emit(SPEEDTEST_EVENTS.DOWNLOAD_SPEED_FINAL, { speedMbps: finalSpeedMbps })

        return
    }

    private async _pingTest(stream: Stream, dstp: DSTPClient) {
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
                dstp.EE.emit(SPEEDTEST_EVENTS.PING, { ping: rtt })
            }
        );
        return
    }
}