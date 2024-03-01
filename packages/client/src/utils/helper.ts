export function calculateSpeedMbpsRealTime(bytes: number, durationSeconds: number) {
    return (bytes * 8) / (1024 * 1024) / durationSeconds; // Convert bytes to bits, then to Mbps
};


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
