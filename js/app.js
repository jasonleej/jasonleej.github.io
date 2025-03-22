// 全局变量
let currentImage = null;
let canvas = document.getElementById('imageCanvas');
let ctx = null;
let history = [];
let historyIndex = -1;
let originalImageData = null;
let activeToolId = null; // 新增：跟踪当前激活的工具
let lastImageState = null; // 用于存储最后一次操作前的状态

// DOM 元素
const imageUpload = document.getElementById('imageUpload');
const dropZone = document.getElementById('dropZone');
const editorSection = document.getElementById('editorSection');
const optionsPanel = document.getElementById('optionsPanel');
const toolButtons = document.querySelectorAll('.tool-btn');
const undoBtn = document.getElementById('undo');
const redoBtn = document.getElementById('redo');
const resetBtn = document.getElementById('reset');
const downloadBtn = document.getElementById('download');

// 初始化函数
function init() {
    // 事件监听器
    imageUpload.addEventListener('change', handleImageUpload);
    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('dragleave', handleDragLeave);
    dropZone.addEventListener('drop', handleDrop);
    
    // 工具按钮事件
    toolButtons.forEach(button => {
        button.addEventListener('click', () => handleToolClick(button.id));
    });
    
    // 操作按钮事件
    undoBtn.addEventListener('click', undo);
    redoBtn.addEventListener('click', redo);
    resetBtn.addEventListener('click', reset);
    downloadBtn.addEventListener('click', downloadImage);
}

// 图片上传处理
function handleImageUpload(e) {
    const file = e.target.files[0];
    if (file && file.type.match('image.*')) {
        processImage(file);
    }
}

function handleDragOver(e) {
    e.preventDefault();
    dropZone.classList.add('active');
}

function handleDragLeave() {
    dropZone.classList.remove('active');
}

function handleDrop(e) {
    e.preventDefault();
    dropZone.classList.remove('active');
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.match('image.*')) {
        processImage(file);
    }
}

function processImage(file) {
    const reader = new FileReader();
    
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            // 设置画布尺寸
            initCanvas(img.width, img.height);
            
            // 显示图片
            ctx.drawImage(img, 0, 0);
            
            // 保存原始图像数据
            originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            // 将当前状态添加到历史记录
            addToHistory();
            
            // 显示编辑器区域
            editorSection.style.display = 'flex';
            
            // 保存当前图像
            currentImage = img;
        };
        img.src = event.target.result;
    };
    
    reader.readAsDataURL(file);
}

function initCanvas(width, height) {
    // 限制最大尺寸以避免性能问题
    const maxWidth = 1200;
    const maxHeight = 800;
    
    let newWidth = width;
    let newHeight = height;
    
    if (width > maxWidth) {
        const ratio = maxWidth / width;
        newWidth = maxWidth;
        newHeight = height * ratio;
    }
    
    if (newHeight > maxHeight) {
        const ratio = maxHeight / newHeight;
        newHeight = maxHeight;
        newWidth = newWidth * ratio;
    }
    
    canvas.width = newWidth;
    canvas.height = newHeight;
    
    ctx = canvas.getContext('2d');
}

// 历史记录管理
function addToHistory() {
    // 如果当前不是历史记录的最后一个状态，删除后面的历史
    if (historyIndex < history.length - 1) {
        history = history.slice(0, historyIndex + 1);
    }
    
    // 添加当前状态到历史记录
    history.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    
    // 更新历史索引
    historyIndex = history.length - 1;
    
    // 更新操作按钮状态
    updateActionButtons();
}

function undo() {
    if (historyIndex > 0) {
        historyIndex--;
        ctx.putImageData(history[historyIndex], 0, 0);
        updateActionButtons();
        resetActiveToolId();
    } else if (lastImageState) {
        // 如果没有历史记录但有lastImageState，使用它来撤销
        ctx.putImageData(lastImageState, 0, 0);
        lastImageState = null;
        resetActiveToolId();
    }
}

