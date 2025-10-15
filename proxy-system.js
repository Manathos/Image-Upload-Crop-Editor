// ========================================
// PROXY SYSTEM FOR HIGH-RES EXPORT
// ========================================

// Proxy Manager for handling low-res editing and high-res export
class ProxyManager {
  constructor() {
    this.originalImages = new Map(); // Store original images by ID
    this.proxyScale = 0.4; // 40% for good performance/quality balance
    this.imageCounter = 0;
  }

  // Generate unique ID for each image
  generateImageId() {
    return `img_${Date.now()}_${++this.imageCounter}`;
  }

  // Store original image and create proxy
  async createProxy(originalFile) {
    const imageId = this.generateImageId();
    
    // Store original file
    this.originalImages.set(imageId, originalFile);
    
    // Create proxy (low-res version)
    const proxyDataUrl = await this.createProxyDataUrl(originalFile);
    
    return { imageId, proxyDataUrl };
  }

  // Create low-res proxy from original file
  async createProxyDataUrl(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          const originalWidth = img.width;
          const originalHeight = img.height;
          const proxyWidth = img.width * this.proxyScale;
          const proxyHeight = img.height * this.proxyScale;
          
          canvas.width = proxyWidth;
          canvas.height = proxyHeight;
          
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, proxyWidth, proxyHeight);
          
          console.log(`🔍 PROXY CREATION VERIFICATION:`);
          console.log(`   Original image: ${originalWidth}x${originalHeight} (${(originalWidth * originalHeight).toLocaleString()} pixels)`);
          console.log(`   Proxy image: ${proxyWidth}x${proxyHeight} (${(proxyWidth * proxyHeight).toLocaleString()} pixels)`);
          console.log(`   Proxy scale: ${this.proxyScale} (${(this.proxyScale * 100).toFixed(1)}% of original)`);
          console.log(`   Size reduction: ${((1 - this.proxyScale) * 100).toFixed(1)}% smaller`);
          
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // Get original image by ID
  getOriginalImage(imageId) {
    return this.originalImages.get(imageId);
  }

  // Clean up original image
  removeOriginalImage(imageId) {
    this.originalImages.delete(imageId);
  }

  // Get all stored original images
  getAllOriginalImages() {
    return Array.from(this.originalImages.entries());
  }

  // Clear all stored images
  clearAllImages() {
    this.originalImages.clear();
    this.imageCounter = 0;
  }
}

// Initialize proxy manager globally
window.proxyManager = new ProxyManager();

// Create full-resolution image from proxy
async function createFullResImage(proxyImage) {
  return new Promise((resolve) => {
    const originalFile = window.proxyManager.getOriginalImage(proxyImage.imageId);
    
    if (!originalFile) {
      console.log('No original file found, using proxy as fallback');
      resolve(proxyImage); // Fallback to proxy
      return;
    }
    
    console.log('Creating full-res image from proxy:', {
      proxyId: proxyImage.imageId,
      proxySize: { width: proxyImage.width, height: proxyImage.height },
      proxyScale: { scaleX: proxyImage.scaleX, scaleY: proxyImage.scaleY },
      proxyPosition: { left: proxyImage.left, top: proxyImage.top },
      proxyOrigin: { originX: proxyImage.originX, originY: proxyImage.originY }
    });

    console.log('Creating full-res image from proxy:', {
      proxyId: proxyImage.imageId,
      proxySize: { width: proxyImage.width, height: proxyImage.height },
      proxyScale: { scaleX: proxyImage.scaleX, scaleY: proxyImage.scaleY },
      proxyPosition: { left: proxyImage.left, top: proxyImage.top },
      proxyOrigin: { originX: proxyImage.originX, originY: proxyImage.originY }
    });

    const reader = new FileReader();
    reader.onload = (e) => {
      fabric.Image.fromURL(e.target.result, (fullResImg) => {
        // The key insight: we need to scale the position and scale differently
        // Position should be scaled up (proxy was smaller, so positions were smaller)
        // Scale should be adjusted to maintain the same visual size
        
        const scaleFactor = 1 / window.proxyManager.proxyScale;
        
        // Calculate the visual size of the proxy image
        const proxyVisualWidth = proxyImage.width * proxyImage.scaleX;
        const proxyVisualHeight = proxyImage.height * proxyImage.scaleY;
        
        // For export, we want the full-res image to be at its original size
        // The scale should be 1.0 (no scaling) to show the full resolution
        const scaleX = 1.0;
        const scaleY = 1.0;
        
        console.log('Scale calculations:', {
          scaleFactor,
          proxyVisualSize: { width: proxyVisualWidth, height: proxyVisualHeight },
          fullResSize: { width: fullResImg.width, height: fullResImg.height },
          calculatedScale: { scaleX, scaleY }
        });
        
        // FIXED: Don't scale the position if it's already centered
        // If the proxy image is centered (originX: 'center', originY: 'center'),
        // then the full-res image should also be centered at the same position
        let finalLeft = proxyImage.left;
        let finalTop = proxyImage.top;
        
        // Only scale position if it's not a centered positioning
        if (proxyImage.originX !== 'center' || proxyImage.originY !== 'center') {
          finalLeft = proxyImage.left * scaleFactor;
          finalTop = proxyImage.top * scaleFactor;
        }
        
        fullResImg.set({
          left: finalLeft,
          top: finalTop,
          scaleX: scaleX,
          scaleY: scaleY,
          angle: proxyImage.angle || 0,
          flipX: proxyImage.flipX || false,
          flipY: proxyImage.flipY || false,
          opacity: proxyImage.opacity || 1,
          selectable: proxyImage.selectable,
          hasControls: proxyImage.hasControls,
          hasBorders: proxyImage.hasBorders,
          originX: proxyImage.originX || 'center',
          originY: proxyImage.originY || 'center'
        });

        // Copy metadata
        fullResImg.imageId = proxyImage.imageId;
        fullResImg._originalDataUrl = proxyImage._originalDataUrl;

        console.log('Full-res image created:', {
          originalSize: { width: fullResImg.width, height: fullResImg.height },
          proxySize: { width: proxyImage.width, height: proxyImage.height },
          proxyVisualSize: { width: proxyVisualWidth, height: proxyVisualHeight },
          finalScale: { scaleX, scaleY },
          position: { left: fullResImg.left, top: fullResImg.top },
          origin: { originX: fullResImg.originX, originY: fullResImg.originY },
          positionScaling: { scaled: proxyImage.originX !== 'center', scaleFactor }
        });

        resolve(fullResImg);
      });
    };
    reader.readAsDataURL(originalFile);
  });
}

