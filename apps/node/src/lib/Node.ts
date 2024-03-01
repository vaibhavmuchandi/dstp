import { pipe } from "it-pipe";
import { pushable } from "it-pushable"

import { GeoLocation, Libp2pNode } from "../utils/types.js";
import { calculateSpeedMbps, calculateSpeedMbpsRealTime, createPacket } from "../utils/helper.js";

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
        let totalDownloadedBytes = 0;
        let intervalBytes = 0;
        let packet = Buffer.alloc(0);
        let lastReportTime = performance.now();
        let totalAcks = 0;

        const ackStream = pushable();

        const ackSendingPromise = pipe(ackStream, stream.sink);

        // Start sending ACKs as soon as they are pushed to ackStream
        let uploadSpeed;

        // Process received packets and push ACKs to ackStream
        const packetReceivingPromise = pipe(
            stream.source,
            async function (source) {
                for await (const chunk of source) {
                    totalDownloadedBytes += chunk.length;
                    intervalBytes += chunk.length;
                    packet = Buffer.concat([packet, chunk.subarray()]); // Assuming chunk is Buffer or Uint8Array
                    if (packet.byteLength === 5241920) { // Check if we have a complete packet
                        const seqNo = packet.readInt32BE(0);
                        packet = Buffer.alloc(0); // Reset packet for the next one
                        ackStream.push(Buffer.from(`ACK:${seqNo}`)); // Send ACK immediately
                        totalAcks += 1
                        if (totalAcks == 40) {
                            setTimeout(() => {
                                ackStream.end()
                            }, 500)
                        }

                        const now = performance.now();
                        const intervalDurationSeconds = (now - lastReportTime) / 500;
                        if (intervalDurationSeconds >= 0.5) {
                            const intervalSpeedMbps = calculateSpeedMbpsRealTime(intervalBytes, intervalDurationSeconds);
                            if (!uploadSpeed) uploadSpeed = intervalSpeedMbps;
                            else {
                                if (intervalSpeedMbps > uploadSpeed) {
                                    uploadSpeed = intervalSpeedMbps
                                }
                            }
                            console.log(`Current Estimated Upload Speed of Client: ${intervalSpeedMbps}`);
                            intervalBytes = 0;
                            lastReportTime = now;
                        }
                    }
                }
            }
        );

        // Wait for both the packet receiving and ACK sending to complete
        await Promise.all([packetReceivingPromise, ackSendingPromise]);
        console.log(`Final Estimated Upload Speed of the Client: ${uploadSpeed}`)
    }

    private async _downloadTest({ stream }) {
        console.log('Client connected for download speed test');

        const packetSize = 5241920; // 5 MB per packet
        const packets = 41; // Total packets to send
        const dataStream = pushable();
        const ackTimes = [];
        let intervalBytesAcked = 0;
        let lastAckTime = performance.now();

        let downloadSpeed;

        // Function to send packets
        for (let i = 1; i < packets; i++) {
            const packet = createPacket(i, packetSize);
            dataStream.push(packet);
        }
        dataStream.end();

        // Start sending packets to the client
        pipe(
            dataStream,
            stream.sink
        );

        // Function to handle ACKs and calculate speed
        for await (const ack of stream.source) {
            const ackMessage = new TextDecoder().decode(ack.subarray());

            // Parse the ACK message for the sequence number, assuming format "ACK:<seqNo>"
            const [ackType, seqNoStr] = ackMessage.split(':');
            if (ackType === 'ACK') {
                const seqNo = parseInt(seqNoStr, 10);
                ackTimes.push(performance.now()); // Record the time when each ACK is received
                intervalBytesAcked += packetSize; // Assume each ACK corresponds to a full packet

                // Calculate speed at regular intervals
                const now = performance.now();
                const intervalDurationSeconds = (now - lastAckTime) / 500;
                if (intervalDurationSeconds >= 0.5) { // Update every second, adjust as needed
                    const intervalSpeedMbps = calculateSpeedMbpsRealTime(intervalBytesAcked, intervalDurationSeconds);
                    if (!downloadSpeed) downloadSpeed = intervalSpeedMbps;
                    else {
                        if (intervalSpeedMbps > downloadSpeed) {
                            downloadSpeed = intervalSpeedMbps
                        }
                    }
                    console.log(`Current download speed of client: ${intervalSpeedMbps.toFixed(2)} Mbps`);

                    // Reset for the next interval
                    intervalBytesAcked = 0;
                    lastAckTime = now;
                }
            }
        }
        console.log('Final download speed: ', downloadSpeed)
    }


    private async _pingTest({ stream }) {
        console.log(`Client connected for ping test`);
        await pipe([stream.source], stream.sink)
    }
}