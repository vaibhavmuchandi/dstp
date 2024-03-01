export const calculateSpeedMbpsRealTime = (bytes: number, durationSeconds: number): number => {
    return (bytes * 8) / (1024 * 1024) / durationSeconds; // Convert bytes to bits, then to Mbps
};

export function createPacket(seqNum: number, size: number): Buffer {
    // Allocate buffer for the packet: 4 bytes for the seqNum and the rest for the payload
    const packet = Buffer.alloc(size);

    // Write the sequence number at the beginning of the packet
    packet.writeInt32BE(seqNum, 0);

    // The rest of the packet can be payload; here we're just filling it with zeros
    // In a real application, you might want to fill it with actual data or leave it as zeros

    return packet;
}