// Export using full-resolution images
async function exportWithFullResImages(proxyImages, canvas, conservative = false) {
  console.log('Starting high-res export with', proxyImages.length, 'images');
  
  // Calculate the optimal export canvas size based on original image resolutions
  let maxRequiredWidth = 0;
  let maxRequiredHeight = 0;
  let totalOriginalPixels = 0;
  
  // First pass: analyze all images to determine required canvas size
  for (let i = 0; i < proxyImages.length; i++) {
    const proxyImage = proxyImages[i];
    if (proxyImage.imageId && window.proxyManager.getOriginalImage(proxyImage.imageId)) {
      const originalFile = window.proxyManager.getOriginalImage(proxyImage.imageId);
      
      // Get original image dimensions
      const originalDimensions = await getImageDimensions(originalFile);
      console.log(`Image ${i + 1} original dimensions:`, originalDimensions);
      
      // Calculate how much space this image needs at full resolution
      const proxyVisualWidth = proxyImage.width * proxyImage.scaleX;
      const proxyVisualHeight = proxyImage.height * proxyImage.scaleY;
      
      // The full resolution size should be the original image dimensions
      // The proxy was scaled down, so we need to scale it back up to full size
      const fullResWidth = originalDimensions.width;
      const fullResHeight = originalDimensions.height;
      
      console.log(`Image ${i + 1} full-res requirements:`, {
        proxyVisualSize: { width: proxyVisualWidth, height: proxyVisualHeight },
        fullResSize: { width: fullResWidth, height: fullResHeight },
        originalDimensions: originalDimensions
      });
      
      // Track the maximum dimensions needed
      maxRequiredWidth = Math.max(maxRequiredWidth, fullResWidth);
      maxRequiredHeight = Math.max(maxRequiredHeight, fullResHeight);
      totalOriginalPixels += originalDimensions.width * originalDimensions.height;
    }
  }
  
  // Calculate the optimal export canvas size based on original image dimensions
  const originalCanvasWidth = canvas.getWidth();
  const originalCanvasHeight = canvas.getHeight();
  const originalAspectRatio = originalCanvasWidth / originalCanvasHeight;
  
  // Determine export canvas size based on the largest image dimensions
  let exportWidth, exportHeight;
  
  if (maxRequiredWidth > 0 && maxRequiredHeight > 0) {
    // Use the actual image dimensions as the base
    // The export canvas should be sized to fit the image, not be unnecessarily large
    exportWidth = Math.ceil(maxRequiredWidth);
    exportHeight = Math.ceil(maxRequiredHeight);
    
    console.log('Canvas size based on image dimensions:', {
      imageSize: { width: maxRequiredWidth, height: maxRequiredHeight },
      calculatedCanvas: { width: exportWidth, height: exportHeight }
    });
    
    console.log('Export canvas size calculation:', {
      originalCanvas: { width: originalCanvasWidth, height: originalCanvasHeight, aspectRatio: originalAspectRatio },
      maxImageSize: { width: maxRequiredWidth, height: maxRequiredHeight },
      finalExportSize: { width: exportWidth, height: exportHeight, aspectRatio: exportWidth / exportHeight },
      totalOriginalPixels: totalOriginalPixels.toLocaleString()
    });
  } else {
    // Fallback: use a reasonable high-res size based on original canvas
    exportWidth = originalCanvasWidth * 4;
    exportHeight = originalCanvasHeight * 4;
  }
  
  // Add minimal padding to ensure everything fits
  exportWidth = Math.ceil(exportWidth * 1.05); // Only 5% padding
  exportHeight = Math.ceil(exportHeight * 1.05);
  
  // Use a more reasonable canvas size limit for better performance
  // Still high quality but manageable for browser processing
  console.log(`Initial canvas size: ${exportWidth}x${exportHeight} (${(exportWidth * exportHeight).toLocaleString()} pixels)`);
  
  // Limit to a very small size (2M pixels max) for maximum performance
  const currentPixels = exportWidth * exportHeight;
  if (currentPixels > 2000000) { // 2M pixels max
    const scaleDown = Math.sqrt(2000000 / currentPixels);
    exportWidth = Math.ceil(exportWidth * scaleDown);
    exportHeight = Math.ceil(exportHeight * scaleDown);
    console.log(`Canvas size limited for maximum performance: ${exportWidth}x${exportHeight} (${(exportWidth * exportHeight).toLocaleString()} pixels)`);
  }
  
  // Create a new canvas for export with calculated high resolution
  const exportCanvas = new fabric.Canvas(null, {
    width: exportWidth,
    height: exportHeight
  });

  // Set white background for export canvas (matches white desk pad substrate)
  exportCanvas.setBackgroundColor('white', () => {
    exportCanvas.renderAll();
  });

  console.log('Export canvas created:', { 
    width: exportCanvas.getWidth(), 
    height: exportCanvas.getHeight() 
  });

  // Calculate the scale factor for positioning objects
  const exportMultiplier = exportWidth / originalCanvasWidth;

  // Process each image
  for (let i = 0; i < proxyImages.length; i++) {
    const proxyImage = proxyImages[i];
    console.log(`Processing image ${i + 1}/${proxyImages.length}:`, {
      imageId: proxyImage.imageId,
      hasOriginal: !!window.proxyManager.getOriginalImage(proxyImage.imageId),
      proxySize: { width: proxyImage.width, height: proxyImage.height },
      proxyPosition: { left: proxyImage.left, top: proxyImage.top },
      proxyScale: { scaleX: proxyImage.scaleX, scaleY: proxyImage.scaleY },
      proxyOrigin: { originX: proxyImage.originX, originY: proxyImage.originY }
    });
    
    if (proxyImage.imageId && window.proxyManager.getOriginalImage(proxyImage.imageId)) {
      // Replace proxy with full-res version
      console.log(`Creating full-res version for image ${proxyImage.imageId}`);
      const fullResImage = await createFullResImage(proxyImage);
      
      // For export, we need to scale the image to fit the smaller canvas
      // This prevents loading massive images into memory
      const canvasWidth = exportCanvas.getWidth();
      const canvasHeight = exportCanvas.getHeight();
      
      // Calculate the scale needed to fit the image in the export canvas
      const scaleX = canvasWidth / fullResImage.width;
      const scaleY = canvasHeight / fullResImage.height;
      const scale = Math.min(scaleX, scaleY, 1); // Don't scale up, only down
      
      fullResImage.set({
        left: canvasWidth / 2,
        top: canvasHeight / 2,
        originX: 'center',
        originY: 'center',
        scaleX: scale,
        scaleY: scale
      });
      
      console.log(`Image scaled for export: ${(scale * 100).toFixed(1)}% of original size`);
      
      exportCanvas.add(fullResImage);
      console.log(`Full-res image added to export canvas with properties:`, {
        width: fullResImage.width,
        height: fullResImage.height,
        left: fullResImage.left,
        top: fullResImage.top,
        scaleX: fullResImage.scaleX,
        scaleY: fullResImage.scaleY,
        originX: fullResImage.originX,
        originY: fullResImage.originY
      });
    } else {
      // No original available, use proxy as-is but scale for export
      console.log(`Using proxy as-is (no original available)`);
      const scaledProxy = proxyImage.clone();
      scaledProxy.set({
        left: proxyImage.left * exportMultiplier,
        top: proxyImage.top * exportMultiplier,
        scaleX: proxyImage.scaleX * exportMultiplier,
        scaleY: proxyImage.scaleY * exportMultiplier
      });
      exportCanvas.add(scaledProxy);
    }
  }

  // Add non-image objects (also scaled for export)
  const nonImageObjects = canvas.getObjects().filter(obj => obj.type !== 'image');
  console.log('Adding', nonImageObjects.length, 'non-image objects');
  nonImageObjects.forEach((obj, index) => {
    console.log(`Adding non-image object ${index + 1}:`, {
      type: obj.type,
      left: obj.left,
      top: obj.top,
      width: obj.width,
      height: obj.height
    });
    
    try {
      // Try to clone the object
      const scaledObj = obj.clone();
      if (scaledObj && typeof scaledObj.set === 'function') {
        scaledObj.set({
          left: obj.left * exportMultiplier,
          top: obj.top * exportMultiplier,
          scaleX: (obj.scaleX || 1) * exportMultiplier,
          scaleY: (obj.scaleY || 1) * exportMultiplier
        });
        exportCanvas.add(scaledObj);
        console.log(`Successfully added scaled ${obj.type} object`);
      } else {
        console.warn(`Failed to clone ${obj.type} object, adding original`);
        exportCanvas.add(obj);
      }
    } catch (error) {
      console.warn(`Error cloning ${obj.type} object:`, error);
      // Fallback: add the original object without scaling
      try {
        exportCanvas.add(obj);
        console.log(`Added original ${obj.type} object as fallback`);
      } catch (fallbackError) {
        console.error(`Failed to add ${obj.type} object even as fallback:`, fallbackError);
      }
    }
  });

  exportCanvas.renderAll();
  
  console.log('Export canvas final state:', {
    totalObjects: exportCanvas.getObjects().length,
    imageObjects: exportCanvas.getObjects().filter(obj => obj.type === 'image').length,
    nonImageObjects: exportCanvas.getObjects().filter(obj => obj.type !== 'image').length,
    canvasSize: { width: exportCanvas.getWidth(), height: exportCanvas.getHeight() },
    exportMultiplier: exportMultiplier
  });

  // Log all objects in export canvas
  exportCanvas.getObjects().forEach((obj, index) => {
    console.log(`Export canvas object ${index + 1}:`, {
      type: obj.type,
      left: obj.left,
      top: obj.top,
      width: obj.width,
      height: obj.height,
      scaleX: obj.scaleX,
      scaleY: obj.scaleY,
      originX: obj.originX,
      originY: obj.originY
    });
  });

  return exportCanvas;
}

