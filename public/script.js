class ImagePacker {
  constructor(canvasId, maxSize = 2048) {
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
    this.canvas.width = maxSize;
    this.canvas.height = maxSize;
    this.ctx.fillStyle = 'transparent';
    this.ctx.fillRect(0, 0, maxSize, maxSize);
    
    // Setup event listeners
    this.setupEventListeners();
  }

  generateCanvasId() {
    // Generate a 7-digit random number
    const randomNum = Math.floor(Math.random() * 9000000) + 1000000; // ensures 7 digits
    return `packed_data_prep/canvas_${randomNum}`;
  }

  setupEventListeners() {
    this.canvas.addEventListener('mousemove', this.handleHover.bind(this));
    this.canvas.addEventListener('click', this.handleClick.bind(this));
  }

  async addImage(file) {
    const img = await this.loadImage(file);
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
      // Calculate position relative to the canvas container
      const canvasContainer = document.querySelector('.canvas-container');
      const containerRect = canvasContainer.getBoundingClientRect();
      
      // Position the tooltip relative to the mouse but within the container
      const tooltipX = event.clientX - containerRect.left;
      const tooltipY = event.clientY - containerRect.top;
      
      hoverInfo.style.display = 'block';
      hoverInfo.style.left = `${tooltipX}px`;
      hoverInfo.style.top = `${tooltipY - 30}px`; // 30px above the cursor
      hoverInfo.textContent = `${hoveredImage.name}\nClick to copy URL`;
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
      // Show a brief notification
      const hoverInfo = document.getElementById('hover-info');
      hoverInfo.textContent = 'URL copied!';
      setTimeout(() => {
        hoverInfo.textContent = `${clickedImage.name}\nClick to copy URL`;
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
const packer = new ImagePacker('packing-canvas');

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
    
    if (result.success) {
      // Enable clear canvas button
      document.getElementById('clear-canvas').disabled = false;
      
      // Update URL input
      document.getElementById('image-url-input').value = result.url;
      
      // Update stats
      document.getElementById('images-count').textContent = packer.images.size;
      document.getElementById('canvas-usage').textContent = 
        Math.round(packer.getCanvasUsage());
      
      // Enable upload button if canvas usage is above threshold
      document.getElementById('upload-canvas').disabled = 
        packer.getCanvasUsage() < 75;
        
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