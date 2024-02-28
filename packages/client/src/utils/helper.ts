export function calculateSpeedMbps(bytes, startTime, endTime) {
    const durationSeconds = (endTime - startTime) / 1000;
    const bits = bytes * 8;
    return (bits / durationSeconds) / 1e6;
};

export const calculateSpeedMbpsRealTime = (bytes: number, durationSeconds: number): number => {
    return (bytes * 8) / (1024 * 1024) / durationSeconds; // Convert bytes to bits, then to Mbps
};