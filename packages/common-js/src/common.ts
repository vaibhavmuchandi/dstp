import { STAMP } from "./types";

export function calculateSpeedMbps(bytes, startTime, endTime) {
    const durationSeconds = (endTime - startTime) / 2000;
    const bits = bytes * 8;
    return (bits / durationSeconds) / 1e6; // Mbps
}


export const calculateSpeedMbpsRealTime = (bytes: number, durationSeconds: number): number => {
    return (bytes * 8) / (1024 * 1024) / durationSeconds; // Convert bytes to bits, then to Mbps
};

export const calculateAverageSpeed = (stamps: STAMP[]): number => {
    const totalSpeed = stamps.reduce((acc, stamp) => {
        const speed = calculateSpeedMbpsRealTime(stamp.size, stamp.intervalDuration);
        return acc + speed;
    }, 0);

    return totalSpeed / stamps.length;
};