function redo() {
    if (historyIndex < history.length - 1) {
        historyIndex++;
        ctx.putImageData(history[historyIndex], 0, 0);
        updateActionButtons();
    }
}

function reset() {
    if (originalImageData) {
        ctx.putImageData(originalImageData, 0, 0);
        addToHistory();
        resetActiveToolId();
        optionsPanel.innerHTML = '';
        optionsPanel.classList.remove('visible');
    }
}

function updateActionButtons() {
    undoBtn.disabled = historyIndex <= 0;
    redoBtn.disabled = historyIndex >= history.length - 1;
}

// 工具处理
function handleToolClick(toolId) {
    // 检查是否点击了当前已激活的工具
    if (toolId === activeToolId) {
        // 第二次点击同一个工具，撤销效果
        undo();
        // 移除活动状态
        document.getElementById(toolId).classList.remove('active');
        activeToolId = null;
        // 隐藏选项面板
        optionsPanel.innerHTML = '';
        optionsPanel.classList.remove('visible');
        return;
    }
    
    // 在应用新工具前保存当前状态
    lastImageState = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // 移除所有工具按钮的活动状态
    toolButtons.forEach(btn => btn.classList.remove('active'));
    
    // 添加当前工具按钮的活动状态
    document.getElementById(toolId).classList.add('active');
    
    // 保存当前激活的工具ID
    activeToolId = toolId;
    
    // 显示相应的选项面板
    showOptionsPanel(toolId);
}

function showOptionsPanel(toolId) {
    optionsPanel.innerHTML = '';
    
    switch(toolId) {
        case 'resize':
            createResizeOptions();
            break;
        case 'crop':
            createCropOptions();
            break;
        case 'rotate':
            createRotateOptions();
            break;
        case 'flip':
            createFlipOptions();
            break;
        case 'grayscale':
            // 直接应用滤镜，无需选项面板
            // 保存应用前的状态，以便在第二次点击时撤销
            lastImageState = ctx.getImageData(0, 0, canvas.width, canvas.height);
            applyFilter('grayscale');
            break;
        case 'sepia':
            // 直接应用滤镜，无需选项面板
            lastImageState = ctx.getImageData(0, 0, canvas.width, canvas.height);
            applyFilter('sepia');
            break;
        case 'invert':
            // 直接应用滤镜，无需选项面板
            lastImageState = ctx.getImageData(0, 0, canvas.width, canvas.height);
            applyFilter('invert');
            break;
        case 'brightness':
            createBrightnessOptions();
            break;
        case 'contrast':
            createContrastOptions();
            break;
        case 'blur':
            createBlurOptions();
            break;
        case 'sharpen':
            // 直接应用锐化效果，无需选项面板
            lastImageState = ctx.getImageData(0, 0, canvas.width, canvas.height);
            applySharpen();
            break;
        case 'emboss':
            // 直接应用浮雕效果，无需选项面板
            lastImageState = ctx.getImageData(0, 0, canvas.width, canvas.height);
            applyEmboss();
            break;
        case 'vignette':
            createVignetteOptions();
            break;
        case 'removeMosaic':
            attemptRemoveMosaic();
            break;
        case 'addText':
            createTextOptions();
            break;
        case 'drawShape':
            createShapeOptions();
            break;
    }
    
    // 显示选项面板 (仅对需要选项的工具)
    if (['resize', 'crop', 'rotate', 'flip', 'brightness', 'contrast', 'blur', 
         'vignette', 'removeMosaic', 'addText', 'drawShape'].includes(toolId)) {
        optionsPanel.classList.add('visible');
    }
}

