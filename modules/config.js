// modules/config.js

// 初始示例消息列表
export const defaultMessages = [
	{ frequency: 1000, dataLength: 8, frameCount: 7, frameType: "CAN_STANDARD" },
	{ frequency: 500, dataLength: 8, frameCount: 1, frameType: "CAN_EXTENDED" },
	{ frequency: 500, dataLength: 16, frameCount: 1, frameType: "FDCAN_STANDARD" }
];

// 常量定义
export const CONSTANTS = {
	MAX_DATA_LENGTH: 8,
	MAX_FDCAN_DATA_LENGTH: 64,
	MAX_BAUD_RATE: 5000000,
	DEFAULT_BAUD_RATE: 1000000,
	IFS_LENGTH: 3, // 帧间间隔
	// 负载阈值
	LOAD_STATUS_THRESHOLDS: {
		DANGER: 90,
		WARNING: 80,
		FINE: 50
	}
};

// FDCAN DLC to Data Length mapping
export const DLC_TO_LENGTH = [0, 1, 2, 3, 4, 5, 6, 7, 8, 12, 16, 20, 24, 32, 48, 64];