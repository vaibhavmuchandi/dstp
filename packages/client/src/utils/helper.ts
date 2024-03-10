import { createHash } from "crypto-browserify"

export function hash(data: string): string {
    return createHash('sha256').update(data).digest('hex');
}

export function createPacket(seqNum, size) {
    const buffer = new ArrayBuffer(size); // Create an ArrayBuffer of the specified size
    const view = new DataView(buffer); // Create a DataView for the ArrayBuffer

    // Use the DataView to write a 32-bit int at the beginning of the buffer
    view.setInt32(0, seqNum, false); // 'false' for big-endian

    // The rest of the buffer can be left as zeros or filled with data
    // For example, to fill the rest with a pattern:
    // for (let i = 4; i < size; i++) {
    //     view.setUint8(i, someValue); // Fill each byte with someValue
    // }

    // Return a Uint8Array view of the buffer for convenience
    return new Uint8Array(buffer);
}

export function hashPacket(packet: Buffer): string {
    const hash = createHash('sha256').update(packet).digest('hex');
    return hash
}