// 各种编辑功能的实现
function createResizeOptions() {
    const div = document.createElement('div');
    div.innerHTML = `
        <h4>调整大小</h4>
        <div class="slider-container">
            <label for="widthInput">宽度:</label>
            <input type="number" id="widthInput" value="${canvas.width}" min="1">
        </div>
        <div class="slider-container">
            <label for="heightInput">高度:</label>
            <input type="number" id="heightInput" value="${canvas.height}" min="1">
        </div>
        <div class="checkbox-container">
            <input type="checkbox" id="maintainAspect" checked>
            <label for="maintainAspect">保持宽高比</label>
        </div>
        <button id="applyResize" class="action-btn primary">应用</button>
    `;
    
    optionsPanel.appendChild(div);
    
    // 事件监听
    const widthInput = document.getElementById('widthInput');
    const heightInput = document.getElementById('heightInput');
    const maintainAspect = document.getElementById('maintainAspect');
    const applyResize = document.getElementById('applyResize');
    
    const aspectRatio = canvas.width / canvas.height;
    
    widthInput.addEventListener('change', () => {
        if (maintainAspect.checked) {
            heightInput.value = Math.round(widthInput.value / aspectRatio);
        }
    });
    
    heightInput.addEventListener('change', () => {
        if (maintainAspect.checked) {
            widthInput.value = Math.round(heightInput.value * aspectRatio);
        }
    });
    
    applyResize.addEventListener('click', () => {
        resizeImage(parseInt(widthInput.value), parseInt(heightInput.value));
    });
}

function resizeImage(width, height) {
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    
    tempCanvas.width = width;
    tempCanvas.height = height;
    
    tempCtx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, width, height);
    
    canvas.width = width;
    canvas.height = height;
    
    ctx.drawImage(tempCanvas, 0, 0);
    
    addToHistory();
}

function createCropOptions() {
    alert('裁剪功能: 请在图片上点击并拖动选择要保留的区域');
    // 实际项目中这里需要实现选区操作
}

function createRotateOptions() {
    const div = document.createElement('div');
    div.innerHTML = `
        <h4>旋转</h4>
        <button id="rotate90" class="action-btn">向右旋转90°</button>
        <button id="rotate180" class="action-btn">旋转180°</button>
        <button id="rotate270" class="action-btn">向左旋转90°</button>
    `;
    
    optionsPanel.appendChild(div);
    
    document.getElementById('rotate90').addEventListener('click', () => {
        rotateImage(90);
        // 单独设置activeToolId，避免与普通工具按钮冲突
        activeToolId = 'rotate90';
    });
    
    document.getElementById('rotate180').addEventListener('click', () => {
        rotateImage(180);
        activeToolId = 'rotate180';
    });
    
    document.getElementById('rotate270').addEventListener('click', () => {
        rotateImage(270);
        activeToolId = 'rotate270';
    });
}

function rotateImage(degrees) {
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    
    let width = canvas.width;
    let height = canvas.height;
    
    if (degrees === 90 || degrees === 270) {
        // 交换宽高
        tempCanvas.width = height;
        tempCanvas.height = width;
    } else {
        tempCanvas.width = width;
        tempCanvas.height = height;
    }
    
    tempCtx.save();
    tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
    tempCtx.rotate(degrees * Math.PI / 180);
    
    if (degrees === 90 || degrees === 270) {
        tempCtx.drawImage(canvas, -height / 2, -width / 2);
    } else {
        tempCtx.drawImage(canvas, -width / 2, -height / 2);
    }
    
    tempCtx.restore();
    
    canvas.width = tempCanvas.width;
    canvas.height = tempCanvas.height;
    ctx.drawImage(tempCanvas, 0, 0);
    
    addToHistory();
}

function createFlipOptions() {
    const div = document.createElement('div');
    div.innerHTML = `
        <h4>翻转</h4>
        <button id="flipHorizontal" class="action-btn">水平翻转</button>
        <button id="flipVertical" class="action-btn">垂直翻转</button>
    `;
    
    optionsPanel.appendChild(div);
    
    document.getElementById('flipHorizontal').addEventListener('click', () => {
        flipImage('horizontal');
        activeToolId = 'flipHorizontal';
    });
    
    document.getElementById('flipVertical').addEventListener('click', () => {
        flipImage('vertical');
        activeToolId = 'flipVertical';
    });
}

