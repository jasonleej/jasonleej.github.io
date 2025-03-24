// 音频转换器主应用
document.addEventListener('DOMContentLoaded', function() {
    // DOM 元素
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const fileList = document.getElementById('fileList');
    const fileListContainer = document.getElementById('fileListContainer');
    const fileCount = document.getElementById('fileCount');
    const conversionResults = document.getElementById('conversionResults');
    const resultsList = document.getElementById('resultsList');
    const clearBtn = document.getElementById('clearBtn');
    const convertBtn = document.getElementById('convertBtn');
    const downloadAllBtn = document.getElementById('downloadAllBtn');
    const menuItems = document.querySelectorAll('.menu li a');
    const formatInfo = document.querySelector('.format-info');
    
    // 当前格式和状态
    let currentFormat = 'mp3';
    let isConverting = false;
    let uploadedFiles = [];
    let convertedFiles = [];
    
    // 格式信息映射
    const formatDescriptions = {
        mp3: {
            title: "MP3 格式转换器",
            description: "将其他格式的音频文件转换为MP3格式。MP3是一种常用的音频压缩格式，具有良好的兼容性和较小的文件大小。"
        },
        wav: {
            title: "WAV 格式转换器",
            description: "将音频文件转换为WAV格式。WAV是一种无损音频格式，提供最高质量的音频，但文件体积较大。"
        },
        aac: {
            title: "AAC 格式转换器",
            description: "将音频文件转换为AAC格式。AAC是一种高级音频编码，通常提供比MP3更好的音质和更小的文件大小。"
        },
        ac3: {
            title: "AC3 格式转换器",
            description: "将音频文件转换为AC3格式。AC3是杜比数字音频编码，常用于DVD和蓝光碟片。"
        },
        wma: {
            title: "WMA 格式转换器",
            description: "将音频文件转换为WMA格式。WMA是微软开发的Windows媒体音频格式。"
        },
        ogg: {
            title: "OGG 格式转换器",
            description: "将音频文件转换为OGG格式。OGG是一种开放、免费的容器格式，通常与Vorbis音频编解码器一起使用。"
        },
        m4a: {
            title: "M4A 格式转换器",
            description: "将音频文件转换为M4A格式。M4A是基于MPEG-4的音频文件格式，通常使用AAC编码。"
        },
        flac: {
            title: "FLAC 格式转换器",
            description: "将音频文件转换为FLAC格式。FLAC是一种无损音频压缩格式，提供原始音频质量，同时减小文件大小。"
        },
        opus: {
            title: "OPUS 格式转换器",
            description: "将音频文件转换为OPUS格式。OPUS是一种高度压缩的音频编码格式，为互联网流媒体和存储而设计。"
        },
        ape: {
            title: "APE 格式转换器",
            description: "将音频文件转换为APE格式。APE是Monkey's Audio无损音频压缩格式，提供极高的压缩率。"
        },
        amr: {
            title: "AMR 格式转换器",
            description: "将音频文件转换为AMR格式。AMR是一种针对语音优化的压缩格式，常用于移动电话。"
        }
    };
    
    // 初始化FFmpeg
    const { createFFmpeg, fetchFile } = FFmpeg;
    const ffmpeg = createFFmpeg({ 
        log: true,
        corePath: 'https://unpkg.com/@ffmpeg/core@0.10.0/dist/ffmpeg-core.js'
    });
    
    let ffmpegLoaded = false;
    
    // 加载FFmpeg
    async function loadFFmpeg() {
        if (!ffmpegLoaded) {
            try {
                await ffmpeg.load();
                ffmpegLoaded = true;
                console.log('FFmpeg 加载完成');
            } catch (error) {
                console.error('FFmpeg 加载失败:', error);
                alert('音频处理库加载失败，请刷新页面重试');
            }
        }
    }
    
    // 拖放事件处理
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });
    
    function highlight() {
        dropZone.classList.add('drag-over');
    }
    
    function unhighlight() {
        dropZone.classList.remove('drag-over');
    }
    
    // 文件拖放处理
    dropZone.addEventListener('drop', handleDrop, false);
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    }
    
    // 文件选择处理
    fileInput.addEventListener('change', function() {
        handleFiles(this.files);
    });
    
    // 文件处理函数
    function handleFiles(files) {
        if (files.length === 0) return;
        
        // 过滤出音频文件
        const audioFiles = Array.from(files).filter(file => file.type.includes('audio') || isKnownAudioFormat(file.name));
        
        if (audioFiles.length === 0) {
            alert('请上传音频文件');
            return;
        }
        
        // 添加文件到上传列表
        audioFiles.forEach(file => {
            if (!isFileAlreadyAdded(file)) {
                uploadedFiles.push({
                    file: file,
                    id: generateUniqueId(),
                    status: 'pending' // pending, converting, completed, error
                });
            }
        });
        
        updateFileList();
        showFileListContainer();
    }
    
    // 检查文件是否已添加
    function isFileAlreadyAdded(file) {
        return uploadedFiles.some(item => 
            item.file.name === file.name && 
            item.file.size === file.size && 
            item.file.lastModified === file.lastModified
        );
    }
    
    // 根据文件扩展名判断是否为已知的音频格式
    function isKnownAudioFormat(filename) {
        const audioExtensions = ['.mp3', '.wav', '.aac', '.ac3', '.wma', '.ogg', '.m4a', '.flac', '.opus', '.ape', '.amr'];
        const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
        return audioExtensions.includes(ext);
    }
    
    // 生成唯一ID
    function generateUniqueId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    }
    
    // 更新文件列表显示
    function updateFileList() {
        fileList.innerHTML = '';
        fileCount.textContent = `(${uploadedFiles.length})`;
        
        uploadedFiles.forEach(fileObj => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.dataset.id = fileObj.id;
            
            const fileSize = formatFileSize(fileObj.file.size);
            const fileExt = fileObj.file.name.split('.').pop().toUpperCase();
            
            fileItem.innerHTML = `
                <div class="file-icon">
                    <i class="fas fa-music"></i>
                </div>
                <div class="file-info">
                    <div class="file-name">${fileObj.file.name}</div>
                    <div class="file-meta">${fileExt} · ${fileSize}</div>
                    ${fileObj.status === 'converting' ? '<div class="progress-container"><div class="progress-bar" style="width: 0%"></div></div>' : ''}
                </div>
                <div class="file-actions">
                    <button class="file-action-btn remove-file" data-id="${fileObj.id}">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            `;
            
            fileList.appendChild(fileItem);
            
            // 添加删除事件监听
            fileItem.querySelector('.remove-file').addEventListener('click', function() {
                removeFile(this.dataset.id);
            });
        });
    }
    
    // 显示文件列表容器
    function showFileListContainer() {
        if (uploadedFiles.length > 0) {
            fileListContainer.style.display = 'block';
        } else {
            fileListContainer.style.display = 'none';
        }
    }
    
    // 格式化文件大小
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    // 删除文件
    function removeFile(id) {
        uploadedFiles = uploadedFiles.filter(file => file.id !== id);
        updateFileList();
        
        if (uploadedFiles.length === 0) {
            showFileListContainer();
        }
    }
    
    // 清空列表
    clearBtn.addEventListener('click', function() {
        if (isConverting) {
            alert('转换进行中，无法清空列表');
            return;
        }
        
        uploadedFiles = [];
        updateFileList();
        showFileListContainer();
    });
    
    // 转换按钮点击事件
    convertBtn.addEventListener('click', async function() {
        if (isConverting) {
            alert('转换进行中，请等待完成');
            return;
        }
        
        if (uploadedFiles.length === 0) {
            alert('请先添加文件');
            return;
        }
        
        const outputFormat = document.getElementById('outputFormat').value;
        const bitrate = document.getElementById('bitrate').value;
        const sampleRate = document.getElementById('sampleRate').value;
        const channels = document.getElementById('channels').value;
        
        // 转换参数
        const conversionParams = {
            outputFormat,
            bitrate,
            sampleRate,
            channels
        };
        
        // 开始转换
        try {
            isConverting = true;
            convertBtn.textContent = '转换中...';
            convertBtn.disabled = true;
            
            // 加载FFmpeg
            await loadFFmpeg();
            
            // 开始批量转换
            convertedFiles = [];
            await convertFiles(conversionParams);
            
            // 显示转换结果
            showConversionResults();
            
            isConverting = false;
            convertBtn.textContent = '开始转换';
            convertBtn.disabled = false;
        } catch (error) {
            console.error('转换出错:', error);
            alert('转换过程中出错: ' + error.message);
            isConverting = false;
            convertBtn.textContent = '开始转换';
            convertBtn.disabled = false;
        }
    });
    
    // 批量转换文件
    async function convertFiles(params) {
        for (let i = 0; i < uploadedFiles.length; i++) {
            const fileObj = uploadedFiles[i];
            fileObj.status = 'converting';
            updateFileList();
            
            try {
                const result = await convertSingleFile(fileObj.file, params, (progress) => {
                    updateProgress(fileObj.id, progress);
                });
                
                convertedFiles.push({
                    originalName: fileObj.file.name,
                    convertedFile: result.data,
                    outputFormat: params.outputFormat,
                    fileSize: result.data.size,
                    duration: result.duration || '未知'
                });
                
                fileObj.status = 'completed';
            } catch (error) {
                console.error(`转换文件 ${fileObj.file.name} 出错:`, error);
                fileObj.status = 'error';
            }
            
            updateFileList();
        }
    }
    
    // 转换单个文件
    async function convertSingleFile(file, params, progressCallback) {
        // 在这里我们模拟转换，实际应用中应使用ffmpeg.wasm进行转换
        // 因为需要完整的ffmpeg.wasm库才能运行
        
        // 模拟进度回调
        for (let i = 0; i <= 100; i += 10) {
            progressCallback(i);
            await new Promise(resolve => setTimeout(resolve, 200)); // 模拟延迟
        }
        
        // 模拟转换结果
        // 在实际应用中，使用ffmpeg.wasm进行转换
        /*
        const { name } = file;
        const baseName = name.substring(0, name.lastIndexOf('.'));
        const outputName = `${baseName}.${params.outputFormat}`;
        
        ffmpeg.FS('writeFile', name, await fetchFile(file));
        
        // 构建ffmpeg命令
        await ffmpeg.run(
            '-i', name,
            '-ar', params.sampleRate,
            '-ac', params.channels,
            '-b:a', params.bitrate + 'k',
            outputName
        );
        
        const data = ffmpeg.FS('readFile', outputName);
        ffmpeg.FS('unlink', name);
        ffmpeg.FS('unlink', outputName);
        
        const outputBlob = new Blob([data.buffer], { type: getMimeType(params.outputFormat) });
        */
        
        // 模拟转换结果
        const baseName = file.name.substring(0, file.name.lastIndexOf('.'));
        const newFileName = `${baseName}.${params.outputFormat}`;
        
        // 创建一个模拟的转换后文件
        const convertedBlob = new Blob([await file.arrayBuffer()], { type: getMimeType(params.outputFormat) });
        const convertedFile = new File([convertedBlob], newFileName, {
            type: getMimeType(params.outputFormat)
        });
        
        return {
            data: convertedFile,
            duration: '1:30' // 模拟时长
        };
    }
    
    // 更新进度条
    function updateProgress(fileId, progress) {
        const fileItem = document.querySelector(`.file-item[data-id="${fileId}"]`);
        if (fileItem) {
            let progressBar = fileItem.querySelector('.progress-bar');
            if (!progressBar) {
                const progressContainer = document.createElement('div');
                progressContainer.className = 'progress-container';
                progressContainer.innerHTML = '<div class="progress-bar"></div>';
                fileItem.querySelector('.file-info').appendChild(progressContainer);
                progressBar = fileItem.querySelector('.progress-bar');
            }
            progressBar.style.width = `${progress}%`;
        }
    }
    
    // 获取MIME类型
    function getMimeType(format) {
        const mimeTypes = {
            'mp3': 'audio/mpeg',
            'wav': 'audio/wav',
            'aac': 'audio/aac',
            'ogg': 'audio/ogg',
            'm4a': 'audio/mp4',
            'flac': 'audio/flac',
            'wma': 'audio/x-ms-wma',
            'opus': 'audio/opus',
            'ac3': 'audio/ac3',
            'ape': 'audio/ape',
            'amr': 'audio/amr'
        };
        
        return mimeTypes[format] || 'audio/mpeg';
    }
    
    // 显示转换结果
    function showConversionResults() {
        resultsList.innerHTML = '';
        
        convertedFiles.forEach((file, index) => {
            const resultItem = document.createElement('div');
            resultItem.className = 'result-item';
            
            const fileSize = formatFileSize(file.fileSize);
            
            resultItem.innerHTML = `
                <div class="result-icon">
                    <i class="fas fa-check-circle"></i>
                </div>
                <div class="result-info">
                    <div class="result-name">${file.originalName} → ${file.convertedFile.name}</div>
                    <div class="result-meta">${file.outputFormat.toUpperCase()} · ${fileSize} · ${file.duration}</div>
                </div>
                <div class="result-actions">
                    <button class="result-action-btn download-file" data-index="${index}">
                        <i class="fas fa-download"></i> 下载
                    </button>
                </div>
            `;
            
            resultsList.appendChild(resultItem);
            
            // 添加下载事件监听
            resultItem.querySelector('.download-file').addEventListener('click', function() {
                downloadFile(parseInt(this.dataset.index));
            });
        });
        
        conversionResults.style.display = 'block';
    }
    
    // 下载文件
    function downloadFile(index) {
        const file = convertedFiles[index];
        if (!file) return;
        
        const url = URL.createObjectURL(file.convertedFile);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.convertedFile.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    // 下载所有文件
    downloadAllBtn.addEventListener('click', function() {
        if (convertedFiles.length === 0) return;
        
        // 如果只有一个文件，直接下载
        if (convertedFiles.length === 1) {
            downloadFile(0);
            return;
        }
        
        // 如果有多个文件，创建一个ZIP文件（实际应用中需要使用JSZip库）
        alert('批量下载功能需要JSZip库支持，已单独下载每个文件');
        
        // 逐个下载文件
        convertedFiles.forEach((file, index) => {
            setTimeout(() => {
                downloadFile(index);
            }, index * 500); // 间隔下载，避免浏览器阻止
        });
    });
    
    // 菜单项点击事件
    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            // 更新活动状态
            menuItems.forEach(mi => mi.parentElement.classList.remove('active'));
            this.parentElement.classList.add('active');
            
            // 获取格式或工具
            if (this.dataset.format) {
                currentFormat = this.dataset.format;
                updateFormatInfo();
            } else if (this.dataset.tool) {
                // 处理工具点击
                handleToolClick(this.dataset.tool);
            }
        });
    });
    
    // 更新格式信息
    function updateFormatInfo() {
        const info = formatDescriptions[currentFormat] || formatDescriptions.mp3;
        formatInfo.innerHTML = `
            <h2>${info.title}</h2>
            <p>${info.description}</p>
        `;
    }
    
    // 处理工具点击
    function handleToolClick(tool) {
        // 在实际应用中实现不同工具的处理逻辑
        alert(`${tool}工具功能正在开发中...`);
    }
    
    // 初始化
    updateFormatInfo();
}); 