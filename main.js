// 初始示例消息列表（与表格中的默认值一致）
const defaultMessages = [
    { frequency: 1000, dataLength: 8, frameCount: 7 },
    { frequency: 500, dataLength: 8, frameCount: 1 },
    { frequency: 500, dataLength: 6, frameCount: 1 }
];

// 当前消息列表
const canMessages = [...defaultMessages];

// 常量定义
const CONSTANTS = {
    MAX_DATA_LENGTH: 8,
    MAX_BAUD_RATE: 1000000,
    DEFAULT_BAUD_RATE: 1000000
};

// DOM 元素缓存
const elements = {
    baudRate: document.getElementById("baud-rate"),
    canMessagesTable: document.getElementById("can-messages-table"),
    addRowButton: document.getElementById("add-row-button"),
    loadResult: document.getElementById("load-result"),
    loadBar: document.getElementById("load-bar"),
    resetButton: document.getElementById("reset-button")
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

    try {
        const savedCanMessages = localStorage.getItem("CANbus-Load-Calculator:canMessages");
        const savedBaudRate = localStorage.getItem("CANbus-Load-Calculator:baudRate");

        if (savedCanMessages) {
            canMessages.splice(0, canMessages.length, ...JSON.parse(savedCanMessages));
        }

        if (savedBaudRate) {
            elements.baudRate.value = savedBaudRate;
        }
    } catch (error) {
        console.error("Error loading saved data:", error);
        localStorage.removeItem("CANbus-Load-Calculator:canMessages");
        localStorage.removeItem("CANbus-Load-Calculator:baudRate");
    }

    // 渲染初始消息表格
    renderMessageTable();

    // 计算并显示初始负载
    calculateBusLoad();
}

// 处理表格输入事件
function handleTableInput(event) {
    if (event.target.tagName === "INPUT") {
        const row = event.target.closest("tr");
        const rowIndex = Array.from(row.parentNode.children).indexOf(row);

        if (rowIndex !== -1) {
            const inputs = row.querySelectorAll("input");
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
    }
}

// 重置所有内容
function resetAll() {
    localStorage.removeItem("CANbus-Load-Calculator:canMessages");
    localStorage.removeItem("CANbus-Load-Calculator:baudRate");

    elements.baudRate.value = CONSTANTS.DEFAULT_BAUD_RATE;
    canMessages.splice(0, canMessages.length, ...defaultMessages);
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
        row.innerHTML = `
            <td><input type="number" class="frequency" value="${message.frequency}" min="0" step="1"></td>
            <td><input type="number" class="dataLength" value="${message.dataLength}" min="0" max="${CONSTANTS.MAX_DATA_LENGTH}" step="1"></td>
            <td><input type="number" class="frameCount" value="${message.frameCount}" min="1" step="1"></td>
            <td><button class="delete-button" data-index="${index}" ${disabled}>删除</button></td>
        `;
        tableBody.appendChild(row);
    });
}

// 添加新行
function addNewRow() {
    canMessages.push({ frequency: 0, dataLength: 8, frameCount: 1 });
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
    canMessages[index] = {
        frequency: parseFloat(inputs[0].value) || 0,
        dataLength: parseFloat(inputs[1].value) || 0,
        frameCount: parseFloat(inputs[2].value) || 1
    };
    calculateBusLoad();
}

// 验证输入数据
function validateInputData() {
    const baudRate = parseFloat(elements.baudRate.value) || 0;

    // 检查波特率是否超过上限
    if (baudRate > CONSTANTS.MAX_BAUD_RATE) {
        showError("波特率超出上限（1000000）");
        return false;
    }

    // 检查数据长度是否合规
    const invalidDataLength = canMessages.some(message =>
        message.dataLength > CONSTANTS.MAX_DATA_LENGTH
    );

    if (invalidDataLength) {
        showError("数据段长度超出上限（8字节）");
        return false;
    }

    return true;
}

// 显示错误信息
function showError(errorMessage) {
    elements.loadResult.textContent = errorMessage;
    elements.loadBar.style.width = "100%";
    elements.loadBar.style.backgroundColor = getComputedStyle(document.documentElement).getPropertyValue('--color-danger'); // 使用CSS变量
}

// 计算总线负载
function calculateBusLoad() {
    const baudRate = parseFloat(elements.baudRate.value) || CONSTANTS.DEFAULT_BAUD_RATE;

    // 验证输入数据
    if (!validateInputData()) {
        return "0.00";
    }

    let totalBitsPerSecond = 0;

    canMessages.forEach(message => {
        const frameLength = message.dataLength > 0 ? 44 + (message.dataLength * 8) : 0;
        const totalFrameLength = frameLength * message.frameCount;
        const bitsPerSecond = totalFrameLength * message.frequency;
        totalBitsPerSecond += bitsPerSecond;
    });

    // 计算负载百分比
    const busLoad = (totalBitsPerSecond / baudRate) * 100;
    const formattedBusLoad = busLoad.toFixed(2);

    // 更新UI
    updateLoadDisplay(formattedBusLoad);

    // 存入 localStorage
    localStorage.setItem("CANbus-Load-Calculator:canMessages", JSON.stringify(canMessages));
    localStorage.setItem("CANbus-Load-Calculator:baudRate", baudRate.toString());

    return formattedBusLoad;
}

// 更新负载显示
function updateLoadDisplay(loadPercentage) {
    // 更新数值显示
    elements.loadResult.textContent = `${loadPercentage}%`;

    // 更新进度条
    elements.loadBar.style.width = `${Math.min(loadPercentage, 100)}%`;

    // 获取 CSS 变量
    const style = getComputedStyle(document.documentElement);
    const colorDanger = style.getPropertyValue('--color-danger');
    const colorWarning = style.getPropertyValue('--color-warning');
    const colorSuccess = style.getPropertyValue('--color-success');
    const colorPrimary = style.getPropertyValue('--color-primary');

    // 根据负载设置颜色
    if (loadPercentage > 90) {
        elements.loadBar.style.backgroundColor = colorDanger; // 红色 - 严重过载
    } else if (loadPercentage > 80) {
        elements.loadBar.style.backgroundColor = colorWarning; // 黄色 - 接近过载
    } else if (loadPercentage > 50) {
        elements.loadBar.style.backgroundColor = colorSuccess; // 绿色 - 正常高负载
    } else {
        elements.loadBar.style.backgroundColor = colorPrimary; // 蓝色 - 低负载
    }
}

// 页面加载完成后初始化
document.addEventListener("DOMContentLoaded", init);