function flipImage(direction) {
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    
    if (direction === 'horizontal') {
        tempCtx.translate(tempCanvas.width, 0);
        tempCtx.scale(-1, 1);
    } else {
        tempCtx.translate(0, tempCanvas.height);
        tempCtx.scale(1, -1);
    }
    
    tempCtx.drawImage(canvas, 0, 0);
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(tempCanvas, 0, 0);
    
    addToHistory();
}

function applyFilter(type) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        switch (type) {
            case 'grayscale':
                const gray = 0.3 * r + 0.59 * g + 0.11 * b;
                data[i] = gray;
                data[i + 1] = gray;
                data[i + 2] = gray;
                break;
                
            case 'sepia':
                data[i] = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
                data[i + 1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
                data[i + 2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
                break;
                
            case 'invert':
                data[i] = 255 - r;
                data[i + 1] = 255 - g;
                data[i + 2] = 255 - b;
                break;
        }
    }
    
    ctx.putImageData(imageData, 0, 0);
    addToHistory();
    // 保持activeToolId与当前工具一致
}

function createBrightnessOptions() {
    const div = document.createElement('div');
    div.innerHTML = `
        <h4>调整亮度</h4>
        <div class="slider-container">
            <input type="range" id="brightnessSlider" min="-100" max="100" value="0">
            <label for="brightnessSlider">亮度: <span id="brightnessValue">0</span></label>
        </div>
        <button id="applyBrightness" class="action-btn primary">应用</button>
    `;
    
    optionsPanel.appendChild(div);
    
    const brightnessSlider = document.getElementById('brightnessSlider');
    const brightnessValue = document.getElementById('brightnessValue');
    
    brightnessSlider.addEventListener('input', () => {
        brightnessValue.textContent = brightnessSlider.value;
    });
    
    document.getElementById('applyBrightness').addEventListener('click', () => {
        adjustBrightness(parseInt(brightnessSlider.value));
        activeToolId = 'brightness_applied';
    });
}

function adjustBrightness(value) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, Math.max(0, data[i] + value));
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + value));
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + value));
    }
    
    ctx.putImageData(imageData, 0, 0);
    addToHistory();
}

function createContrastOptions() {
    const div = document.createElement('div');
    div.innerHTML = `
        <h4>调整对比度</h4>
        <div class="slider-container">
            <input type="range" id="contrastSlider" min="-100" max="100" value="0">
            <label for="contrastSlider">对比度: <span id="contrastValue">0</span></label>
        </div>
        <button id="applyContrast" class="action-btn primary">应用</button>
    `;
    
    optionsPanel.appendChild(div);
    
    const contrastSlider = document.getElementById('contrastSlider');
    const contrastValue = document.getElementById('contrastValue');
    
    contrastSlider.addEventListener('input', () => {
        contrastValue.textContent = contrastSlider.value;
    });
    
    document.getElementById('applyContrast').addEventListener('click', () => {
        adjustContrast(parseInt(contrastSlider.value));
        activeToolId = 'contrast_applied';
    });
}

function adjustContrast(value) {
    const factor = (259 * (value + 255)) / (255 * (259 - value));
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128));
        data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128));
        data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128));
    }
    
    ctx.putImageData(imageData, 0, 0);
    addToHistory();
}

