// 初始示例消息列表
const defaultMessages = [
    { frequency: 1000, dataLength: 8, frameCount: 7, frameType: "CAN_STANDARD" },
    { frequency: 500, dataLength: 8, frameCount: 1, frameType: "CAN_EXTENDED" },
    { frequency: 500, dataLength: 16, frameCount: 1, frameType: "FDCAN_STANDARD" }
];

// 当前消息列表
let canMessages = [];

// 常量定义
const CONSTANTS = {
    MAX_DATA_LENGTH: 8,
    MAX_FDCAN_DATA_LENGTH: 64,
    MAX_BAUD_RATE: 5000000,
    DEFAULT_BAUD_RATE: 1000000,
    IFS_LENGTH: 3 // 帧间间隔
};

// FDCAN DLC to Data Length mapping
const DLC_TO_LENGTH = [0, 1, 2, 3, 4, 5, 6, 7, 8, 12, 16, 20, 24, 32, 48, 64];

// DOM 元素缓存
const elements = {
    baudRate: document.getElementById("baud-rate"),
    canMessagesTable: document.getElementById("can-messages-table"),
    addRowButton: document.getElementById("add-row-button"),
    minLoadResult: document.getElementById("min-load-result"),
    avgLoadResult: document.getElementById("avg-load-result"),
    maxLoadResult: document.getElementById("max-load-result"),
    loadBar: document.getElementById("load-bar"),
    resetButton: document.getElementById("reset-button"),
    visualizationContainer: document.getElementById("visualization-container")
};

// 初始化页面
function init() {
    // 绑定事件监听
    elements.baudRate.addEventListener("input", calculateBusLoad);
    elements.addRowButton.addEventListener("click", addNewRow);
    elements.resetButton.addEventListener("click", resetAll);

    // 使用事件委托处理表格输入和删除操作
    const tableBody = elements.canMessagesTable.querySelector("tbody");
    tableBody.addEventListener("input", handleTableInput);
    tableBody.addEventListener("click", handleTableClick);
    tableBody.addEventListener("change", handleTableChange);

    loadFromLocalStorage();

    // 渲染初始消息表格
    renderMessageTable();

    // 计算并显示初始负载
    calculateBusLoad();
}

function loadFromLocalStorage() {
    try {
        const savedCanMessages = localStorage.getItem("CANbus-Load-Calculator:canMessages");
        const savedBaudRate = localStorage.getItem("CANbus-Load-Calculator:baudRate");

        if (savedCanMessages) {
            const parsedMessages = JSON.parse(savedCanMessages);
            if (Array.isArray(parsedMessages) && parsedMessages.length > 0) {
                // Quick migration for users from older version
                parsedMessages.forEach(m => {
                    if (m.frameType === 'FDCAN') m.frameType = 'FDCAN_STANDARD';
                });
                canMessages = parsedMessages;
            } else {
                canMessages = JSON.parse(JSON.stringify(defaultMessages));
            }
        } else {
            canMessages = JSON.parse(JSON.stringify(defaultMessages));
        }

        if (savedBaudRate) {
            elements.baudRate.value = savedBaudRate;
        } else {
            elements.baudRate.value = CONSTANTS.DEFAULT_BAUD_RATE;
        }

    } catch (error) {
        console.error("Error loading saved data:", error);
        localStorage.removeItem("CANbus-Load-Calculator:canMessages");
        localStorage.removeItem("CANbus-Load-Calculator:baudRate");
        canMessages = JSON.parse(JSON.stringify(defaultMessages));
    }
}

// 处理表格 select 元素的 change 事件
function handleTableChange(event) {
    if (event.target.tagName === "SELECT") {
        const row = event.target.closest("tr");
        const rowIndex = Array.from(row.parentNode.children).indexOf(row);

        if (rowIndex !== -1) {
            const inputs = row.querySelectorAll("input, select");
            updateMessage(rowIndex, inputs);
        }
    }
}

// 处理表格输入事件
function handleTableInput(event) {
    if (event.target.tagName === "INPUT") {
        const row = event.target.closest("tr");
        const rowIndex = Array.from(row.parentNode.children).indexOf(row);

        if (rowIndex !== -1) {
            const inputs = row.querySelectorAll("input, select");
            updateMessage(rowIndex, inputs);
        }
    }
}

