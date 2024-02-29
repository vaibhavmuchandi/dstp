import { pipe } from "it-pipe";

import { GeoLocation, Libp2pNode } from "../utils/types.js";
import { calculateSpeedMbps } from "../utils/helper.js";

export default class DSTPNode {
    node: Libp2pNode;
    geoLocation: GeoLocation

    constructor(options: { node: Libp2pNode, geoLocation: GeoLocation }) {
        this.node = options.node;
        this.geoLocation = options.geoLocation;
    }

    static init(options: { node: Libp2pNode, geoLocation: GeoLocation }) {
        const dstp = new DSTPNode(options);
        dstp._initProtocol()
        return dstp;
    }

    private async _initProtocol() {
        this.node.handle('/dstp/0.0.0/upload-test', this._uploadTest)
        this.node.handle('/dstp/0.0.0/download-test', this._downloadTest)
        this.node.handle('/dstp/0.0.0/ping-test', this._pingTest)
    }

    private async _uploadTest({ stream }) {
        console.log('Client connected for upload speed test');

        let totalBytes = 0;
        const start = performance.now();

        await pipe(
            stream.source,
            async function (source) {
                for await (const chunk of source) {
                    totalBytes += chunk.length;
                }
            }
        );

        const end = performance.now();
        const uploadSpeedMbps = calculateSpeedMbps(totalBytes, start, end);
        console.log(`Estimated upload speed: ${uploadSpeedMbps} Mbps`);
    }

    private async _downloadTest({ stream }) {
        console.log('Client connected for download speed test');
        const downloadStart = performance.now()
        const testData = Buffer.alloc(200 * 1024 * 1024);
        await pipe(
            [testData],
            stream.sink
        );
        const downloadEnd = performance.now()
        const downloadSpeedMbps = calculateSpeedMbps(50 * 1024 * 1024, downloadStart, downloadEnd);
        console.log(`Estimated download speed: ${downloadSpeedMbps} Mbps`);
    }

    private async _pingTest({ stream }) {
        console.log(`Client connected for ping test`);
        await pipe([stream.source], stream.sink)
    }
}