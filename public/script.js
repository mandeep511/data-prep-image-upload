function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

class ImagePacker {
  constructor(canvasId, maxSize = 2048) {
    this.canvasId = canvasId;
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.maxSize = maxSize;
    this.images = new Map(); // Stores image positions and metadata
    this.currentX = 0;
    this.currentY = 0;
    this.rowHeight = 0;
    
    // Generate a unique canvas ID once during initialization
    this.canvasUUID = this.generateCanvasId();
    console.log('Generated Canvas ID:', this.canvasUUID); // For debugging
    
    // Initialize canvas
    this.canvas.width = this.maxSize;
    this.canvas.height = this.maxSize;
    this.ctx.fillStyle = 'transparent';
    this.ctx.fillRect(0, 0, this.maxSize, this.maxSize);
    
    // Setup event listeners
    this.setupEventListeners();

    // Flag to prevent size change after upload
    this.sizeLocked = false;
  }

  setMaxSize(newSize) {
    if (this.sizeLocked) return false;
    this.maxSize = newSize;
    this.canvas.width = newSize;
    this.canvas.height = newSize;
    this.ctx.clearRect(0, 0, newSize, newSize);
    this.images.clear();
    this.currentX = 0;
    this.currentY = 0;
    this.rowHeight = 0;
    // Generate a new canvas UUID for the new size
    this.canvasUUID = this.generateCanvasId();
    console.log('New Canvas ID:', this.canvasUUID);
    return true;
  }

  lockSize() {
    this.sizeLocked = true;
  }

  generateCanvasId() {
    // Generate a 7-digit random number
    const randomNum = Math.floor(Math.random() * 9000000) + 1000000; // ensures 7 digits
    return `packed_data_prep/canvas_${randomNum}`;
  }

  setupEventListeners() {
    this.canvas.addEventListener('mousemove', this.handleHover.bind(this));
    this.canvas.addEventListener('click', this.handleClick.bind(this));
    
    // Add mouseout event listener
    this.canvas.addEventListener('mouseout', () => {
      const hoverInfo = document.getElementById('hover-info');
      hoverInfo.style.display = 'none';
    });
  }

  async addImage(file) {
    const img = await this.loadImage(file);
    
    // Check image dimensions before proceeding
    if (img.width > this.maxSize || img.height > this.maxSize) {
      return {
        success: false,
        error: `Image too large. Maximum dimensions allowed are ${this.maxSize}x${this.maxSize} pixels. This image is ${img.width}x${img.height} pixels.`
      };
    }

    const position = this.findPosition(img.width, img.height);
    
    if (!position) {
      return { success: false, error: 'Canvas is full' };
    }

    this.ctx.drawImage(img, position.x, position.y);
    
    const imageData = {
      x: position.x,
      y: position.y,
      width: img.width,
      height: img.height,
      name: file.name
    };
    
    this.images.set(`${position.x}-${position.y}`, imageData);
    
    // Lock the canvas size after the first image is added
    if (!this.sizeLocked) {
      this.lockSize();
      disableCanvasSizeSelection();
    }
    
    return {
      success: true,
      url: this.generateImageUrl(imageData)
    };
  }

  findPosition(width, height) {
    if (this.currentX + width > this.maxSize) {
      this.currentX = 0;
      this.currentY += this.rowHeight;
      this.rowHeight = 0;
    }

    if (this.currentY + height > this.maxSize) {
      return null; // Canvas is full
    }

    const position = {
      x: this.currentX,
      y: this.currentY
    };

    this.currentX += width;
    this.rowHeight = Math.max(this.rowHeight, height);

    return position;
  }

  loadImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  generateImageUrl(imageData) {
    const baseUrl = 'https://cdn.pureessence.tech/';
    return `${baseUrl}${this.canvasUUID}.png?top_left_x=${imageData.x}&top_left_y=${imageData.y}&width=${imageData.width}&height=${imageData.height}`;
  }