// 处理表格点击事件（删除按钮）
function handleTableClick(event) {
    if (event.target.classList.contains("delete-button")) {
        const index = parseInt(event.target.dataset.index);
        if (!isNaN(index)) {
            deleteRow(index);
        }
    } else if (event.target.classList.contains("visualize-button")) {
        const index = parseInt(event.target.dataset.index);
        if (!isNaN(index)) {
            visualizeMessage(canMessages[index]);
        }
    }
}

// 重置所有内容
function resetAll() {
    localStorage.removeItem("CANbus-Load-Calculator:canMessages");
    localStorage.removeItem("CANbus-Load-Calculator:baudRate");

    elements.baudRate.value = CONSTANTS.DEFAULT_BAUD_RATE;
    canMessages = JSON.parse(JSON.stringify(defaultMessages));
    renderMessageTable();
    calculateBusLoad();
}

// 渲染消息表格
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

// 添加新行
function addNewRow() {
    canMessages.push({ frequency: 0, dataLength: 8, frameCount: 1, frameType: "CAN_STANDARD" });
    renderMessageTable();
    calculateBusLoad();
}

// 删除行
function deleteRow(index) {
    if (canMessages.length <= 1) {
        return;
    }
    canMessages.splice(index, 1);
    renderMessageTable();
    calculateBusLoad();
}

// 更新消息数据
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

    const row = inputs[0].closest('tr');
    row.querySelector('.dataLength').setAttribute('max', maxDataLength);

    calculateBusLoad();
}

// 验证输入数据
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

// 显示错误信息
function showError(errorMessage) {
    elements.minLoadResult.textContent = "错误";
    elements.avgLoadResult.textContent = errorMessage;
    elements.maxLoadResult.textContent = "错误";
    elements.loadBar.style.width = "100%";
    elements.loadBar.style.backgroundColor = getComputedStyle(document.documentElement).getPropertyValue('--color-danger'); // 使用CSS变量
}

// --- Unified Frame Length Calculation (REVISED FINAL) ---
function getFrameLength(frameType, dataLength) {
    let stuffableOverhead = 0;
    // Non-stuffable bits that are always present
    const fixedBits = 1 + 1 + 2 + 7 + 3; // SOF, CRC Del, ACK(Slot+Del), EOF, IFS

    let dataBits = dataLength * 8;
    let dlcVal = dataLength;

    switch (frameType) {
        case 'CAN_STANDARD':
            // ID(11), RTR(1), IDE(1), r0(1), DLC(4), CRC(15)
            stuffableOverhead = 11 + 1 + 1 + 1 + 4 + 15;
            break;
        case 'CAN_EXTENDED':
            // BaseID(11), SRR(1), IDE(1), ExtID(18), RTR(1), r1(1), r0(1), DLC(4), CRC(15)
            stuffableOverhead = 11 + 1 + 1 + 18 + 1 + 1 + 1 + 4 + 15;
            break;
        case 'FDCAN_STANDARD': {
            dlcVal = DLC_TO_LENGTH.findIndex(len => len >= dataLength);
            if (dlcVal === -1) dlcVal = 15;
            dataBits = DLC_TO_LENGTH[dlcVal] * 8;
            const crcBitCount = (dlcVal <= 10) ? 17 : 21;
            // ID(11), RRS(1), IDE(1), FDF(1), r(1), BRS(1), ESI(1), DLC(4), StuffCount(4), CRC
            stuffableOverhead = 11 + 1 + 1 + 1 + 1 + 1 + 1 + 4 + 4 + crcBitCount;
            break;
        }
        case 'FDCAN_EXTENDED': {
            dlcVal = DLC_TO_LENGTH.findIndex(len => len >= dataLength);
            if (dlcVal === -1) dlcVal = 15;
            dataBits = DLC_TO_LENGTH[dlcVal] * 8;
            const crcBitCount = (dlcVal <= 10) ? 21 : 25;
            // BaseID(11), SRR(1), IDE(1), ExtID(18), FDF(1), r(1), BRS(1), ESI(1), DLC(4), StuffCount(4), CRC
            stuffableOverhead = 11 + 1 + 1 + 18 + 1 + 1 + 1 + 1 + 4 + 4 + crcBitCount;
            break;
        }
    }

    const stuffableBits = stuffableOverhead + dataBits;
    const minLength = stuffableBits + fixedBits;
    const maxStuffing = Math.floor(stuffableBits / 5); // Corrected stuffing logic for worst-case
    const maxLength = minLength + maxStuffing;

    return { min: minLength, max: maxLength };
}


