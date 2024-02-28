export function calculateSpeedMbps(bytes, startTime, endTime) {
    const durationSeconds = (endTime - startTime) / 1000;
    const bits = bytes * 8;
    return (bits / durationSeconds) / 1e6;
};