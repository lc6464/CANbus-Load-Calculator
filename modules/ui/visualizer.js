// modules/ui/visualizer.js

import { DLC_TO_LENGTH } from '../config.js';
import { elements } from './elements.js';

function createBitCell(bitInfo) {
	const cell = document.createElement("div");
	cell.className = "bit-cell";
	cell.setAttribute("data-type", bitInfo.type);
	if (bitInfo.isAlt) {
		cell.setAttribute("data-alt", "true");
	}

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
			stuffed.push({ value: stuffBitValue, label: '填充', type: 'STUFF' });
			consecutiveCount = 1;
			lastBitValue = stuffBitValue;
		}
	}
	return stuffed;
}

export function visualizeMessage(message) {
	const container = elements.visualizationContainer;
	container.innerHTML = "";
	const bitStreamContainer = document.createElement("div");
	bitStreamContainer.className = "bit-stream-container";

	let finalBitStream = [];
	let stuffablePart = [];

	finalBitStream.push({ value: '0', label: 'SOF', type: 'SOF' });

	const { frameType, dataLength } = message;
	const isFd = frameType.startsWith('FDCAN');
	const isExtended = frameType.endsWith('EXTENDED');

	const baseIdBits = generateRandomBits(11);
	baseIdBits.forEach((b, i) => stuffablePart.push({ value: b, label: `ID${10 - i}`, type: 'ARBITRATION' }));

	if (isExtended) {
		stuffablePart.push({ value: '1', label: 'SRR', type: 'ARBITRATION' });
		stuffablePart.push({ value: '1', label: 'IDE', type: 'ARBITRATION' });
		const extIdBits = generateRandomBits(18);
		extIdBits.forEach((b, i) => stuffablePart.push({ value: b, label: `ExtID${17 - i}`, type: 'ARBITRATION' }));
	} else {
		const rtrLabel = isFd ? 'RRS' : 'RTR';
		const rtrBit = isFd ? '1' : '0';
		stuffablePart.push({ value: rtrBit, label: rtrLabel, type: 'ARBITRATION' });
		stuffablePart.push({ value: '0', label: 'IDE', type: 'ARBITRATION' });
	}

	let dlcVal = dataLength;
	if (isFd) {
		stuffablePart.push({ value: '1', label: 'FDF', type: 'CONTROL' });
		stuffablePart.push({ value: '0', label: 'r', type: 'CONTROL' });
		stuffablePart.push({ value: '1', label: 'BRS', type: 'CONTROL' });
		stuffablePart.push({ value: '0', label: 'ESI', type: 'CONTROL' });
		dlcVal = DLC_TO_LENGTH.findIndex(len => len >= dataLength);
		if (dlcVal === -1) dlcVal = 15;
	} else {
		if (isExtended) {
			stuffablePart.push({ value: '0', label: 'RTR', type: 'CONTROL' });
			stuffablePart.push({ value: '0', label: 'r1', type: 'CONTROL' });
			stuffablePart.push({ value: '0', label: 'r0', type: 'CONTROL' });
		} else {
			stuffablePart.push({ value: '0', label: 'r0', type: 'CONTROL' });
		}
	}
	const dlcBits = dlcVal.toString(2).padStart(4, '0').split('');
	dlcBits.forEach((b, i) => stuffablePart.push({ value: b, label: `DLC${3 - i}`, type: 'CONTROL' }));

	const actualDataLength = isFd ? DLC_TO_LENGTH[dlcVal] : dataLength;
	const dataBits = generateRandomBits(actualDataLength * 8);
	dataBits.forEach((b, i) => {
		const byteIndex = Math.floor(i / 8);
		stuffablePart.push({
			value: b, label: `D${7 - (i % 8)}`, type: 'DATA',
			isAlt: byteIndex % 2 === 1
		});
	});

	let crcBitCount;
	if (isFd) {
		stuffablePart.push(...generateRandomBits(4).map((b, i) => ({ value: b, label: `SC${3 - i}`, type: 'CRC' })));
		if (isExtended) crcBitCount = (dlcVal <= 10) ? 21 : 25;
		else crcBitCount = (dlcVal <= 10) ? 17 : 21;
	} else {
		crcBitCount = 15;
	}
	stuffablePart.push(...generateRandomBits(crcBitCount).map((b, i) => ({ value: b, label: `CRC${crcBitCount - 1 - i}`, type: 'CRC' })));

	finalBitStream.push(...applyBitStuffing(stuffablePart));

	finalBitStream.push({ value: '1', label: 'Del', type: 'CRC' });
	finalBitStream.push({ value: '0', label: 'Slot', type: 'ACK' });
	finalBitStream.push({ value: '1', label: 'Del', type: 'ACK' });
	finalBitStream.push(...Array(7).fill(0).map(() => ({ value: '1', label: 'EOF', type: 'EOF' })));
	finalBitStream.push(...Array(3).fill(0).map(() => ({ value: '1', label: 'IFS', type: 'IFS' })));

	const title = document.createElement("h4");
	title.textContent = `单帧模拟 (总计: ${finalBitStream.length} bits)`;
	container.appendChild(title);
	finalBitStream.forEach(bitInfo => bitStreamContainer.appendChild(createBitCell(bitInfo)));
	container.appendChild(bitStreamContainer);
}
