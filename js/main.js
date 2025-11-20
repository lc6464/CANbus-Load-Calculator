// js/main.js

import { CONSTANTS, defaultMessages } from './config.js';
import { elements } from './ui/elements.js';
import { getFrameLength } from './calculator.js';
import { visualizeMessage } from './ui/visualizer.js';

// --- Global State ---
let canMessages = [];

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

function updateLoadDisplay(minLoad, avgLoad, maxLoad) {
    elements.minLoadResult.textContent = `${minLoad.toFixed(2)}%`;
    elements.avgLoadResult.textContent = `${avgLoad.toFixed(2)}%`;
    elements.maxLoadResult.textContent = `${maxLoad.toFixed(2)}%`;

    const displayLoad = avgLoad;
    elements.loadBar.style.width = `${Math.min(displayLoad, 100)}%`;

    const style = getComputedStyle(document.documentElement);
    const colorDanger = style.getPropertyValue('--color-danger');
    const colorWarning = style.getPropertyValue('--color-warning');
    const colorSuccess = style.getPropertyValue('--color-success');
    const colorPrimary = style.getPropertyValue('--color-primary');

    if (displayLoad > 90) elements.loadBar.style.backgroundColor = colorDanger;
    else if (displayLoad > 80) elements.loadBar.style.backgroundColor = colorWarning;
    else if (displayLoad > 50) elements.loadBar.style.backgroundColor = colorSuccess;
    else elements.loadBar.style.backgroundColor = colorPrimary;
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
            <td><input type="number" class="frequency" value="${message.frequency}" min="0" step="1"></td>
            <td><input type="number" class="dataLength" value="${message.dataLength}" min="0" max="${maxDataLength}" step="1"></td>
            <td><input type="number" class="frameCount" value="${message.frameCount}" min="1" step="1"></td>
            <td>
                <select class="frameType">
                    <option value="CAN_STANDARD" ${message.frameType === "CAN_STANDARD" ? "selected" : ""}>CAN 标准帧</option>
                    <option value="CAN_EXTENDED" ${message.frameType === "CAN_EXTENDED" ? "selected" : ""}>CAN 扩展帧</option>
                    <option value="FDCAN_STANDARD" ${message.frameType === "FDCAN_STANDARD" ? "selected" : ""}>CAN FD 标准帧</option>
                    <option value="FDCAN_EXTENDED" ${message.frameType === "FDCAN_EXTENDED" ? "selected" : ""}>CAN FD 扩展帧</option>
                </select>
            </td>
            <td><button class="delete-button" data-index="${index}" ${disabled}>删除</button></td>
            <td><button class="visualize-button" data-index="${index}">模拟</button></td>
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

function updateMessage(index, inputs) {
    const frameType = inputs[3].value;
    let dataLength = parseFloat(inputs[1].value) || 0;
    const isFd = frameType.startsWith('FDCAN');
    const maxDataLength = isFd ? CONSTANTS.MAX_FDCAN_DATA_LENGTH : CONSTANTS.MAX_DATA_LENGTH;
    if (dataLength > maxDataLength) {
        dataLength = maxDataLength;
        inputs[1].value = maxDataLength;
    }
    canMessages[index] = {
        frequency: parseFloat(inputs[0].value) || 0,
        dataLength: dataLength,
        frameCount: parseFloat(inputs[2].value) || 1,
        frameType: frameType
    };
    inputs[1].setAttribute('max', maxDataLength);
    calculateBusLoad();
}


// --- Event Handlers ---
function handleTableChange(event) {
    if (event.target.tagName === "SELECT") {
        const row = event.target.closest("tr");
        const rowIndex = Array.from(row.parentNode.children).indexOf(row);
        if (rowIndex !== -1) {
            updateMessage(rowIndex, row.querySelectorAll("input, select"));
        }
    }
}

function handleTableInput(event) {
    if (event.target.tagName === "INPUT") {
        const row = event.target.closest("tr");
        const rowIndex = Array.from(row.parentNode.children).indexOf(row);
        if (rowIndex !== -1) {
            updateMessage(rowIndex, row.querySelectorAll("input, select"));
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
    canMessages = JSON.parse(JSON.stringify(defaultMessages));
    renderMessageTable();
    calculateBusLoad();
}


// --- Initialization ---
function validateInputData() {
    const baudRate = parseFloat(elements.baudRate.value) || 0;
    if (baudRate > CONSTANTS.MAX_BAUD_RATE) {
        showError(`波特率超出上限 (${CONSTANTS.MAX_BAUD_RATE})`);
        return false;
    }
    const hasFdcan = canMessages.some(m => m.frameType.startsWith('FDCAN'));
    const hasClassicCan = canMessages.some(m => m.frameType.startsWith('CAN_'));
    if (hasFdcan && hasClassicCan) {
        showError("不允许混合使用经典CAN和FDCAN");
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
    elements.loadBar.style.backgroundColor = getComputedStyle(document.documentElement).getPropertyValue('--color-danger');
}


function loadFromLocalStorage() {
    try {
        const savedCanMessages = localStorage.getItem("CANbus-Load-Calculator:canMessages");
        const savedBaudRate = localStorage.getItem("CANbus-Load-Calculator:baudRate");
        if (savedCanMessages) {
            const parsedMessages = JSON.parse(savedCanMessages);
            if (Array.isArray(parsedMessages) && parsedMessages.length > 0) {
                parsedMessages.forEach(m => { if (m.frameType === 'FDCAN') m.frameType = 'FDCAN_STANDARD'; });
                canMessages = parsedMessages;
            } else {
                canMessages = JSON.parse(JSON.stringify(defaultMessages));
            }
        } else {
            canMessages = JSON.parse(JSON.stringify(defaultMessages));
        }
        if (savedBaudRate) elements.baudRate.value = savedBaudRate;
        else elements.baudRate.value = CONSTANTS.DEFAULT_BAUD_RATE;
    } catch (error) {
        console.error("Error loading saved data:", error);
        localStorage.clear();
        canMessages = JSON.parse(JSON.stringify(defaultMessages));
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