function createBlurOptions() {
    const div = document.createElement('div');
    div.innerHTML = `
        <h4>模糊</h4>
        <div class="slider-container">
            <input type="range" id="blurSlider" min="0" max="20" value="0" step="1">
            <label for="blurSlider">模糊程度: <span id="blurValue">0</span></label>
        </div>
        <button id="applyBlur" class="action-btn primary">应用</button>
    `;
    
    optionsPanel.appendChild(div);
    
    const blurSlider = document.getElementById('blurSlider');
    const blurValue = document.getElementById('blurValue');
    
    blurSlider.addEventListener('input', () => {
        blurValue.textContent = blurSlider.value;
    });
    
    document.getElementById('applyBlur').addEventListener('click', () => {
        applyBlur(parseInt(blurSlider.value));
        activeToolId = 'blur_applied';
    });
}

function applyBlur(radius) {
    // 使用CSS滤镜实现模糊效果
    ctx.filter = `blur(${radius}px)`;
    
    // 保存当前图像到临时画布
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(canvas, 0, 0);
    
    // 清除当前画布并重新绘制
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(tempCanvas, 0, 0);
    
    // 重置滤镜
    ctx.filter = 'none';
    
    addToHistory();
}

function applySharpen() {
    // 锐化卷积核
    const weights = [
        0, -1, 0,
        -1, 5, -1,
        0, -1, 0
    ];
    
    convolute(weights);
    addToHistory();
    // activeToolId已在调用时设置
}

function applyEmboss() {
    // 浮雕卷积核
    const weights = [
        -2, -1, 0,
        -1, 1, 1,
        0, 1, 2
    ];
    
    convolute(weights);
    addToHistory();
    // activeToolId已在调用时设置
}

function convolute(weights) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const tempData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const tempPixels = tempData.data;
    
    const side = Math.round(Math.sqrt(weights.length));
    const halfSide = Math.floor(side / 2);
    
    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            const dstOff = (y * canvas.width + x) * 4;
            
            let r = 0, g = 0, b = 0;
            
            for (let cy = 0; cy < side; cy++) {
                for (let cx = 0; cx < side; cx++) {
                    const scy = y + cy - halfSide;
                    const scx = x + cx - halfSide;
                    
                    if (scy >= 0 && scy < canvas.height && scx >= 0 && scx < canvas.width) {
                        const srcOff = (scy * canvas.width + scx) * 4;
                        const wt = weights[cy * side + cx];
                        
                        r += tempPixels[srcOff] * wt;
                        g += tempPixels[srcOff + 1] * wt;
                        b += tempPixels[srcOff + 2] * wt;
                    }
                }
            }
            
            data[dstOff] = Math.min(255, Math.max(0, r));
            data[dstOff + 1] = Math.min(255, Math.max(0, g));
            data[dstOff + 2] = Math.min(255, Math.max(0, b));
        }
    }
    
    ctx.putImageData(imageData, 0, 0);
}

function createVignetteOptions() {
    const div = document.createElement('div');
    div.innerHTML = `
        <h4>暗角</h4>
        <div class="slider-container">
            <input type="range" id="vignetteIntensity" min="0" max="1" value="0.5" step="0.1">
            <label for="vignetteIntensity">强度: <span id="vignetteValue">0.5</span></label>
        </div>
        <button id="applyVignette" class="action-btn primary">应用</button>
    `;
    
    optionsPanel.appendChild(div);
    
    const vignetteSlider = document.getElementById('vignetteIntensity');
    const vignetteValue = document.getElementById('vignetteValue');
    
    vignetteSlider.addEventListener('input', () => {
        vignetteValue.textContent = vignetteSlider.value;
    });
    
    document.getElementById('applyVignette').addEventListener('click', () => {
        applyVignette(parseFloat(vignetteSlider.value));
        activeToolId = 'vignette_applied';
    });
}

