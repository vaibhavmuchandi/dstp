export const SPEEDTEST_EVENTS = {
    UPLOAD_SPEED: "upload-speed",
    DOWNLOAD_SPEED: "download-speed",
    UPLOAD_SPEED_FINAL: "upload-speed-final",
    DOWNLOAD_SPEED_FINAL: "download-speed-final",
    PING: "ping"
}

export const INTERNAL_EVENTS = {
    UPLOAD_TEST_COMPLETED: "upload-test-completed",
    DOWNLOAD_TEST_COMPLETED: "download-test-completed"
}

export const PROTOCOL_EVENTS = {
    ST_ROOT: "st-root",
    ST_RAW: "st-raw"
}

export type TSPEEDTEST_EVENTS = "upload-speed" | "download-speed" | "upload-speed-final" | "download-speed-final" | "ping"