  handleHover(event) {
    const rect = this.canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (this.canvas.width / rect.width);
    const y = (event.clientY - rect.top) * (this.canvas.height / rect.height);
    
    const hoveredImage = this.findImageAtPosition(x, y);
    const hoverInfo = document.getElementById('hover-info');
    
    if (hoveredImage) {
      const tooltipX = event.clientX;
      const tooltipY = event.clientY;
      
      hoverInfo.style.display = 'block';
      hoverInfo.style.position = 'fixed';
      hoverInfo.style.left = `${tooltipX}px`;
      hoverInfo.style.top = `${tooltipY - 30}px`;
      
      hoverInfo.innerHTML = `
        <div class="url-text">${this.generateImageUrl(hoveredImage)}</div>
        <div class="action-text">Just click to copy URL</div>
      `;
    } else {
      hoverInfo.style.display = 'none';
    }
  }

  handleClick(event) {
    const rect = this.canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (this.canvas.width / rect.width);
    const y = (event.clientY - rect.top) * (this.canvas.height / rect.height);
    
    const clickedImage = this.findImageAtPosition(x, y);
    if (clickedImage) {
      const url = this.generateImageUrl(clickedImage);
      navigator.clipboard.writeText(url);
      
      // Show a brief "Copied!" notification while maintaining the style
      const hoverInfo = document.getElementById('hover-info');
      hoverInfo.innerHTML = `
        <div class="url-text">${url}</div>
        <div class="action-text">Copied!</div>
      `;
      
      // Reset back to original text after 1 second
      setTimeout(() => {
        hoverInfo.innerHTML = `
          <div class="url-text">${url}</div>
          <div class="action-text">Click to copy URL</div>
        `;
      }, 1000);
    }
  }

  findImageAtPosition(x, y) {
    for (const [_, imageData] of this.images) {
      if (x >= imageData.x && x <= imageData.x + imageData.width &&
          y >= imageData.y && y <= imageData.y + imageData.height) {
        return imageData;
      }
    }
    return null;
  }

  getCanvasUsage() {
    const totalPixels = this.maxSize * this.maxSize;
    let usedPixels = 0;
    
    for (const [_, imageData] of this.images) {
      usedPixels += imageData.width * imageData.height;
    }
    
    return (usedPixels / totalPixels) * 100;
  }

  async getCanvasBlob() {
    return new Promise(resolve => {
      this.canvas.toBlob(resolve, 'image/png', 1.0);
    });
  }
}

// Initialize the packer
let packer; // Will initialize after size selection
const defaultSize = 2048;

// Initialize with default size
packer = new ImagePacker('packing-canvas', defaultSize);

// Function to disable canvas size selection
function disableCanvasSizeSelection() {
  const sizeDropdown = document.getElementById('canvas-size');
  sizeDropdown.disabled = true;
}

// Function to enable canvas size selection
function enableCanvasSizeSelection() {
  const sizeDropdown = document.getElementById('canvas-size');
  sizeDropdown.disabled = false;
}

// Update the current canvas size display
function updateCanvasSizeDisplay(size) {
  const display = document.getElementById('current-canvas-size');
  display.textContent = `Current Size: ${size}x${size}`;
}

// Handle canvas size selection changes
document.getElementById('canvas-size').addEventListener('change', function(event) {
  const selectedSize = parseInt(event.target.value);
  const success = packer.setMaxSize(selectedSize);
  if (success) {
    updateCanvasSizeDisplay(selectedSize);
  } else {
    alert('Cannot change canvas size after images have been uploaded.');
  }
});

// Clear canvas button
document.getElementById('clear-canvas').addEventListener('click', () => {
  location.reload(); // Simple reload to clear everything
});

// Copy button
document.getElementById('copy-button').addEventListener('click', () => {
  const copyText = document.getElementById('image-url-input');
  copyText.select();
  navigator.clipboard.writeText(copyText.value);
});

// Update the image input listener
document.getElementById('image-input').addEventListener('change', async function(event) {
  if (event.target.files && event.target.files[0]) {
    const result = await packer.addImage(event.target.files[0]);
    console.log('addImage result:', result);

    if (result.success) {
      // Enable clear canvas button
      document.getElementById('clear-canvas').disabled = false;
      
      // Update URL input
      document.getElementById('image-url-input').value = result.url;
      
      // Enable upload button if there are at least 2 images
      const uploadButton = document.getElementById('upload-canvas');
      uploadButton.disabled = (packer.images.size < 2);
      
      // Clear the input
      event.target.value = '';
    } else {
      alert(result.error);
    }
  }
});

