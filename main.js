// main.js

import { CONSTANTS, defaultMessages } from './modules/config.js';
import { elements } from './modules/ui/elements.js';
import { getFrameLength } from './modules/calculator.js';
import { visualizeMessage } from './modules/ui/visualizer.js';

// --- Global State ---
const canMessages = [...defaultMessages];

// --- Main Calculation and UI Update ---
function calculateBusLoad() {
	if (!validateInputData()) {
		return;
	}
	const baudRate = parseFloat(elements.baudRate.value) || CONSTANTS.DEFAULT_BAUD_RATE;
	let totalMinBitsPerSecond = 0;
	let totalMaxBitsPerSecond = 0;

	canMessages.forEach(message => {
		const { min, max } = getFrameLength(message.frameType, message.dataLength);
		totalMinBitsPerSecond += min * message.frequency * message.frameCount;
		totalMaxBitsPerSecond += max * message.frequency * message.frameCount;
	});

	const minBusLoad = (totalMinBitsPerSecond / baudRate) * 100;
	const maxBusLoad = (totalMaxBitsPerSecond / baudRate) * 100;
	const avgBusLoad = (minBusLoad + maxBusLoad) / 2;

	updateLoadDisplay(minBusLoad, avgBusLoad, maxBusLoad);

	localStorage.setItem("CANbus-Load-Calculator:canMessages", JSON.stringify(canMessages));
	localStorage.setItem("CANbus-Load-Calculator:baudRate", baudRate.toString());
}

function calculateLoadStatus(load) {
	if (load > CONSTANTS.LOAD_STATUS_THRESHOLDS.DANGER) {
		return 'danger';
	} else if (load > CONSTANTS.LOAD_STATUS_THRESHOLDS.WARNING) {
		return 'warning';
	} else if (load > CONSTANTS.LOAD_STATUS_THRESHOLDS.FINE) {
		return 'success';
	} else {
		return 'primary';
	}
}

function updateLoadDisplay(minLoad, avgLoad, maxLoad) {
	elements.minLoadResult.textContent = `${minLoad.toFixed(2)}%`;
	elements.avgLoadResult.textContent = `${avgLoad.toFixed(2)}%`;
	elements.maxLoadResult.textContent = `${maxLoad.toFixed(2)}%`;

	elements.loadBar.style.width = `${Math.min(avgLoad, 100)}%`;

	elements.loadBar.setAttribute('data-status', calculateLoadStatus(avgLoad));
	elements.minLoadResult.setAttribute('data-status', calculateLoadStatus(minLoad));
	elements.avgLoadResult.setAttribute('data-status', calculateLoadStatus(avgLoad));
	elements.maxLoadResult.setAttribute('data-status', calculateLoadStatus(maxLoad));
}

// --- Table Row Management ---
function renderMessageTable() {
	const tableBody = elements.canMessagesTable.querySelector("tbody");
	tableBody.innerHTML = "";
	const disabled = canMessages.length <= 1 ? "disabled" : "";

	canMessages.forEach((message, index) => {
		const row = document.createElement("tr");
		const isFd = message.frameType.startsWith('FDCAN');
		const maxDataLength = isFd ? CONSTANTS.MAX_FDCAN_DATA_LENGTH : CONSTANTS.MAX_DATA_LENGTH;
		row.innerHTML = `
			<td><input type="number" class="frequency" value="${message.frequency}" min="0" step="1" aria-label="消息频率（Hz）"></td>
			<td><input type="number" class="dataLength" value="${message.dataLength}" min="0" max="${maxDataLength}" step="1" aria-label="数据长度（字节）"></td>
			<td><input type="number" class="frameCount" value="${message.frameCount}" min="1" step="1" aria-label="每个周期发送的帧数"></td>
			<td>
				<select class="frameType" aria-label="选择 CAN 帧类型">
					<option value="CAN_STANDARD" ${message.frameType === "CAN_STANDARD" ? "selected" : ""}>CAN 标准帧</option>
					<option value="CAN_EXTENDED" ${message.frameType === "CAN_EXTENDED" ? "selected" : ""}>CAN 扩展帧</option>
					<option value="FDCAN_STANDARD" ${message.frameType === "FDCAN_STANDARD" ? "selected" : ""}>CAN FD 标准帧</option>
					<option value="FDCAN_EXTENDED" ${message.frameType === "FDCAN_EXTENDED" ? "selected" : ""}>CAN FD 扩展帧</option>
				</select>
			</td>
			<td><button class="delete-button" data-index="${index}" ${disabled} aria-label="删除此 CAN 消息">删除</button></td>
			<td><button class="visualize-button" data-index="${index}" aria-label="模拟此 CAN 消息的总线负载">模拟</button></td>
		`;
		tableBody.appendChild(row);
	});
}

function addNewRow() {
	canMessages.push({ frequency: 0, dataLength: 8, frameCount: 1, frameType: "CAN_STANDARD" });
	renderMessageTable();
	calculateBusLoad();
}

function deleteRow(index) {
	if (canMessages.length <= 1) return;
	canMessages.splice(index, 1);
	renderMessageTable();
	calculateBusLoad();
}

function updateMessage(index, row) {
	const frequencyInput = row.querySelector('.frequency');
	const dataLengthInput = row.querySelector('.dataLength');
	const frameCountInput = row.querySelector('.frameCount');
	const frameTypeSelect = row.querySelector('.frameType');
	
	const frameType = frameTypeSelect.value;
	let dataLength = parseFloat(dataLengthInput.value) || 0;
	const isFd = frameType.startsWith('FDCAN');
	const maxDataLength = isFd ? CONSTANTS.MAX_FDCAN_DATA_LENGTH : CONSTANTS.MAX_DATA_LENGTH;
	if (dataLength > maxDataLength) {
		dataLength = maxDataLength;
		dataLengthInput.value = maxDataLength;
	}
	canMessages[index] = {
		frequency: parseFloat(frequencyInput.value) || 0,
		dataLength: dataLength,
		frameCount: parseFloat(frameCountInput.value) || 1,
		frameType: frameType
	};
	dataLengthInput.setAttribute('max', maxDataLength);
	calculateBusLoad();
}