// --- Visualization Functions (REVISED FINAL) ---
const VIS_COLORS = {
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

function createBitCell(bitInfo) {
    const cell = document.createElement("div");
    cell.className = "bit-cell";
    cell.style.backgroundColor = bitInfo.color;

    const label = document.createElement("span");
    label.className = "bit-label";
    label.textContent = bitInfo.label;
    cell.appendChild(label);

    const value = document.createElement("span");
    value.className = "bit-value";
    value.textContent = bitInfo.value;
    cell.appendChild(value);

    return cell;
}

function generateRandomBits(count) {
    return Array.from({ length: count }, () => Math.round(Math.random()).toString());
}

function applyBitStuffing(bitObjects) {
    if (bitObjects.length === 0) return [];
    let stuffed = [];
    let consecutiveCount = 0;
    let lastBitValue = -1;
    for (const bitObject of bitObjects) {
        stuffed.push(bitObject);
        if (bitObject.value === lastBitValue) {
            consecutiveCount++;
        } else {
            consecutiveCount = 1;
            lastBitValue = bitObject.value;
        }
        if (consecutiveCount === 5) {
            const stuffBitValue = lastBitValue === '1' ? '0' : '1';
            stuffed.push({ value: stuffBitValue, label: '填充', type: 'STUFF', color: VIS_COLORS.STUFF });
            consecutiveCount = 0;
            lastBitValue = -1;
        }
    }
    return stuffed;
}

function visualizeMessage(message) {
    const container = elements.visualizationContainer;
    container.innerHTML = "";
    const bitStreamContainer = document.createElement("div");
    bitStreamContainer.className = "bit-stream-container";

    let finalBitStream = [];
    let stuffablePart = [];
    const DATA_BYTE_COLORS = [VIS_COLORS.DATA, VIS_COLORS.DATA_ALT];

    // --- Build Frame ---
    
    // 1. SOF (not stuffable)
    finalBitStream.push({ value: '0', label: 'SOF', type: 'SOF', color: VIS_COLORS.SOF });

    const { frameType, dataLength } = message;
    const isFd = frameType.startsWith('FDCAN');
    const isExtended = frameType.endsWith('EXTENDED');
    
    // 2. Arbitration Field (stuffable)
    const baseIdBits = generateRandomBits(11);
    baseIdBits.forEach((b, i) => stuffablePart.push({ value: b, label: `ID${10 - i}`, type: 'ARBITRATION', color: VIS_COLORS.ARBITRATION }));

    if (isExtended) {
        stuffablePart.push({ value: '1', label: 'SRR', type: 'ARBITRATION', color: VIS_COLORS.ARBITRATION });
        stuffablePart.push({ value: '1', label: 'IDE', type: 'ARBITRATION', color: VIS_COLORS.ARBITRATION });
        const extIdBits = generateRandomBits(18);
        extIdBits.forEach((b, i) => stuffablePart.push({ value: b, label: `ExtID${17 - i}`, type: 'ARBITRATION', color: VIS_COLORS.ARBITRATION }));
    } else { // Standard ID
        const rtrLabel = isFd ? 'RRS' : 'RTR';
        const rtrBit = isFd ? '1' : '0'; // RTR is 0 for data frame, RRS is 1 for FD frame
        stuffablePart.push({ value: rtrBit, label: rtrLabel, type: 'ARBITRATION', color: VIS_COLORS.ARBITRATION });
        stuffablePart.push({ value: '0', label: 'IDE', type: 'ARBITRATION', color: VIS_COLORS.ARBITRATION });
    }

    // 3. Control Field (stuffable)
    let dlcVal = dataLength;
    if (isFd) {
        stuffablePart.push({ value: '1', label: 'FDF', type: 'CONTROL', color: VIS_COLORS.CONTROL });
        stuffablePart.push({ value: '0', label: 'r', type: 'CONTROL', color: VIS_COLORS.CONTROL }); // FD frames have one 'r' bit
        stuffablePart.push({ value: '1', label: 'BRS', type: 'CONTROL', color: VIS_COLORS.CONTROL });
        stuffablePart.push({ value: '0', label: 'ESI', type: 'CONTROL', color: VIS_COLORS.CONTROL });
        dlcVal = DLC_TO_LENGTH.findIndex(len => len >= dataLength);
        if (dlcVal === -1) dlcVal = 15;
    } else { // Classic CAN
        if (isExtended) {
            stuffablePart.push({ value: '0', label: 'RTR', type: 'CONTROL', color: VIS_COLORS.CONTROL });
            stuffablePart.push({ value: '0', label: 'r1', type: 'CONTROL', color: VIS_COLORS.CONTROL });
            stuffablePart.push({ value: '0', label: 'r0', type: 'CONTROL', color: VIS_COLORS.CONTROL });
        } else {
             stuffablePart.push({ value: '0', label: 'r0', type: 'CONTROL', color: VIS_COLORS.CONTROL });
        }
    }
    const dlcBits = dlcVal.toString(2).padStart(4, '0').split('');
    dlcBits.forEach((b, i) => stuffablePart.push({ value: b, label: `DLC${3 - i}`, type: 'CONTROL', color: VIS_COLORS.CONTROL }));

    // 4. Data Field (stuffable)
    const actualDataLength = isFd ? DLC_TO_LENGTH[dlcVal] : dataLength;
    const dataBits = generateRandomBits(actualDataLength * 8);
    dataBits.forEach((b, i) => {
        const byteIndex = Math.floor(i / 8);
        stuffablePart.push({
            value: b, label: `D${7 - (i % 8)}`, type: 'DATA',
            color: DATA_BYTE_COLORS[byteIndex % DATA_BYTE_COLORS.length]
        });
    });
    
    // 5. CRC Field (stuffable)
    let crcBitCount;
    if (isFd) {
        stuffablePart.push(...generateRandomBits(4).map((b, i) => ({ value: b, label: `SC${3-i}`, type: 'CRC', color: VIS_COLORS.CRC })));
        if(isExtended) crcBitCount = (dlcVal <= 10) ? 21 : 25;
        else crcBitCount = (dlcVal <= 10) ? 17 : 21;
    } else {
        crcBitCount = 15;
    }
    stuffablePart.push(...generateRandomBits(crcBitCount).map((b, i) => ({ value: b, label: `CRC${crcBitCount-1-i}`, type: 'CRC', color: VIS_COLORS.CRC })));
    
    // Apply Bit Stuffing to all stuffable parts
    finalBitStream.push(...applyBitStuffing(stuffablePart));

    // 6. Post-Stuffing Fields
    finalBitStream.push({ value: '1', label: 'Del', type: 'CRC', color: VIS_COLORS.CRC }); // CRC Delimiter
    finalBitStream.push({ value: '0', label: 'Slot', type: 'ACK', color: VIS_COLORS.ACK });
    finalBitStream.push({ value: '1', label: 'Del', type: 'ACK', color: VIS_COLORS.ACK });
    finalBitStream.push(...Array(7).fill(0).map(() => ({ value: '1', label: 'EOF', type: 'EOF', color: VIS_COLORS.EOF })));
    finalBitStream.push(...Array(3).fill(0).map(() => ({ value: '1', label: 'IFS', type: 'IFS', color: VIS_COLORS.IFS })));

    // Render
    const title = document.createElement("h4");
    title.textContent = `单帧模拟 (总计: ${finalBitStream.length} bits)`;
    container.appendChild(title);
    finalBitStream.forEach(bitInfo => bitStreamContainer.appendChild(createBitCell(bitInfo)));
    container.appendChild(bitStreamContainer);
}


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

    const displayLoad = avgLoad; // 使用平均负载来驱动进度条

    elements.loadBar.style.width = `${Math.min(displayLoad, 100)}%`;

    const style = getComputedStyle(document.documentElement);
    const colorDanger = style.getPropertyValue('--color-danger');
    const colorWarning = style.getPropertyValue('--color-warning');
    const colorSuccess = style.getPropertyValue('--color-success');
    const colorPrimary = style.getPropertyValue('--color-primary');

    if (displayLoad > 90) {
        elements.loadBar.style.backgroundColor = colorDanger;
    } else if (displayLoad > 80) {
        elements.loadBar.style.backgroundColor = colorWarning;
    } else if (displayLoad > 50) {
        elements.loadBar.style.backgroundColor = colorSuccess;
    } else {
        elements.loadBar.style.backgroundColor = colorPrimary;
    }
}

// 页面加载完成后初始化
document.addEventListener("DOMContentLoaded", init);