// Helper function to get image dimensions from a file
function getImageDimensions(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// Enhanced download function with proxy system
async function downloadCanvasWithProxy(canvas) {
  if (!canvas || canvas.getObjects().length === 0) {
    alert('No content to download. Please add some images or text first.');
    return;
  }

  // Show loading state
  const loadingOverlay = document.getElementById('loading-overlay');
  const loadingText = document.getElementById('loading-text');
  if (loadingOverlay) {
    loadingOverlay.classList.add('show');
    if (loadingText) {
      loadingText.textContent = 'Preparing export...';
    }
    
    // Add a safety timeout to hide loading screen after 30 seconds
    const loadingTimeout = setTimeout(() => {
      if (loadingOverlay.classList.contains('show')) {
        console.log('⚠️ Loading screen timeout - hiding after 30 seconds');
        loadingOverlay.classList.remove('show');
        if (loadingText) {
          loadingText.textContent = '';
        }
      }
    }, 30000);
    
    // Store timeout reference for cleanup
    window.loadingTimeout = loadingTimeout;
  }

  try {
    // Calculate optimal export size based on original image dimensions
    const imageObjects = canvas.getObjects().filter(obj => obj.type === 'image');
    let exportWidth = canvas.getWidth();
    let exportHeight = canvas.getHeight();
    
    if (imageObjects.length > 0) {
      // Find the largest original image dimensions
      let maxOriginalWidth = 0;
      let maxOriginalHeight = 0;
      
      // Process all images to get their original dimensions
      for (const imgObj of imageObjects) {
        if (imgObj.imageId && window.proxyManager) {
          const originalFile = window.proxyManager.getOriginalImage(imgObj.imageId);
          
          if (originalFile && originalFile instanceof File) {
            try {
              const dimensions = await getImageDimensions(originalFile);
              maxOriginalWidth = Math.max(maxOriginalWidth, dimensions.width);
              maxOriginalHeight = Math.max(maxOriginalHeight, dimensions.height);
            } catch (error) {
              console.error(`Error getting dimensions for image:`, error);
            }
          }
        }
      }
      
      if (maxOriginalWidth > 0 && maxOriginalHeight > 0) {
        // Calculate export size based on original image dimensions
        // Maintain the working canvas aspect ratio but use original image size as reference
        const workingAspectRatio = canvas.getWidth() / canvas.getHeight();
        const originalAspectRatio = maxOriginalWidth / maxOriginalHeight;
        
        // Use the larger dimension from original image, but respect working canvas aspect ratio
        if (workingAspectRatio > originalAspectRatio) {
          // Working canvas is wider, use original height as reference
          exportHeight = maxOriginalHeight;
          exportWidth = exportHeight * workingAspectRatio;
        } else {
          // Working canvas is taller, use original width as reference
          exportWidth = maxOriginalWidth;
          exportHeight = exportWidth / workingAspectRatio;
        }
      }
    }
    
    // Create the export canvas with calculated dimensions
    const exportCanvas = new fabric.Canvas('temp-export-canvas', {
      width: Math.ceil(exportWidth),
      height: Math.ceil(exportHeight)
    });
    
    // Set white background for export canvas (matches white desk pad substrate)
    exportCanvas.setBackgroundColor('white', () => {
      exportCanvas.renderAll();
    });
    
    // Calculate scale factors for the export canvas
    const scaleX = exportCanvas.getWidth() / canvas.getWidth();
    const scaleY = exportCanvas.getHeight() / canvas.getHeight();
    

    
    // Process all objects and recreate them with original images
    // Note: canvas.getObjects() returns objects in stacking order (bottom to top)
    // We need to process them in reverse order to maintain proper stacking
    const objects = canvas.getObjects();
    const objectPromises = [];
    
    // Process objects in the order they appear in the layer panel
    // Layer 0 (top) should be processed last so it appears on top in export
    // We need to get the actual layer order from the layers array
    let objectsToProcess = [...objects];
    
    // Create a mapping of objects to their layer order (moved to top level for scope access)
    const objectToLayerOrder = {};
    
    // If layers array exists, sort objects by layer order
    if (typeof layers !== 'undefined' && layers.length > 0) {
      
      // Populate the mapping of objects to their layer order
      // INVERT the layer order: Main editor uses Layer 0=BOTTOM, but proxy system expects Layer 0=TOP
      const maxLayerOrder = Math.max(...layers.map(l => l.order));
      objects.forEach(obj => {
        const layer = layers.find(l => l.object === obj);
        if (layer) {
          // Use consistent key generation for all object types
          const key = obj.imageId || obj.id || `${obj.type}_${obj.name || 'undefined'}`;
          // Invert the layer order: Layer 0 (BOTTOM) becomes Layer N (BOTTOM), Layer N (TOP) becomes Layer 0 (TOP)
          objectToLayerOrder[key] = maxLayerOrder - layer.order;
        }
      });
      
      // Add fallback mapping for objects not in layers array
      objects.forEach(obj => {
        const key = obj.imageId || obj.id || `${obj.type}_${obj.name || 'undefined'}`;
        if (!objectToLayerOrder.hasOwnProperty(key)) {
          // Give unmapped objects a default order (higher than existing layers)
          const highestOrder = Math.max(...Object.values(objectToLayerOrder), maxLayerOrder);
          objectToLayerOrder[key] = highestOrder + 1;
        }
      });
      
      // Sort objects by layer order (bottom to top)
      objectsToProcess.sort((a, b) => {
        const layerA = objectToLayerOrder[a.imageId || a.id || `${a.type}_${a.name || 'undefined'}`];
        const layerB = objectToLayerOrder[b.imageId || b.id || `${b.type}_${b.name || 'undefined'}`];
        
        // Handle undefined layer orders gracefully
        const safeLayerA = layerA !== undefined ? layerA : 999;
        const safeLayerB = layerB !== undefined ? layerB : 999;
        
        return safeLayerB - safeLayerA; // Descending order (highest number first, then descending to 0)
      });
      
      // Verify the sorting worked correctly
      console.log('Sorted objects order:');
      objectsToProcess.forEach((obj, index) => {
        const layer = layers.find(l => l.object === obj);
        const order = layer ? layer.order : 'unknown';
        console.log(`  ${index + 1}. ${obj.type} ${obj.imageId ? `(${obj.imageId})` : ''} - Layer order: ${order}`);
      });
    } else {
      console.log('No layers array found, using canvas object order...');
      // For test page without layers, reverse the order so last added = top
      objectsToProcess = objects.slice().reverse();
    }
    
    console.log(`Processing ${objectsToProcess.length} objects in layer order (bottom to top):`);
    
    // Verify the processing order is correct
    const expectedOrder = objectsToProcess.map((obj, index) => {
      const layer = typeof layers !== 'undefined' ? layers.find(l => l.object === obj) : null;
      const layerOrder = layer ? layer.order : 'unknown';
      if (obj.type === 'image') {
        console.log(`  ${index + 1}. Image ID: ${obj.imageId} (${obj.name || 'unnamed'}) - Layer order: ${layerOrder}`);
        return { type: 'image', id: obj.imageId, order: layerOrder };
      } else {
        console.log(`  ${index + 1}. ${obj.type} object`);
        return { type: obj.type, order: layerOrder };
      }
    });
    
    console.log('Expected processing order:', expectedOrder);
    
    // Process ALL objects asynchronously to maintain correct layer order
    const allObjectPromises = [];
    const processedObjects = []; // Collect all processed objects
    
    for (let i = 0; i < objectsToProcess.length; i++) {
      const obj = objectsToProcess[i];

      
      if (obj.type === 'image' && obj.imageId && window.proxyManager) {
        console.log(`Processing image object with ID: ${obj.imageId}, opacity: ${obj.opacity}`);
        
        const objectPromise = new Promise(async (resolve) => {
          try {
            // Check if this is a cropped image (has been modified from original)
            const isCroppedImage = obj._element && obj._element.src && 
                                 (obj._element.src.startsWith('data:') || 
                                  obj._element.src !== obj._originalDataUrl);
            
            // Get the original image file
            const originalFile = window.proxyManager.getOriginalImage(obj.imageId);
            if (originalFile && originalFile instanceof File && !isCroppedImage) {
              // Create data URL from original file
              const originalDataUrl = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsDataURL(originalFile);
              });
              
              // Create new fabric image from original data
              fabric.Image.fromURL(originalDataUrl, (originalImg) => {
                const canvasWidth = exportCanvas.getWidth();
                const canvasHeight = exportCanvas.getHeight();
                
                // Calculate scale factors
                const exportScaleX = canvasWidth / canvas.getWidth();
                const exportScaleY = canvasHeight / canvas.getHeight();
                
                // Calculate final position by scaling the current position directly
                const finalLeft = obj.left * exportScaleX;
                const finalTop = obj.top * exportScaleY;
                
                // Calculate final scale
                const workingCanvasWidth = canvas.getWidth();
                const workingCanvasHeight = canvas.getHeight();
                const imageWorkingWidth = obj.width * (obj.scaleX || 1);
                const imageWorkingHeight = obj.height * (obj.scaleY || 1);
                const finalScaleX = (imageWorkingWidth * exportScaleX) / originalImg.width;
                const finalScaleY = (imageWorkingHeight * exportScaleY) / originalImg.height;
                
                // Apply transformations to original image
                originalImg.set({
                  left: finalLeft,
                  top: finalTop,
                  originX: 'center',
                  originY: 'center',
                  scaleX: finalScaleX,
                  scaleY: finalScaleY,
                  angle: obj.angle || 0,
                  skewX: obj.skewX || 0,
                  skewY: obj.skewY || 0,
                  flipX: obj.flipX || false,
                  flipY: obj.flipY || false,
                  opacity: obj.opacity !== undefined ? obj.opacity : 1,
                  selectable: false,
                  evented: false
                });
                
                // Store the processed image object instead of adding immediately
                processedObjects.push({
                  type: 'image',
                  object: originalImg,
                  layerOrder: objectToLayerOrder[obj.imageId],
                  name: obj.name || 'unnamed'
                });
                
                console.log(`✅ Processed image object: ${obj.imageId} (${obj.name || 'unnamed'}) - Layer order: ${objectToLayerOrder[obj.imageId]}`);
                resolve();
              });
            } else if (isCroppedImage) {
              // Handle cropped images - use the current image data
              
              try {
                // Create a new fabric image from the current cropped image data
                const croppedDataUrl = obj._element.src;
                fabric.Image.fromURL(croppedDataUrl, (croppedImg) => {
                  const canvasWidth = exportCanvas.getWidth();
                  const canvasHeight = exportCanvas.getHeight();
                  
                  // Calculate scale factors
                  const exportScaleX = canvasWidth / canvas.getWidth();
                  const exportScaleY = canvasHeight / canvas.getHeight();
                  
                  // Calculate final position by scaling the current position directly
                  const finalLeft = obj.left * exportScaleX;
                  const finalTop = obj.top * exportScaleY;
                  
                  // Calculate final scale
                  const workingCanvasWidth = canvas.getWidth();
                  const workingCanvasHeight = canvas.getHeight();
                  const imageWorkingWidth = obj.width * (obj.scaleX || 1);
                  const imageWorkingHeight = obj.height * (obj.scaleY || 1);
                  const finalScaleX = (imageWorkingWidth * exportScaleX) / croppedImg.width;
                  const finalScaleY = (imageWorkingHeight * exportScaleY) / croppedImg.height;
                  
                  // Apply transformations to cropped image
                  croppedImg.set({
                    left: finalLeft,
                    top: finalTop,
                    originX: 'center',
                    originY: 'center',
                    scaleX: finalScaleX,
                    scaleY: finalScaleY,
                    angle: obj.angle || 0,
                    skewX: obj.skewX || 0,
                    skewY: obj.skewY || 0,
                    flipX: obj.flipX || false,
                    flipY: obj.flipY || false,
                    opacity: obj.opacity !== undefined ? obj.opacity : 1,
                    selectable: false,
                    evented: false
                  });
                  
                  // Store the processed cropped image object
                  processedObjects.push({
                    type: 'image',
                    object: croppedImg,
                    layerOrder: objectToLayerOrder[obj.imageId],
                    name: obj.name || 'cropped-image'
                  });
                  

                  resolve();
                });
              } catch (error) {
                console.error(`Error processing cropped image:`, error);
                resolve();
              }
            } else {
              console.log(`Original file not found, skipping image`);
              resolve();
            }
                      } catch (error) {
              console.error(`Error processing image object:`, error);
              
              // Try fallback processing for cropped images
              try {
                console.log(`Attempting fallback processing for image object`);
                const clonedObj = obj.clone();
                if (clonedObj && typeof clonedObj.set === 'function') {
                  clonedObj.set({
                    left: obj.left * scaleX,
                    top: obj.top * scaleY,
                    scaleX: (obj.scaleX || 1) * scaleX,
                    scaleY: (obj.scaleY || 1) * scaleY,
                    angle: obj.angle || 0,
                    flipX: obj.flipX || false,
                    flipY: obj.flipY || false,
                    opacity: obj.opacity !== undefined ? obj.opacity : 1,
                    selectable: false,
                    evented: false
                  });
                  
                  processedObjects.push({
                    type: 'image',
                    object: clonedObj,
                    layerOrder: objectToLayerOrder[obj.imageId || obj.id || `${obj.type}_${obj.name || 'undefined'}`] || 0,
                    name: obj.name || 'fallback-image'
                  });
                  
                  console.log(`✅ Processed image object with fallback: ${obj.name || 'unnamed'}`);
                } else {
                  console.error(`Failed to clone image object: clone returned null`);
                }
              } catch (fallbackError) {
                console.error(`Fallback processing also failed:`, fallbackError);
              }
              
              resolve();
            }
        });
        
        allObjectPromises.push(objectPromise);
      } else if (obj.type === 'image' && !obj.imageId) {
        // Handle cropped images or images without imageId
        console.log(`Processing image without imageId (likely cropped): ${obj.name || 'unnamed'}`);
        
        const objectPromise = new Promise(async (resolve) => {
          try {
            // For cropped images, we need to use the current image data
            // since we don't have access to the original file
            const clonedObj = obj.clone();
            if (clonedObj && typeof clonedObj.set === 'function') {
              clonedObj.set({
                left: obj.left * scaleX,
                top: obj.top * scaleY,
                scaleX: (obj.scaleX || 1) * scaleX,
                scaleY: (obj.scaleY || 1) * scaleY,
                angle: obj.angle || 0,
                flipX: obj.flipX || false,
                flipY: obj.flipY || false,
                opacity: obj.opacity !== undefined ? obj.opacity : 1,
                selectable: false,
                evented: false
              });
              
              // Store the processed cropped image object
              processedObjects.push({
                type: 'image',
                object: clonedObj,
                layerOrder: objectToLayerOrder[obj.imageId || obj.id || `${obj.type}_${obj.name || 'undefined'}`] || 0,
                name: obj.name || 'cropped-image'
              });
              
              console.log(`✅ Processed cropped image object: ${obj.name || 'unnamed'} - Layer order: ${objectToLayerOrder[obj.imageId || obj.id || `${obj.type}_${obj.name || 'undefined'}`] || 0}`);
              resolve();
            } else {
              console.error(`Failed to clone cropped image object: clone returned null`);
              resolve();
            }
          } catch (error) {
            console.error(`Error processing cropped image object:`, error);
            resolve();
          }
        });
        
        allObjectPromises.push(objectPromise);
      } else {
        // Handle non-image objects (text, shapes, etc.) asynchronously
        const objectPromise = new Promise(async (resolve) => {
          try {
            // For text objects, handle cloning more carefully
            if (obj.type === 'text' || obj.type === 'i-text') {
              // Debug: Log the original text object properties
              console.log(`🔍 DEBUG: Original text object properties:`);
              console.log(`  - Text: "${obj.text}"`);
              console.log(`  - Position: left=${obj.left}, top=${obj.top}`);
              console.log(`  - Scale: scaleX=${obj.scaleX}, scaleY=${obj.scaleY}`);
              console.log(`  - Origin: originX=${obj.originX}, originY=${obj.originY}`);
              console.log(`  - TextAlign: ${obj.textAlign}`);
              console.log(`  - FontSize: ${obj.fontSize}`);
              console.log(`  - Opacity: ${obj.opacity}`);
              console.log(`  - Shadow: color=${obj.shadowColor}, distance=${obj.shadowDistance}, blur=${obj.shadowBlur}, angle=${obj.shadowDirectionAngle}`);
              console.log(`  - Stroke: color=${obj.stroke}, width=${obj.strokeWidth}, dashArray=${obj.strokeDashArray}, dashOffset=${obj.strokeDashOffset}`);
              
              // Create a new text object instead of cloning to avoid textBaseline issues
              const textObj = new fabric.Text(obj.text, {
                left: obj.left * scaleX,
                top: obj.top * scaleY,
                // Scale the object itself to match the export canvas scale
                scaleX: (obj.scaleX || 1) * scaleX,
                scaleY: (obj.scaleY || 1) * scaleY,
                angle: obj.angle || 0,
                flipX: obj.flipX || false,
                flipY: obj.flipY || false,
                fontSize: obj.fontSize,
                fontFamily: obj.fontFamily,
                fontWeight: obj.fontWeight,
                fontStyle: obj.fontStyle,
                fill: obj.fill,
                stroke: obj.stroke,
                strokeWidth: obj.strokeWidth,
                // Add stroke dash properties if they exist
                strokeDashArray: obj.strokeDashArray,
                strokeDashOffset: obj.strokeDashOffset,
                textAlign: obj.textAlign,
                charSpacing: obj.charSpacing,
                lineHeight: obj.lineHeight,
                underline: obj.underline,
                linethrough: obj.linethrough,
                overline: obj.overline,
                selectable: false,
                evented: false,
                // Set origin point to match the original object
                originX: obj.originX || 'left',
                originY: obj.originY || 'top',
                // Set opacity to match the original object
                opacity: obj.opacity !== undefined ? obj.opacity : 1,
                // Explicitly set textBaseline to avoid the 'alphabetical' error
                textBaseline: obj.textBaseline && ['alphabetic', 'top', 'hanging', 'middle', 'ideographic', 'bottom'].includes(obj.textBaseline) ? obj.textBaseline : 'alphabetic',
                // Add shadow properties if they exist
                shadow: obj.shadow ? obj.shadow : null
              });
              
              // Apply custom stroke positioning if it's an outer stroke
              if (obj.strokePosition === 'outer' && obj.stroke && obj.strokeWidth > 0) {
                console.log(`🔧 Applying outer stroke positioning for text object`);
                
                // Create a custom render method that mimics the main editor's outer stroke behavior
                const originalRender = textObj._render;
                textObj._render = function(ctx) {
                  const originalFill = this.fill;
                  const originalStroke = this.stroke;
                  const originalStrokeWidth = this.strokeWidth;
                  
                  // Draw stroke first (behind text) - make it thicker for outer effect
                  this.fill = 'transparent';
                  this.stroke = originalStroke;
                  this.strokeWidth = originalStrokeWidth * 2; // Double the stroke width for outer effect
                  
                  // Save current transform
                  ctx.save();
                  // Slightly offset the stroke for more obvious outer effect
                  ctx.translate(1, 1);
                  originalRender.call(this, ctx);
                  ctx.restore();
                  
                  // Then draw fill text on top
                  this.fill = originalFill;
                  this.stroke = 'transparent';
                  this.strokeWidth = 0;
                  originalRender.call(this, ctx);
                  
                  // Restore original properties
                  this.fill = originalFill;
                  this.stroke = originalStroke;
                  this.strokeWidth = originalStrokeWidth;
                };
              }
              
              // Store the processed text object instead of adding immediately
              processedObjects.push({
                type: 'text',
                object: textObj,
                layerOrder: objectToLayerOrder[`${obj.type}_${obj.name || 'undefined'}`],
                name: obj.text || 'text'
              });
              
              console.log(`✅ Processed text object - Layer order: ${objectToLayerOrder[`${obj.type}_${obj.name || 'undefined'}`]}`);
              
              // Debug: Log the final text object properties
              console.log(`🔍 DEBUG: Final text object properties:`);
              console.log(`  - Position: left=${textObj.left}, top=${textObj.top}`);
              console.log(`  - Scale: scaleX=${textObj.scaleX}, scaleY=${textObj.scaleY}`);
              console.log(`  - Origin: originX=${textObj.originX}, originY=${textObj.originY}`);
              console.log(`  - TextAlign: ${textObj.textAlign}`);
              console.log(`  - FontSize: ${textObj.fontSize}`);
              console.log(`  - Opacity: ${textObj.opacity}`);
              console.log(`  - Shadow: ${textObj.shadow ? `color=${textObj.shadow.color}, blur=${textObj.shadow.blur}, offsetX=${textObj.shadow.offsetX}, offsetY=${textObj.shadow.offsetY}` : 'none'}`);
              console.log(`  - Stroke: color=${textObj.stroke}, width=${textObj.strokeWidth}, dashArray=${textObj.strokeDashArray}, dashOffset=${textObj.strokeDashOffset}`);
              
              resolve();
            } else {
              // For other objects, use normal cloning
              console.log(`🔍 DEBUG: Processing ${obj.type} object with opacity: ${obj.opacity}`);
              const clonedObj = obj.clone();
              if (clonedObj && typeof clonedObj.set === 'function') {
                clonedObj.set({
                  left: obj.left * scaleX,
                  top: obj.top * scaleY,
                  scaleX: (obj.scaleX || 1) * scaleX,
                  scaleY: (obj.scaleY || 1) * scaleY,
                  angle: obj.angle || 0,
                  flipX: obj.flipX || false,
                  flipY: obj.flipY || false,
                  opacity: obj.opacity !== undefined ? obj.opacity : 1,
                  selectable: false,
                  evented: false
                });
                
                // Store the processed shape object instead of adding immediately
                processedObjects.push({
                  type: obj.type,
                  object: clonedObj,
                  layerOrder: objectToLayerOrder[`${obj.type}_${obj.name || 'undefined'}`],
                  name: obj.name || obj.type
                });
                
                console.log(`✅ Processed ${obj.type} object - Layer order: ${objectToLayerOrder[`${obj.type}_${obj.name || 'undefined'}`]}`);
                resolve();
              } else {
                console.error(`Failed to clone ${obj.type} object: clone returned null`);
                
                // Fallback: try to create a new shape object
                try {
                  console.log(`Attempting fallback creation for ${obj.type} object`);
                  let newShape;
                  
                  if (obj.type === 'triangle') {
                    newShape = new fabric.Triangle({
                      left: obj.left * scaleX,
                      top: obj.top * scaleY,
                      width: obj.width * scaleX,
                      height: obj.height * scaleY,
                      fill: obj.fill || '#f4a012',
                      stroke: obj.stroke || '#000',
                      strokeWidth: obj.strokeWidth || 25,
                      angle: obj.angle || 0,
                      flipX: obj.flipX || false,
                      flipY: obj.flipY || false,
                      opacity: obj.opacity !== undefined ? obj.opacity : 1,
                      selectable: false,
                      evented: false
                    });
                  } else if (obj.type === 'rect') {
                    newShape = new fabric.Rect({
                      left: obj.left * scaleX,
                      top: obj.top * scaleY,
                      width: obj.width * scaleX,
                      height: obj.height * scaleY,
                      fill: obj.fill || '#f4a012',
                      stroke: obj.stroke || '#000',
                      strokeWidth: obj.strokeWidth || 25,
                      angle: obj.angle || 0,
                      flipX: obj.flipX || false,
                      flipY: obj.flipY || false,
                      opacity: obj.opacity !== undefined ? obj.opacity : 1,
                      selectable: false,
                      evented: false
                    });
                  } else if (obj.type === 'circle') {
                    newShape = new fabric.Circle({
                      left: obj.left * scaleX,
                      top: obj.top * scaleY,
                      radius: (obj.width / 2) * scaleX,
                      fill: obj.fill || '#f4a012',
                      stroke: obj.stroke || '#000',
                      strokeWidth: obj.strokeWidth || 25,
                      angle: obj.angle || 0,
                      flipX: obj.flipX || false,
                      flipY: obj.flipY || false,
                      opacity: obj.opacity !== undefined ? obj.opacity : 1,
                      selectable: false,
                      evented: false
                    });
                  } else if (obj.type === 'ellipse') {
                    newShape = new fabric.Ellipse({
                      left: obj.left * scaleX,
                      top: obj.top * scaleY,
                      rx: (obj.width / 2) * scaleX,
                      ry: (obj.height / 2) * scaleY,
                      fill: obj.fill || '#f4a012',
                      stroke: obj.stroke || '#000',
                      strokeWidth: obj.strokeWidth || 25,
                      angle: obj.angle || 0,
                      flipX: obj.flipX || false,
                      flipY: obj.flipY || false,
                      opacity: obj.opacity !== undefined ? obj.opacity : 1,
                      selectable: false,
                      evented: false
                    });
                  }
                  
                  if (newShape) {
                    // Store the processed fallback shape object instead of adding immediately
                    processedObjects.push({
                      type: obj.type,
                      object: newShape,
                      layerOrder: objectToLayerOrder[`${obj.type}_${obj.name || 'undefined'}`],
                      name: obj.name || obj.type
                    });
                    
                    console.log(`✅ Processed fallback ${obj.type} object - Layer order: ${objectToLayerOrder[`${obj.type}_${obj.name || 'undefined'}`]}`);
                    resolve();
                  } else {
                    console.error(`Could not create fallback ${obj.type} object`);
                    resolve();
                  }
                } catch (fallbackError) {
                  console.error(`Fallback creation also failed for ${obj.type} object:`, fallbackError);
                  resolve();
                }
              }
            }
          } catch (error) {
            console.error(`Error processing ${obj.type} object:`, error);
            resolve();
          }
        });
        
        allObjectPromises.push(objectPromise);
      }
    }
    
    // Wait for ALL objects to be processed (both images and non-images)
    if (allObjectPromises.length > 0) {
      await Promise.all(allObjectPromises);
    }
    
    // Now add all processed objects to the export canvas in the correct layer order
    // Sort processed objects by layer order (bottom to top)
    // After inversion: Layer 0=TOP (highest number), Layer N=BOTTOM (lowest number)
    processedObjects.sort((a, b) => b.layerOrder - a.layerOrder); // Descending order (Layer 0=TOP first, Layer N=BOTTOM last)
    
    // Add objects to export canvas in correct order
    // Add objects to export canvas in sorted order
    processedObjects.forEach((processedObj, index) => {
      exportCanvas.add(processedObj.object);
    });
    
    exportCanvas.renderAll();
    
    // Store the export canvas globally for download
    window.readyForDownload = {
      canvas: exportCanvas,
      timestamp: Date.now()
    };
    
    // Show success message
    if (loadingText) {
      loadingText.textContent = '✅ Export ready! Click download to save.';
    }
    
    // Check if we're in the Image Editor 2.0 context
    const existingDownloadBtn = document.getElementById('desk-pad-download-btn');
    
    if (existingDownloadBtn) {
      // We're in Image Editor 2.0 - update the existing button
      
      // Store the original onclick to restore later
      if (!existingDownloadBtn.originalOnclick) {
        existingDownloadBtn.originalOnclick = existingDownloadBtn.onclick;
      }
      
      // Store the original text and styles
      if (!existingDownloadBtn.originalText) {
        existingDownloadBtn.originalText = existingDownloadBtn.textContent;
        existingDownloadBtn.originalBackground = existingDownloadBtn.style.background;
        existingDownloadBtn.originalColor = existingDownloadBtn.style.color;
      }
      
      // Update button to show it's ready for high-res download
      existingDownloadBtn.textContent = '📥 Download High-Res (Ready)';
      existingDownloadBtn.style.background = '#28a745';
      existingDownloadBtn.style.color = 'white';
      
      // Override the onclick to use proxy system
      existingDownloadBtn.onclick = () => {
        if (window.readyForDownload && window.readyForDownload.canvas) {
          existingDownloadBtn.textContent = '⏳ Generating...';
          existingDownloadBtn.disabled = true;
          
          // Generate download in background
          setTimeout(() => {
                         try {
               const dataUrl = window.readyForDownload.canvas.toDataURL({
                 format: 'jpeg',
                 quality: 1.0,
                 multiplier: 1.0
               });
              const link = document.createElement('a');
              link.download = `deskpad_design_${window.readyForDownload.timestamp}.jpg`;
              link.href = dataUrl;
              
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              existingDownloadBtn.textContent = '✅ Downloaded!';
              existingDownloadBtn.style.background = '#28a745';
              
              // Reset button to original state after a delay
              setTimeout(() => {
                existingDownloadBtn.textContent = existingDownloadBtn.originalText || 'Download';
                existingDownloadBtn.style.background = existingDownloadBtn.originalBackground || '';
                existingDownloadBtn.style.color = existingDownloadBtn.originalColor || '';
                existingDownloadBtn.disabled = false;
                
                // Clear the proxy system data
                window.readyForDownload = null;
              }, 2000);
              
            } catch (error) {
              console.error('Download failed:', error);
              existingDownloadBtn.textContent = '❌ Download Failed';
              existingDownloadBtn.style.background = '#dc3545';
              existingDownloadBtn.disabled = false;
              
              // Reset to original state after error
              setTimeout(() => {
                existingDownloadBtn.textContent = existingDownloadBtn.originalText || 'Download';
                existingDownloadBtn.style.background = existingDownloadBtn.originalBackground || '';
                existingDownloadBtn.style.color = existingDownloadBtn.originalColor || '';
                existingDownloadBtn.disabled = false;
              }, 3000);
            }
          }, 100);
        }
      };
    } else {
      // Fallback to creating a new download button (for other contexts)
      let downloadBtn = document.getElementById('download-ready-btn');
      
      if (!downloadBtn) {
        downloadBtn = document.createElement('button');
        downloadBtn.id = 'download-ready-btn';
        downloadBtn.textContent = '📥 Download High-Res JPEG';
        downloadBtn.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: #28a745;
          color: white;
          border: none;
          padding: 15px 25px;
          border-radius: 8px;
          font-size: 16px;
          cursor: pointer;
          z-index: 10000;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        
        downloadBtn.onclick = () => {
          if (window.readyForDownload && window.readyForDownload.canvas) {
            console.log('Starting download generation...');
            downloadBtn.textContent = '⏳ Generating...';
            downloadBtn.disabled = true;
            
            // Generate download in background
            setTimeout(() => {
              try {
                console.log('Starting toDataURL generation...');
                const dataUrl = window.readyForDownload.canvas.toDataURL({
                  format: 'jpeg',
                  quality: 1.0,
                  multiplier: 1.0
                });
                
                console.log('toDataURL completed, creating download link...');
                const link = document.createElement('a');
                link.download = `deskpad_design_${window.readyForDownload.timestamp}.jpg`;
                link.href = dataUrl;
                
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                console.log('✅ Download completed successfully!');
                downloadBtn.textContent = '✅ Downloaded!';
                
                // Clean up
                setTimeout(() => {
                  document.body.removeChild(downloadBtn);
                  window.readyForDownload = null;
                }, 2000);
                
              } catch (error) {
                console.error('Download failed:', error);
                downloadBtn.textContent = '❌ Download Failed';
                downloadBtn.style.background = '#dc3545';
              }
            }, 100);
          }
        };
        
        document.body.appendChild(downloadBtn);
      }
    }
    
  } catch (error) {
    console.error('❌ Export failed with error:', error);
    alert(`Export failed: ${error.message}. Please try again.`);
    
    // Ensure loading screen is hidden even on error
    if (loadingOverlay) {
      loadingOverlay.classList.remove('show');
      console.log('🔧 Loading screen hidden due to error');
    }
  } finally {
    // Clear the safety timeout
    if (window.loadingTimeout) {
      clearTimeout(window.loadingTimeout);
      window.loadingTimeout = null;
    }
    
    // Always hide loading screen when function completes
    if (loadingOverlay) {
      loadingOverlay.classList.remove('show');
      console.log('🔧 Loading screen hidden in finally block');
    }
    
    // Also hide loading text if it exists
    if (loadingText) {
      loadingText.textContent = '';
    }
  }
}

