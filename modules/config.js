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
	IFS_LENGTH: 3 // 帧间间隔
};

// FDCAN DLC to Data Length mapping
export const DLC_TO_LENGTH = [0, 1, 2, 3, 4, 5, 6, 7, 8, 12, 16, 20, 24, 32, 48, 64];

// 可视化颜色定义
export const VIS_COLORS = {
	SOF: 'rgba(241, 196, 15, 0.3)',
	ARBITRATION: 'rgba(230, 126, 34, 0.3)',
	CONTROL: 'rgba(52, 152, 219, 0.3)',
	DATA: 'rgba(46, 204, 113, 0.3)',
	DATA_ALT: 'rgba(52, 152, 219, 0.4)',
	CRC: 'rgba(155, 89, 182, 0.3)',
	ACK: 'rgba(26, 188, 156, 0.3)',
	EOF: 'rgba(149, 165, 166, 0.3)',
	IFS: 'rgba(210, 215, 211, 0.3)',
	STUFF: 'rgba(231, 76, 60, 0.5)',
};