// Handle canvas upload
document.getElementById('upload-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // Get elements
  const uploadButton = document.getElementById('upload-canvas');
  const form = document.getElementById('upload-form');
  const fileInput = document.getElementById('image-input');
  const clearButton = document.getElementById('clear-canvas');
  
  try {
    // Disable controls and show loading state
    uploadButton.classList.add('loading');
    form.classList.add('uploading');
    fileInput.disabled = true;
    clearButton.disabled = true;
    
    const canvasBlob = await packer.getCanvasBlob();
    const formData = new FormData();
    
    // Ensure the full path is included in the filename
    const filename = packer.canvasUUID + '.png';
    console.log('Canvas UUID:', packer.canvasUUID);
    console.log('Filename being sent:', filename);
    // Add the full path as a separate field
    formData.append('filepath', packer.canvasUUID);
    formData.append('image', canvasBlob, filename);
    
    const response = await fetch('/upload', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    if (response.ok) {
      alert('Canvas uploaded successfully!');
      location.reload();
    } else {
      throw new Error('Upload failed');
    }
  } catch (error) {
    alert('Failed to upload canvas: ' + error.message);
    
    // Re-enable controls and remove loading state
    uploadButton.classList.remove('loading');
    form.classList.remove('uploading');
    fileInput.disabled = false;
    clearButton.disabled = false;
  }
});

// Add tab switching functionality
document.querySelectorAll('.tab-btn').forEach(button => {
  button.addEventListener('click', () => {
    // Update active button
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    
    // Show/hide content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.style.display = 'none';
    });
    document.getElementById(button.dataset.tab === 'normal' ? 'normal-upload' : 'image-packer').style.display = 'block';
  });
});

// Handle normal image upload
document.getElementById('normal-upload-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const form = e.target;
  const uploadButton = document.getElementById('normal-upload-button');
  const fileInput = document.getElementById('normal-image-input');
  const copyButton = document.getElementById('normal-copy-button');
  const urlInput = document.getElementById('normal-url-input');
  
  if (!fileInput.files || !fileInput.files[0]) {
    alert('Please select an image first');
    return;
  }
  
  try {
    // Disable form and show loading state
    form.classList.add('form-disabled');
    uploadButton.classList.add('loading');
    
    const file = fileInput.files[0];
    const fileExt = file.name.split('.').pop();
    const uniqueFilename = `${uuidv4()}.${fileExt}`;
    
    const formData = new FormData();
    const uniqueFile = new File([file], uniqueFilename, { type: file.type });
    
    formData.append('filepath', uniqueFilename);
    formData.append('image', uniqueFile);
    
    const response = await fetch('/upload', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    if (response.ok) {
      urlInput.value = data.url;
      copyButton.disabled = false;
      alert('Image uploaded successfully!');
      
      // Clear the file input
      fileInput.value = '';
      uploadButton.disabled = true;
    } else {
      throw new Error(data.error || 'Upload failed');
    }
  } catch (error) {
    alert('Failed to upload image: ' + error.message);
  } finally {
    // Re-enable form and remove loading state
    form.classList.remove('form-disabled');
    uploadButton.classList.remove('loading');
  }
});

// Preview normal image upload
document.getElementById('normal-image-input').addEventListener('change', function(event) {
  const preview = document.getElementById('normal-image-preview');
  const uploadButton = document.getElementById('normal-upload-button');
  
  preview.innerHTML = '';
  uploadButton.disabled = true;
  
  if (event.target.files && event.target.files[0]) {
    const img = document.createElement('img');
    img.src = URL.createObjectURL(event.target.files[0]);
    preview.appendChild(img);
    uploadButton.disabled = false;
  }
});

// Copy URL for normal upload
document.getElementById('normal-copy-button').addEventListener('click', () => {
  const copyButton = document.getElementById('normal-copy-button');
  const copyText = document.getElementById('normal-url-input');
  
  copyText.select();
  navigator.clipboard.writeText(copyText.value);
  
  // Show success state
  const originalText = copyButton.textContent;
  copyButton.textContent = 'Copied!';
  copyButton.classList.add('success');
  
  setTimeout(() => {
    copyButton.textContent = originalText;
    copyButton.classList.remove('success');
  }, 2000);
});