// Enhanced image loading function that uses proxies
async function addImageToCanvasWithProxy(file, canvas, index = 0) {
  try {
    // Safety check for canvas
    if (!canvas) {
      console.error('Canvas is undefined in addImageToCanvasWithProxy');
      return;
    }

    console.log('Adding image with proxy system:', {
      fileName: file.name,
      fileSize: file.size,
      canvasWidth: canvas.getWidth(),
      canvasHeight: canvas.getHeight(),
      index: index
    });

    // Create proxy for this image
    const { imageId, proxyDataUrl } = await window.proxyManager.createProxy(file);
    
    // Generate unique ID for this image (for auto-enlargement tracking)
    const uniqueImageId = 'img_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    // Load the proxy version for editing
    fabric.Image.fromURL(proxyDataUrl, async function(fabricImg) {
      // Add imageId to track this image
      fabricImg.imageId = imageId;
      
      // Store original dimensions for DPI calculation
      try {
        const originalDimensions = await getImageDimensions(file);
        fabricImg._originalWidth = originalDimensions.width;
        fabricImg._originalHeight = originalDimensions.height;
      } catch (error) {
        console.error('Error getting original dimensions:', error);
        // Fallback to proxy dimensions if original dimensions can't be determined
        fabricImg._originalWidth = fabricImg.width;
        fabricImg._originalHeight = fabricImg.height;
      }
      

      
      // Calculate positioning to fit the image to canvas width or height
      const canvasW = canvas.getWidth();
      const canvasH = canvas.getHeight();
      
      // Calculate scale to fit either width or height of the canvas
      const scaleX = canvasW / fabricImg.width;
      const scaleY = canvasH / fabricImg.height;
      
      // Use the smaller scale to fit either width or height (whichever constraint is hit first)
      // This ensures the image fits within the canvas bounds
      // Allow upscaling to fit the canvas if necessary
      const finalScale = Math.min(scaleX, scaleY);
      
      // Track if image was auto-enlarged (scale > 1 means it was upscaled)
      const wasAutoEnlarged = finalScale > 1;
      
      console.log('Proxy image upload tracking:', {
        originalWidth: fabricImg.width,
        originalHeight: fabricImg.height,
        canvasWidth: canvasW,
        canvasHeight: canvasH,
        scale: finalScale,
        wasAutoEnlarged,
        imageId: uniqueImageId
      });
      
      // Calculate positioning with offset for multiple images
      const scaledWidth = fabricImg.width * finalScale;
      const scaledHeight = fabricImg.height * finalScale;
      
      // Offset each image based on existing objects to prevent overlapping
      const existingObjects = canvas.getObjects().filter(obj => obj.type === 'image');
      const offsetX = existingObjects.length * 50; // 50px horizontal offset per image
      const offsetY = existingObjects.length * 50; // 50px vertical offset per image
      
      // Center the image in the canvas with offset, respecting aspect ratio
      // Calculate center position relative to canvas dimensions
      const centerX = canvasW / 2;
      const centerY = canvasH / 2;
      
      // Position image relative to center, accounting for its scaled dimensions
      const left = centerX - (scaledWidth / 2) + offsetX;
      const top = centerY - (scaledHeight / 2) + offsetY;
      

      
      // Set up the image with center origin
      fabricImg.set({
        left: left + (scaledWidth / 2), // Center position
        top: top + (scaledHeight / 2),  // Center position
        originX: 'center',
        originY: 'center',
        scaleX: finalScale,
        scaleY: finalScale,
        selectable: true,
        hasControls: true,
        hasBorders: true,
        stroke: 'transparent',
        strokeWidth: 0,
        evented: true,
        _wasAutoEnlarged: wasAutoEnlarged, // Track auto-enlargement
        _originalScale: finalScale, // Store original scale for undo
        _userHasResized: false, // Track if user has manually resized
        _imageId: uniqueImageId // Unique identifier
      });
      
      // Store initial values for transformation tracking
      // Store the actual position and scale as they are set
      fabricImg.initialPosition = {
        left: fabricImg.left,
        top: fabricImg.top
      };
      fabricImg.initialScale = {
        scaleX: fabricImg.scaleX,
        scaleY: fabricImg.scaleY
      };
      
      // Add event listeners to track user modifications
      fabricImg.on('modified', function() {
        console.log(`Image ${imageId} modified - Position: ${this.left.toFixed(1)}x${this.top.toFixed(1)}, Scale: ${this.scaleX.toFixed(3)}x${this.scaleY.toFixed(3)}`);
      });
      
      canvas.add(fabricImg);
      canvas.setActiveObject(fabricImg); // Select the new image
      
      // Create a layer for this image if layer management is available
      try {
        if (typeof createLayer !== 'undefined' && typeof updateLayersList !== 'undefined') {
          const imageName = fabricImg.name || file.name || `Image ${canvas.getObjects().length}`;
          const layer = createLayer(imageName, 'Image', fabricImg);
          
          // Set this as the active layer since the image is auto-selected
          if (typeof activeLayerId !== 'undefined') {
            activeLayerId = layer.id;
          }
          
          // Update properties panel if available
          if (typeof updatePropertiesPanel !== 'undefined') {
            setTimeout(() => {
              updatePropertiesPanel(layer);
            }, 100);
          }
          
          updateLayersList();
        }
      } catch (layerError) {
        console.error('Error creating layer:', layerError);
        // Continue without layer management if it fails
      }
      
      canvas.requestRenderAll();
      
      // Call the completion callback to hide loading screen
      if (window.modalImageProcessingComplete) {
        window.modalImageProcessingComplete();
      }
    });
  } catch (error) {
    console.error('Error adding image with proxy:', error);
    alert('Error adding image. Please try again.');
  }
}

// Override the existing downloadCanvas function
window.enhancedDownloadCanvas = function(canvas) {
  return downloadCanvasWithProxy(canvas);
};

console.log('Proxy system loaded successfully!'); 