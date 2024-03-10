import { createHash } from 'crypto';

export function hash(data: string): string {
    return createHash('sha256').update(data).digest('hex');
}

export const calculateSpeedMbpsRealTime = (bytes: number, durationSeconds: number): number => {
    return (bytes * 8) / (1024 * 1024) / durationSeconds; // Convert bytes to bits, then to Mbps
};

export function createPacket(seqNum: number, size: number, hashString: string): Buffer {
    const packet = Buffer.alloc(size);

    packet.writeInt32BE(seqNum, 0);

    const seed = parseInt(hashString.slice(0, 8), 16);

    const prng = xmur3(seed.toString());
    const rand = sfc32(prng(), prng(), prng(), prng());

    for (let i = 4; i < size; i++) {
        packet[i] = Math.floor(rand() * 256);
    }

    return packet;
}

export function hashPacket(packet: Buffer): string {
    const hash = createHash('sha256').update(packet).digest('hex');
    return hash
}


function xmur3(str) {
    for (var i = 0, h = 1779033703 ^ str.length; i < str.length; i++)
        h = Math.imul(h ^ str.charCodeAt(i), 3432918353), h = h << 13 | h >>> 19;
    return function () {
        h = Math.imul(h ^ h >>> 16, 2246822507);
        h = Math.imul(h ^ h >>> 13, 3266489909);
        return (h ^= h >>> 16) >>> 0;
    }
}

function sfc32(a, b, c, d) {
    return function () {
        a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
        var t = (a + b) | 0;
        a = b ^ b >>> 9;
        b = c + (c << 3) | 0;
        c = (c << 21 | c >>> 11);
        d = d + 1 | 0;
        t = t + d | 0;
        c = c + t | 0;
        return (t >>> 0) / 4294967296;
    }
}
