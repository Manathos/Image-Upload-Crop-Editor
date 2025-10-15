// ========================================
// PROXY SYSTEM INTEGRATION
// ========================================

// Wait for the page to load
document.addEventListener('DOMContentLoaded', function() {
  console.log('Proxy system integration starting...');
  
  // Override the existing downloadCanvas function
  if (typeof downloadCanvas !== 'undefined') {
    const originalDownloadCanvas = downloadCanvas;
    
    window.downloadCanvas = async function() {
      console.log('Enhanced downloadCanvas called');
      
      if (!deskPadModalCanvas || deskPadModalCanvas.getObjects().length === 0) {
        alert('No content to download. Please add some images or text first.');
        return;
      }

      // Check if proxy system is available
      if (window.enhancedDownloadCanvas) {
        await window.enhancedDownloadCanvas(deskPadModalCanvas);
        return;
      }

      // Fallback to original method
      console.log('Proxy system not available, using fallback');
      return originalDownloadCanvas();
    };
    
    console.log('downloadCanvas function overridden successfully');
  }

  // Override the addImageToModalCanvasInternal function to use proxies
  if (typeof addImageToModalCanvasInternal !== 'undefined') {
    const originalAddImageToModalCanvasInternal = addImageToModalCanvasInternal;
    
    window.addImageToModalCanvasInternal = async function(img, index = 0) {
      console.log('Enhanced addImageToModalCanvasInternal called');
      
      // Check if proxy system is available
      if (window.addImageToCanvasWithProxy && img instanceof File) {
        await window.addImageToCanvasWithProxy(img, deskPadModalCanvas, index);
        return;
      }

      // Fallback to original method
      console.log('Proxy system not available, using fallback');
      return originalAddImageToModalCanvasInternal(img, index);
    };
    
    console.log('addImageToModalCanvasInternal function overridden successfully');
  }

  // Override the handleModalFileUpload function to use proxies
  if (typeof handleModalFileUpload !== 'undefined') {
    const originalHandleModalFileUpload = handleModalFileUpload;
    
    window.handleModalFileUpload = async function(files) {
      console.log('Enhanced handleModalFileUpload called');
      
      // Show loading overlay for modal file upload
      const loadingOverlay = document.getElementById('loading-overlay');
      const loadingText = document.getElementById('loading-text');
      
      if (loadingOverlay) {
        loadingOverlay.classList.add('show');
      } else {
        console.error('Loading overlay not found!');
      }
      
      if (loadingText) {
        loadingText.textContent = `Uploading image 1 of ${files.length}...`;
      } else {
        console.error('Loading text element not found!');
      }
      
      try {
        // Check if proxy system is available
        if (window.proxyManager) {
          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.type.startsWith('image/')) {
              // Update loading text for each image
              if (loadingText) {
                loadingText.textContent = `Uploading image ${i + 1} of ${files.length}...`;
              }
              await window.addImageToCanvasWithProxy(file, deskPadModalCanvas, i);
            }
          }
        } else {
          // Fallback to original method
          console.log('Proxy system not available, using fallback');
          return originalHandleModalFileUpload(files);
        }
      } finally {
        // Hide loading overlay when done
        if (loadingOverlay) {
          setTimeout(() => {
            loadingOverlay.classList.remove('show');
          }, 500); // Small delay to ensure processing is complete
        }
      }
    };
    
    console.log('handleModalFileUpload function overridden successfully');
  }

  console.log('Proxy system integration completed!');
});

// Add a global function to check proxy system status
window.checkProxySystemStatus = function() {
  const status = {
    proxyManager: !!window.proxyManager,
    enhancedDownloadCanvas: !!window.enhancedDownloadCanvas,
    addImageToCanvasWithProxy: !!window.addImageToCanvasWithProxy
  };
  
  console.log('Proxy System Status:', status);
  return status;
};

// Add a global function to manually trigger high-res export
window.exportHighRes = function(canvas) {
  if (window.enhancedDownloadCanvas) {
    return window.enhancedDownloadCanvas(canvas);
  } else {
    console.error('Proxy system not available');
    alert('Proxy system not available. Please ensure proxy-system.js is loaded.');
  }
}; 