function applyVignette(intensity) {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);
    
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxDistance);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(0.5, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(0,0,0,' + intensity + ')');
    
    // 保存当前图像到临时画布
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(canvas, 0, 0);
    
    // 应用暗角效果
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 使用源图像作为蒙版
    ctx.globalCompositeOperation = 'source-atop';
    ctx.drawImage(tempCanvas, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    
    addToHistory();
}

function attemptRemoveMosaic() {
    const div = document.createElement('div');
    div.innerHTML = `
        <h4>去除马赛克</h4>
        <p>注意: 去马赛克功能使用基于AI的图像恢复技术，效果可能因图片不同而异。</p>
        <div class="slider-container">
            <input type="range" id="mosaicStrength" min="1" max="10" value="5" step="1">
            <label for="mosaicStrength">强度: <span id="mosaicValue">5</span></label>
        </div>
        <button id="applyDemosaic" class="action-btn primary">应用</button>
    `;
    
    optionsPanel.appendChild(div);
    
    const mosaicSlider = document.getElementById('mosaicStrength');
    const mosaicValue = document.getElementById('mosaicValue');
    
    mosaicSlider.addEventListener('input', () => {
        mosaicValue.textContent = mosaicSlider.value;
    });
    
    document.getElementById('applyDemosaic').addEventListener('click', () => {
        // 模拟去马赛克效果 (实际项目中这里需要使用更复杂的算法)
        applySharpening(parseInt(mosaicSlider.value));
        alert('马赛克去除处理已完成。请注意，此功能为模拟效果，实际应用中可能需要更高级的AI算法。');
        activeToolId = 'mosaic_applied';
    });
}

function applySharpening(intensity) {
    // 创建一个简单的锐化效果来模拟去马赛克
    for (let i = 0; i < intensity; i++) {
        applySharpen();
    }
}

function createTextOptions() {
    const div = document.createElement('div');
    div.innerHTML = `
        <h4>添加文字</h4>
        <div class="input-container">
            <label for="textInput">文本内容:</label>
            <input type="text" id="textInput" placeholder="输入文字">
        </div>
        <div class="input-container">
            <label for="fontFamily">字体:</label>
            <select id="fontFamily">
                <option value="Arial">Arial</option>
                <option value="Verdana">Verdana</option>
                <option value="Georgia">Georgia</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Courier New">Courier New</option>
                <option value="微软雅黑">微软雅黑</option>
                <option value="宋体">宋体</option>
            </select>
        </div>
        <div class="input-container">
            <label for="fontSize">字体大小:</label>
            <input type="number" id="fontSize" value="24" min="8" max="100">
        </div>
        <div class="input-container">
            <label for="textColor">颜色:</label>
            <input type="color" id="textColor" value="#000000">
        </div>
        <p>点击图像上的位置放置文本</p>
        <button id="addTextBtn" class="action-btn primary">开始添加文本</button>
    `;
    
    optionsPanel.appendChild(div);
    
    document.getElementById('addTextBtn').addEventListener('click', () => {
        const text = document.getElementById('textInput').value;
        const fontFamily = document.getElementById('fontFamily').value;
        const fontSize = document.getElementById('fontSize').value;
        const color = document.getElementById('textColor').value;
        
        if (text) {
            // 在添加文本前先保存当前状态，以便后续撤销
            const beforeTextState = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            canvas.addEventListener('click', function placeText(e) {
                const rect = canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                ctx.font = `${fontSize}px ${fontFamily}`;
                ctx.fillStyle = color;
                ctx.fillText(text, x, y);
                
                canvas.removeEventListener('click', placeText);
                addToHistory();
                activeToolId = 'text_applied';
            });
            
            alert('现在请点击图像上的位置放置文本');
        } else {
            alert('请输入文本内容');
        }
    });
}

function createShapeOptions() {
    const div = document.createElement('div');
    div.innerHTML = `
        <h4>绘制形状</h4>
        <div class="input-container">
            <label for="shapeType">形状类型:</label>
            <select id="shapeType">
                <option value="rectangle">矩形</option>
                <option value="circle">圆形</option>
                <option value="line">直线</option>
            </select>
        </div>
        <div class="input-container">
            <label for="strokeColor">线条颜色:</label>
            <input type="color" id="strokeColor" value="#000000">
        </div>
        <div class="input-container">
            <label for="fillColor">填充颜色:</label>
            <input type="color" id="fillColor" value="#ffffff">
        </div>
        <div class="input-container">
            <label for="lineWidth">线条宽度:</label>
            <input type="number" id="lineWidth" value="2" min="1" max="20">
        </div>
        <p>点击并拖动鼠标在图像上绘制</p>
        <button id="drawShapeBtn" class="action-btn primary">开始绘制</button>
    `;
    
    optionsPanel.appendChild(div);
    
    document.getElementById('drawShapeBtn').addEventListener('click', () => {
        const shapeType = document.getElementById('shapeType').value;
        const strokeColor = document.getElementById('strokeColor').value;
        const fillColor = document.getElementById('fillColor').value;
        const lineWidth = document.getElementById('lineWidth').value;
        
        let isDrawing = false;
        let startX, startY;
        
        function mouseDown(e) {
            isDrawing = true;
            const rect = canvas.getBoundingClientRect();
            startX = e.clientX - rect.left;
            startY = e.clientY - rect.top;
        }
        
        function mouseMove(e) {
            if (!isDrawing) return;
            
            const rect = canvas.getBoundingClientRect();
            const currentX = e.clientX - rect.left;
            const currentY = e.clientY - rect.top;
            
            // 临时画布用于绘制预览
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
            const tempCtx = tempCanvas.getContext('2d');
            
            // 复制当前画布状态
            tempCtx.drawImage(canvas, 0, 0);
            
            // 设置样式
            tempCtx.strokeStyle = strokeColor;
            tempCtx.fillStyle = fillColor;
            tempCtx.lineWidth = lineWidth;
            
            // 绘制形状
            if (shapeType === 'rectangle') {
                tempCtx.beginPath();
                tempCtx.rect(startX, startY, currentX - startX, currentY - startY);
                tempCtx.stroke();
                tempCtx.fill();
            } else if (shapeType === 'circle') {
                const radius = Math.sqrt(Math.pow(currentX - startX, 2) + Math.pow(currentY - startY, 2));
                tempCtx.beginPath();
                tempCtx.arc(startX, startY, radius, 0, 2 * Math.PI);
                tempCtx.stroke();
                tempCtx.fill();
            } else if (shapeType === 'line') {
                tempCtx.beginPath();
                tempCtx.moveTo(startX, startY);
                tempCtx.lineTo(currentX, currentY);
                tempCtx.stroke();
            }
            
            // 更新主画布
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(tempCanvas, 0, 0);
        }
        
        function mouseUp() {
            if (isDrawing) {
                isDrawing = false;
                addToHistory();
                activeToolId = 'shape_applied';
                
                // 移除事件监听器
                canvas.removeEventListener('mousedown', mouseDown);
                canvas.removeEventListener('mousemove', mouseMove);
                canvas.removeEventListener('mouseup', mouseUp);
                canvas.removeEventListener('mouseleave', mouseUp);
            }
        }
        
        canvas.addEventListener('mousedown', mouseDown);
        canvas.addEventListener('mousemove', mouseMove);
        canvas.addEventListener('mouseup', mouseUp);
        canvas.addEventListener('mouseleave', mouseUp);
        
        alert('现在可以在图像上绘制形状了');
    });
}

// 下载图片
function downloadImage() {
    const link = document.createElement('a');
    link.download = 'edited-image.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    
    // 下载后可以重置工具激活状态，但保持图像不变
    resetActiveToolId();
    optionsPanel.innerHTML = '';
    optionsPanel.classList.remove('visible');
}

// 添加一个重置activeToolId的函数，当执行撤销或重做操作时调用
function resetActiveToolId() {
    activeToolId = null;
    toolButtons.forEach(btn => btn.classList.remove('active'));
}

// 页面加载完成后初始化
window.addEventListener('load', init); 