// --- Event Handlers ---
function handleTableChange(event) {
	if (event.target.tagName === "SELECT") {
		const row = event.target.closest("tr");
		const rowIndex = Array.from(row.parentNode.children).indexOf(row);
		if (rowIndex !== -1) {
			updateMessage(rowIndex, row);
		}
	}
}

function handleTableInput(event) {
	if (event.target.tagName === "INPUT") {
		const row = event.target.closest("tr");
		const rowIndex = Array.from(row.parentNode.children).indexOf(row);
		if (rowIndex !== -1) {
			updateMessage(rowIndex, row);
		}
	}
}

function handleTableClick(event) {
	if (event.target.classList.contains("delete-button")) {
		const index = parseInt(event.target.dataset.index);
		if (!isNaN(index)) deleteRow(index);
	} else if (event.target.classList.contains("visualize-button")) {
		const index = parseInt(event.target.dataset.index);
		if (!isNaN(index)) visualizeMessage(canMessages[index]);
	}
}

function resetAll() {
	localStorage.removeItem("CANbus-Load-Calculator:canMessages");
	localStorage.removeItem("CANbus-Load-Calculator:baudRate");
	elements.baudRate.value = CONSTANTS.DEFAULT_BAUD_RATE;
	canMessages.splice(0, canMessages.length, ...defaultMessages);
	renderMessageTable();
	calculateBusLoad();
}


// --- Initialization ---
function validateInputData() {
	const baudRate = parseFloat(elements.baudRate.value) || 0;
	if (baudRate <= 0) {
		showError("波特率必须大于 0");
		return false;
	}
	if (baudRate > CONSTANTS.MAX_BAUD_RATE) {
		showError(`波特率超出上限 (${CONSTANTS.MAX_BAUD_RATE})`);
		return false;
	}
	const hasFdcan = canMessages.some(m => m.frameType.startsWith('FDCAN'));
	const hasClassicCan = canMessages.some(m => !m.frameType.startsWith('FDCAN'));
	if (hasFdcan && hasClassicCan) {
		showError("不允许混合使用经典 CAN 和 FD CAN");
		return false;
	}
	for (const message of canMessages) {
		const isFd = message.frameType.startsWith('FDCAN');
		const maxLen = isFd ? CONSTANTS.MAX_FDCAN_DATA_LENGTH : CONSTANTS.MAX_DATA_LENGTH;
		if (message.dataLength > maxLen) {
			showError(`数据长度超出 ${message.frameType} 上限 (${maxLen}字节)`);
			return false;
		}
	}
	return true;
}

function showError(errorMessage) {
	elements.minLoadResult.textContent = "错误";
	elements.avgLoadResult.textContent = errorMessage;
	elements.maxLoadResult.textContent = "错误";
	elements.loadBar.style.width = "100%";
	elements.loadBar.setAttribute('data-status', 'danger');
	elements.minLoadResult.setAttribute('data-status', 'danger');
	elements.avgLoadResult.setAttribute('data-status', 'danger');
	elements.maxLoadResult.setAttribute('data-status', 'danger');
}

/**
 * Validate that loaded messages from localStorage have the expected structure.
 * In particular, each message must have a string `frameType` so that
 * code using `message.frameType.startsWith(...)` does not throw.
 */
function isValidSavedMessagesArray(messages) {
	if (!Array.isArray(messages) || messages.length === 0) {
		return false;
	}
	return messages.every(msg =>
		msg &&
		typeof msg === 'object' &&
		typeof msg.frameType === 'string'
	);
}

function loadFromLocalStorage() {
	try {
		const savedCanMessages = localStorage.getItem("CANbus-Load-Calculator:canMessages");
		const savedBaudRate = localStorage.getItem("CANbus-Load-Calculator:baudRate");
		if (savedCanMessages !== null) {
			const parsedMessages = JSON.parse(savedCanMessages);
			if (isValidSavedMessagesArray(parsedMessages)) {
				canMessages.splice(0, canMessages.length, ...parsedMessages);
			} else {
				// Fallback to defaults if the stored structure is incompatible
				canMessages.splice(0, canMessages.length, ...defaultMessages);
			}
		}
		elements.baudRate.value = savedBaudRate ?? CONSTANTS.DEFAULT_BAUD_RATE;
	} catch (error) {
		// 禁止使用 localStorage.clear()，以免误删同域其他数据
		console.error("Error loading saved data:", error);
		localStorage.removeItem("CANbus-Load-Calculator:canMessages");
		localStorage.removeItem("CANbus-Load-Calculator:baudRate");
	}
}

function init() {
	elements.baudRate.addEventListener("input", calculateBusLoad);
	elements.addRowButton.addEventListener("click", addNewRow);
	elements.resetButton.addEventListener("click", resetAll);

	const tableBody = elements.canMessagesTable.querySelector("tbody");
	tableBody.addEventListener("input", handleTableInput);
	tableBody.addEventListener("click", handleTableClick);
	tableBody.addEventListener("change", handleTableChange);

	loadFromLocalStorage();
	renderMessageTable();
	calculateBusLoad();
}

document.addEventListener("DOMContentLoaded", init);
