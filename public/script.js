let svgBlob = null;
document.getElementById('upload-button').disabled = true;

document.getElementById('image-input').addEventListener('change', function (event) {
  if (event.target.files && event.target.files[0]) {
    // Preview image
    var reader = new FileReader();
    reader.onload = function (e) {
      document.getElementById('image-preview').innerHTML = '<img src="' + e.target.result + '" style="max-width:100%;"/>';
    };
    reader.readAsDataURL(event.target.files[0]);
    // Enable the upload button and clear the SVG input
    document.getElementById('upload-button').disabled = false;
    document.getElementById('svgInput').value = '';
    document.getElementById('svgInput').disabled = true;
  }

});

document.getElementById('upload-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  let formData = new FormData();
  const imageInput = document.getElementById('image-input');

  // Check if we have a selected file or an SVG blob
  if (imageInput.files.length > 0) {
    formData.append('image', imageInput.files[0]);
  } else if (svgBlob) {
    formData.append('image', svgBlob, 'uploaded.png');
  } else {
    // If neither input is filled, do not proceed
    return;
  }

  document.querySelector('#upload-button').disabled = true;

  try {

    const response = await fetch('/upload', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    if (response.ok) {
      const imageUrlInput = document.getElementById('image-url-input');
      imageUrlInput.value = `![](${data.url})`;
      document.getElementById('image-preview').innerHTML = `<img src="${data.url}" style="max-width:100%;">`;
      document.getElementById('image-input').value = ''; // Clear file input
    } else {
      // alert('Upload failed.');
    }
  } catch (error) {
    document.querySelector('#upload-button').disabled = false;
  }
});

document.getElementById('copy-button').addEventListener('click', () => {
  const copyText = document.getElementById('image-url-input');
  copyText.select();
  document.execCommand('copy');
  // alert('URL copied to clipboard!');
});

document.getElementById('svgInput').addEventListener('input', async function () {
  console.log(this.value)
  const svgInput = this.value;
  const regex = /<img[^>]+src="([^">]+)"/g;
  const match = regex.exec(svgInput);
  console.log(match);
  if (!match || !match[1]) {
    // Hide preview if the SVG is invalid
    document.getElementById('image-preview').innerHTML = '';
    document.querySelector('#upload-button').disabled = true;
    return;
  }
  const imgSrc = match[1];
  // Show preview from SVG input
  document.getElementById('image-preview').innerHTML = `<img src="${imgSrc}" style="max-width:100%;">`;
  const dataStart = imgSrc.indexOf('base64,') + 'base64,'.length;
  if (dataStart > 'base64,'.length - 1) {
    const svgContent = atob(imgSrc.substring(dataStart));
    blob_temp = new Blob([svgContent], { type: 'image/svg+xml' });
    svgBlob = await convertSvgBlobToImage(blob_temp, 'png')
    // Disable upload input
    document.getElementById('image-input').value = '';
    document.getElementById('image-input').disabled = true;
  } else {
    svgBlob = null;
    // Hide preview if the SVG is invalid
    document.getElementById('image-preview').innerHTML = '';
    document.querySelector('.upload-button').disabled = true;

  }
});

const validateSVGInput = (svgInput) => {
  const regex = /<img[^>]+src="([^">]+)"/g;
  const match = regex.exec(svgInput);
  if (!match || !match[1]) {
    return false;
  }
  const imgSrc = match[1];
  const dataStart = imgSrc.indexOf('base64,') + 'base64,'.length;
  return dataStart > 'base64,'.length - 1;
}

function toggleUploadButtonState() {
  const svgValue = document.getElementById('svgInput').value;
  const imageValue = document.getElementById('image-input').value;
  const uploadButton = document.getElementById('upload-button');
  const resetButton = document.getElementById('reset-button');

  // Disable the button if both fields are empty, enable it if either field has a value
  uploadButton.disabled = !(validateSVGInput(svgValue) || imageValue);
  resetButton.disabled = !(validateSVGInput(svgValue) || imageValue);

  if (validateSVGInput(svgValue)) {
    document.getElementById('image-input').disabled = true;
  } else {
    document.getElementById('image-input').disabled = false;
  }

  // show error if the SVG input is invalid
  if (svgValue && !validateSVGInput(svgValue)) {
    alert('Invalid SVG input');
  }
}

// Call this function whenever there's a change in the SVG input or the image input field
document.getElementById('svgInput').addEventListener('input', toggleUploadButtonState);
document.getElementById('image-input').addEventListener('change', toggleUploadButtonState);

// implement reset button along with disable logic
document.getElementById('reset-button').addEventListener('click', () => {
  document.getElementById('image-input').value = '';
  document.getElementById('svgInput').value = '';
  document.getElementById('image-preview').innerHTML = '';
  document.getElementById('image-url-input').value = '';
  document.getElementById('upload-form').reset();
  document.getElementById('upload-button').disabled = true;
  document.getElementById('svgInput').disabled = false;
  document.getElementById('image-input').disabled = false;
  document.getElementById('reset-button').disabled = true;
  svgBlob = null;
});

function convertSvgBlobToImage(svgBlob, outputFormat) {
  return new Promise((resolve, reject) => {
    // Validate the output format
    const validFormats = ['png', 'jpeg'];
    if (!validFormats.includes(outputFormat)) {
      outputFormat = 'png';  // Default to PNG if invalid format
    }

    // Create a URL from the SVG Blob
    const url = URL.createObjectURL(svgBlob);

    // Create an image element to load the SVG
    const image = new Image();

    image.onload = () => {
      // Set up a canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Set canvas dimensions to the image dimensions
      canvas.width = image.width;
      canvas.height = image.height;

      // Draw the image (SVG) on the canvas
      ctx.fillStyle = '#FFFFFF'; // White background
      ctx.drawImage(image, 0, 0);

      // Convert the canvas content to an image blob
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);  // Resolve the promise with the blob
        } else {
          reject(new Error('Failed to convert canvas to Blob.'));
        }
      }, `image/${outputFormat}`);

      // Clean up the created URL
      URL.revokeObjectURL(url);
    };

    image.onerror = () => {
      reject(new Error("Error loading the SVG image."));
      URL.revokeObjectURL(url);
    };

    // Start loading the image
    image.src = url;
  });
}