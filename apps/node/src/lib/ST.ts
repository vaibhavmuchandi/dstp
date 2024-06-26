
import { pipe } from "it-pipe";
import { pushable } from "it-pushable"
import { Connection, Stream } from "@libp2p/interface";
import EventEmitter from "eventemitter3";
import { SENDER_DATA, STAMP } from "common-js";
import { constructMerkleTree, calculateSpeedMbpsRealTime, calculateAverageSpeed } from "common-js";

import { INTERNAL_EVENTS } from "../utils/events.js";
import { createPacket, hashPacket, hash } from "../utils/helper.js";
import { fetchRandomness } from "../utils/randomness.js";

export async function _uploadTest({ stream }) {
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

export async function _downloadTest(connection: Connection, stream: Stream, EE: EventEmitter) {
    console.log('Client connected for download speed test');
    const stamps: Array<STAMP> = []
    const packetSize = 5241920; // 5 MB per packet
    const packets = 41; // Total packets to send
    const dataStream = pushable();
    const ackTimes = [];
    let intervalBytesAcked = 0;
    let lastAckTime = performance.now();

    let packetHashes: string[] = [];
    const speeds: Array<number> = []

    const randomness = await fetchRandomness()

    // Function to send packets
    for (let i = 1; i < packets; i++) {
        const packet = createPacket(i, packetSize, randomness);
        dataStream.push(packet);
        const packetHash = hashPacket(packet);
        packetHashes.push(packetHash);
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
            const intervalDurationSeconds = (now - lastAckTime) / 2000;
            if (intervalDurationSeconds >= 0.5) { // Update every second, adjust as needed
                const intervalSpeedMbps = calculateSpeedMbpsRealTime(intervalBytesAcked, intervalDurationSeconds);
                speeds.push(intervalSpeedMbps)
                const stamp: STAMP = { intervalDuration: intervalDurationSeconds, size: intervalBytesAcked }
                stamps.push(stamp)
                // Reset for the next interval
                intervalBytesAcked = 0;
                lastAckTime = now;
            }
        }
    }
    console.log('Final download speed: ', calculateAverageSpeed(stamps))
    const { testHash, merkleTree } = constructMerkleTree(packetHashes, hash);
    console.log(`Merkle Size: `, merkleTree.length)
    console.log('Merkle Root:', testHash);
    const senderData: SENDER_DATA = {
        testHash,
        merkleTree,
        stamps,
        clientId: connection.remotePeer.toString(),
    }
    EE.emit(INTERNAL_EVENTS.DOWNLOAD_TEST_COMPLETED, senderData)
}


export async function _pingTest({ stream }) {
    console.log(`Client connected for ping test`);
    await pipe([stream.source], stream.sink)
}