// js/calculator.js

import { CONSTANTS, DLC_TO_LENGTH } from './config.js';

// --- Unified Frame Length Calculation ---
export function getFrameLength(frameType, dataLength) {
    let stuffableOverhead = 0;
    const fixedBits = 1 + 1 + 2 + 7 + 3; // SOF, CRC Del, ACK(Slot+Del), EOF, IFS
    let dataBits = dataLength * 8;
    let dlcVal = dataLength;

    switch (frameType) {
        case 'CAN_STANDARD':
            stuffableOverhead = 11 + 1 + 1 + 1 + 4 + 15; // ID, RTR, IDE, r0, DLC, CRC
            break;
        case 'CAN_EXTENDED':
            stuffableOverhead = 11 + 1 + 1 + 18 + 1 + 1 + 1 + 4 + 15; // BaseID, SRR, IDE, ExtID, RTR, r1, r0, DLC, CRC
            break;
        case 'FDCAN_STANDARD': {
            dlcVal = DLC_TO_LENGTH.findIndex(len => len >= dataLength);
            if (dlcVal === -1) dlcVal = 15;
            dataBits = DLC_TO_LENGTH[dlcVal] * 8;
            const crcBitCount = (dlcVal <= 10) ? 17 : 21;
            stuffableOverhead = 11 + 1 + 1 + 1 + 1 + 1 + 1 + 4 + 4 + crcBitCount; // ID, RRS, IDE, FDF, r, BRS, ESI, DLC, StuffCount, CRC
            break;
        }
        case 'FDCAN_EXTENDED': {
            dlcVal = DLC_TO_LENGTH.findIndex(len => len >= dataLength);
            if (dlcVal === -1) dlcVal = 15;
            dataBits = DLC_TO_LENGTH[dlcVal] * 8;
            const crcBitCount = (dlcVal <= 10) ? 21 : 25;
            stuffableOverhead = 11 + 1 + 1 + 18 + 1 + 1 + 1 + 1 + 4 + 4 + crcBitCount; // BaseID, SRR, IDE, ExtID, FDF, r, BRS, ESI, DLC, StuffCount, CRC
            break;
        }
    }

    const stuffableBits = stuffableOverhead + dataBits;
    const minLength = stuffableBits + fixedBits;
    const maxStuffing = Math.floor(stuffableBits / 5);
    const maxLength = minLength + maxStuffing;

    return { min: minLength, max: maxLength };
}
