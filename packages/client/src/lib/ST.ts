import { Stream } from "@libp2p/interface";
import { pushable } from "it-pushable";
import { calculateSpeedMbpsRealTime, createPacket, hashPacket, hash } from "../utils/helper.js";
import { pipe } from "it-pipe";
import { INTERNAL_EVENTS, SPEEDTEST_EVENTS } from "../utils/events.js";
import EventEmitter from "eventemitter3";
import { constructMerkleTree, generateProof } from "common-js";
import { RECEIVER_DATA } from "common-js";

export async function _uploadData(stream: Stream, EE: EventEmitter) {
    const packetSize = 5241920; // 5 MB per packet
    const packets = 41; // Total packets to send
    const dataStream = pushable();
    const ackTimes = [];
    let intervalBytesAcked = 0;
    let lastAckTime = performance.now();

    let uploadSpeed;

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
                if (!uploadSpeed) uploadSpeed = intervalSpeedMbps;
                else {
                    if (intervalSpeedMbps > uploadSpeed) {
                        uploadSpeed = intervalSpeedMbps
                    }
                }
                EE.emit(SPEEDTEST_EVENTS.UPLOAD_SPEED, { speedMbps: intervalSpeedMbps })

                // Reset for the next interval
                intervalBytesAcked = 0;
                lastAckTime = now;
            }
        }
    }
    EE.emit(SPEEDTEST_EVENTS.UPLOAD_SPEED_FINAL, { speedMbps: uploadSpeed })
}

export async function _downloadData(stream: Stream, EE: EventEmitter) {
    let totalDownloadedBytes = 0;
    let intervalBytes = 0;
    let packet = Buffer.alloc(0);
    let lastReportTime = performance.now();
    let totalAcks = 0;

    let packetHashes = [];

    const ackStream = pushable();

    // Start sending ACKs as soon as they are pushed to ackStream
    const ackSendingPromise = pipe(ackStream, stream.sink);

    let downloadSpeed;

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
                    const packetHash = hashPacket(packet); // Hash the complete packet
                    packetHashes.push(packetHash)
                    packet = Buffer.alloc(0); // Reset packet for the next one
                    ackStream.push(Buffer.from(`ACK:${seqNo}`)); // Send ACK immediately
                    totalAcks += 1
                    if (totalAcks == 40) {
                        setTimeout(() => {
                            ackStream.end()
                        }, 500)
                    }

                    const now = performance.now();
                    const intervalDurationSeconds = (now - lastReportTime) / 2000;
                    if (intervalDurationSeconds >= 0.5) {
                        const intervalSpeedMbps = calculateSpeedMbpsRealTime(intervalBytes, intervalDurationSeconds);
                        if (!downloadSpeed) downloadSpeed = intervalSpeedMbps;
                        else {
                            if (intervalSpeedMbps > downloadSpeed) {
                                downloadSpeed = intervalSpeedMbps
                            }
                        }
                        EE.emit(SPEEDTEST_EVENTS.DOWNLOAD_SPEED, { speedMbps: intervalSpeedMbps });
                        intervalBytes = 0;
                        lastReportTime = now;
                    }
                }
            }
        }
    );

    // Wait for both the packet receiving and ACK sending to complete
    await Promise.all([packetReceivingPromise, ackSendingPromise]);
    const { merkleRoot, merkleTree } = constructMerkleTree(packetHashes, hash);
    const nounce = Math.floor(Math.random() * merkleTree.length)
    const proof = generateProof(nounce, merkleTree)
    console.log(`Merkle Root: ${merkleRoot}`)
    console.log(`Merkle Tree Length: ${merkleTree.length}`)
    const testData: RECEIVER_DATA = {
        speedMbps: downloadSpeed,
        merkleRoot: merkleRoot,
        nounce: nounce,
        proof: proof
    }
    EE.emit(SPEEDTEST_EVENTS.DOWNLOAD_SPEED_FINAL, { speedMbps: downloadSpeed });
    EE.emit(INTERNAL_EVENTS.DOWNLOAD_TEST_COMPLETED, testData)
}


export async function _pingTest(stream: Stream, EE: EventEmitter) {
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
            EE.emit(SPEEDTEST_EVENTS.PING, { ping: rtt })
        }
    );
    return
}
