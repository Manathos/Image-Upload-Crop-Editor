// Top overlay row (barless): menu + theme toggle, horizontally scrollable when overflow
function installTopOverlayRow() {
  const root = document.getElementById('mobile-layout') || document.body;
  if (!root || document.getElementById('mobile-top-row')) return;
  const row = document.createElement('div');
  row.id = 'mobile-top-row';
  row.style.cssText = [
    'position:fixed','left:0','right:0','top:0','z-index:15006','display:flex','gap:8px',
    'align-items:center','padding:8px 10px','box-sizing:border-box','overflow-x:auto','overflow-y:hidden',
    'scrollbar-width:none','-ms-overflow-style:none','pointer-events:none'
  ].join(';');
  row.addEventListener('wheel', e => { if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) { row.scrollLeft += e.deltaY; e.preventDefault(); } }, { passive:false });
  // Background is transparent; buttons carry their own backgrounds. Pointer events only on buttons
  const mkBtn = (id, label, aria, onClick) => {
    const b = document.createElement('button');
    b.id = id; b.setAttribute('aria-label', aria);
    b.textContent = label;
    b.style.cssText = 'pointer-events:auto; background: var(--bg-primary); color: var(--accent-color); border:1px solid var(--accent-color); border-radius:10px; height:40px; padding:0 10px; min-width:44px; display:flex; align-items:center; justify-content:center; font-size:16px;';
    b.addEventListener('click', (e)=>{ e.stopPropagation(); onClick && onClick(); });
    return b;
  };
  const btnMenu = mkBtn('mobile-top-menu','☰','Menu', ()=> showMobileMainMenu && showMobileMainMenu());
  const btnTheme = mkBtn('mobile-top-theme','🌙','Toggle Theme', ()=> {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
  });
  row.appendChild(btnMenu);
  row.appendChild(btnTheme);
  root.appendChild(row);
}

// Bottom overlay row (barless): transform controls in horizontal line grid
function installBottomTransformOverlayRow() {
  const root = document.getElementById('mobile-layout') || document.body;
  if (!root || document.getElementById('mobile-bottom-row')) return;
  const row = document.createElement('div');
  row.id = 'mobile-bottom-row';
  row.style.cssText = [
    'position:fixed','left:0','right:0','bottom:0','z-index:15006','display:flex','gap:12px',
    'align-items:flex-end','padding:10px 12px calc(10px + env(safe-area-inset-bottom))','box-sizing:border-box','overflow-x:auto','overflow-y:hidden',
    'scrollbar-width:none','-ms-overflow-style:none','pointer-events:none',
    // Background panel behind buttons
    'background:rgba(0,0,0,0.35)','backdrop-filter:saturate(120%) blur(8px)',
    // Hidden by default; slide in on long-press
    'transform:translateY(100%)','transition:transform 220ms ease'
  ].join(';');
  const mkBtn = (iconText, titleText, aria, action) => {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'pointer-events:auto; display:flex; flex-direction:column; align-items:center; gap:6px;';
    const b = document.createElement('button');
    b.setAttribute('aria-label', aria);
    b.style.cssText = [
      'background:var(--bg-primary)','color:var(--accent-color)','border:none','border-radius:14px',
      'width:56px','height:56px','display:flex','align-items:center','justify-content:center','font-size:22px',
      'box-shadow:0 2px 8px rgba(0,0,0,0.35)','cursor:pointer'
    ].join(';');
    b.textContent = iconText;
    b.addEventListener('click', (e)=>{ e.stopPropagation(); tryHandleTransformAction(action); });
    const label = document.createElement('div');
    label.textContent = titleText;
    label.style.cssText = 'font-size:10px; color: var(--accent-color); line-height:1;';
    wrap.appendChild(b);
    wrap.appendChild(label);
    return wrap;
  };
  const buttons = [
    mkBtn('⬆️','Front','Bring to Front','bringFront'),
    mkBtn('⬇️','Back','Send to Back','sendBack'),
    mkBtn('↺','Rotate L','Rotate Left','rotateLeft'),
    mkBtn('↻','Rotate R','Rotate Right','rotateRight'),
    mkBtn('⇄','Flip H','Flip Horizontal','flipH'),
    mkBtn('⇅','Flip V','Flip Vertical','flipV'),
    mkBtn('✂️','Crop','Crop Image','crop'),
    mkBtn('⟵','Align L','Align Left','alignLeft'),
    mkBtn('↔','Align C','Align Center','alignCenter'),
    mkBtn('⟶','Align R','Align Right','alignRight'),
    mkBtn('⊕','Center','Center Object','center'),
    mkBtn('1×','1x','Reset Scale','resetScale'),
    mkBtn('🗑','Delete','Delete','delete')
  ];
  buttons.forEach(b => row.appendChild(b));
  // Dismiss button at end
  const dismiss = document.createElement('button');
  dismiss.setAttribute('aria-label', 'Close');
  dismiss.textContent = '✕';
  dismiss.style.cssText = 'pointer-events:auto; margin-left:auto; background:transparent; color: var(--accent-color); border:none; font-size:20px; width:40px; height:40px;';
  dismiss.addEventListener('click', (e)=>{ e.stopPropagation(); hideBottomTransformOverlayRow(); });
  row.appendChild(dismiss);
  root.appendChild(row);
  // Hide by default
  hideBottomTransformOverlayRow();

  // Show on long-press of selected object; hide when selection clears
  ensureBottomTransformLongPressHooks();
}

let _bottomTransformLPInstalled = false;
function ensureBottomTransformLongPressHooks() {
  try {
    if (_bottomTransformLPInstalled) return;
    if (!window.mobileCanvas) return;
    _bottomTransformLPInstalled = true;
    let lpTimer = null;
    let startX = 0, startY = 0;
    const LONG_PRESS_MS = 350;
    const MOVE_CANCEL_PX = 10;
    window.mobileCanvas.on('mouse:down', (opt) => {
      const p = opt && opt.e ? opt.e : null;
      // If pressing on a transform control/handle, do not start long-press
      const pressedControl = !!(opt && ((opt.transform && opt.transform.corner) || (opt.e && opt.e.corner) || (opt.target && opt.target.__corner)));
      if (pressedControl) {
        if (lpTimer) { clearTimeout(lpTimer); lpTimer = null; }
        return;
      }
      startX = p && typeof p.clientX === 'number' ? p.clientX : 0;
      startY = p && typeof p.clientY === 'number' ? p.clientY : 0;
      if (lpTimer) { clearTimeout(lpTimer); lpTimer = null; }
      lpTimer = setTimeout(() => {
        const obj = window.mobileCanvas.getActiveObject();
        if (obj) showQuickActionMenuAt(startX, startY);
      }, LONG_PRESS_MS);
    });
    window.mobileCanvas.on('mouse:move', (opt) => {
      if (!lpTimer) return;
      const p = opt && opt.e ? opt.e : null;
      const dx = (p && typeof p.clientX === 'number') ? Math.abs(p.clientX - startX) : 0;
      const dy = (p && typeof p.clientY === 'number') ? Math.abs(p.clientY - startY) : 0;
      if (Math.max(dx, dy) > MOVE_CANCEL_PX) { clearTimeout(lpTimer); lpTimer = null; }
    });
    // Explicitly cancel long-press while object is moving/dragging
    try {
      window.mobileCanvas.on('object:moving', () => { if (lpTimer) { clearTimeout(lpTimer); lpTimer = null; } hideQuickActionMenu(); });
      window.mobileCanvas.on('mouse:wheel', () => { if (lpTimer) { clearTimeout(lpTimer); lpTimer = null; } hideQuickActionMenu(); });
      // Cancel/hide during resize/rotate lifecycle
      window.mobileCanvas.on('object:scaling', () => { if (lpTimer) { clearTimeout(lpTimer); lpTimer = null; } hideQuickActionMenu(); });
      window.mobileCanvas.on('object:scaled', () => { if (lpTimer) { clearTimeout(lpTimer); lpTimer = null; } hideQuickActionMenu(); });
      window.mobileCanvas.on('object:rotating', () => { if (lpTimer) { clearTimeout(lpTimer); lpTimer = null; } hideQuickActionMenu(); });
      window.mobileCanvas.on('object:modified', () => { if (lpTimer) { clearTimeout(lpTimer); lpTimer = null; } hideQuickActionMenu(); });
    } catch(_) {}
    window.mobileCanvas.on('mouse:up', () => { if (lpTimer) { clearTimeout(lpTimer); lpTimer = null; } });
    window.mobileCanvas.on('selection:cleared', () => hideBottomTransformOverlayRow());
  } catch(_) {}
}

function tryHandleTransformAction(action) {
  const activeObject = window.mobileCanvas?.getActiveObject();
  if (!activeObject && action !== 'close') return;
  switch(action) {
    case 'bringFront': window.mobileCanvas.bringToFront(activeObject); break;
    case 'sendBack': sendToBackSafe(activeObject); break;
    case 'rotateLeft': activeObject.rotate((activeObject.angle || 0) - 90); break;
    case 'rotateRight': activeObject.rotate((activeObject.angle || 0) + 90); break;
    case 'flipH': activeObject.set('flipX', !activeObject.flipX); break;
    case 'flipV': activeObject.set('flipY', !activeObject.flipY); break;
    case 'crop': {
      if (activeObject.type === 'image') {
        try {
          if ((activeObject.angle && Math.abs(activeObject.angle % 360) > 0.01) || activeObject.flipX || activeObject.flipY) {
            if (window.openCropModal) {
              const src = activeObject._element?.src || activeObject.toDataURL?.();
              openCropModal(src, activeObject);
            }
          } else {
            if (window.enterInCanvasCropMode) {
              enterInCanvasCropMode(activeObject);
            } else if (window.openCropModal) {
              const src = activeObject._element?.src || activeObject.toDataURL?.();
              openCropModal(src, activeObject);
            }
          }
        } catch(_) {}
      }
      break;
    }
    case 'alignLeft': activeObject.set({ left: activeObject.getScaledWidth()/2 }); break;
    case 'alignCenter': activeObject.set({ left: window.mobileCanvas.getWidth() / 2 }); break;
    case 'alignRight': activeObject.set({ left: window.mobileCanvas.getWidth() - activeObject.getScaledWidth()/2 }); break;
    case 'center': activeObject.set({ originX: 'center', originY: 'center', left: window.mobileCanvas.getWidth()/2, top: window.mobileCanvas.getHeight()/2 }); break;
    case 'resetScale': activeObject.set({ scaleX: 1, scaleY: 1 }); break;
    case 'delete': window.mobileCanvas.remove(activeObject); window.mobileCanvas.discardActiveObject(); break;
  }
  if (activeObject) { activeObject.setCoords(); window.mobileCanvas.requestRenderAll(); }
}

// Quick Action Menu (press-positioned): Delete, Transform, Crop
function showQuickActionMenuAt(clientX, clientY) {
  const root = document.getElementById('mobile-layout') || document.body;
  let menu = document.getElementById('mobile-quick-action');
  if (!menu) {
    menu = document.createElement('div');
    menu.id = 'mobile-quick-action';
    menu.style.cssText = [
      'position:fixed','z-index:15020','background:rgba(0,0,0,0.75)','backdrop-filter:saturate(120%) blur(6px)',
      'border-radius:12px','padding:6px 8px','display:flex','flex-direction:column','gap:6px','pointer-events:auto',
      'box-shadow:0 6px 20px rgba(0,0,0,0.35)'
    ].join(';');
    const mk = (label, aria, onClick) => {
      const b = document.createElement('button');
      b.textContent = label; b.setAttribute('aria-label', aria);
      b.style.cssText = [
        'background:var(--bg-primary)','color:var(--accent-color)','border:none','border-radius:10px',
        'padding:10px 12px','font-size:14px','text-align:left','min-width:160px','height:40px'
      ].join(';');
      b.addEventListener('click', (e)=>{ e.stopPropagation(); hideQuickActionMenu(); onClick && onClick(); });
      return b;
    };
    const del = mk('Delete','Delete selected', ()=> { const o = window.mobileCanvas?.getActiveObject(); if (o) { window.mobileCanvas.remove(o); window.mobileCanvas.discardActiveObject(); window.mobileCanvas.requestRenderAll(); } });
    const tfm = mk('Transform','Open transform bar', ()=> { showBottomTransformOverlayRow(); });
    const crop = mk('Crop','Open crop modal', ()=> { const o = window.mobileCanvas?.getActiveObject(); if (o && o.type === 'image') { try { openCropModal(o._element?.src || o.toDataURL?.(), o); } catch(_) {} } });
    menu.appendChild(del); menu.appendChild(tfm); menu.appendChild(crop);
    root.appendChild(menu);
  }
  // Position menu centered on screen (ignore press coordinates)
  const vvW = Math.round(window.visualViewport ? window.visualViewport.width : window.innerWidth);
  const vvH = Math.round(window.visualViewport ? window.visualViewport.height : window.innerHeight);
  menu.style.visibility = 'hidden';
  menu.style.left = '0px'; menu.style.top = '0px';
  menu.style.display = 'flex';
  requestAnimationFrame(() => {
    const rect = menu.getBoundingClientRect();
    const x = Math.max(8, Math.round((vvW - rect.width) / 2));
    const y = Math.max(8, Math.round((vvH - rect.height) / 2));
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    menu.style.visibility = 'visible';
  });
  // Dismiss on outside tap or selection clear
  const outside = (e) => { const t = e.target; if (menu && !menu.contains(t)) { hideQuickActionMenu(); } };
  setTimeout(() => {
    document.addEventListener('pointerdown', outside, { capture: true, passive: true });
    menu._outside = outside;
  }, 0);
  try { window.mobileCanvas.on('selection:cleared', hideQuickActionMenu); } catch(_) {}
}

function hideQuickActionMenu() {
  const menu = document.getElementById('mobile-quick-action');
  if (!menu) return;
  try { document.removeEventListener('pointerdown', menu._outside, true); } catch(_) {}
  menu.remove();
}

function showBottomTransformOverlayRow() {
  const row = document.getElementById('mobile-bottom-row');
  if (!row) return;
  row.style.transform = 'translateY(0)';
}

function hideBottomTransformOverlayRow() {
  const row = document.getElementById('mobile-bottom-row');
  if (!row) return;
  row.style.transform = 'translateY(100%)';
}
// Mobile background layer – mirror desktop behavior using a non-selectable rect
let mobileBackgroundRect = null;
function setupMobileBackgroundLayer() {
  if (!window.mobileCanvas || !window.fabric) return;
  // Ensure transparent canvas background; color is via rect
  window.mobileCanvas.backgroundColor = 'transparent';
  updateMobileCanvasBackground();
  // Re-apply on resize/orientation
  try {
    window.addEventListener('orientationchange', () => setTimeout(updateMobileCanvasBackground, 50));
  } catch(_) {}
}

function updateMobileCanvasBackground() {
  if (!window.mobileCanvas || !window.fabric) return;
  const canvas = window.mobileCanvas;
  const width = canvas.getWidth();
  const height = canvas.getHeight();
  const color = (typeof currentBackground === 'object' && currentBackground.type === 'solid') ? (currentBackground.color || '#ffffff') : null;

  // Remove existing rect if type changed to transparent
  if (!color) {
    if (mobileBackgroundRect) {
      try { canvas.remove(mobileBackgroundRect); } catch(_) {}
      mobileBackgroundRect = null;
      canvas.requestRenderAll();
    }
    return;
  }

  if (!mobileBackgroundRect) {
    mobileBackgroundRect = new fabric.Rect({
      left: 0,
      top: 0,
      width,
      height,
      fill: color,
      selectable: false,
      evented: false,
      name: 'mobileBackgroundRect'
    });
    // Insert at bottom
    try { canvas.insertAt(mobileBackgroundRect, 0, true); } catch { canvas.add(mobileBackgroundRect); }
  } else {
    mobileBackgroundRect.set({ width, height, fill: color });
  }
  // Ensure it stays at the bottom of the stack
  try { canvas.sendToBack(mobileBackgroundRect); } catch(_) {}
  canvas.requestRenderAll();
}
// Layer ordering safety helpers (keep background at true back)
function getMinForegroundIndex() {
  try {
    if (!window.mobileCanvas) return 0;
    const objs = window.mobileCanvas.getObjects();
    const bgIndex = mobileBackgroundRect ? objs.indexOf(mobileBackgroundRect) : -1;
    return bgIndex >= 0 ? bgIndex + 1 : 0;
  } catch (_) { return 0; }
}

function sendBackwardsSafe(obj) {
  try {
    if (!window.mobileCanvas || !obj) return;
    const objs = window.mobileCanvas.getObjects();
    const curIndex = objs.indexOf(obj);
    const minIndex = getMinForegroundIndex();
    if (curIndex <= minIndex) return; // already just above background or lower
    window.mobileCanvas.sendBackwards(obj);
  } catch (_) {}
}

function sendToBackSafe(obj) {
  try {
    if (!window.mobileCanvas || !obj) return;
    const minIndex = getMinForegroundIndex();
    if (minIndex <= 0) {
      window.mobileCanvas.sendToBack(obj);
    } else {
      // Move just above the background
      obj.moveTo(minIndex);
    }
  } catch (_) {}
}
// Mobile detection and interface
let isMobile = false;
let isPortrait = false;

// Mobile snapping configuration (defaults; can be adjusted via UI)
let mobileSnapThreshold = 8;   // pixels; 0 disables translational snapping
let mobileSnapAngle = 10;      // degrees; 0 disables angle snapping
let mobileAngleUnsnap = 10;    // degrees tolerance to escape angle snap
let mobileUnsnapDistance = 6;  // extra pixels required to "unsnap" from an engaged snap

// Motion/accessibility helpers
function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function motionMs(defaultMs = 300) {
  return prefersReducedMotion() ? 0 : defaultMs;
}

let bodyOverflowBackup = null;

// Theme-aware color functions
function getMobileThemeColors() {
  const isLightTheme = document.documentElement.getAttribute('data-theme') === 'light';
  
  return {
    // Background colors
    primaryBg: isLightTheme ? '#ffffff' : '#1a1919',
    secondaryBg: isLightTheme ? '#f0f0f0' : '#222',
    tertiaryBg: isLightTheme ? '#e0e0e0' : '#333',
    canvasBg: isLightTheme ? '#f8f9fa' : '#444',
    menuBg: isLightTheme ? '#ffffff' : '#1a1919',
    
    // Text colors
    primaryText: isLightTheme ? '#333333' : '#ffffff',
    secondaryText: isLightTheme ? '#666666' : '#cccccc',
    accentText: isLightTheme ? '#f4a012' : '#f4a012', // Keep orange for both themes
    
    // Border colors
    primaryBorder: isLightTheme ? '#cccccc' : '#444',
    accentBorder: isLightTheme ? '#f4a012' : '#f4a012', // Keep orange for both themes
    
    // Button colors
    buttonBg: isLightTheme ? '#f0f0f0' : '#333',
    buttonHoverBg: isLightTheme ? '#e0e0e0' : '#444',
    buttonText: isLightTheme ? '#333333' : '#f4a012',
    
    // Canvas colors
    canvasContainerBg: isLightTheme ? '#f8f9fa' : '#444',
    canvasElementBg: isLightTheme ? '#ffffff' : '#555',
    fabricCanvasBg: isLightTheme ? '#ffffff' : '#666'
  };
}

function updateMobileInterfaceTheme() {
  // Since CSS now handles most theme changes, we only need to update:
  // 1. Fabric.js canvas background - but we need to make it transparent so the pattern shows through
  // 2. Logo image
  // 3. Button text colors (which aren't handled by CSS variables)
  
  const colors = getMobileThemeColors();
  const isLightTheme = document.documentElement.getAttribute('data-theme') === 'light';
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
  

  
  // Update Fabric.js canvas background to be transparent so the pattern shows through
  if (window.mobileCanvas) {
    // Ensure Fabric canvas background is transparent; color is drawn via background rect like desktop
    window.mobileCanvas.backgroundColor = 'transparent';
    window.mobileCanvas.renderAll();
  }
  
  // Update logo based on theme
  // Logo removed in barless UI
  
  // Update button text colors (these aren't handled by CSS variables)
  // No bottom toolbar in barless UI
  
  // Update mobile menu and theme button colors
  // Menu button now lives in overlay; styled by overlay installation
  
  // Theme button now lives in overlay; styled by overlay installation
  
  // Update header and toolbar background colors
  // No header in barless UI
  
  // No bottom toolbar in barless UI
  
  // Force a re-render of the mobile canvas container to ensure patterns are visible
  const mobileCanvasContainer = document.getElementById('mobile-canvas-container');
  if (mobileCanvasContainer) {
    // Trigger a reflow to ensure CSS patterns are applied
    mobileCanvasContainer.style.display = 'none';
    mobileCanvasContainer.offsetHeight; // Force reflow
    mobileCanvasContainer.style.display = 'flex';
    
  }
  
  // Also force reflow of canvas area to ensure patterns are applied
  const mobileCanvasArea = document.getElementById('mobile-canvas-area');
  if (mobileCanvasArea) {
    mobileCanvasArea.style.display = 'none';
    mobileCanvasArea.offsetHeight; // Force reflow
    mobileCanvasArea.style.display = 'flex';
    
  }
  
  // Note: Background patterns are handled separately by reapplyMobileCanvasBackgroundPattern()
  // to avoid circular dependencies with theme updates
  
}

function detectMobile() {
  // More precise mobile detection
  const width = window.innerWidth;
  const height = window.innerHeight;
  const aspectRatio = width / height;
  
  // Check if it's actually a mobile device or just a small window
  const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isSmallWindow = width <= 768;
  const isPortraitOrientation = aspectRatio < 1;
  
  // Treat as mobile if it's a mobile device OR a small window (regardless of orientation)
  isMobile = isMobileDevice || isSmallWindow;
  isPortrait = isPortraitOrientation;
  
  
  return isMobile;
}

function setupMobileInterface() {
  if (!isMobile) {
    return;
  }
  
  // Check main theme toggle status
  checkMainThemeToggle();
  
  // Create a completely new mobile layout
  setupMobileLayout();
  
  // Ensure theme is properly initialized with more robust handling
  initializeMobileTheme();
  
  // Force a delay to ensure DOM elements are created before updating theme
  setTimeout(() => {
    // Update theme after layout is created
    updateMobileInterfaceTheme();
    
    // Force re-render of pattern backgrounds
    const mobileCanvasArea = document.getElementById('mobile-canvas-area');
    const mobileCanvasContainer = document.getElementById('mobile-canvas-container');
    
    if (mobileCanvasArea) {
      mobileCanvasArea.style.display = 'none';
      mobileCanvasArea.offsetHeight; // Force reflow
      mobileCanvasArea.style.display = 'flex';
    }
    
    if (mobileCanvasContainer) {
      mobileCanvasContainer.style.display = 'none';
      mobileCanvasContainer.offsetHeight; // Force reflow
      mobileCanvasContainer.style.display = 'flex';
    }
    
    // Debug outlines disabled
    
    // Apply background patterns after setup
    reapplyMobileCanvasBackgroundPattern();
    
    // Set up mobile theme listener
    setupMobileThemeListener();
    setupDirectThemeToggleListener();
    
    // Install gesture overlays and tools
    installMobileZoomOverlay();
  // installMobileBackgroundOverlay(); // replaced by Add (+) overlay actions
    installMobileLayersDock();
    installMobileAddOverlay();
    installMobilePanAndPinch();
    installMobileRecenterOverlay();
  }, 100);
}

// Ensure proper theme initialization for mobile
function initializeMobileTheme() {
  // Get current theme from localStorage or default to dark
  const savedTheme = localStorage.getItem('theme') || 'dark';
  const currentTheme = document.documentElement.getAttribute('data-theme');
  
 
  
  // Ensure theme is properly set
  if (!currentTheme || currentTheme !== savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
  
  }
  
  // Force a brief delay to ensure the theme attribute is applied
  setTimeout(() => {
    // Double-check theme consistency
    const finalTheme = document.documentElement.getAttribute('data-theme');
   
    
    // Update theme button icon
    updateMobileThemeButtonIcon();
    
   
  }, 10);
}

function setupMobileLayout() {
  // Instead of hiding, we need to restructure the layout
  // The desktop elements should be completely removed from the DOM flow in mobile mode
  
  // Get the modal overlay and restructure it for mobile
  const modalOverlay = document.getElementById('desk-pad-modal-overlay');
  if (!modalOverlay) return;
  
  // Clear the modal overlay completely
  modalOverlay.innerHTML = '';
  
  // Create a fresh mobile layout structure
  const mobileLayout = document.createElement('div');
  mobileLayout.id = 'mobile-layout';
  mobileLayout.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    display: flex;
    flex-direction: column;
    z-index: 15000;
    overflow: hidden;
    padding-bottom: 0; /* avoid extra dark strip below bottom toolbar */
    overscroll-behavior: contain;
    touch-action: manipulation;
  `;

  // Snap layout height to the visible viewport (fixes device/ratio-specific bottom gap)
  function syncMobileLayoutHeight() {
    const vh = window.visualViewport ? Math.round(window.visualViewport.height) : Math.round(window.innerHeight);
    mobileLayout.style.height = vh + 'px';
  }
  syncMobileLayoutHeight();
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', syncMobileLayoutHeight);
    window.visualViewport.addEventListener('scroll', syncMobileLayoutHeight);
  }
  window.addEventListener('resize', syncMobileLayoutHeight);
  window.addEventListener('orientationchange', () => setTimeout(syncMobileLayoutHeight, 50));
  
  // Create mobile canvas area
  const mobileCanvasArea = createMobileCanvasArea();
  
  // Assemble the mobile layout
  mobileLayout.appendChild(mobileCanvasArea);
  // Header and bottom toolbar removed in barless UI; overlays will be installed instead
  
  // Add the mobile layout to the modal overlay
  modalOverlay.appendChild(mobileLayout);

  // Initialize viewport-first layout manager
  initMobileViewportLayoutManager();
  requestMobileViewportLayout();
  
  // Install barless overlay rows
  try { installTopOverlayRow(); } catch(_) {}
  try { installBottomTransformOverlayRow(); } catch(_) {}
  
  
}



function createMobileHeader() {
  const colors = getMobileThemeColors();
  
  const header = document.createElement('div');
  header.id = 'mobile-header';
  header.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 56px;
    background: ${colors.primaryBg};
    border-bottom: 2px solid ${colors.accentBorder};
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 12px;
    box-sizing: border-box;
    flex-shrink: 0;
    z-index: 15001;
  `;
  
  header.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px;">
      <button id="mobile-menu-btn" style="background: none; border: none; color: ${colors.accentText}; cursor: pointer; display: flex; flex-direction: column; align-items: center; min-width: 50px; min-height: 50px; font-size: 18px;">
        <div style="font-size: 18px; margin-bottom: 2px;">☰</div>
        <div style="font-size: 10px;">Menu</div>
      </button>
      <img src="${colors.primaryBg === '#ffffff' ? 'Paddash.com Logo black text.png' : 'Paddash Logo.png'}" alt="Paddash Logo" style="height: 20px; width: auto;">
    </div>
    <div style="display: flex; align-items: center; gap: 8px;">
      <button id="mobile-theme-btn" style="background: none; border: none; color: ${colors.accentText}; cursor: pointer; display: flex; flex-direction: column; align-items: center; min-width: 50px; min-height: 50px;">
        <div style="font-size: 16px; margin-bottom: 2px;">🌙</div>
        <div style="font-size: 10px;">Theme</div>
      </button>
    </div>
  `;
  
  // Set up header events
  setupMobileHeaderEvents(header);
  
  return header;
}

function createMobileCanvasArea() {
  const colors = getMobileThemeColors();
  
  const canvasArea = document.createElement('div');
  canvasArea.id = 'mobile-canvas-area';
  canvasArea.style.cssText = `
    position: fixed;
    left: 0;
    right: 0;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
  `;
  
  // Create a new canvas container specifically for mobile
  const mobileCanvasContainer = document.createElement('div');
  mobileCanvasContainer.id = 'mobile-canvas-container';
  mobileCanvasContainer.style.cssText = `
    position: relative;
    overflow: hidden;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    flex-shrink: 0;
    transition: transform 120ms ease;
  `;
  
  // Create a new canvas element for mobile
  const mobileCanvas = document.createElement('canvas');
  mobileCanvas.id = 'mobile-canvas';
  mobileCanvas.style.cssText = `
    display: block;
    border-radius: 6px;
    max-width: 100%;
    max-height: 100%;
    width: 100%;
    height: 100%;
    object-fit: contain;
  `;
  
  mobileCanvasContainer.appendChild(mobileCanvas);
  canvasArea.appendChild(mobileCanvasContainer);
  
  // Initialize the mobile canvas with Fabric.js after a delay
  setTimeout(() => {
    initializeMobileFabricCanvas();
    // Update theme after canvas initialization
    setTimeout(() => {
      updateMobileInterfaceTheme();
    }, 200);
  }, 100);
  
  return canvasArea;
}

function initializeMobileFabricCanvas() {
  if (window.fabric) {
    try {
      
      
      // Calculate constrained canvas size based on pad size
      const canvasSize = calculateMobileCanvasSize();
      
      const colors = getMobileThemeColors();
      
      const mobileFabricCanvas = new fabric.Canvas('mobile-canvas', {
        width: canvasSize.width,
        height: canvasSize.height,
        backgroundColor: 'transparent', // Transparent so CSS pattern shows through
        selection: true,
        // Mobile-optimized snapping settings
        snapAngle: mobileSnapAngle,
        snapThreshold: mobileSnapThreshold,
        snapAngleThreshold: mobileSnapAngle,
        // Performance optimizations for mobile
        enableRetinaScaling: false,
        renderOnAddRemove: false,
        skipTargetFind: false,
        preserveObjectStacking: true,
        skipOffscreen: true,
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high',
        textEditing: true
      });
      
      // Store reference to mobile canvas
      window.mobileCanvas = mobileFabricCanvas;
  // Ensure long-press hooks are installed after canvas is ready
  try { ensureBottomTransformLongPressHooks(); } catch(_) {}
      
      // Update container size to match canvas exactly
      const mobileCanvasContainer = document.getElementById('mobile-canvas-container');
      if (mobileCanvasContainer) {
        // Set exact dimensions to match canvas
        mobileCanvasContainer.style.width = canvasSize.width + 'px';
        mobileCanvasContainer.style.height = canvasSize.height + 'px';
        mobileCanvasContainer.style.minWidth = canvasSize.width + 'px';
        mobileCanvasContainer.style.minHeight = canvasSize.height + 'px';
        mobileCanvasContainer.style.maxWidth = canvasSize.width + 'px';
        mobileCanvasContainer.style.maxHeight = canvasSize.height + 'px';
        
        // Add smooth transition for rotation changes
        mobileCanvasContainer.style.transition = 'all 0.3s ease';
        
        
        
        // Force a reflow to ensure dimensions are applied
        mobileCanvasContainer.offsetHeight;
      }
      
      // Initialize mobile canvas event handlers
      initializeMobileCanvas();
      
      // Setup mobile canvas snapping
      setupMobileCanvasSnapping(mobileFabricCanvas);
      
      // Create visual snap guides
      createMobileSnapGuides(mobileFabricCanvas);
      
      
      
      // Initialize zoom system (debounced to avoid double fit with initial layout)
      requestDebouncedFit(0, false);
      
      // Canvas initialization complete
  // Install zoom overlay for mobile (disabled; using + menu)
  // installMobileZoomOverlay();
  // Install background overlay for mobile (disabled; using + menu)
  // installMobileBackgroundOverlay();
  // Touch pan & pinch
  installMobilePanAndPinch();
      
     
      
      // Debug canvas positioning and visibility
      const canvasElement = document.getElementById('mobile-canvas');
      if (canvasElement) {
        const rect = canvasElement.getBoundingClientRect();
       
      }
      
      // Initialize mobile background layer to match desktop model if present
      try { if (typeof setupMobileBackgroundLayer === 'function') setupMobileBackgroundLayer(); } catch(_) {}
      
     
      
      // Update theme after canvas is fully initialized
      updateMobileInterfaceTheme();
      
    } catch (error) {
      console.error('Error initializing mobile canvas:', error);
    }
  } else {

    // Retry after a short delay
    setTimeout(initializeMobileFabricCanvas, 200);
  }
}
// Zoom Overlay (mobile): bottom-right magnifier toggle → vertical slider and Fit button
function installMobileZoomOverlay() {
  try {
    const root = document.getElementById('mobile-layout') || document.body;
    if (!root || document.getElementById('mobile-zoom-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'mobile-zoom-overlay';
    overlay.style.cssText = `
      position: fixed; left: 14px; top: 14px; z-index: 15004; pointer-events: none;`;

    const toggle = document.createElement('button');
    toggle.setAttribute('aria-label', 'Zoom');
    toggle.style.cssText = `
      pointer-events: auto; width: 48px; height: 48px; border-radius: 24px; border: 2px solid var(--accent-color);
      background: var(--bg-primary); color: var(--accent-color); display:flex; align-items:center; justify-content:center;
      box-shadow: 0 2px 10px rgba(0,0,0,0.25);`;
    toggle.textContent = '🔍';
    // Offset toggle down to clear top overlay row
    toggle.style.marginTop = '56px';

    const panel = document.createElement('div');
    panel.style.cssText = `
      position: absolute; right: 0; bottom: 56px; width: auto; padding: 4px; border-radius: 12px;
      border: none; background: transparent; box-shadow: none; display:none; gap:6px; align-items:center; flex-direction:column; pointer-events:none;`;

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '20';
    slider.max = '120';
    slider.value = String(Math.round((mobileCurrentScale || 1) * 100));
    slider.style.cssText = `writing-mode: bt-lr; -webkit-appearance: slider-vertical; appearance: slider-vertical; width: 36px; height: 180px; pointer-events: auto; touch-action: none; background: transparent;`;
    slider.setAttribute('orient', 'vertical');

    const fitBtn = document.createElement('button');
    fitBtn.textContent = 'Fit';
    fitBtn.style.cssText = `pointer-events:auto; border:1px solid var(--accent-color); color: var(--accent-color); background: transparent; border-radius:8px; padding:2px 6px; font-size: 12px;`;

    // Snap strength row (horizontal)
    const snapRow = document.createElement('div');
    snapRow.style.cssText = 'pointer-events:auto; display:flex; gap:6px; align-items:center; background: rgba(0,0,0,0.2); padding:4px 6px; border-radius:8px;';
    const snapLabel = document.createElement('span');
    snapLabel.textContent = 'Snap';
    snapLabel.style.cssText = 'font-size:11px; color: var(--accent-color);';
    const snapInput = document.createElement('input');
    snapInput.type = 'range';
    snapInput.min = '0';
    snapInput.max = '30';
    snapInput.value = String(mobileSnapThreshold);
    snapInput.style.cssText = 'width:120px;';
    const snapVal = document.createElement('span');
    snapVal.textContent = String(mobileSnapThreshold);
    snapVal.style.cssText = 'font-size:11px; color: var(--accent-color); width: 24px; text-align: right;';
    snapRow.appendChild(snapLabel);
    snapRow.appendChild(snapInput);
    snapRow.appendChild(snapVal);

    // Angle snap row
    const angleRow = document.createElement('div');
    angleRow.style.cssText = 'pointer-events:auto; display:flex; gap:6px; align-items:center; background: rgba(0,0,0,0.2); padding:4px 6px; border-radius:8px;';
    const angleLabel = document.createElement('span');
    angleLabel.textContent = 'Angle';
    angleLabel.style.cssText = 'font-size:11px; color: var(--accent-color);';
    const angleInput = document.createElement('input');
    angleInput.type = 'range';
    angleInput.min = '0';
    angleInput.max = '30';
    angleInput.value = String(mobileSnapAngle);
    angleInput.style.cssText = 'width:120px;';
    const angleVal = document.createElement('span');
    angleVal.textContent = String(mobileSnapAngle);
    angleVal.style.cssText = 'font-size:11px; color: var(--accent-color); width: 24px; text-align: right;';
    angleRow.appendChild(angleLabel);
    angleRow.appendChild(angleInput);
    angleRow.appendChild(angleVal);

    // Unsnap row (extra movement to escape an engaged snap)
    const unsnapRow = document.createElement('div');
    unsnapRow.style.cssText = 'pointer-events:auto; display:flex; gap:6px; align-items:center; background: rgba(0,0,0,0.2); padding:4px 6px; border-radius:8px;';
    const unsnapLabel = document.createElement('span');
    unsnapLabel.textContent = 'Unsnap';
    unsnapLabel.style.cssText = 'font-size:11px; color: var(--accent-color);';
    const unsnapInput = document.createElement('input');
    unsnapInput.type = 'range';
    unsnapInput.min = '0';
    unsnapInput.max = '30';
    unsnapInput.value = String(mobileUnsnapDistance);
    unsnapInput.style.cssText = 'width:120px;';
    const unsnapVal = document.createElement('span');
    unsnapVal.textContent = String(mobileUnsnapDistance);
    unsnapVal.style.cssText = 'font-size:11px; color: var(--accent-color); width: 24px; text-align: right;';
    unsnapRow.appendChild(unsnapLabel);
    unsnapRow.appendChild(unsnapInput);
    unsnapRow.appendChild(unsnapVal);

    panel.appendChild(slider);
    panel.appendChild(fitBtn);
    panel.appendChild(snapRow);
    panel.appendChild(angleRow);
    panel.appendChild(unsnapRow);
    overlay.appendChild(toggle);
    overlay.appendChild(panel);
    root.appendChild(overlay);

    const positionPanel = () => {
      const isLandscape = window.innerWidth > window.innerHeight;
      const btn = 48, gap = 8;
      if (isLandscape) {
        // Top-left: open to the right of the button
        panel.style.left = (btn + gap) + 'px';
        // Offset below top overlay row (approx 56px row + 8px gap)
        panel.style.top = '64px';
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
      } else {
        // Top-left in portrait: open below the button
        panel.style.left = '0px';
        // Offset below top overlay row as well
        panel.style.top = (btn + gap + 56) + 'px';
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
      }
    };
    const showPanel = () => { panel.style.display = 'flex'; positionPanel(); slider.value = String(Math.round((mobileCurrentScale || 1) * 100)); };
    const hidePanel = () => { panel.style.display = 'none'; };
    let open = false;
    toggle.addEventListener('click', () => { open = !open; open ? showPanel() : hidePanel(); });

    const stop = (e) => { e.stopPropagation(); };
    slider.addEventListener('mousedown', stop);
    slider.addEventListener('touchstart', stop, { passive: true });
    slider.addEventListener('input', () => {
      const val = Math.max(20, Math.min(120, parseInt(slider.value || '100', 10)));
      const scale = val / 100;
      mobileCurrentScale = scale;
      resizeMobileCanvasDom(scale);
    });
    slider.addEventListener('change', () => {
      // allow a brief window where automatic fits are suppressed so the slider's
      // final value is not immediately overridden
      if (typeof performance !== 'undefined') suppressFitUntilTs = performance.now() + 200;
      requestDebouncedFit(0, false);
    });
    const applySnap = (val) => {
      mobileSnapThreshold = val;
      if (window.mobileCanvas) {
        window.mobileCanvas.set({ snapThreshold: mobileSnapThreshold });
        // also soften angle snap proportionally (optional): map 0..30 -> 0..15
        const angle = Math.round(Math.max(0, Math.min(15, Math.floor(mobileSnapThreshold * 0.5))));
        mobileSnapAngle = angle;
        window.mobileCanvas.set({ snapAngle: mobileSnapAngle, snapAngleThreshold: mobileSnapAngle });
        window.mobileCanvas.requestRenderAll();
      }
      snapVal.textContent = String(mobileSnapThreshold);
    };
    snapInput.addEventListener('input', () => applySnap(parseInt(snapInput.value || '0', 10)));
    // Initialize label once
    setTimeout(() => applySnap(mobileSnapThreshold), 0);

    const applyAngle = (val) => {
      mobileSnapAngle = val;
      if (window.mobileCanvas) {
        window.mobileCanvas.set({ snapAngle: mobileSnapAngle, snapAngleThreshold: mobileSnapAngle });
        window.mobileCanvas.requestRenderAll();
      }
      angleVal.textContent = String(mobileSnapAngle);
    };
    angleInput.addEventListener('input', () => applyAngle(parseInt(angleInput.value || '0', 10)));
    setTimeout(() => applyAngle(mobileSnapAngle), 0);

    const applyUnsnap = (val) => {
      mobileUnsnapDistance = val;
      unsnapVal.textContent = String(mobileUnsnapDistance);
    };
    unsnapInput.addEventListener('input', () => applyUnsnap(parseInt(unsnapInput.value || '0', 10)));
    setTimeout(() => applyUnsnap(mobileUnsnapDistance), 0);
    fitBtn.addEventListener('click', () => requestDebouncedFit(0, false));

    // Keep slider in sync if external fits occur
    const sync = () => { slider.value = String(Math.round((mobileCurrentScale || 1) * 100)); positionPanel(); };
    window.addEventListener('resize', sync, { passive: true });
    document.addEventListener('mobileZoomUpdated', sync, { passive: true });

    // Close overlay when tapping outside
    const closeIfOutside = (e) => {
      const t = e.target;
      if (t === toggle || panel.contains(t)) return;
      // Close for clicks anywhere else, including the canvas layers
      panel.style.display = 'none';
      open = false;
    };
    document.addEventListener('pointerdown', closeIfOutside, true);
    document.addEventListener('click', closeIfOutside, true);

    // Add slider thumb/track styling (larger thumb)
    const style = document.createElement('style');
    style.id = 'mobile-zoom-overlay-style';
    style.textContent = `
      #mobile-zoom-overlay input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 24px; height: 24px; border-radius: 50%; background: var(--accent-color); border: 2px solid var(--bg-primary); }
      #mobile-zoom-overlay input[type="range"]::-moz-range-thumb { width: 24px; height: 24px; border-radius: 50%; background: var(--accent-color); border: 2px solid var(--bg-primary); }
      #mobile-zoom-overlay input[type="range"] { outline: none; }
    `;
    document.head.appendChild(style);
  } catch (_) { /* no-op */ }
}

// Recenter overlay: appears when user pans/zooms away; one-tap to refit
function installMobileRecenterOverlay() {
  const root = document.getElementById('mobile-layout') || document.body;
  if (!root || document.getElementById('mobile-recenter-btn')) return;

  const btn = document.createElement('button');
  btn.id = 'mobile-recenter-btn';
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Recenter canvas');
  btn.style.cssText = [
    'position:fixed',
    'left:12px',
    'bottom:96px',
    'z-index:15010',
    'width:44px',
    'height:44px',
    'border-radius:22px',
    'border:none',
    'background:rgba(0,0,0,0.55)',
    'color:#fff',
    'font-size:20px',
    'display:none',
    'align-items:center',
    'justify-content:center',
    'box-shadow:0 2px 8px rgba(0,0,0,0.35)',
    'backdrop-filter:saturate(120%) blur(6px)',
    'touch-action:manipulation',
    'user-select:none',
    'pointer-events:auto'
  ].join(';');
  btn.textContent = '⤾';
  root.appendChild(btn);

  const show = ()=> { btn.style.display = 'flex'; };
  const hide = ()=> { btn.style.display = 'none'; };

  function updateRecenterVisibility() {
    const scaleDev = Math.abs((mobileCurrentScale || 1) - (mobileFitToScreenScale || 1));
    const panDev = Math.hypot(mobilePanX, mobilePanY);
    const shouldShow = scaleDev > 0.04 || panDev > 12; // thresholds
    if (shouldShow) show(); else hide();
  }

  btn.addEventListener('click', ()=>{
    mobilePanX = 0; mobilePanY = 0;
    mobileCanvasZoomFit(true);
    setTimeout(hide, 260);
  }, { passive: true });

  // Hook into existing updates
  const originalResize = resizeMobileCanvasDom;
  window.resizeMobileCanvasDom = function patchedResize(f) {
    originalResize(f);
    updateRecenterVisibility();
    document.dispatchEvent(new Event('mobileZoomUpdated'));
  };
  window.addEventListener('resize', updateRecenterVisibility, { passive: true });
  document.addEventListener('mobileZoomUpdated', updateRecenterVisibility, { passive: true });
  setTimeout(updateRecenterVisibility, 0);
}

// Add (+) overlay: bottom-right; opens thin vertical menu with Upload, Background, Text
function installMobileAddOverlay() {
  try {
    const root = document.getElementById('mobile-layout') || document.body;
    if (!root || document.getElementById('mobile-add-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'mobile-add-overlay';
    overlay.style.cssText = 'position:fixed; right:24px; bottom:86px; z-index:15012; pointer-events:none;';

    const btn = document.createElement('button');
    btn.setAttribute('aria-label', 'Add');
    btn.style.cssText = 'pointer-events:auto; width:48px; height:48px; border-radius:24px; border:2px solid var(--accent-color); background:var(--bg-primary); color:var(--accent-color); display:flex; align-items:center; justify-content:center; box-shadow:0 2px 10px rgba(0,0,0,0.25); font-size:28px; line-height:1;';
    btn.textContent = '+';

    const rail = document.createElement('div');
    rail.id = 'mobile-add-rail';
    const sheetDuration = motionMs(260);
    rail.style.cssText = `
      position: fixed;
      left: 0; right: 0; bottom: 0;
      display: flex; flex-direction: column; gap: 10px;
      pointer-events: none; z-index: 15013;
      background: var(--bg-primary);
      border-top: 2px solid var(--accent-color);
      border-top-left-radius: 14px; border-top-right-radius: 14px;
      padding: 10px 16px 18px;
      width: 100%; max-width: 100vw; box-sizing: border-box; margin: 0;
      box-shadow: 0 -12px 24px rgba(0,0,0,0.35);
      transform: translateY(100%);
      will-change: transform;
      contain: layout paint;
      transition: transform ${sheetDuration}ms ease;
    `;
    try { rail.style.touchAction = 'none'; } catch(_) {}

    // Dull handle line at the top for slide-to-close
    const handle = document.createElement('div');
    handle.style.cssText = 'width: 64px; height: 5px; border-radius: 3px; background: var(--accent-color); opacity: 0.75; align-self:center; margin: 6px auto 6px auto; touch-action: none;';
    const title = document.createElement('div');
    title.textContent = 'Add Image or Text';
    title.style.cssText = 'align-self:flex-start; margin: 0 0 8px 2px; font-size: 16px; font-weight: 800; color: var(--accent-color); letter-spacing: 0.2px;';

    const mkRowItem = (glyph, title, desc, onClick) => {
      const row = document.createElement('button');
      row.type = 'button';
      row.style.cssText = [
        'display:flex','align-items:flex-start','gap:10px','width:100%',
        'background: rgba(255,255,255,0.06)','border:1px solid var(--accent-color)','border-radius:10px',
        'padding:8px','color:var(--accent-color)','text-align:left','cursor:pointer'
      ].join(';');
      const icon = document.createElement('div');
      icon.textContent = glyph; icon.style.cssText = 'font-size:22px; line-height:1; width:24px;';
      const texts = document.createElement('div');
      const t = document.createElement('div'); t.textContent = title; t.style.cssText = 'font-size:13px; font-weight:700;';
      const d = document.createElement('div'); d.textContent = desc; d.style.cssText = 'font-size:11px; opacity:0.9;';
      texts.appendChild(t); texts.appendChild(d);
      row.appendChild(icon); row.appendChild(texts);
      row.addEventListener('click',(e)=>{ e.stopPropagation(); onClick && onClick(); hide(); open = false; });
      return row;
    };

    const uploadItem = mkRowItem('⬆', 'Upload', 'Add image from your device', ()=> {
      // Use the same flow as the bottom toolbar Upload button
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.multiple = true;
      fileInput.onchange = (e) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        const file = files[0];
        const reader = new FileReader();
        reader.onload = (ev) => { try { addImageToMobileCanvas(ev.target.result, file.name); } catch(_) {} };
        reader.readAsDataURL(file);
      };
      fileInput.click();
    });

    const bgItem = mkRowItem('🎨', 'Background', 'Set canvas background color', ()=> {
      openMobileBackgroundPanel();
    });

    const textItem = mkRowItem('T', 'Text', 'Add a text layer', ()=> {
      if (typeof addTextToMobileCanvas === 'function') addTextToMobileCanvas();
      else if (window.addTextToCanvas) window.addTextToCanvas();
    });

    rail.appendChild(handle);
    rail.appendChild(title);
    rail.appendChild(uploadItem);
    rail.appendChild(bgItem);
    rail.appendChild(textItem);

    overlay.appendChild(btn);
    overlay.appendChild(rail);
    root.appendChild(overlay);

    const positionSheet = () => {
      const isLandscape = window.innerWidth > window.innerHeight;
      if (isLandscape) {
        rail.style.width = '50vw';
        rail.style.maxWidth = '50vw';
        rail.style.left = '';
        rail.style.right = '0';
        rail.style.margin = '0 0 0 auto';
      } else {
        rail.style.width = '100%';
        rail.style.maxWidth = '100vw';
        rail.style.left = '0';
        rail.style.right = '0';
        rail.style.margin = '0';
      }
    };
    const show = ()=>{ positionSheet(); rail.style.pointerEvents='auto'; rail.style.transform='translateY(0)'; btn.disabled = true; btn.style.opacity = '1'; };
    const hide = ()=>{ rail.style.transform='translateY(100%)'; setTimeout(()=>{ rail.style.pointerEvents='none'; }, sheetDuration); btn.disabled = false; btn.style.opacity = ''; };
    let open = false;
    btn.addEventListener('click', (e)=>{ e.stopPropagation(); if (btn.disabled) return; open = !open; open ? show() : hide(); });
    document.addEventListener('pointerdown', (e)=>{ const t=e.target; if (t===btn || rail.contains(t)) return; hide(); open=false; }, true);
    window.addEventListener('resize', ()=>{ if (open) positionSheet(); }, { passive: true });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', ()=>{ if (open) positionSheet(); });
      window.visualViewport.addEventListener('scroll', ()=>{ if (open) positionSheet(); });
    }

    // Slide down to close via drag on the whole sheet (with velocity support)
    let dragStartY = null, dragActive = false, prevTransition = '', recentMoves = [];
    const nowTs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const startDrag = (clientY) => {
      dragStartY = clientY; dragActive = true; recentMoves = [{ y: clientY, t: nowTs() }];
      // Disable transition during drag for responsiveness
      prevTransition = rail.style.transition;
      rail.style.transition = 'none';
    };
    const moveDrag = (clientY) => {
      if (!dragActive || dragStartY == null) return;
      const dy = Math.max(0, clientY - dragStartY);
      rail.style.transform = `translateY(${dy}px)`;
      const t = nowTs();
      recentMoves.push({ y: clientY, t });
      // Keep only last ~120ms of movement for velocity calc
      const cutoff = t - 120;
      while (recentMoves.length > 1 && recentMoves[0].t < cutoff) recentMoves.shift();
    };
    const endDrag = (clientY) => {
      if (!dragActive || dragStartY == null) { dragActive = false; dragStartY = null; recentMoves = []; return; }
      // Restore transition
      rail.style.transition = prevTransition;
      const dy = Math.max(0, clientY - dragStartY);
      const sheetH = Math.max(1, rail.getBoundingClientRect().height || 1);
      const distanceThreshold = Math.max(40, Math.min(120, sheetH * 0.20));
      // Velocity in px/ms using last samples
      const tNow = nowTs();
      const valid = recentMoves.filter(m => tNow - m.t <= 150);
      let velocity = 0;
      if (valid.length >= 2) {
        const first = valid[0];
        const last = valid[valid.length - 1];
        const dt = Math.max(1, last.t - first.t);
        velocity = (last.y - first.y) / dt; // px/ms; positive is downward
      }
      const velocityThreshold = 1.0; // ~1000 px/s
      if (dy > distanceThreshold || velocity > velocityThreshold) {
        hide(); open = false;
      } else {
        rail.style.transform = 'translateY(0)';
      }
      dragActive = false; dragStartY = null; recentMoves = [];
    };
    // Attach to handle explicitly (for visual affordance)
    handle.addEventListener('pointerdown', (e)=>{ e.preventDefault(); startDrag(e.clientY); handle.setPointerCapture?.(e.pointerId); });
    handle.addEventListener('pointermove', (e)=>{ e.preventDefault(); moveDrag(e.clientY); });
    handle.addEventListener('pointerup', (e)=>{ e.preventDefault(); endDrag(e.clientY); });
    handle.addEventListener('pointercancel', ()=>{ dragActive=false; dragStartY=null; });
    // And allow dragging from anywhere on the sheet
    rail.addEventListener('pointerdown', (e)=>{ startDrag(e.clientY); rail.setPointerCapture?.(e.pointerId); });
    rail.addEventListener('pointermove', (e)=>{ moveDrag(e.clientY); });
    rail.addEventListener('pointerup', (e)=>{ endDrag(e.clientY); });
    rail.addEventListener('pointercancel', ()=>{ dragActive=false; dragStartY=null; });
  } catch(_) {}
}
// Background Overlay (mobile): button near zoom toggle → panel with recent/common swatches (right)
// and a full color picker (left). Applies solid background color.
function installMobileBackgroundOverlay() {
  try {
    const root = document.getElementById('mobile-layout') || document.body;
    if (!root || document.getElementById('mobile-bg-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'mobile-bg-overlay';
    overlay.style.cssText = `position: fixed; z-index: 15020; pointer-events: none;`;

    const toggle = document.createElement('button');
    toggle.setAttribute('aria-label', 'Background');
    toggle.style.cssText = `
      pointer-events: auto; width: 48px; height: 48px; border-radius: 24px; border: 2px solid var(--accent-color);
      background: var(--bg-primary); color: var(--accent-color); display:flex; align-items:center; justify-content:center;
      box-shadow: 0 2px 10px rgba(0,0,0,0.25);`;
    toggle.textContent = '🖌️';

    const panel = document.createElement('div');
    const sheetDuration = motionMs(260);
      panel.style.cssText = `
      position: fixed; left: 0; right: 0; bottom: 0; z-index: 15021;
      display: none; pointer-events: none; gap: 12px; align-items: stretch;
        padding: 12px 16px 14px; background: var(--bg-primary);
      border-top: 2px solid var(--accent-color);
      border-top-left-radius: 14px; border-top-right-radius: 14px;
        min-height: 18vh;
      transform: translateY(100%);
      transition: transform ${sheetDuration}ms ease;`;
    try { panel.style.touchAction = 'none'; } catch(_) {}

    const left = document.createElement('div');
    left.style.cssText = `pointer-events: auto; display:flex; align-items:center; justify-content:center; gap:8px;`;
    // Responsive square size based on viewport
    const pickSize = () => {
      const vw = Math.round(window.visualViewport ? window.visualViewport.width : window.innerWidth);
      const vh = Math.round(window.visualViewport ? window.visualViewport.height : window.innerHeight);
      return Math.max(120, Math.min(180, Math.floor(Math.min(vw, vh) * 0.28)));
    };
    let svSize = pickSize();
    const svWrap = document.createElement('div');
    svWrap.style.cssText = `position: relative; width: ${svSize}px; height: ${svSize}px; border-radius: 8px; overflow: hidden; border: 2px solid var(--accent-color);`;
    const svCanvas = document.createElement('canvas');
    svCanvas.width = svSize; svCanvas.height = svSize;
    svCanvas.style.cssText = `display:block; width: ${svSize}px; height: ${svSize}px; touch-action: none;`;
    const svThumb = document.createElement('div');
    svThumb.style.cssText = 'position:absolute; width:14px; height:14px; border:2px solid #fff; border-radius:50%; box-shadow:0 0 0 1px rgba(0,0,0,0.6); pointer-events:none; transform: translate(-7px, -7px);';
    svWrap.appendChild(svCanvas); svWrap.appendChild(svThumb);
    left.appendChild(svWrap);

    const right = document.createElement('div');
    right.style.cssText = `pointer-events: auto; display:flex; flex-direction: column; align-items:center; gap: 6px;`;

    // Header: grabber + title
    const headerWrap = document.createElement('div');
    headerWrap.style.cssText = 'display:flex; flex-direction:column; width:100%; align-items:center;';
    const grabber = document.createElement('div');
    grabber.style.cssText = 'width:64px; height:5px; border-radius:3px; background: var(--accent-color); opacity:0.75; margin: 4px auto 8px auto; touch-action: none;';
    const titleEl = document.createElement('div');
    titleEl.textContent = 'Background Color';
    titleEl.style.cssText = 'font-size:16px; font-weight:800; color: var(--accent-color); letter-spacing:0.2px; margin: 0 0 2px 0;';
    headerWrap.appendChild(grabber);
    headerWrap.appendChild(titleEl);

    panel.appendChild(headerWrap);
    panel.appendChild(left);
    overlay.appendChild(toggle);
    overlay.appendChild(panel);
    root.appendChild(overlay);

    // Defaults for the two recent slots when no history exists
    const defaultColors = ['#ff0000','#000000'];
    const recentsKey = 'mobileBgRecents';
    const readRecents = () => {
      try { return JSON.parse(localStorage.getItem(recentsKey) || '[]'); } catch { return []; }
    };
    const writeRecents = (arr) => { try { localStorage.setItem(recentsKey, JSON.stringify(arr)); } catch {} };

    function hsvToHex(hh, ss, vv){
      const c = vv * ss;
      const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
      const m = vv - c;
      let r=0,g=0,b=0;
      if (hh < 60) { r=c; g=x; b=0; }
      else if (hh < 120) { r=x; g=c; b=0; }
      else if (hh < 180) { r=0; g=c; b=x; }
      else if (hh < 240) { r=0; g=x; b=c; }
      else if (hh < 300) { r=x; g=0; b=c; }
      else { r=c; g=0; b=x; }
      const toHex=v=>('0'+Math.round((v+m)*255).toString(16)).slice(-2);
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }
    function rgbStrToHex(str){
      const m=str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i); if(!m) return '#ffffff';
      const r=Number(m[1]),g=Number(m[2]),b=Number(m[3]);
      const toHex=v=>('0'+v.toString(16)).slice(-2); return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }
    function hexToHsv(hex){
      const hx=hex.replace('#','');
      const r=parseInt(hx.substring(0,2),16)/255, g=parseInt(hx.substring(2,4),16)/255, b=parseInt(hx.substring(4,6),16)/255;
      const max=Math.max(r,g,b), min=Math.min(r,g,b); const d = max-min; let h=0;
      const v=max; const s = max===0?0:d/max;
      if(d!==0){ switch(max){case r: h=((g-b)/d)%6; break; case g: h=(b-r)/d+2; break; default: h=(r-g)/d+4;} h=h*60; if(h<0) h+=360; }
      return {h, s, v};
    }
    let colorPreview = null; // set to liveSwatch after it's created
    const applyColor = (hex, record=true) => {
      if (!hex) return;
      // Match desktop: set currentBackground model if present and update via background rect
      try {
        if (typeof currentBackground === 'object') {
          currentBackground.type = 'solid';
          currentBackground.color = hex;
        }
      } catch(_) {}
      try { if (typeof updateMobileCanvasBackground === 'function') updateMobileCanvasBackground(); } catch(_) {}
      // reflect in live swatch
      liveSwatch.style.background = hex;
      // recents UI removed; no-op for history updates
      try { if (colorPreview) colorPreview.style.background = hex; } catch(_) {}
    };

    // live swatch shows current selection while dragging (not persisted yet)
    const liveSwatch = document.createElement('div');
    liveSwatch.style.cssText = `width: 36px; height: 36px; border-radius: 8px; border:2px solid var(--accent-color); background:#ffffff;`;
    colorPreview = liveSwatch;
    left.appendChild(liveSwatch);

    const position = () => {
      const isLandscape = window.innerWidth > window.innerHeight;
      const baseRight = 20; const baseBottom = 86; const btn = 48; const gap = 8;
      // Position only the button; the panel is a bottom sheet centered by default
      if (isLandscape) {
        overlay.style.right = baseRight + 'px';
        overlay.style.bottom = (baseBottom + btn + gap) + 'px';
      } else {
        overlay.style.right = (baseRight + btn + gap) + 'px';
        overlay.style.bottom = baseBottom + 'px';
      }
    };
    position();
    window.addEventListener('resize', position, { passive: true });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', position);
      window.visualViewport.addEventListener('scroll', position);
    }
    // Reposition when the layers panel resizes
    try {
      const lp = document.getElementById('mobile-layers-panel');
      if (lp && 'ResizeObserver' in window) {
        const ro = new ResizeObserver(() => position());
        ro.observe(lp);
      }
    } catch(_) {}

    // Local state to avoid immediate outside-close right after opening
    const sheetState = { open: false, suppressUntil: 0 };
    overlay._bgSheetState = sheetState;

    const showPanel = () => {
      panel.style.display = 'flex'; panel.style.pointerEvents = 'auto';
      const cont = document.getElementById('mobile-canvas-container');
      // Prefer the Fabric canvas background if available; fallback to container style; default to white
      // reuse hex from above block
      let hex = '#ffffff';
      try {
        if (window.mobileCanvas && window.mobileCanvas.backgroundColor) {
          hex = window.mobileCanvas.backgroundColor;
        } else if (cont) {
          const bg = getComputedStyle(cont).backgroundColor || '#ffffff';
          hex = bg.startsWith('#') ? bg : rgbStrToHex(bg);
        }
      } catch(_) {}
      liveSwatch.style.background = hex;
      // Initialize HSV and render immediately
      setFromHex(hex);
      drawSV();
      placeSVThumb();
      requestAnimationFrame(() => { panel.style.transform = 'translateY(0)'; });
      sheetState.open = true;
      try { sheetState.suppressUntil = (typeof performance !== 'undefined' ? performance.now() : Date.now()) + 220; } catch(_) {}
      // Dim/disable the + menu button while sheet is open
      try {
        const addBtn = document.querySelector('#mobile-add-overlay > button');
        if (addBtn) { addBtn.style.opacity = '0.25'; addBtn.style.pointerEvents = 'none'; addBtn.disabled = true; }
      } catch(_) {}
    };
    const hidePanel = () => {
      panel.style.transform = 'translateY(100%)';
      setTimeout(()=>{
        panel.style.display = 'none'; panel.style.pointerEvents = 'none';
        sheetState.open = false;
        // Restore + menu button
        try {
          const addBtn = document.querySelector('#mobile-add-overlay > button');
          if (addBtn) { addBtn.style.opacity = ''; addBtn.style.pointerEvents = 'auto'; addBtn.disabled = false; }
        } catch(_) {}
      }, sheetDuration);
    };
    let open = false;
    toggle.addEventListener('click', () => { open = !open; open ? showPanel() : hidePanel(); });

    // Right side: hue slider (vertical) above swatches, with a custom gradient track behind for consistent rendering
    const hueWrap = document.createElement('div');
    hueWrap.style.cssText = `position: relative; width: 18px; height: ${svSize}px; border-radius: 8px;`;
    const hueBg = document.createElement('div');
    hueBg.style.cssText = `position:absolute; inset:0; background: linear-gradient(to top, red, yellow, lime, cyan, blue, magenta, red); border-radius: 8px; border: 1px solid var(--accent-color);`;
    const hSlider = document.createElement('input');
    hSlider.type = 'range'; hSlider.min = '0'; hSlider.max = '360'; hSlider.value = '0';
    hSlider.style.cssText = `position:relative; writing-mode: vertical-lr; direction: rtl; -webkit-appearance: none; appearance: none; width: 18px; height: ${svSize}px; background: transparent; border-radius: 8px; border: none;`;
    hueWrap.appendChild(hueBg);
    hueWrap.appendChild(hSlider);
    // Arrange: SV square | Hue slider | Live preview
    const leftRow = document.createElement('div');
    leftRow.style.cssText = 'display:flex; align-items:center; gap:10px;';
    const svGroup = document.createElement('div');
    svGroup.style.cssText = 'display:flex; align-items:center; gap:10px;';
    svGroup.appendChild(svWrap);
    svGroup.appendChild(hueWrap);
    leftRow.appendChild(svGroup);
    left.appendChild(leftRow);

    // HSV state
    let currentH = 0, currentS = 1, currentV = 1;
    const ctx = svCanvas.getContext('2d');
    function drawSV(){
      // base: horizontal saturation gradient from white to hue at v=1
      const hexHue = hsvToHex(currentH, 1, 1);
      const grd1 = ctx.createLinearGradient(0,0, svCanvas.width,0);
      grd1.addColorStop(0, '#ffffff'); grd1.addColorStop(1, hexHue);
      ctx.fillStyle = grd1; ctx.fillRect(0,0, svCanvas.width, svCanvas.height);
      // overlay: vertical black gradient for value
      const grd2 = ctx.createLinearGradient(0,0,0, svCanvas.height);
      grd2.addColorStop(0,'rgba(0,0,0,0)'); grd2.addColorStop(1,'rgba(0,0,0,1)');
      ctx.fillStyle = grd2; ctx.fillRect(0,0, svCanvas.width, svCanvas.height);
      // preview
      const hex = hsvToHex(currentH, currentS, currentV);
      try { if (colorPreview) colorPreview.style.background = hex; } catch(_) {}
    }
    function placeSVThumb(){
      const x = Math.max(0, Math.min(svCanvas.width, currentS * svCanvas.width));
      const y = Math.max(0, Math.min(svCanvas.height, (1 - currentV) * svCanvas.height));
      svThumb.style.left = x + 'px';
      svThumb.style.top = y + 'px';
    }
    function applyFromHSV(record=false){
      const hex = hsvToHex(currentH, currentS, currentV);
      liveSwatch.style.background = hex;
      applyColor(hex, record);
    }
    function setFromHex(hex){
      const hsv = hexToHsv(hex);
      currentH = hsv.h; currentS = hsv.s; currentV = hsv.v;
      hSlider.value = String(Math.round(currentH));
      drawSV(); placeSVThumb();
    }
    // SV interactions
    let draggingSV = false;
    const svToHSV = (clientX, clientY) => {
      const r = svCanvas.getBoundingClientRect();
      const x = Math.max(0, Math.min(r.width, clientX - r.left));
      const y = Math.max(0, Math.min(r.height, clientY - r.top));
      currentS = x / r.width; currentV = 1 - y / r.height;
      placeSVThumb();
      applyFromHSV(false);
    };
    svCanvas.addEventListener('pointerdown', (e)=>{ draggingSV = true; svCanvas.setPointerCapture(e.pointerId); svToHSV(e.clientX, e.clientY); });
    svCanvas.addEventListener('pointermove', (e)=>{ if (!draggingSV) return; svToHSV(e.clientX, e.clientY); });
    svCanvas.addEventListener('pointerup', (e)=>{ if (!draggingSV) return; draggingSV=false; svCanvas.releasePointerCapture(e.pointerId); applyFromHSV(true); });
    svCanvas.addEventListener('pointercancel', ()=>{ draggingSV=false; });
    // Hue interactions
    hSlider.addEventListener('input', ()=>{ currentH = parseInt(hSlider.value||'0',10); drawSV(); applyFromHSV(false); });
    hSlider.addEventListener('change', ()=>{ applyFromHSV(true); });

    // Resize picker responsively on viewport changes
    const resizePicker = () => {
      const size = pickSize(); if (size === svSize) return; svSize = size;
      svCanvas.width = size; svCanvas.height = size;
      svCanvas.style.width = size + 'px'; svCanvas.style.height = size + 'px';
      svWrap.style.width = size + 'px'; svWrap.style.height = size + 'px';
      hueWrap.style.height = size + 'px';
      hueBg.style.height = size + 'px';
      hSlider.style.height = size + 'px';
      drawSV(); placeSVThumb();
      // Also resize background rect to current canvas size
      try { updateMobileCanvasBackground(); } catch(_) {}
    };
    window.addEventListener('resize', resizePicker, { passive: true });
    if (window.visualViewport) window.visualViewport.addEventListener('resize', resizePicker);
    // Refresh on orientation change to keep background color persistent
    window.addEventListener('orientationchange', () => {
      try {
        if (window.mobileCanvas && window.mobileCanvas.backgroundColor) {
          const hex = window.mobileCanvas.backgroundColor;
          liveSwatch.style.background = hex;
          setFromHex(hex);
          drawSV();
          placeSVThumb();
        }
      } catch(_) {}
    }, { passive: true });

    // Close when tapping outside the sheet (with short suppression after opening)
    const closeIfOutside = (e) => {
      const t = e.target;
      const st = overlay._bgSheetState;
      if (!st || !st.open) return;
      if (t === toggle || panel.contains(t)) return;
      const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      if (sheetState && now < (sheetState.suppressUntil || 0)) return;
      hidePanel();
      open = false;
    };
    document.addEventListener('pointerdown', closeIfOutside, true);
    // No click listener to avoid immediate auto-close after opening
    // Drag-to-close from top header/grabber region
    let dragStartY = null, dragging = false;
    const startDrag = (clientY) => { dragging = true; dragStartY = clientY; panel.style.transition = 'none'; };
    const moveDrag = (clientY) => { if (!dragging) return; const dy = Math.max(0, clientY - dragStartY); panel.style.transform = `translateY(${dy}px)`; };
    const endDrag = (clientY) => { if (!dragging) return; const dy = Math.max(0, clientY - dragStartY); dragging=false; panel.style.transition = `transform ${sheetDuration}ms ease`; if (dy > 80) { hidePanel(); open=false; } else { panel.style.transform = 'translateY(0)'; } };
    const headerStart = (e)=>{ e.preventDefault(); startDrag(e.clientY); };
    const headerMove = (e)=>{ e.preventDefault(); moveDrag(e.clientY); };
    const headerEnd = (e)=>{ e.preventDefault(); endDrag(e.clientY); };
    headerWrap.addEventListener('pointerdown', headerStart);
    headerWrap.addEventListener('pointermove', headerMove);
    headerWrap.addEventListener('pointerup', headerEnd);
    headerWrap.addEventListener('pointercancel', ()=>{ dragging=false; panel.style.transition = `transform ${sheetDuration}ms ease`; panel.style.transform = 'translateY(0)'; });

  } catch (_) { /* no-op */ }
}
// Programmatically open the background color panel without showing its floating button
function openMobileBackgroundPanel() {
  try {
    // Ensure overlay exists
    if (!document.getElementById('mobile-bg-overlay')) installMobileBackgroundOverlay();
    const overlay = document.getElementById('mobile-bg-overlay');
    if (!overlay) return;
    // First child is the toggle button, second is the panel container by construction
    const toggleBtn = overlay.querySelector('button');
    const panelEl = overlay.children[1];
  const state = overlay._bgSheetState || { open:false, suppressUntil:0 };
    if (toggleBtn) {
      toggleBtn.style.visibility = 'hidden';
      toggleBtn.style.pointerEvents = 'none';
    }
    if (panelEl) {
      panelEl.style.display = 'flex';
      panelEl.style.pointerEvents = 'auto';
      // Bottom sheet: slide up
      panelEl.style.left = '0';
      panelEl.style.right = '0';
      panelEl.style.bottom = '0';
      requestAnimationFrame(() => { panelEl.style.transform = 'translateY(0)'; });
    try { state.open = true; state.suppressUntil = (typeof performance !== 'undefined' ? performance.now() : Date.now()) + 220; } catch(_) {}
    }
  } catch(_) { /* no-op */ }
}

// Layers Overlay (mobile): button near zoom/background → tap toggles thin layers bar; long-press opens hold overlay
function installMobileLayersOverlay() {
  try {
    const root = document.getElementById('mobile-layout') || document.body;
    if (!root || document.getElementById('mobile-layers-overlay-btn')) return;

    const overlay = document.createElement('div');
    overlay.id = 'mobile-layers-overlay-btn';
    overlay.style.cssText = `position: fixed; z-index: 15006; pointer-events: none;`;

    const toggle = document.createElement('button');
    toggle.setAttribute('aria-label', 'Layers');
    // Make this look like an always-visible thumbnail instead of a "button"
    toggle.style.cssText = `
      pointer-events: auto; width: 56px; height: 56px; border-radius: 14px; border: 2px solid var(--accent-color);
      background: var(--bg-primary); color: var(--accent-color); display:flex; align-items:center; justify-content:center;
      position: relative; overflow: hidden; padding:0; box-shadow: 0 4px 14px rgba(0,0,0,0.3);`;
    // full-bleed preview image fills the button
    const thumb = document.createElement('img');
    thumb.id = 'mobile-layers-overlay-thumb';
    thumb.alt = 'Layer preview';
    thumb.style.cssText = 'position:absolute; inset:0; width:100%; height:100%; object-fit:cover; border-radius: 12px;';
    toggle.appendChild(thumb);

    overlay.appendChild(toggle);
    root.appendChild(overlay);

    // Collapsed indicators shown around the thumbnail (always visible)
    const collapsedInd = document.createElement('div');
    collapsedInd.id = 'mobile-layers-collapsed-ind';
    collapsedInd.style.cssText = 'position:fixed; z-index:15005; pointer-events:none; width:64px; height:180px;';
    root.appendChild(collapsedInd);

    function renderCollapsedIndicators() {
      if (!window.mobileCanvas) { collapsedInd.style.display = 'none'; return; }
      const objs = window.mobileCanvas.getObjects().filter(o => o.selectable !== false);
      if (!objs.length) { collapsedInd.style.display = 'none'; return; }
      // Position the indicator box centered on the thumbnail
      const r = toggle.getBoundingClientRect();
      const W = Math.max(56, Math.round(r.width + 8));
      const H = Math.max(120, Math.round(r.height * 3));
      collapsedInd.style.left = Math.round(r.left + r.width / 2 - W / 2) + 'px';
      collapsedInd.style.top = Math.round(r.top + r.height / 2 - H / 2) + 'px';
      collapsedInd.style.width = W + 'px';
      collapsedInd.style.height = H + 'px';
      // Build lines relative to this box
      const centerY = Math.floor(H / 2);
      const itemH = Math.max(44, Math.round(W)); // approximate row height; wide enough for scaling
      const selObj = window.mobileCanvas.getActiveObject();
      const items = objs.slice().reverse();
      let sel = 0; if (selObj) { const idx = items.indexOf(selObj); sel = Math.max(0, idx); }
      const aboveCount = sel;
      const belowCount = Math.max(0, items.length - 1 - sel);
      const maxW = itemH;
      const baseW = Math.round(maxW * 0.95);
      const scale = 0.82;
      const spacing = Math.max(6, Math.round(itemH * 0.22));
      const startGap = Math.max(8, Math.round(itemH * 0.25));
      const muted = getComputedStyle(document.documentElement).getPropertyValue('--muted') || '#8b94a7';
      collapsedInd.innerHTML = '';
      // Top lines
      for (let i = 1; i <= aboveCount; i++) {
        const w = Math.max(14, Math.round(baseW * Math.pow(scale, i - 1)));
        const y = Math.round(centerY - (itemH / 2) - startGap - i * spacing);
        const line = document.createElement('div');
        line.style.cssText = `position:absolute; left:50%; transform:translateX(-50%); top:${y}px; height:4px; width:${w}px; background:${muted.trim()}; opacity:${Math.max(0.25, 0.85 - i * 0.06)}; border-radius:3px;`;
        collapsedInd.appendChild(line);
      }
      // Bottom lines
      for (let i = 1; i <= belowCount; i++) {
        const w = Math.max(14, Math.round(baseW * Math.pow(scale, i - 1)));
        const y = Math.round(centerY + (itemH / 2) + startGap + i * spacing);
        const line = document.createElement('div');
        line.style.cssText = `position:absolute; left:50%; transform:translateX(-50%); top:${y}px; height:4px; width:${w}px; background:${muted.trim()}; opacity:${Math.max(0.25, 0.85 - i * 0.06)}; border-radius:3px;`;
        collapsedInd.appendChild(line);
      }
      collapsedInd.style.display = 'block';
    }

    // Gesture: drag left on the button to open Layers Panel directly
    try { toggle.style.touchAction = 'none'; } catch(_) {}
    let _dragDetect = null;
    const onBtnPointerDown = (ev) => {
      if (ev.pointerType === 'mouse' && ev.button !== 0) return;
      _dragDetect = {
        startX: ev.clientX,
        startY: ev.clientY,
        consumed: false
      };
      try { toggle.setPointerCapture && toggle.setPointerCapture(ev.pointerId); } catch(_) {}
      const move = (e) => {
        if (!_dragDetect || _dragDetect.consumed) return;
        if (layersHoldOverlayState && layersHoldOverlayState.isOpen) return; // overlay handles its own left-swipe
        const dx = e.clientX - _dragDetect.startX;
        const dy = e.clientY - _dragDetect.startY;
        // left swipe threshold with some vertical tolerance
        if (dx < -40 && Math.abs(dy) < 40) {
          _dragDetect.consumed = true;
          // cancel pending long-press if any
          try { clearTimeout(layersHoldOverlayState && layersHoldOverlayState.timeoutId); } catch(_) {}
          // open panel
          showMobileLayersPanel();
          // suppress following click
          layersHoldOverlayState.suppressClickTs = Date.now() + 300;
          // cleanup
          up(e);
        }
      };
      const up = (e) => {
        try { toggle.releasePointerCapture && toggle.releasePointerCapture(ev.pointerId); } catch(_) {}
        window.removeEventListener('pointermove', move, true);
        window.removeEventListener('pointerup', up, true);
        _dragDetect = null;
      };
      window.addEventListener('pointermove', move, { capture: true, passive: false });
      window.addEventListener('pointerup', up, { capture: true, passive: true });
    };
    toggle.addEventListener('pointerdown', onBtnPointerDown, { capture: true, passive: false });

    const position = () => {
      const isLandscape = window.innerWidth > window.innerHeight;
      const baseRight = 20; const baseBottom = 86; const btn = 56; const gap = 10;
      overlay.style.right = baseRight + 'px';
      if (isLandscape) {
        const vvH = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        overlay.style.top = Math.max(70, Math.round(vvH / 2 - btn / 2)) + 'px';
        overlay.style.bottom = '';
      } else {
        overlay.style.top = '';
        overlay.style.bottom = (baseBottom + (btn + gap) * 1) + 'px';
      }
    };
    position();
    window.addEventListener('resize', position, { passive: true });
    if (window.visualViewport) window.visualViewport.addEventListener('resize', position);

    // Tap toggles combo overlay: open if closed; if open and center layer tapped, close
    toggle.addEventListener('click', () => {
      const r = toggle.getBoundingClientRect();
      const ev = { clientX: Math.round(r.left + r.width / 2), clientY: Math.round(r.top + r.height / 2) };
      const existing = document.getElementById('mobile-layers-combo-overlay');
      if (existing) { try { document.body.removeChild(existing); } catch(_) {} return; }
      openLayersComboOverlay(ev);
    });

    // Long-press to open hold overlay (reordering)
    installMobileLayersHoldOverlay(toggle);
    // Prevent native context menu from interfering with long-press
    toggle.addEventListener('contextmenu', (e)=>{ e.preventDefault(); }, { capture: true });

    // Keep overlay thumbnail and collapsed indicators in sync with active object
    const refreshThumb = () => {
      if (!window.mobileCanvas) { thumb.style.display = 'none'; return; }
      const active = window.mobileCanvas.getActiveObject();
      if (!active) { thumb.style.display = 'none'; return; }
      // Render larger so it fills the button crisply
      buildObjectThumbnail(active, 96, (src) => { thumb.src = src; thumb.style.display = 'block'; });
      renderCollapsedIndicators();
    };
    document.addEventListener('mobileZoomUpdated', refreshThumb, { passive: true });
    if (window.mobileCanvas) {
      window.mobileCanvas.on('selection:created', refreshThumb);
      window.mobileCanvas.on('selection:cleared', refreshThumb);
      window.mobileCanvas.on('selection:updated', refreshThumb);
      window.mobileCanvas.on('object:modified', refreshThumb);
      window.mobileCanvas.on('object:added', refreshThumb);
      window.mobileCanvas.on('object:removed', refreshThumb);
    }
    setTimeout(()=>{ refreshThumb(); renderCollapsedIndicators(); }, 0);
    document.addEventListener('mobileSelectionUpdated', refreshThumb, { passive: true });

    // Close any hold overlay when tapping outside
    const closeIfOutside = (e) => {
      if (e.target === toggle) return;
      // Do not close if tapping inside the hold overlay column
      const hold = document.getElementById('mobile-layers-hold-overlay');
      if (hold && hold.contains(e.target)) return;
      // Do not close when tapping the arrow button
      const arrow = document.getElementById('mobile-layers-overlay-arrow');
      if (arrow && (e.target === arrow || arrow.contains(e.target))) return;
      if (layersHoldOverlayState && layersHoldOverlayState.isOpen) closeLayersHoldOverlay();
    };
    document.addEventListener('pointerdown', closeIfOutside, true);
    document.addEventListener('click', closeIfOutside, true);
    // Ensure no stray background/zoom overlays exist in portrait
    const isLandscapeNow = window.innerWidth > window.innerHeight;
    if (!isLandscapeNow) {
      const zb = document.getElementById('mobile-zoom-overlay'); if (zb) zb.style.display = 'none';
      const bb = document.getElementById('mobile-bg-overlay'); if (bb) { const t = bb.querySelector('button'); if (t) t.style.display='none'; }
    }
  } catch (_) { /* no-op */ }
}

// --- Mobile Pad Size Presets (matching desktop version) ---
const mobilePadPresets = {
  extended:  { w: 4725, h: 1785, aspect: 77/29, name: 'EXTENDED', description: '33" × 11"' },
  immersive: { w: 5310, h: 2220, aspect: 43/18, name: 'IMMERSIVE', description: '33.5" × 13.8"' },
  laptop:    { w: 3815, h: 2250, aspect: 61/36, name: 'LAPTOP', description: '23.6" × 13.8"' },
  playmat:   { w: 3815, h: 2250, aspect: 61/36, name: 'PLAY MAT', description: '23.6" × 13.8"' },
  fullsize:  { w: 5400, h: 2306, aspect: 96/41, name: 'FULLSIZE', description: '37.4" × 15.7"' },
  supersize: { w: 7200, h: 3636, aspect: 101/51, name: 'SUPERSIZE', description: '39.1" × 19.6"' }
};

let currentMobilePadPreset = 'extended'; // Default to Extended pad size

function calculateMobileCanvasSize() {
  // Calculate canvas size based on current preset - maintaining physical proportions like desktop
  const availableWidth = window.innerWidth;
  const availableHeight = window.innerHeight - 140; // 60px header + 80px toolbar
  
  const currentPreset = mobilePadPresets[currentMobilePadPreset];
  const targetAspectRatio = currentPreset.aspect;
  
  // Use physical dimensions to maintain proper proportions (like desktop at 150 DPI)
  // Scale down from desktop physical dimensions for mobile display
  const mobileScaleFactor = 0.2; // Scale down desktop dimensions by 80% for mobile
  
  let canvasWidth = Math.round(currentPreset.w * mobileScaleFactor);
  let canvasHeight = Math.round(currentPreset.h * mobileScaleFactor);
  
  // Ensure minimum size for usability
  const minWidth = 400;
  const minHeight = minWidth / targetAspectRatio;
  
  if (canvasWidth < minWidth) {
    canvasWidth = minWidth;
    canvasHeight = canvasWidth / targetAspectRatio;
  }
  
  if (canvasHeight < minHeight) {
    canvasHeight = minHeight;
    canvasWidth = canvasHeight * targetAspectRatio;
  }
  
  const result = {
    width: Math.round(canvasWidth),
    height: Math.round(canvasHeight),
    isLandscape: availableWidth > availableHeight
  };
  
  
  
  return result;
}

// Mobile zoom system (like desktop)
let mobileCurrentScale = 1;
let mobileFitToScreenScale = 1;
let mobileBaseRect = null; // unused in RAF path; kept for compatibility
let _mobileTransformRafScheduled = false;
let _mobileLastTransform = { x: 0, y: 0, scale: 1 };

function resizeMobileCanvasDom(factor) {
  // Batch transform updates via rAF to avoid jank and layout trashing
  const container = document.getElementById('mobile-canvas-container');
  if (!container) return;

  // One-time perf hints
  if (!container._mobilePerfInit) {
    container.style.willChange = 'transform';
    container.style.transformOrigin = 'center center';
    container._mobilePerfInit = true;
  }

  _mobileLastTransform.x = mobilePanX;
  _mobileLastTransform.y = mobilePanY;
  _mobileLastTransform.scale = factor;

  if (_mobileTransformRafScheduled) return;
  _mobileTransformRafScheduled = true;
  requestAnimationFrame(() => {
    _mobileTransformRafScheduled = false;
    // GPU-friendly transform
    container.style.transform = `translate3d(${_mobileLastTransform.x}px, ${_mobileLastTransform.y}px, 0) scale(${_mobileLastTransform.scale})`;
  });
  // you do NOT need to call canvas.setZoom or canvas.viewportTransform here
}

// Pan/Pinch state
let mobilePanX = 0, mobilePanY = 0;
let pinchTracking = null; // { id1, id2, startDist, startScale, startPanX, startPanY, centerX, centerY }
let isPanningOneFinger = false;
let prevSkipTargetFind = null;
let prevSelectionEnabled = null;

function installMobilePanAndPinch() {
  const area = document.getElementById('mobile-canvas-area');
  const container = document.getElementById('mobile-canvas-container');
  const upper = (window.mobileCanvas && window.mobileCanvas.upperCanvasEl) || document.querySelector('.upper-canvas');
  const targets = [];
  if (upper) targets.push(upper);
  if (container) targets.push(container);
  if (area) targets.push(area);
  if (!targets.length) return;
  // Ensure the interactive layers don't hand control to browser gestures
  targets.forEach(t => { try { t.style.touchAction = 'none'; } catch(_) {} });

  const active = new Map();
  const dist = (p1,p2)=> Math.hypot(p2.x - p1.x, p2.y - p1.y);
  const midpoint = (p1,p2)=> ({ x:(p1.x+p2.x)/2, y:(p1.y+p2.y)/2 });
  const clampPan = () => {
    const areaEl = document.getElementById('mobile-canvas-area');
    if (!areaEl) return;
    const r = areaEl.getBoundingClientRect();
    const extra = 80; // breathing room in px
    const maxX = Math.max(0, ((mobileCurrentScale - 1) * r.width) / 2 + extra);
    const maxY = Math.max(0, ((mobileCurrentScale - 1) * r.height) / 2 + extra);
    if (mobilePanX > maxX) mobilePanX = maxX;
    if (mobilePanX < -maxX) mobilePanX = -maxX;
    if (mobilePanY > maxY) mobilePanY = maxY;
    if (mobilePanY < -maxY) mobilePanY = -maxY;
  };

  const onPointerDown = (el) => (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    // Ignore when overlays likely active
    try { if (layersHoldOverlayState && layersHoldOverlayState.isOpen) return; } catch(_) {}
    el.setPointerCapture?.(e.pointerId);
    active.set(e.pointerId, { x:e.clientX, y:e.clientY });
    // Start pinch if two fingers
    if (active.size === 2) {
      // cancel any panning state
      if (isPanningOneFinger) {
        if (window.mobileCanvas) {
          if (prevSkipTargetFind !== null) window.mobileCanvas.skipTargetFind = prevSkipTargetFind;
          if (prevSelectionEnabled !== null) window.mobileCanvas.selection = prevSelectionEnabled;
        }
        isPanningOneFinger = false;
      }
      // Disable hit testing/selection during pinch
      if (window.mobileCanvas) {
        prevSkipTargetFind = window.mobileCanvas.skipTargetFind;
        prevSelectionEnabled = window.mobileCanvas.selection;
        window.mobileCanvas.skipTargetFind = true;
        window.mobileCanvas.selection = false;
      }
      const [p1,p2] = Array.from(active.values());
      const m = midpoint(p1,p2);
      pinchTracking = {
        id1: Array.from(active.keys())[0], id2: Array.from(active.keys())[1],
        startDist: dist(p1,p2), startScale: mobileCurrentScale,
        startPanX: mobilePanX, startPanY: mobilePanY,
        centerX: m.x, centerY: m.y
      };
    }
  };

  const onPointerMove = (e) => {
    if (!active.has(e.pointerId)) return;
    if (pinchTracking && active.has(pinchTracking.id1) && active.has(pinchTracking.id2)) {
      // Pinch zoom
      const p1 = active.get(pinchTracking.id1), p2 = active.get(pinchTracking.id2);
      const d = dist(p1,p2);
      const ratio = d / Math.max(1, pinchTracking.startDist);
      mobileCurrentScale = Math.max(0.2, Math.min(3, pinchTracking.startScale * ratio));
      // Keep center under pinch midpoint by adjusting pan to maintain anchor
      if (pinchTracking.centerX != null && pinchTracking.centerY != null) {
        const scaleDelta = mobileCurrentScale / pinchTracking.startScale;
        mobilePanX = pinchTracking.startPanX + (pinchTracking.centerX - pinchTracking.startPanX) * (scaleDelta - 1);
        mobilePanY = pinchTracking.startPanY + (pinchTracking.centerY - pinchTracking.startPanY) * (scaleDelta - 1);
      }
      clampPan();
      resizeMobileCanvasDom(mobileCurrentScale);
      e.preventDefault();
      return;
    }
    // Single-finger pan when no object is selected
    if (active.size === 1 && (!window.mobileCanvas || !window.mobileCanvas.getActiveObject())) {
      if (!isPanningOneFinger) {
        isPanningOneFinger = true;
        if (window.mobileCanvas) {
          prevSkipTargetFind = window.mobileCanvas.skipTargetFind;
          prevSelectionEnabled = window.mobileCanvas.selection;
          window.mobileCanvas.skipTargetFind = true; // disable hit testing while panning
          window.mobileCanvas.selection = false;     // disable marquee/band selection
        }
      }
      const prev = active.get(e.pointerId);
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      active.set(e.pointerId, { x:e.clientX, y:e.clientY });
      mobilePanX += dx; mobilePanY += dy;
      clampPan();
      resizeMobileCanvasDom(mobileCurrentScale);
      e.preventDefault();
    }
  };

  const onPointerEnd = (e) => {
    active.delete(e.pointerId);
    if (pinchTracking && (e.pointerId === pinchTracking.id1 || e.pointerId === pinchTracking.id2)) {
      pinchTracking = null;
      // Restore Fabric flags after pinch ends
      if (window.mobileCanvas) {
        if (prevSkipTargetFind !== null) window.mobileCanvas.skipTargetFind = prevSkipTargetFind;
        if (prevSelectionEnabled !== null) window.mobileCanvas.selection = prevSelectionEnabled;
      }
    }
    if (isPanningOneFinger && active.size === 0) {
      if (window.mobileCanvas) {
        if (prevSkipTargetFind !== null) window.mobileCanvas.skipTargetFind = prevSkipTargetFind;
        if (prevSelectionEnabled !== null) window.mobileCanvas.selection = prevSelectionEnabled;
      }
      isPanningOneFinger = false;
    }
  };

  const addTarget = (el) => {
    el.addEventListener('pointerdown', onPointerDown(el), { passive: true, capture: true });
    el.addEventListener('pointermove', onPointerMove, { passive: false, capture: true });
    el.addEventListener('pointerup', onPointerEnd, { passive: true, capture: true });
    el.addEventListener('pointercancel', onPointerEnd, { passive: true, capture: true });
  };

  targets.forEach(addTarget);
}

function mobileCanvasZoomIn() {
  mobileCurrentScale = Math.min(3, mobileCurrentScale * 1.2);
  resizeMobileCanvasDom(mobileCurrentScale);
}

function mobileCanvasZoomOut() {
  mobileCurrentScale = Math.max(0.1, mobileCurrentScale / 1.2);
  resizeMobileCanvasDom(mobileCurrentScale);
}

function mobileCanvasZoomFit(animate = false) {
  // EXACT COPY of desktop fitCanvasToViewport function
  if (!window.mobileCanvas) return;
  
  const viewportWidth = window.innerWidth;
  // Use actual measured header + toolbar + layers bar + open panel offsets
  const headerH = getMobileHeaderHeight();
  const toolbarH = getMobileToolbarHeight();
  const layersBarH = getMobileLayersBarHeight();
  // Stage layout reserves bottom overlays only in portrait to avoid gray gaps in landscape.
  // For centering/fit, we also consider the thin menu height in landscape when visible.
  const bottomOverlaysLayoutH = getBottomOverlayHeight();
  const panel = document.getElementById('mobile-layers-panel');
  const isLandscape = window.innerWidth > window.innerHeight;
  const panelWidth = panel && isLandscape ? panel.offsetWidth : 0;
  const panelHeight = panel && !isLandscape ? panel.offsetHeight : 0;
  // Prefer visualViewport to avoid browser UI bars affecting layout
  const rawVH = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  // Match the stage sizing logic: in portrait, we only push the canvas up by
  // a fraction of the panel height, which matches the perceived vertical centering
  // when the panel opens. Since bottomOverlaysH already includes the rail height
  // in portrait, subtract only the net panel height above the rail, multiplied by factor.
  const rail = document.getElementById('mobile-bottom-rail');
  const railH = (!isLandscape && rail) ? Math.round(rail.offsetHeight || 50) : 0;
  const thinMenuVisibleH = (isLandscape && rail && (rail.querySelector('#mobile-transform-menu') || rail.querySelector('#mobile-layers-menu'))) ? 50 : 0;
  // When both a thin menu and the layers panel are open in portrait (e.g.,
  // rotated from landscape with thin menu still visible), push a bit more so
  // the canvas clears both. Otherwise use the regular factor.
  const thinOpenPortrait = (!isLandscape && rail && (rail.querySelector('#mobile-transform-menu') || rail.querySelector('#mobile-layers-menu')));
  const PANEL_PUSH_FACTOR = (!isLandscape && thinOpenPortrait && panelHeight > 0) ? 1.0 : 0.5;
  const effectivePanelH = !isLandscape ? Math.round(Math.max(0, (panelHeight || 0) - railH) * PANEL_PUSH_FACTOR) : 0;
  const overlaysForFit = bottomOverlaysLayoutH + thinMenuVisibleH;
  const viewportHeight = Math.max(0, Math.round(rawVH - (headerH + toolbarH + overlaysForFit + effectivePanelH)));
  const effectiveWidth = Math.max(0, Math.round(viewportWidth - (panelWidth || 0)));
  const canvasWidth = window.mobileCanvas.getWidth();
  const canvasHeight = window.mobileCanvas.getHeight();
  
  // Calculate zoom to fit canvas in viewport with padding
  const margins = computeFitMargins({ isLandscape, bottomOverlaysH: overlaysForFit, panelWidth });
  const pads = computeContextPadding({ isLandscape, bottomOverlaysH: overlaysForFit, panelWidth });
  const usableW = Math.max(0, (effectiveWidth - pads.x * 2)) * margins.x;
  const usableH = Math.max(0, (viewportHeight - pads.y * 2)) * margins.y;
  const scaleX = usableW / canvasWidth;
  const scaleY = usableH / canvasHeight;
  let scale = Math.min(scaleX, scaleY, 1); // Don't zoom in beyond 100%
  // Allow dynamic fit when menus are open. Keep a gentle lower bound that differs by orientation
  // to avoid the canvas becoming unreadably small on very short devices.
  if (overlaysForFit > 0) {
    // During rotation into portrait with both thin bar and panel open, allow more zoom-out
    const bothOpenPortrait = (!isLandscape && thinMenuVisibleH > 0 && panelHeight > 0 && rotationLockActive);
    const MIN_OVERLAY_SCALE = isLandscape ? 0.56 : (bothOpenPortrait ? 0.22 : 0.30);
    scale = Math.max(scale, MIN_OVERLAY_SCALE);
  }

  // Portrait: if a thin menu is visible, usually keep current zoom and only reposition.
  // However, during an orientation change (rotationLockActive), we DO refit to adapt
  // to the new window size even with the thin bar open.
  const thinVisible = !!(rail && (rail.querySelector('#mobile-transform-menu') || rail.querySelector('#mobile-layers-menu')));
  if (!isLandscape && thinVisible && typeof mobileCurrentScale === 'number' && !rotationLockActive && !(panel && panelHeight > 0)) {
    scale = mobileCurrentScale;
  }
  
  // Store the fit-to-screen scale for percentage calculations
  mobileFitToScreenScale = scale;
  if (animate) {
    animateMobileCanvasScaleTo(scale, 220);
    } else {
    mobileCurrentScale = scale;
    resizeMobileCanvasDom(scale);
  }
  centerCanvasWrapper();
  
  
}

function computeFitMargins({ isLandscape, bottomOverlaysH, panelWidth }) {
  // Base margins leave some breathing room around the canvas.
  let marginX = isLandscape ? 0.90 : 0.94;
  // Slightly reduce vertical margin to keep center from overshooting upward in portrait
  let marginY = isLandscape ? 0.90 : 0.94;

  // If a side panel is open in landscape, reduce horizontal fill slightly
  if (isLandscape && panelWidth && panelWidth > 0) {
    marginX -= 0.04; // give extra buffer near panel
  }

  // If a bottom overlay (transform/layers bar) is visible, reduce vertical fill a bit more in landscape only
  if (bottomOverlaysH && bottomOverlaysH > 0) {
    marginY -= isLandscape ? 0.03 : 0.01;
  }

  // Clamp margins to reasonable bounds
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  marginX = clamp(marginX, 0.82, 0.95);
  marginY = clamp(marginY, 0.82, 0.95);
  return { x: marginX, y: marginY };
}

function computeContextPadding({ isLandscape, bottomOverlaysH, panelWidth }) {
  // Extra pixel padding to keep breathing room regardless of aspect match
  let padX = isLandscape ? 20 : 12; // base horizontal pad in CSS px
  let padY = isLandscape ? 14 : 16; // base vertical pad

  if (panelWidth && panelWidth > 0) padX += 18; // extra when side panel is open
  if (bottomOverlaysH && bottomOverlaysH > 0) padY += 16; // extra for transform/layers bar in portrait

  // Clamp to reasonable values
  padX = Math.min(padX, 48);
  padY = Math.min(padY, 56);
  return { x: padX, y: padY };
}

function centerCanvasWrapper() {
  const area = document.getElementById('mobile-canvas-area');
  const wrapper = document.getElementById('mobile-canvas-container');
  if (!area || !wrapper) return;
  // Ensure flex centering and no stray margins/padding
  area.style.display = 'flex';
  area.style.alignItems = 'center';
  area.style.justifyContent = 'center';
  wrapper.style.margin = '0';
}

function animateMobileCanvasScaleTo(targetScale, durationMs = 200) {
  const start = performance.now();
  const startScale = mobileCurrentScale || 1;
  const delta = targetScale - startScale;
  function easeOutCubic(t){ return 1 - Math.pow(1 - t, 3); }
  function step(now){
    const t = Math.min(1, (now - start) / durationMs);
    const eased = easeOutCubic(t);
    const current = startScale + delta * eased;
    mobileCurrentScale = current;
    resizeMobileCanvasDom(current);
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ---------- Viewport-first layout manager ----------
let mobileLayoutRaf = null;

function initMobileViewportLayoutManager() {
  const relayout = () => requestMobileViewportLayout();
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', relayout);
    window.visualViewport.addEventListener('scroll', relayout);
  }
  window.addEventListener('resize', relayout);
  window.addEventListener('orientationchange', () => setTimeout(relayout, 50));

  // Observe overlay size changes
  const overlays = [
    document.getElementById('mobile-bottom-rail'),
  ];
  const ro = new ResizeObserver(() => relayout());
  overlays.forEach(el => el && ro.observe(el));

  // Refit on bottom menus/panels toggles
  const observeIds = ['mobile-transform-menu','mobile-layers-menu','mobile-layers-panel'];
  const ro2 = new ResizeObserver(() => requestMobileViewportLayout());
  observeIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) ro2.observe(el);
    // Also attach a MutationObserver for style changes (transform translateY)
    if (el) {
      const mo = new MutationObserver(() => requestMobileViewportLayout());
      mo.observe(el, { attributes: true, attributeFilter: ['style', 'class'] });
    }
  });
}

function requestMobileViewportLayout() {
  if (mobileLayoutRaf) return;
  mobileLayoutRaf = requestAnimationFrame(applyMobileViewportLayout);
}

function applyMobileViewportLayout() {
  mobileLayoutRaf = null;

  const header = null; // barless UI
  const toolbar = null; // barless UI
  const canvasArea = document.getElementById('mobile-canvas-area');
  if (!canvasArea) return;

  // Measure viewport and overlays
  const vpW = Math.round(window.visualViewport ? window.visualViewport.width : window.innerWidth);
  const vpH = Math.round(window.visualViewport ? window.visualViewport.height : window.innerHeight);
  const headerH = 0;
  const toolbarH = 0;
  const bottomOverlaysH = getBottomOverlayHeight();

  // Position canvas area within stage rect. In portrait, if a thin menu rail is visible,
  // use it as part of the bottom inset so the canvas is centered between header and the top of the open menu.
  const isLandscape = window.innerWidth > window.innerHeight;
  const top = headerH; // header is fixed at 0
  // Include only a fraction of panel height in portrait to achieve perceived vertical centering
  const panel = document.getElementById('mobile-layers-panel');
  const rail = document.getElementById('mobile-bottom-rail');
  const railH = (!isLandscape && rail) ? Math.round(rail.offsetHeight || 50) : 0;
  const panelHeightPortrait = (!isLandscape && panel) ? Math.round(panel.offsetHeight || 0) : 0;
  const PANEL_PUSH_FACTOR = 0.5;
  // Net push equals fraction of (panel - rail)
  const netPanelPush = (!isLandscape) ? Math.round(Math.max(0, panelHeightPortrait - railH) * PANEL_PUSH_FACTOR) : 0;
  let bottom = Math.max(0, toolbarH + bottomOverlaysH + netPanelPush);
  canvasArea.style.top = top + 'px';
  canvasArea.style.bottom = bottom + 'px';
  canvasArea.style.padding = '0 16px';
  // In landscape, when a thin bottom menu is visible, shift the canvas up by the
  // actual thin-menu height (measured from the rail) without shrinking stage height.
  if (isLandscape) {
    const rail = document.getElementById('mobile-bottom-rail');
    const thinVisible = !!(rail && (rail.querySelector('#mobile-transform-menu') || rail.querySelector('#mobile-layers-menu')));
    const railH = thinVisible ? Math.round((rail && (rail.offsetHeight || 50)) || 50) : 0;
    canvasArea.style.paddingBottom = railH + 'px';
  } else {
    canvasArea.style.paddingBottom = '0px';
  }
  // In landscape, if the layers panel is open, push the canvas horizontally by panel width
  if (isLandscape) {
    const panelEl = document.getElementById('mobile-layers-panel');
    const panelW = panelEl ? Math.round(panelEl.offsetWidth || 0) : 0;
    canvasArea.style.paddingRight = panelW > 0 ? panelW + 'px' : '16px';
  } else {
    canvasArea.style.paddingRight = '16px';
  }

  // Auto-correct any remaining bottom gap due to DPR rounding
  try {
    const vpH = Math.round(window.visualViewport ? window.visualViewport.height : window.innerHeight);
    const areaRect = canvasArea.getBoundingClientRect();
    const toolbarTop = toolbar ? Math.round(toolbar.getBoundingClientRect().top) : vpH;
    const gap = toolbarTop - Math.round(areaRect.bottom);
    if (gap > 0) {
      canvasArea.style.bottom = (bottom + gap + 1) + 'px';
    }
  } catch (_) {}

  // Center canvas wrapper within stage rect (ensure no leftover transforms push it off-center)
  const wrapper = document.getElementById('mobile-canvas-container');
  if (wrapper) {
    wrapper.style.margin = '0 auto';
    // Use flex centering as the primary method
    canvasArea.style.display = 'flex';
    canvasArea.style.alignItems = 'center';
    canvasArea.style.justifyContent = 'center';
  }

  // Refit/center after transient UI changes (debounced single fit)
  updateBottomMenusPosition();
  requestDebouncedFit(0, false);
}



function createMobileBottomToolbar() {
  const colors = getMobileThemeColors();
  
  const toolbar = document.createElement('div');
  toolbar.id = 'mobile-bottom-toolbar';
  toolbar.setAttribute('role', 'toolbar');
  toolbar.setAttribute('aria-label', 'Quick actions');
  toolbar.style.cssText = `
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    height: 64px;
    background: ${colors.primaryBg};
    border-top: 2px solid ${colors.accentBorder};
    display: flex;
    align-items: center;
    justify-content: space-around;
    padding: 0 12px;
    /* avoid double safe-area since layout already handles it */
    box-sizing: border-box;
    flex-shrink: 0;
    z-index: 15002;
  `;
  
  // Add mobile buttons
  const buttons = [
    { id: 'mobile-transform', icon: '🔄', text: 'Transform', action: () => {
      showMobileTransformMenu();
    }},
    // Background button removed; background overlay replaces it
    // Zoom button removed; overlay replaces it
  ];
  
  buttons.forEach(btn => {
    const button = document.createElement('button');
    button.id = btn.id;
    button.setAttribute('type', 'button');
    button.setAttribute('aria-label', btn.text);
    const isLayers = btn.id === 'mobile-layers';
    button.innerHTML = `
      <div style="position:relative; display:flex; flex-direction:column; align-items:center;">
      <div style="font-size: 20px; margin-bottom: 4px;">${btn.icon}</div>
        ${isLayers ? `<img id="mobile-layers-thumb" alt="Layer thumbnail" style="position:absolute; width:18px; height:18px; border-radius:4px; border:1px solid var(--accent-color); object-fit:cover; bottom:6px; right:-10px; background: var(--bg-primary);" />` : ''}
        <div style="font-size: 10px; color: ${colors.accentText}; margin-top: 2px;">${btn.text}</div>
      </div>
    `;
    button.style.cssText = `
      background: transparent;
      border: none;
      color: ${colors.buttonText};
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-width: 60px;
      min-height: 60px;
      border-radius: 8px;
      transition: all 0.2s ease;
    `;
    
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Prevent accidental tap action immediately after long-press overlay
      if (btn.id === 'mobile-layers') {
        if (layersHoldOverlayState && (layersHoldOverlayState.isOpen || (layersHoldOverlayState.suppressClickTs && Date.now() < layersHoldOverlayState.suppressClickTs))) {
          return;
        }
      }
      btn.action();
    });
    
    button.addEventListener('touchstart', (e) => {
      button.style.transform = 'scale(0.95)';
    });
    
    button.addEventListener('touchend', (e) => {
      button.style.transform = 'scale(1)';
    });
    
    toolbar.appendChild(button);

    if (btn.id === 'mobile-layers') {
      // Enable long-press overlay behavior and thumbnail updates
      installMobileLayersHoldOverlay(button);
      setTimeout(() => updateLayersButtonThumbnail(), 0);
    }
  });
  
  
  return toolbar;
}
function setupMobileHeaderEvents(header) {
  // Mobile menu button
  const mobileMenuBtn = header.querySelector('#mobile-menu-btn');
  if (mobileMenuBtn) {
    
    mobileMenuBtn.addEventListener('click', showMobileMainMenu);
    mobileMenuBtn.addEventListener('touchstart', (e) => {
      mobileMenuBtn.style.transform = 'scale(0.95)';
    });
    mobileMenuBtn.addEventListener('touchend', (e) => {
      mobileMenuBtn.style.transform = 'scale(1)';
    });
  } else {
    
  }
  
  // Mobile theme button
  const mobileThemeBtn = header.querySelector('#mobile-theme-btn');
  if (mobileThemeBtn) {
    
    
    // Update theme button icon based on current theme
    updateMobileThemeButtonIcon();
    
    mobileThemeBtn.addEventListener('click', (e) => {
      
      e.preventDefault();
      e.stopPropagation();
      
      // Directly toggle theme without looking for desktop button
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      
      // Update mobile interface theme immediately
      updateMobileInterfaceTheme();
      updateMobileThemeButtonIcon();
      // Reapply background patterns with new theme
      reapplyMobileCanvasBackgroundPattern();
      
    });
    mobileThemeBtn.addEventListener('touchstart', (e) => {
      mobileThemeBtn.style.transform = 'scale(0.95)';
    });
    mobileThemeBtn.addEventListener('touchend', (e) => {
      mobileThemeBtn.style.transform = 'scale(1)';
    });
  } else {
    
  }
}

function updateMobileThemeButtonIcon() {
  const mobileThemeBtn = document.getElementById('mobile-theme-btn');
  if (mobileThemeBtn) {
    const isLightTheme = document.documentElement.getAttribute('data-theme') === 'light';
    const iconDiv = mobileThemeBtn.querySelector('div:first-child');
    if (iconDiv) {
      iconDiv.textContent = isLightTheme ? '🌙' : '☀️';
    }
  }
}

// Check if main theme toggle is available and working
function checkMainThemeToggle() {
  const themeBtn = document.getElementById('theme-toggle-btn');
  if (themeBtn) {
    
    
    return true;
  } else {
    console.error('Main theme toggle button not found!');
    return false;
  }
}

// Listen for theme changes from the main theme toggle
function setupMobileThemeListener() {
  // Create a MutationObserver to watch for theme changes
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
        // Theme changed, update mobile interface
        setTimeout(() => {
          updateMobileInterfaceTheme();
          updateMobileThemeButtonIcon();
          // Reapply background patterns with new theme
          reapplyMobileCanvasBackgroundPattern();
        }, 100);
      }
    });
  });
  
  // Start observing the document element for theme changes
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme']
  });
  
  
}

// Also set up a direct event listener for the main theme toggle
function setupDirectThemeToggleListener() {
  const originalThemeToggle = document.getElementById('theme-toggle-btn');
  if (originalThemeToggle) {
    // Remove any existing listeners
    const newToggle = originalThemeToggle.cloneNode(true);
    originalThemeToggle.parentNode.replaceChild(newToggle, originalThemeToggle);
    
    // Add our listener
    newToggle.addEventListener('click', (e) => {
      // Let the original handler run first
      setTimeout(() => {
        updateMobileInterfaceTheme();
        updateMobileThemeButtonIcon();
        // Reapply background patterns with new theme
        reapplyMobileCanvasBackgroundPattern();
      }, 150);
    });
    
    
  }
}

// Mobile-specific menus that slide up from bottom
function getMobileToolbarHeight() {
  const toolbar = document.getElementById('mobile-bottom-toolbar');
  const defaultHeight = 64;
  return toolbar && toolbar.offsetHeight ? toolbar.offsetHeight : defaultHeight;
}

function getMobileHeaderHeight() {
  const header = document.getElementById('mobile-header');
  const defaultHeight = 56;
  return header && header.offsetHeight ? header.offsetHeight : defaultHeight;
}

// Lightweight toast to show active layer name just below the top bar
let mobileLayerToastState = { el: null, hideTimer: 0, lastText: '', lastShownAt: 0 };
let mobileLayerToastLastObject = null; // only toast on true selection changes
function showMobileLayerToast(text) {
  try {
    if (!text) return;
    const root = document.getElementById('mobile-layout') || document.body;
    if (!root) return;
    const headerH = getMobileHeaderHeight();

    let el = document.getElementById('mobile-layer-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'mobile-layer-toast';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      // Positioned below header, centered
      el.style.cssText = `
        position: fixed; left: 50%; transform: translateX(-50%) translateY(-4px);
        top: ${headerH + 8}px; z-index: 15010; pointer-events: none;
        background: var(--bg-primary); color: var(--accent-color);
        border: 1px solid var(--accent-color); border-radius: 10px;
        padding: 6px 10px; font-size: 13px; font-weight: 600;
        box-shadow: 0 4px 14px rgba(0,0,0,0.25); opacity: 0;
        transition: opacity ${motionMs(180)}ms ease, transform ${motionMs(180)}ms ease;
      `;
      root.appendChild(el);
      mobileLayerToastState.el = el;
    }

    // Update text and position (header height can change)
    el.textContent = text;
    el.style.top = (headerH + 8) + 'px';

    // Restart animation
    // Force reflow to allow transition from opacity 0
    el.style.opacity = '0';
    el.style.transform = 'translateX(-50%) translateY(-4px)';
    void el.offsetHeight; // reflow
    el.style.opacity = '1';
    el.style.transform = 'translateX(-50%) translateY(0)';

    // Clear previous hide timer and schedule fade out
    if (mobileLayerToastState.hideTimer) {
      clearTimeout(mobileLayerToastState.hideTimer);
      mobileLayerToastState.hideTimer = 0;
    }
    mobileLayerToastState.lastText = text;
    mobileLayerToastState.lastShownAt = Date.now();
    mobileLayerToastState.hideTimer = setTimeout(() => {
      try {
        el.style.opacity = '0';
        el.style.transform = 'translateX(-50%) translateY(-4px)';
        setTimeout(() => {
          // Do not remove element; keep for reuse to avoid layout trashing
        }, motionMs(220));
      } catch(_) {}
    }, 2000);
  } catch(_) {}
}

function getBottomOverlayHeight() {
  // Visible height of any bottom overlays (bottom rail that hosts thin bars, or slide menu)
  const rail = document.getElementById('mobile-bottom-rail');
  const slideMenu = document.getElementById('mobile-slide-menu');
  const vpH = Math.round(window.visualViewport ? window.visualViewport.height : window.innerHeight);

  // Slide menu takes precedence if visible
  if (slideMenu) {
    const cs = getComputedStyle(slideMenu);
    const bottomPx = parseFloat(cs.bottom || '0');
    if (!isNaN(bottomPx) && bottomPx >= 0) {
      const r = slideMenu.getBoundingClientRect();
      return Math.max(0, Math.min(r.bottom, vpH) - Math.max(r.top, 0));
    }
  }

  // Otherwise, if rail is active/visible, reserve its height (50px) only in portrait,
  // because in landscape the thin menus overlay the panel edge.
  const isLandscape = window.innerWidth > window.innerHeight;
  if (!isLandscape && rail && rail.style.display !== 'none') {
    return Math.round(rail.offsetHeight || 50);
  }

  // Fallback to legacy elements if rail not yet used
  const ids = ['mobile-transform-menu', 'mobile-layers-menu'];
  let maxVisible = 0;
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const cs = window.getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity || '1') === 0) return;
    // Menus using translateY should be considered visible only at translateY(0)
    if ((id === 'mobile-transform-menu' || id === 'mobile-layers-menu')) {
      const t = (el.style && el.style.transform) || '';
      if (!t.includes('translateY(0)')) return;
    }
    // Slide menu should be visible only when bottom >= 0
    if (id === 'mobile-slide-menu') {
      const bottomPx = parseFloat(cs.bottom || '0');
      if (isNaN(bottomPx) || bottomPx < 0) return;
    }
    const r = el.getBoundingClientRect();
    const visible = Math.max(0, Math.min(r.bottom, vpH) - Math.max(r.top, 0));
    maxVisible = Math.max(maxVisible, Math.round(visible));
  });
  return maxVisible;
}

function getMobileLayersBarHeight() {
  const bar = document.getElementById('mobile-layers-menu');
  const defaultHeight = 50;
  return bar && bar.offsetHeight ? bar.offsetHeight : (bar ? defaultHeight : 0);
}

function showMobileTextMenu() {
  const menu = createMobileSlideUpMenu('Text Editor', [
    { icon: '📝', text: 'Add Text', action: () => {
      if (window.addTextToCanvas) {
        window.addTextToCanvas();
      }
    }},
    { icon: '🎨', text: 'Text Color', action: () => {
      const colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.onchange = (e) => {
        if (window.setSelectedTextColor) {
          window.setSelectedTextColor(e.target.value);
        }
      };
      colorInput.click();
    }},
    { icon: '📏', text: 'Font Size', action: () => {
      const size = prompt('Enter font size (12-72):', '24');
      if (size && window.setSelectedTextSize) {
        window.setSelectedTextSize(parseInt(size));
      }
    }},
    { icon: '🔤', text: 'Font Family', action: () => {
      const fonts = ['Arial', 'Times New Roman', 'Helvetica', 'Georgia', 'Verdana'];
      const font = prompt('Enter font family:\n' + fonts.join(', '), 'Arial');
      if (font && window.setSelectedTextFont) {
        window.setSelectedTextFont(font);
      }
    }},
    { icon: '📍', text: 'Stroke Position', action: () => {
      showMobileStrokePositionMenu();
    }}
  ]);
}

// Removed duplicate showMobileTransformMenu (thin bar version exists later)

function showMobileLayersMenu() {
  const existing = document.getElementById('mobile-layers-menu');
  if (existing) {
    hideMobileLayersMenu();
    return;
  }

  ensureBottomRail();
  const toolbarOffset = getMobileToolbarHeight();
  const duration = motionMs();
  const bar = document.createElement('div');
  bar.id = 'mobile-layers-menu';
  bar.style.cssText = `
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 50px;
    background: var(--bg-primary);
    border-top: 2px solid var(--accent-color);
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 8px;
    padding: 8px 16px;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: none;
    -ms-overflow-style: none;
    box-sizing: border-box;
    z-index: 15001;
    transform: translateY(100%);
    transition: transform ${duration}ms ease;
    box-shadow: 0 -2px 8px rgba(0,0,0,0.2);
    pointer-events: auto;
  `;

  const actions = [
    { icon: '👁️', key: 'toggleVisible', tooltip: 'Toggle Visibility' },
    { icon: '🔒', key: 'toggleLock', tooltip: 'Toggle Lock' },
    { icon: '📋', key: 'duplicate', tooltip: 'Duplicate' },
    { icon: '🗑️', key: 'delete', tooltip: 'Delete' },
    { icon: '⬆️', key: 'moveUp', tooltip: 'Move Up' },
    { icon: '⬇️', key: 'moveDown', tooltip: 'Move Down' },
    { icon: '⤴️', key: 'bringFront', tooltip: 'Bring to Front' },
    { icon: '⤵️', key: 'sendBack', tooltip: 'Send to Back' },
    { icon: '📚', key: 'panel', tooltip: 'Open Layers Panel' },
    { icon: '✕', key: 'close', tooltip: 'Close' }
  ];

  actions.forEach(item => {
    const btn = document.createElement('button');
    btn.style.cssText = `
      background: transparent;
      border: 1px solid var(--accent-color);
      border-radius: 10px;
      width: 44px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      color: var(--accent-color);
      cursor: pointer;
      transition: all 0.2s ease;
      flex: 0 0 auto;
    `;
    btn.innerHTML = item.icon;
    btn.title = item.tooltip;
    btn.setAttribute('aria-label', item.tooltip);

    btn.addEventListener('click', () => handleLayersAction(item.key));
    btn.addEventListener('touchstart', () => {
      btn.style.background = 'var(--accent-color)';
      btn.style.color = 'var(--bg-primary)';
    }, { passive: true });
    btn.addEventListener('touchend', () => {
      btn.style.background = 'transparent';
      btn.style.color = 'var(--accent-color)';
    }, { passive: true });

    bar.appendChild(btn);
  });

  const rail = ensureBottomRail();
  rail.appendChild(bar);

  requestAnimationFrame(() => {
    bar.style.transform = 'translateY(0)';
    adjustViewportForMenu(true);
    updateBottomMenusPosition();
    // If layers panel is open, ensure it resizes to meet the rail
    sizeAndPositionLayersPanel();
    // Single debounced fit when opening the thin bar
    requestMobileViewportLayout();
    if (!rotationLockActive) requestDebouncedFit(60, true);
  });
}

function hideMobileLayersMenu() {
  const bar = document.getElementById('mobile-layers-menu');
  if (!bar) return;
  const duration = motionMs();
  bar.style.transform = 'translateY(100%)';
  adjustViewportForMenu(false);
  setTimeout(() => {
    bar.remove();
    teardownBottomRailIfEmpty();
    // Recompute stage padding so landscape thin-menu bias is cleared
    requestMobileViewportLayout();
  }, duration);
  // Refit after the bar fully closes
  setTimeout(() => requestDebouncedFit(30, true), duration + 30);
  // Reconcile panel height with new bottom inset
  setTimeout(() => sizeAndPositionLayersPanel(), duration + 30);
}

function handleLayersAction(key) {
  const obj = window.mobileCanvas?.getActiveObject();
  if (!obj && !['close','panel'].includes(key)) {
    
    return;
  }

  switch (key) {
    case 'toggleVisible':
      obj.visible = !obj.visible;
      break;
    case 'toggleLock': {
      const next = !(obj.lockMovementX || obj.lockMovementY || obj.lockScalingX || obj.lockScalingY || obj.lockRotation);
      obj.set({
        lockMovementX: next,
        lockMovementY: next,
        lockScalingX: next,
        lockScalingY: next,
        lockRotation: next
      });
      break;
    }
    case 'duplicate':
      obj.clone(clone => {
        clone.set({ left: obj.left + 20, top: obj.top + 20 });
        window.mobileCanvas.add(clone);
        window.mobileCanvas.setActiveObject(clone);
      });
      break;
    case 'delete':
      window.mobileCanvas.remove(obj);
      window.mobileCanvas.discardActiveObject();
      break;
    case 'moveUp':
      if (obj.bringForward) obj.bringForward();
      break;
    case 'moveDown':
      if (obj.sendBackwards) sendBackwardsSafe(obj);
      break;
    case 'bringFront':
      window.mobileCanvas.bringToFront(obj);
      break;
    case 'sendBack':
      sendToBackSafe(obj);
      break;
    case 'panel':
      showMobileLayersPanel();
      return;
    case 'close':
      hideMobileLayersMenu();
      return;
  }

  window.mobileCanvas.requestRenderAll();
}

// Mobile Layers Panel (side drawer)
function showMobileLayersPanel() {
  const existing = document.getElementById('mobile-layers-panel');
  if (existing) return;

  const duration = motionMs();
  const isLandscape = window.innerWidth > window.innerHeight;
  const toolbarOffset = getMobileToolbarHeight();

  const overlay = document.createElement('div');
  overlay.id = 'mobile-layers-overlay';
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    background: transparent; /* no dimming */
    z-index: 15000; /* below toolbars/panel */
    pointer-events: none; /* do not block background interactions */
  `;

  const panel = document.createElement('div');
  panel.id = 'mobile-layers-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', 'Layers');
  const landscapeCss = `top: 0; right: 0; width: 35vw; height: 100dvh;`;
  const portraitCss = `left: 0; right: 0; bottom: ${toolbarOffset}px; height: 25vh;`;
  panel.style.cssText = `
    position: fixed;
    ${isLandscape ? landscapeCss : portraitCss}
    background: var(--bg-primary);
    border-left: ${isLandscape ? '3px solid var(--accent-color)' : 'none'};
    border-top: ${isLandscape ? 'none' : '3px solid var(--accent-color)'};
    box-shadow: -8px 0 24px rgba(0,0,0,0.4);
    z-index: 15000; /* behind thin bottom menus and toolbar */
    transform: translate${isLandscape ? 'X' : 'Y'}(100%);
    transition: transform ${duration}ms ease;
    display: flex;
    flex-direction: column;
    padding-bottom: env(safe-area-inset-bottom);
  `;

  // Header
  const header = document.createElement('div');
  header.style.cssText = `
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 16px; border-bottom: 1px solid var(--accent-color);
  `;
  header.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;">
      <span style="color: var(--accent-color); font-weight: 700;">Layers</span>
      <button id="layers-add-btn" aria-label="Add Layer" style="background:transparent;border:1px solid var(--accent-color);color:var(--accent-color);border-radius:8px;padding:4px 8px;">+ Add</button>
    </div>
    <div style="display:flex;align-items:center;gap:6px;">
      <button id="layers-move-up" aria-label="Move Up" style="background:transparent;border:1px solid var(--accent-color);color:var(--accent-color);border-radius:8px;padding:4px 8px;">↑</button>
      <button id="layers-move-down" aria-label="Move Down" style="background:transparent;border:1px solid var(--accent-color);color:var(--accent-color);border-radius:8px;padding:4px 8px;">↓</button>
      <button id="layers-bring-front" aria-label="Bring to Front" style="background:transparent;border:1px solid var(--accent-color);color:var(--accent-color);border-radius:8px;padding:4px 8px;">⇑</button>
      <button id="layers-send-back" aria-label="Send to Back" style="background:transparent;border:1px solid var(--accent-color);color:var(--accent-color);border-radius:8px;padding:4px 8px;">⇓</button>
      <button id="layers-close-btn" aria-label="Close" style="background: none; border: none; color: var(--accent-color); font-size: 22px;">×</button>
    </div>
  `;

  // List container
  const list = document.createElement('div');
  list.id = 'mobile-layers-list';
  list.style.cssText = `
    flex: 1; overflow: auto; padding: 8px 12px; display: flex; flex-direction: column; gap: 8px;
  `;

  panel.appendChild(header);
  panel.appendChild(list);

  const root = document.getElementById('mobile-layout') || document.body;
  root.appendChild(overlay);
  root.appendChild(panel);

  // Events
  // Do not intercept clicks; close button handles dismissal
  header.querySelector('#layers-close-btn').addEventListener('click', hideMobileLayersPanel);
  header.querySelector('#layers-add-btn').addEventListener('click', () => {
    addTextToMobileCanvas('New Layer');
    refreshMobileLayersPanel();
  });

  // Animate in and push canvas aside (no dimming)
  requestAnimationFrame(() => {
    panel.style.transform = 'translate' + (isLandscape ? 'X(0)' : 'Y(0)');
    sizeAndPositionLayersPanel();
    applyCanvasOffsetForLayersPanel(true);
    // Zoom-out slightly and recenter when panel opens
    if (!rotationLockActive) requestDebouncedFit(60, true);
    // Ensure bottom rail/menus align with panel edge
    updateBottomMenusPosition();
    // Force a relayout of the stage so the canvas area bottom includes the panel height in portrait
    requestMobileViewportLayout();
    // After transform completes, enforce exact edges in case of subpixel rounding
    setTimeout(() => sizeAndPositionLayersPanel(), motionMs() + 20);
  });

  refreshMobileLayersPanel();

  // Wire panel global ordering buttons
  const hasSel = !!(window.mobileCanvas && window.mobileCanvas.getActiveObject());
  const byId = id => header.querySelector('#' + id);
  byId('layers-move-up').addEventListener('click', () => { const o = window.mobileCanvas.getActiveObject(); if (!o) return; if (o.bringForward) o.bringForward(); window.mobileCanvas.requestRenderAll(); refreshMobileLayersPanel(); updateLayersPanelControlsState(); });
  byId('layers-move-down').addEventListener('click', () => { const o = window.mobileCanvas.getActiveObject(); if (!o) return; if (o.sendBackwards) sendBackwardsSafe(o); window.mobileCanvas.requestRenderAll(); refreshMobileLayersPanel(); updateLayersPanelControlsState(); });
  byId('layers-bring-front').addEventListener('click', () => { const o = window.mobileCanvas.getActiveObject(); if (!o) return; window.mobileCanvas.bringToFront(o); window.mobileCanvas.requestRenderAll(); refreshMobileLayersPanel(); updateLayersPanelControlsState(); });
  byId('layers-send-back').addEventListener('click', () => { const o = window.mobileCanvas.getActiveObject(); if (!o) return; sendToBackSafe(o); window.mobileCanvas.requestRenderAll(); refreshMobileLayersPanel(); updateLayersPanelControlsState(); });
  updateLayersPanelControlsState();
}

function updateLayersPanelControlsState() {
  const o = window.mobileCanvas?.getActiveObject();
  const panel = document.getElementById('mobile-layers-panel');
  if (!panel) return;
  const disable = (id, disabled) => {
    const el = panel.querySelector('#' + id);
    if (el) {
      el.disabled = disabled;
      el.style.opacity = disabled ? '0.5' : '1';
    }
  };
  const isNone = !o;
  disable('layers-move-up', isNone);
  disable('layers-move-down', isNone);
  disable('layers-bring-front', isNone);
  disable('layers-send-back', isNone);
}

function hideMobileLayersPanel() {
  const overlay = document.getElementById('mobile-layers-overlay');
  const panel = document.getElementById('mobile-layers-panel');
  if (!panel || !overlay) return;
  const isLandscape = window.innerWidth > window.innerHeight;
  const duration = motionMs();
  overlay.style.opacity = '0';
  panel.style.transform = 'translate' + (isLandscape ? 'X(100%)' : 'Y(100%)');
  setTimeout(() => {
    overlay.remove();
    panel.remove();
    applyCanvasOffsetForLayersPanel(false);
    updateBottomMenusPosition();
    requestMobileViewportLayout();
  requestDebouncedFit(30, true);
    // Ensure floating overlay buttons persist after panel close
    try {
      if (!document.getElementById('mobile-zoom-overlay')) installMobileZoomOverlay();
      if (!document.getElementById('mobile-bg-overlay')) installMobileBackgroundOverlay();
      if (!document.getElementById('mobile-layers-dock')) installMobileLayersDock();
    } catch(_) {}
  }, duration);
}

function refreshMobileLayersPanel() {
  const list = document.getElementById('mobile-layers-list');
  if (!list || !window.mobileCanvas) return;
  list.innerHTML = '';

  const objects = window.mobileCanvas.getObjects().slice().filter(o => !['snapGuideCenterX','snapGuideCenterY'].includes(o.name));
  // Topmost first
  objects.reverse();

  objects.forEach((obj, idx) => {
    const row = document.createElement('div');
    row.style.cssText = `
      display:flex; align-items:center; justify-content:space-between; gap:8px;
      padding: 8px 10px; border:1px solid var(--accent-color); border-radius:10px; background: var(--bg-primary);
    `;
    // Tap row selects object
    row.addEventListener('click', (e) => {
      // Avoid clicks on inner buttons stealing selection
      if (e.target && e.target.tagName.toLowerCase() === 'button') return;
      window.mobileCanvas.setActiveObject(obj);
      window.mobileCanvas.requestRenderAll();
      updateLayersPanelControlsState();
    });

    const left = document.createElement('div');
    left.style.cssText = 'display:flex; align-items:center; gap:10px; flex: 1; min-width:0;';
    const selectBtn = document.createElement('button');
    selectBtn.style.cssText = 'background:transparent;border:none;color:var(--accent-color);font-size:18px;';
    selectBtn.textContent = '◉';
    selectBtn.title = 'Select';
    selectBtn.addEventListener('click', () => {
      window.mobileCanvas.setActiveObject(obj);
      window.mobileCanvas.requestRenderAll();
    });

    const name = document.createElement('div');
    name.style.cssText = 'color: var(--accent-color); font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;';
    name.textContent = getReadableObjectName(obj);

    const rename = document.createElement('button');
    rename.style.cssText = 'background:transparent;border:none;color:var(--accent-color);border-radius:6px;padding:2px 6px; text-decoration: underline;';
    rename.textContent = 'Rename';
    rename.addEventListener('click', () => {
      const current = obj.name || getReadableObjectName(obj);
      const next = prompt('Layer name:', current);
      if (next && next.trim()) {
        obj.set('name', next.trim());
        name.textContent = next.trim();
      }
    });

    left.appendChild(selectBtn);
    left.appendChild(name);
    left.appendChild(rename);

    const right = document.createElement('div');
    right.style.cssText = 'display:flex; align-items:center; gap:6px;';

    const mkBtn = (label, title, handler) => {
      const b = document.createElement('button');
      b.style.cssText = 'background:transparent;border:1px solid var(--accent-color);color:var(--accent-color);border-radius:8px;padding:4px 8px;';
      b.textContent = label;
      b.title = title;
      b.addEventListener('click', handler);
      return b;
    };

    const vis = mkBtn(obj.visible === false ? '🙈' : '👁️', 'Toggle visibility', () => { obj.visible = !obj.visible; window.mobileCanvas.requestRenderAll(); refreshMobileLayersPanel(); updateLayersPanelControlsState(); });
    const lock = mkBtn(obj.lockMovementX ? '🔓' : '🔒', 'Toggle lock', () => {
      const next = !(obj.lockMovementX || obj.lockMovementY || obj.lockScalingX || obj.lockScalingY || obj.lockRotation);
      obj.set({ lockMovementX: next, lockMovementY: next, lockScalingX: next, lockScalingY: next, lockRotation: next });
      refreshMobileLayersPanel();
      updateLayersPanelControlsState();
    });
    const del = mkBtn('🗑️', 'Delete', () => { window.mobileCanvas.remove(obj); window.mobileCanvas.discardActiveObject(); window.mobileCanvas.requestRenderAll(); refreshMobileLayersPanel(); updateLayersPanelControlsState(); });

    right.appendChild(vis);
    right.appendChild(lock);
    right.appendChild(del);

    row.appendChild(left);
    row.appendChild(right);
    list.appendChild(row);
  });
  sizeAndPositionLayersPanel();
}

// Schedule a one-shot Layers UI sync on the next canvas render
function scheduleLayersSyncAfterRender() {
  const canvas = window.mobileCanvas;
  if (!canvas) return;
  const handler = () => {
    try {
      updateLayersButtonThumbnail();
      const panel = document.getElementById('mobile-layers-panel');
      if (panel) {
        refreshMobileLayersPanel();
        updateLayersPanelControlsState();
      }
    } catch(_) {}
    try { canvas.off('after:render', handler); } catch(_) {}
  };
  try { canvas.on('after:render', handler); } catch(_) {}
}

// Produce a short, human-friendly name from filenames like
// "23434 image 456 cat_sleeping.jpg" → "cat sleeping"
function humanizeAssetName(raw) {
  if (!raw || typeof raw !== 'string') return '';
  try {
    // Strip URL/query and extension, keep only base filename
    let base = raw.split('?')[0].split('#')[0];
    base = base.split('/').pop().split('\\').pop();
    base = base.replace(/\.[a-z0-9]+$/i, '');
    // Normalize separators to spaces
    base = base.replace(/[_\-.]+/g, ' ');
    // Tokenize
    let tokens = base
      .split(/\s+/)
      .map(t => t.trim())
      .filter(t => t.length > 0);
    const filler = /^(img|image|photo|picture|pic|copy|final|edited?|version|ver|scan|file|untitled|export|resized|resize|crop|cropped|raw|draft|new|old|tmp|test|result|output|layer)$/i;
    const extLike = /^(jpeg|jpg|png|gif|webp|heic|psd|ai|svg|pdf)$/i;
    const versionLike = /^v?\d{1,3}$/i;
    const mostlyDigits = /^\d{2,}$/;
    const isUuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const hasLetters = /[a-z]/i;

    // If a UUID-like or long mixed token appears, drop it and everything after
    const tailIdx = tokens.findIndex(t => isUuidLike.test(t) || (t.length >= 12 && /\d/.test(t) && hasLetters.test(t)));
    if (tailIdx >= 0) tokens = tokens.slice(0, tailIdx);

    // Clean each token: strip leading/trailing digits, and remove non-letters
    const cleaned = tokens.map(t => {
      let s = t.replace(/^\d+|\d+$/g, ''); // strip digits at ends
      if (isUuidLike.test(s)) return '';
      s = s.replace(/[^a-z]+/gi, ''); // keep letters only
      return s;
    });

    // Filter tokens: keep only real words (letters only), drop fillers and short one-letter noise (keep 'a' only if surrounded?)
    const keep = cleaned.filter((t, idx) => {
      if (!t) return false;
      if (!hasLetters.test(t)) return false;
      if (filler.test(t)) return false;
      if (extLike.test(t)) return false;
      if (versionLike.test(t)) return false;
      if (mostlyDigits.test(t)) return false;
      // drop single-letter tokens except meaningful articles 'a'/'i'
      if (t.length === 1 && t.toLowerCase() !== 'a' && t.toLowerCase() !== 'i') return false;
      return true;
    });

    let result = keep.join(' ').replace(/\s{2,}/g, ' ').trim();
    // Lowercase for a simple, natural look
    result = result.toLowerCase();
    return result;
  } catch(_) {
    return '';
  }
}
function getReadableObjectName(obj) {
  // 1) Respect explicit user-provided name, but show a humanized version if it looks like a raw filename
  if (obj.name && typeof obj.name === 'string') {
    const nice = humanizeAssetName(obj.name);
    if (nice) return nice;
    return obj.name;
  }
  // 2) Derive from source for images if possible
  const t = obj.type || 'object';
  if (t === 'image') {
    const src = (obj._originalElement && obj._originalElement.src) || obj.src || '';
    const fromSrc = humanizeAssetName(src);
    if (fromSrc) return fromSrc;
    return 'Image';
  }
  if (t === 'textbox' || t === 'text') return 'Text';
  if (t === 'rect') return 'Rectangle';
  if (t === 'circle') return 'Circle';
  if (t === 'triangle') return 'Triangle';
  if (t === 'group') return 'Group';
  return t.charAt(0).toUpperCase() + t.slice(1);
}

// --- Layers button thumbnail ---
function updateLayersButtonThumbnail() {
  try {
    const thumb = document.getElementById('mobile-layers-thumb');
    if (!thumb || !window.mobileCanvas) return;
    const active = window.mobileCanvas.getActiveObject();
    if (!active) {
      thumb.style.display = 'none';
      return;
    }
    // Render the active object into an offscreen canvas to create a tiny preview
    const bounds = active.getBoundingRect(true, true);
    const scale = 18 / Math.max(bounds.width || 1, bounds.height || 1);
    const off = document.createElement('canvas');
    off.width = Math.max(1, Math.round(bounds.width * scale));
    off.height = Math.max(1, Math.round(bounds.height * scale));
    const ctx = off.getContext('2d');
    const temp = new fabric.StaticCanvas(off, { enableRetinaScaling: false });
    const cloneOptions = { includeDefaultValues: true }; 
    active.clone((cloned) => {
      // Normalize origin and position at 0,0 for the small canvas
      cloned.set({ left: 0, top: 0, originX: 'left', originY: 'top', angle: 0 });
      const s = Math.min(off.width / (cloned.getScaledWidth() || 1), off.height / (cloned.getScaledHeight() || 1));
      cloned.scale((cloned.scaleX || 1) * s);
      temp.add(cloned);
      temp.renderAll();
      thumb.src = off.toDataURL('image/png');
      thumb.style.display = 'block';
      // Cleanup after a tick
      setTimeout(() => { temp.dispose && temp.dispose(); }, 0);
    }, cloneOptions);
  } catch (_) {
    // no-op
  }
}

// --- Long-press layers overlay ---
let layersHoldOverlayState = {
  timeoutId: null,
  isOpen: false,
  startY: 0,
  startX: 0,
  selectedIndex: -1,
  items: [],
  overlayEl: null,
  attachedButton: null
};

// Global contextmenu guard toggle for stubborn mobile browsers (e.g., Edge)
try { window.layersContextMenuGlobalGuardActive = false; } catch(_) {}
try {
  document.addEventListener('contextmenu', (e) => {
    if (window.layersContextMenuGlobalGuardActive) {
      e.preventDefault();
    }
  }, { capture: true });
} catch(_) {}

function installMobileLayersOverlayHooks() {
  // Refresh thumbnail when objects are added/removed
  if (!window.mobileCanvas) return;
  const refresh = () => updateLayersButtonThumbnail();
  window.mobileCanvas.on('object:added', refresh);
  window.mobileCanvas.on('object:removed', refresh);
  window.mobileCanvas.on('object:modified', refresh);
}

// Always-on layers dock: inline combo directly on the viewport
function installMobileLayersDock() {
  try {
    const root = document.getElementById('mobile-layout') || document.body;
    if (!root || document.getElementById('mobile-layers-dock')) return;

    // Remove legacy thumbnail-based overlay if present
    try {
      const oldBtn = document.getElementById('mobile-layers-overlay-btn');
      if (oldBtn && oldBtn.parentNode) oldBtn.parentNode.removeChild(oldBtn);
      const oldInd = document.getElementById('mobile-layers-collapsed-ind');
      if (oldInd && oldInd.parentNode) oldInd.parentNode.removeChild(oldInd);
    } catch(_) {}

    const dock = document.createElement('div');
    dock.id = 'mobile-layers-dock';
    dock.style.cssText = 'position:fixed; z-index:15006; pointer-events:none; right:20px; bottom:140px; width:64px; height:220px;';

    const col = document.createElement('div');
    col.style.cssText = 'position:absolute; inset:0; pointer-events:auto; touch-action:none;';
    dock.appendChild(col);
    root.appendChild(dock);

    const stack = document.createElement('div');
    stack.style.cssText = 'position:absolute; inset:0;';
    col.appendChild(stack);

    const ind = document.createElement('div');
    ind.style.cssText = 'position:absolute; inset:0; pointer-events:none;';
    col.appendChild(ind);

    let expanded = false;
    let reorderModeDock = false;
    let activeIdxDock = null;
    let targetIdxDock = null;
    let dragLocalYDock = null;
    let items = [];
    let els = [];
    let wheelOffset = 0; // float index for smooth rolling
    let enableTransitionsDock = false; // avoid slide-in on initial layout
    let suppressDockRebuild = false;   // guard against rebuild during internal selection updates

    function positionDock() {
      const isL = window.innerWidth > window.innerHeight;
      dock.style.right = '20px';
      if (isL) {
        const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        dock.style.top = Math.max(70, Math.round(vh / 2 - 110)) + 'px';
        dock.style.bottom = '';
      } else {
        dock.style.top = '';
        dock.style.bottom = '140px';
      }
    }
    positionDock();
    window.addEventListener('resize', positionDock, { passive: true });
    if (window.visualViewport) window.visualViewport.addEventListener('resize', positionDock);

    function rebuildStack() {
      stack.innerHTML = '';
      els = [];
      items = [];
      if (!window.mobileCanvas) return;
      items = window.mobileCanvas.getObjects().filter(o => o.selectable !== false).slice().reverse();
      if (!items.length) { ind.innerHTML = ''; return; }
      const active = window.mobileCanvas.getActiveObject() || items[0];
      const sel = Math.max(0, items.indexOf(active));
      wheelOffset = sel;
      const PREVIEW_W = 56; const PREVIEW_H = Math.round(PREVIEW_W * 0.64);
      for (let i = 0; i < items.length; i++) {
        const el = document.createElement('div');
        el.style.cssText = `position:absolute; left:50%; width:${PREVIEW_W}px; height:${PREVIEW_H}px; border-radius:10px; border:2px solid rgba(255,255,255,0.7); overflow:hidden; box-shadow:0 6px 18px rgba(0,0,0,0.28); background:transparent center/cover no-repeat;`;
        buildObjectThumbnail(items[i], 96, (src) => { el.style.backgroundImage = `url("${src}")`; });
        stack.appendChild(el);
        els.push(el);
      }
      // First layout without transitions
      enableTransitionsDock = false;
      renderDock();
      renderIndicators();
      // Enable transitions on next frame to avoid slide-in from the side
      requestAnimationFrame(() => { enableTransitionsDock = true; });
    }

    function renderIndicators() {
      if (!items.length || expanded || reorderModeDock) { ind.innerHTML = ''; return; }
      const active = window.mobileCanvas.getActiveObject() || items[0];
      const sel = Math.max(0, items.indexOf(active));
      const colRect = col.getBoundingClientRect();
      ind.style.left = '0px';
      ind.style.top = '0px';
      ind.style.width = Math.round(colRect.width) + 'px';
      ind.style.height = Math.round(colRect.height) + 'px';

      // Measure the selected element's box to position lines exactly at its edges
      const selEl = els[sel];
      if (!selEl) { ind.innerHTML = ''; return; }
      const selRect = selEl.getBoundingClientRect();
      const selTopLocal = selRect.top - colRect.top;
      const selBottomLocal = selRect.bottom - colRect.top;

      const itemH = 56;
      const baseW = Math.round(itemH * 0.95);
      const scale = 0.82;
      const startGap = 4; // ~1mm
      const spacing = Math.max(4, Math.round(itemH * 0.14));
      const lineH = 4;
      const muted = getComputedStyle(document.documentElement).getPropertyValue('--muted') || '#8b94a7';
      ind.innerHTML = '';
      // Top lines, position using selected top edge
      for (let i = 1; i <= sel; i++) {
        const w = Math.max(14, Math.round(baseW * Math.pow(scale, i - 1)));
        const y = Math.round(selTopLocal - startGap - (i - 1) * spacing - lineH);
        const line = document.createElement('div');
        line.style.cssText = `position:absolute; left:50%; transform:translateX(-50%); top:${y}px; height:${lineH}px; width:${w}px; background:${muted.trim()}; opacity:${Math.max(0.25, 0.85 - i * 0.06)}; border-radius:3px;`;
        ind.appendChild(line);
      }
      // Bottom lines, position using selected bottom edge
      const below = Math.max(0, items.length - 1 - sel);
      for (let i = 1; i <= below; i++) {
        const w = Math.max(14, Math.round(baseW * Math.pow(scale, i - 1)));
        const y = Math.round(selBottomLocal + startGap + (i - 1) * spacing);
        const line = document.createElement('div');
        line.style.cssText = `position:absolute; left:50%; transform:translateX(-50%); top:${y}px; height:${lineH}px; width:${w}px; background:${muted.trim()}; opacity:${Math.max(0.25, 0.85 - i * 0.06)}; border-radius:3px;`;
        ind.appendChild(line);
      }
    }

    function renderDock() {
      if (!items.length) return;
      const PREVIEW_W = 56; const PREVIEW_H = Math.round(PREVIEW_W * 0.64);
      const SMALL = PREVIEW_H, BIG = Math.round(PREVIEW_H * 1.2), GAP = 8, PEEK = 10;
      const rect = col.getBoundingClientRect(); const centerY = rect.height / 2;
      const yTop = centerY - (BIG / 2 + GAP + SMALL / 2);
      const yBot = centerY + (BIG / 2 + GAP + SMALL / 2);
      const sel = Math.max(0, Math.min(items.length - 1, Math.round(wheelOffset)));

      // Grid metrics for reorder mode (use consistent z-order so higher index is under lower index)
      const pad = 8; const usableH = Math.max(20, rect.height - 2 * pad);
      const uniformScaleY = Math.min(1, Math.max(0.35, (usableH - (items.length - 1) * GAP) / (items.length * SMALL)));
      const step = Math.max(6, (usableH - SMALL * uniformScaleY) / Math.max(1, items.length - 1));
      const top = rect.height / 2 - usableH / 2 + (SMALL * uniformScaleY) / 2;

      for (let i = 0; i < items.length; i++) {
        const el = els[i];
        const k = i - wheelOffset; let y = 0, scaleX = 0.92, scaleY = 0.92, opacity = 1, z = 900;
        if (reorderModeDock) {
          let displayPos = i;
          if (typeof activeIdxDock === 'number' && typeof targetIdxDock === 'number') {
            if (i < activeIdxDock && i >= targetIdxDock) displayPos = i + 1;
            else if (i > activeIdxDock && i <= targetIdxDock) displayPos = i - 1;
          }
          if (i === activeIdxDock && dragLocalYDock != null) {
            const anchorY = Math.max(SMALL * uniformScaleY / 2 + pad, Math.min(rect.height - (SMALL * uniformScaleY) / 2 - pad, dragLocalYDock));
            y = anchorY; scaleX = 1.06; scaleY = uniformScaleY; z = 1100; el.style.transition = 'none';
          } else {
            y = top + displayPos * step; scaleX = 1.0; scaleY = uniformScaleY; z = 900; el.style.transition = enableTransitionsDock ? 'transform 120ms cubic-bezier(0.22,0.61,0.36,1)' : 'none';
          }
        } else if (expanded) {
          if (k <= -1) { const b = Math.abs(k) - 1; y = yTop - b * PEEK; scaleX = 0.92; scaleY = 0.92; }
          else if (k >= 1) { const b = k - 1; y = yBot + b * PEEK; scaleX = 0.92; scaleY = 0.92; }
          else if (k > -1 && k < 0) { const t = k + 1; y = yTop + (centerY - yTop) * t; const s = 0.92 + (1.15 - 0.92) * t; scaleX = s; scaleY = s; }
          else { const t = k; y = centerY + (yBot - centerY) * t; const s = 1.15 + (0.92 - 1.15) * t; scaleX = s; scaleY = s; }
          el.style.transition = enableTransitionsDock ? 'transform 160ms cubic-bezier(0.22,0.61,0.36,1)' : 'none';
        } else {
          // collapsed: only selected visible at center, others hidden
          if (i < sel) { y = yTop - (sel - i - 1) * PEEK; opacity = 0; }
          else if (i > sel) { y = yBot + (i - sel - 1) * PEEK; opacity = 0; }
          else { y = centerY; scaleX = 1.12; scaleY = 1.12; opacity = 1; }
          el.style.transition = enableTransitionsDock ? 'transform 160ms cubic-bezier(0.22,0.61,0.36,1)' : 'none';
        }
        const translateY = Math.round(y - SMALL / 2);
        el.style.transform = `translate3d(-50%, ${translateY}px, 0) scale(${scaleX}, ${scaleY})`;
        el.style.opacity = String(opacity);
        // Stable stacking: follow canvas order (top->bottom by index), with selected above
        let zFinal = (4000 - i * 10);
        if (reorderModeDock && i === activeIdxDock) zFinal = 9000; // dragged always on top
        else if (!reorderModeDock && i === sel) zFinal += 1000;
        el.style.zIndex = String(zFinal);
        el.style.pointerEvents = (expanded || reorderModeDock) ? 'auto' : (i === sel ? 'auto' : 'none');
        el.style.borderWidth = (i === sel ? '4px' : '2px');
        el.style.borderColor = 'rgba(255,255,255,0.85)';
      }
      renderIndicators();
      const addBtn = document.querySelector('#mobile-add-overlay > button');
      if (addBtn) {
        if (expanded || reorderModeDock) {
          addBtn.style.opacity = '0.25';
          addBtn.style.pointerEvents = 'none';
          addBtn.disabled = true;
        } else {
          addBtn.style.opacity = '';
          addBtn.style.pointerEvents = 'auto';
          addBtn.disabled = false;
        }
      }
    }

    function nearestAtY(clientY) {
      const rect = col.getBoundingClientRect(); const localY = clientY - rect.top; const centerY = rect.height / 2; const PREVIEW_W = 56; const PREVIEW_H = Math.round(PREVIEW_W * 0.64); const SMALL = PREVIEW_H; const GAP = 8; const BIG = Math.round(PREVIEW_H * 1.2); const PEEK = 10; const yTop = centerY - (BIG / 2 + GAP + SMALL / 2); const yBot = centerY + (BIG / 2 + GAP + SMALL / 2);
      let best = 0, bestD = Infinity;
      for (let i = 0; i < items.length; i++) {
        let y; const k = i - wheelOffset;
        if (k <= -1) { const b = Math.abs(k) - 1; y = yTop - b * PEEK; }
        else if (k >= 1) { const b = k - 1; y = yBot + b * PEEK; }
        else if (k > -1 && k < 0) { const t = k + 1; y = yTop + (centerY - yTop) * t; }
        else { const t = k; y = centerY + (yBot - centerY) * t; }
        const d = Math.abs(localY - y); if (d < bestD) { bestD = d; best = i; }
      }
      return best;
    }

    function applyActiveFromWheel() {
      const sel = Math.max(0, Math.min(items.length - 1, Math.round(wheelOffset)));
      const obj = items[sel];
      if (obj && window.mobileCanvas) {
        suppressDockRebuild = true;
        window.mobileCanvas.setActiveObject(obj);
        window.mobileCanvas.requestRenderAll();
        // Allow rebuilds next tick
        setTimeout(() => { suppressDockRebuild = false; }, 0);
      }
    }

    function animateTo(idx) {
      const start = wheelOffset; const end = Math.max(0, Math.min(items.length - 1, idx));
      const t0 = performance.now(); const dur = 200;
      function step(ts) { const t = Math.min(1, (ts - t0) / dur); const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; wheelOffset = start + (end - start) * ease; renderDock(); if (t < 1) requestAnimationFrame(step); else applyActiveFromWheel(); }
      requestAnimationFrame(step);
    }

    function toggleExpand() { expanded = !expanded; if (!expanded) { reorderModeDock = false; activeIdxDock = null; targetIdxDock = null; dragLocalYDock = null; } renderDock(); }

    // Gesture handlers on the dock column
    let draggingDock = false, startYDock = 0, startOffDock = 0, movedDock = false;
    let longPressTimerDock = 0;
    let suppressClickUntil = 0;
    const LONG_PRESS_MS = prefersReducedMotion() ? 250 : 520;
    const MOVE_THRESH = 12;
    const STEP_PX = 56;

    function isInsideSelectedEl(clientX, clientY) {
      if (!items.length) return false;
      const sel = Math.max(0, Math.min(items.length - 1, Math.round(wheelOffset)));
      const el = els[sel]; if (!el) return false;
      const r = el.getBoundingClientRect();
      return clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom;
    }

    col.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      // Activate global guard while interacting with the dock to suppress native menus
      try { window.layersContextMenuGlobalGuardActive = true; } catch(_) {}
      // In collapsed state, only allow interaction when pressing on the visible selected item
      if (!expanded && !reorderModeDock && !isInsideSelectedEl(e.clientX, e.clientY)) {
        return; // ignore interactions outside the visible main layer
      }
      col.setPointerCapture?.(e.pointerId);
      draggingDock = true; movedDock = false; startYDock = e.clientY; startOffDock = wheelOffset;
      if (!expanded) { expanded = true; renderDock(); }
      clearTimeout(longPressTimerDock);
      longPressTimerDock = setTimeout(() => {
        if (!draggingDock || movedDock || reorderModeDock) return;
        reorderModeDock = true;
        activeIdxDock = nearestAtY(startYDock);
        wheelOffset = Math.max(0, Math.min(items.length - 1, activeIdxDock));
        const r = col.getBoundingClientRect();
        dragLocalYDock = startYDock - r.top; targetIdxDock = activeIdxDock;
        renderDock();
      }, LONG_PRESS_MS);
      e.preventDefault(); e.stopPropagation();
    }, { capture: true, passive: false });

    col.addEventListener('pointermove', (e) => {
      if (!draggingDock || !items.length) return;
      const dy = e.clientY - startYDock;
      if (!movedDock && Math.abs(dy) > MOVE_THRESH) { movedDock = true; clearTimeout(longPressTimerDock); }
      if (reorderModeDock) {
        const r = col.getBoundingClientRect();
        dragLocalYDock = e.clientY - r.top;
        // Compute target slot from flat grid metrics
        const n = Math.max(1, items.length);
        const pad = 8;
        const PREVIEW_W = 56; const PREVIEW_H = Math.round(PREVIEW_W * 0.64); const SMALL = PREVIEW_H; const GAP = 8;
        const usableH = Math.max(20, r.height - 2 * pad);
        const uniformScaleY = Math.min(1, Math.max(0.35, (usableH - (n - 1) * GAP) / (n * SMALL)));
        const step = Math.max(6, (usableH - SMALL * uniformScaleY) / Math.max(1, n - 1));
        const top = r.height / 2 - usableH / 2 + (SMALL * uniformScaleY) / 2;
        const approx = Math.round((dragLocalYDock - top) / Math.max(1, step));
        targetIdxDock = Math.max(0, Math.min(items.length - 1, approx));
        renderDock();
      } else {
        wheelOffset = Math.max(0, Math.min(items.length - 1, startOffDock - dy / STEP_PX));
        renderDock();
      }
      e.preventDefault(); e.stopPropagation();
    }, { capture: true, passive: false });

    col.addEventListener('pointerup', (e) => {
      if (!draggingDock) return; draggingDock = false; col.releasePointerCapture?.(e.pointerId);
      clearTimeout(longPressTimerDock);
      if (movedDock) suppressClickUntil = Date.now() + 300;
      if (reorderModeDock) {
        if (typeof targetIdxDock === 'number' && typeof activeIdxDock === 'number' && targetIdxDock !== activeIdxDock) {
          const [movedItem] = items.splice(activeIdxDock, 1);
          items.splice(targetIdxDock, 0, movedItem);
          const movedEl = els.splice(activeIdxDock, 1)[0];
          els.splice(targetIdxDock, 0, movedEl);
          activeIdxDock = targetIdxDock;
          applyVisualOrderToCanvas(items);
          // keep selection as moved item, and shift visuals so it remains in the selected position
          const obj = items[activeIdxDock]; if (obj && window.mobileCanvas) { window.mobileCanvas.setActiveObject(obj); window.mobileCanvas.requestRenderAll(); }
          wheelOffset = Math.round(activeIdxDock);
        }
        reorderModeDock = false; targetIdxDock = null; dragLocalYDock = null; renderDock();
      } else {
        if (!movedDock) { const idx = nearestAtY(e.clientY); animateTo(idx); }
        else { animateTo(Math.round(wheelOffset)); }
      }
      e.preventDefault(); e.stopPropagation();
      // Deactivate global guard after interaction completes
      try { window.layersContextMenuGlobalGuardActive = false; } catch(_) {}
    }, { capture: true, passive: false });

    // Tap toggles expand/collapse if not a drag
    col.addEventListener('click', (e) => {
      e.stopPropagation();
      if (Date.now() < suppressClickUntil) return;
      // In collapsed state, only toggle when clicking the visible selected item
      if (!expanded && !reorderModeDock && !isInsideSelectedEl(e.clientX, e.clientY)) return;
      toggleExpand();
    });

    // Collapse when clicking outside
    const onOutside = (e) => {
      if (!expanded && !reorderModeDock) return;
      if (dock.contains(e.target)) return;
      expanded = false; reorderModeDock = false; activeIdxDock = null; targetIdxDock = null; dragLocalYDock = null; renderDock();
    };
    document.addEventListener('pointerdown', onOutside, true);

    // Suppress native menus for the dock column and its descendants
    col.addEventListener('contextmenu', (e) => e.preventDefault(), { capture: true });
    const dockGuard = (e) => { if (e.target && e.target.closest && e.target.closest('#mobile-layers-dock')) { e.preventDefault(); } };
    document.addEventListener('contextmenu', dockGuard, { capture: true });
    document.addEventListener('dragstart', dockGuard, true);

    function refreshAll() { rebuildStack(); }
    setTimeout(refreshAll, 0);
    if (window.mobileCanvas) {
      const c = window.mobileCanvas;
      const guarded = () => { if (!suppressDockRebuild) refreshAll(); };
      ['selection:created', 'selection:cleared', 'object:added', 'object:removed', 'object:modified'].forEach(ev => c.on(ev, guarded));
    }
  } catch (_) { /* no-op */ }
}

function installMobileLayersHoldOverlay(layersButtonEl) {
  if (!layersButtonEl) return;

  const longPressMs = prefersReducedMotion() ? 200 : 320;
  try { layersButtonEl.style.touchAction = 'none'; } catch(_) {}
  layersButtonEl.addEventListener('contextmenu', (e) => { e.preventDefault(); }, { capture: true });
  const onPointerDown = (ev) => {
    if (ev.pointerType === 'mouse' && ev.button !== 0) return;
    try { ev.preventDefault(); ev.stopPropagation(); } catch(_) {}
    layersHoldOverlayState.startY = ev.clientY;
    layersHoldOverlayState.startX = ev.clientX;
    layersHoldOverlayState.attachedButton = layersButtonEl;
    clearTimeout(layersHoldOverlayState.timeoutId);
    layersHoldOverlayState.timeoutId = setTimeout(() => {
      openLayersComboOverlay(ev);
    }, longPressMs);
  };
  const cancel = () => {
    // Only cancel the pending long-press timer; do NOT close an already open overlay here
    clearTimeout(layersHoldOverlayState.timeoutId);
  };
  layersButtonEl.addEventListener('pointerdown', onPointerDown, { passive: false, capture: true });
  layersButtonEl.addEventListener('pointerup', cancel, { passive: true });
  layersButtonEl.addEventListener('pointercancel', cancel, { passive: true });
  layersButtonEl.addEventListener('pointerleave', cancel, { passive: true });
}

function openLayersHoldOverlay(ev) {
  try {
    if (!window.mobileCanvas) return;
    const objects = window.mobileCanvas.getObjects().filter(o => o.selectable !== false);
    if (!objects.length) return;

    // Determine stacking order top->bottom, compute initial selection index
    const items = objects.slice().reverse();
    const active = window.mobileCanvas.getActiveObject();
    const selectedOrig = Math.max(0, active ? items.indexOf(active) : 0);
    layersHoldOverlayState.items = items;
    layersHoldOverlayState.selectedIndex = selectedOrig;

    const overlay = document.createElement('div');
    overlay.id = 'mobile-layers-hold-overlay';
    overlay.style.cssText = `position: fixed; inset: 0; z-index: 15005; background: transparent; pointer-events: none;`;

    const stack = document.createElement('div');
    stack.style.cssText = `
      position: absolute; left: ${Math.max(8, Math.min(window.innerWidth - 60, ev.clientX - 18))}px;
      top: ${Math.max(80, Math.min(window.innerHeight - 80, ev.clientY - 18))}px;
      width: 36px; padding: 0; border-radius: 8px; background: transparent;
      border: none; box-shadow: none;
      pointer-events: auto; max-height: ${Math.round(window.innerHeight * 0.6)}px; overflow: auto; touch-action: none;`;

    const rows = [];
    items.forEach((obj, idx) => {
      const row = document.createElement('div');
      row.style.cssText = `position:relative; display:flex; align-items:center; justify-content:center; width:32px; height:32px; padding:0; border-radius:6px;
        border: none; background: transparent; transition: transform 90ms ease-out;`;
      row.setAttribute('data-index', String(idx));
      const img = document.createElement('img');
      img.style.cssText = 'width:32px; height:32px; border-radius:6px; border:1px solid var(--accent-color); object-fit:cover; background: var(--bg-primary);';
      buildObjectThumbnail(obj, 32, (src) => { img.src = src; });
      row.appendChild(img);
      // Store reference to thumbnail for selection highlighting
      row._thumb = img;
      stack.appendChild(row);
      rows.push(row);
      // Tap to select this layer when the overlay is open
      row.addEventListener('click', (e) => {
        e.stopPropagation();
        const targetObj = items[idx];
        if (targetObj && window.mobileCanvas) {
          window.mobileCanvas.setActiveObject(targetObj);
          window.mobileCanvas.requestRenderAll();
        }
        // Visual feedback and highlight for newly selected row
        try {
          updateHoldOverlaySelection(idx);
          img.style.transition = 'transform 120ms ease';
          img.style.transform = 'scale(1.06)';
          setTimeout(() => { img.style.transform = 'scale(1)'; }, 140);
        } catch(_) {}
      });
    });

    overlay.appendChild(stack);
    document.body.appendChild(overlay);
    // Hide collapsed indicators while combo is open
    const wasDisplay = collapsedInd.style.display;
    collapsedInd.style.display = 'none';
    layersHoldOverlayState.overlayEl = overlay;
    layersHoldOverlayState.isOpen = true;

    // Morph effect: align stack over the button and hide the button visuals while open
    try {
      const btnWrap = document.getElementById('mobile-layers-overlay-btn');
      const toggleBtn = btnWrap ? btnWrap.querySelector('button') : null;
      if (btnWrap && toggleBtn) {
        const btnRect = btnWrap.getBoundingClientRect();
        // Align horizontally so the 36px stack centers over the button
        const desiredLeft = Math.round(btnRect.left + (btnRect.width - 36) / 2);
        stack.style.left = desiredLeft + 'px';
        // Hide the button visuals (but keep wrapper for arrow positioning)
        toggleBtn.dataset.prevOpacity = toggleBtn.style.opacity || '';
        toggleBtn.dataset.prevPointer = toggleBtn.style.pointerEvents || '';
        toggleBtn.style.opacity = '0';
        toggleBtn.style.pointerEvents = 'none';
        layersHoldOverlayState._toggleBtn = toggleBtn;
      }
    } catch (_) {}

    // Show small left arrow next to the overlay button to open full Layers panel
    try {
      const btnWrap = document.getElementById('mobile-layers-overlay-btn');
      if (btnWrap && !document.getElementById('mobile-layers-overlay-arrow')) {
        const arrow = document.createElement('button');
        arrow.id = 'mobile-layers-overlay-arrow';
        arrow.setAttribute('aria-label', 'Open Layers Panel');
        arrow.style.cssText = `
          position: absolute;
          left: -44px;
          top: 2px;
          width: 40px; height: 40px;
          border-radius: 20px;
          border: 2px solid var(--accent-color);
          background: var(--bg-primary);
          color: var(--accent-color);
          display:flex; align-items:center; justify-content:center;
          box-shadow: 0 2px 10px rgba(0,0,0,0.25);
          pointer-events: auto;
        `;
        arrow.textContent = '◀';
        arrow.addEventListener('click', (e) => {
          e.stopPropagation();
          closeLayersHoldOverlay();
          showMobileLayersPanel();
        });
        btnWrap.appendChild(arrow);
      }
    } catch (_) {}

    // Slot layout and order model
    const rowHeights = rows.map(r => r.getBoundingClientRect().height);
    const gap = 6;
    const slotsY = [];
    let acc = 0;
    for (let i = 0; i < rows.length; i++) { slotsY.push(acc); acc += rowHeights[i] + gap; }
    stack.style.height = Math.min(acc, Math.round(window.innerHeight * 0.6)) + 'px';

    // Order array maps position -> rowIndex
    let order = rows.map((_, i) => i);
    // Helper to render all rows from order
    function renderAll(extraTranslateForIndex = -1, extraDy = 0) {
      for (let pos = 0; pos < order.length; pos++) {
        const rowIndex = order[pos];
        const row = rows[rowIndex];
        const baseY = slotsY[pos];
        if (rowIndex === extraTranslateForIndex) {
          row.style.transform = `translateY(${baseY + extraDy}px)`;
        } else {
          row.style.transform = `translateY(${baseY}px)`;
        }
        row.style.position = 'absolute';
        row.style.left = '2px';
        row.style.right = 'auto';
        row.style.width = '32px';
      }
    }
    renderAll();

    // Make any row draggable by press-and-drag within the overlay
    // Helper to center a given row index (by row index, not position) at the button's anchor
    function centerRowAt(rowIndex) {
      try {
        const btnWrap = document.getElementById('mobile-layers-overlay-btn');
        const btnRect = btnWrap ? btnWrap.getBoundingClientRect() : null;
        const pos = order.indexOf(rowIndex);
        if (!btnRect || pos < 0) return;
        const stackRect = stack.getBoundingClientRect();
        const rowH = rowHeights[rowIndex] || 32;
        const desiredTop = Math.round(btnRect.top + btnRect.height / 2 - rowH / 2);
        const currentRowTop = Math.round(stackRect.top + slotsY[pos]);
        const delta = desiredTop - currentRowTop;
        const currentTop = parseInt(stack.style.top || '0', 10) || Math.round(stackRect.top);
        stack.style.top = (currentTop + delta) + 'px';
      } catch (_) {}
    }

    rows.forEach((r, i) => {
      r.addEventListener('pointerdown', (pd) => {
        pd.stopPropagation();
        const dragIndex = i;
        let startY = pd.clientY;
        let moved = false;
        const onMoveDrag = (e) => {
          if (!layersHoldOverlayState.isOpen) return;
          const currentPos = order.indexOf(dragIndex);
          const center = slotsY[currentPos] + (rowHeights[dragIndex] / 2) + (e.clientY - startY);
          // Find nearest slot position
          let nearestPos = 0, best = Infinity;
          for (let p = 0; p < order.length; p++) {
            const c = slotsY[p] + (rowHeights[order[p]] / 2);
            const d = Math.abs(center - c);
            if (d < best) { best = d; nearestPos = p; }
          }
          if (nearestPos !== currentPos) {
            // Move dragIndex within order
            order.splice(currentPos, 1);
            order.splice(nearestPos, 0, dragIndex);
            // Reset anchor to avoid cumulative drift
            startY = e.clientY;
            moved = true;
            renderAll();
            updateHoldOverlaySelection(dragIndex);
          } else {
            // Render with extra translation for smoothness
            const dy = e.clientY - startY;
            renderAll(dragIndex, dy);
          }
          e.preventDefault();
        };
        const onUp = (e) => {
          window.removeEventListener('pointermove', onMoveDrag, true);
          window.removeEventListener('pointerup', onUp, true);
          if (!moved) { renderAll(); return; }
          // Apply order to Fabric: order[0] is top-most visual; convert to items array order (top->bottom)
          const newOrderItems = order.map(idx => items[idx]);
          applyVisualOrderToCanvas(newOrderItems);
          const droppedObj = items[dragIndex];
          if (droppedObj) { window.mobileCanvas.setActiveObject(droppedObj); window.mobileCanvas.requestRenderAll(); }
          updateLayersButtonThumbnail();
          renderAll();
          // Center the dropped row at the selected layer position (button anchor)
          try { centerRowAt(dragIndex); } catch(_) {}
          e.preventDefault();
        };
        window.addEventListener('pointermove', onMoveDrag, { capture: true, passive: false });
        window.addEventListener('pointerup', onUp, { capture: true, passive: false });
      });
      // Tap to select and center without reordering
      r.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = i;
        const targetObj = items[idx];
        if (targetObj && window.mobileCanvas) {
          window.mobileCanvas.setActiveObject(targetObj);
          window.mobileCanvas.requestRenderAll();
        }
        updateHoldOverlaySelection(idx);
        centerRowAt(idx);
      });
    });

    // Selected row visual emphasis
    let selRow = rows[selectedOrig];
    selRow.style.zIndex = '2';
    selRow.style.boxShadow = '0 6px 16px rgba(0,0,0,0.35)';
    selRow.style.transition = 'none';
    selRow.style.transform = `translateY(${slotsY[selectedOrig]}px)`;

    // Selection highlighting helper
    function updateHoldOverlaySelection(activeIdx) {
      rows.forEach((row, i) => {
        const thumb = row._thumb || row.querySelector('img');
        if (!thumb) return;
        if (i === activeIdx) {
          thumb.style.border = '2px solid var(--accent-color)';
          row.style.background = 'rgba(244,160,18,0.12)';
        } else {
          thumb.style.border = '1px solid var(--accent-color)';
          row.style.background = 'transparent';
        }
      });
    }
    // Initial highlight
    updateHoldOverlaySelection(selectedOrig);

    // Shift the whole stack so the selected layer sits under the finger/button
    try {
      const desiredTop = Math.max(60, Math.min(window.innerHeight - 60, (ev.clientY || 0) - Math.round((rowHeights && rowHeights[selectedOrig] ? rowHeights[selectedOrig] : 32) / 2)));
      const stackRect = stack.getBoundingClientRect();
      const currentSelTop = Math.round(stackRect.top + slotsY[selectedOrig]);
      const delta = desiredTop - currentSelTop;
      const currentTop = parseInt(stack.style.top || '0', 10) || Math.round(stackRect.top);
      const nextTop = currentTop + delta;
      stack.style.top = nextTop + 'px';
    } catch (_) { /* no-op */ }

    const selectedHalf = rowHeights[selectedOrig] / 2;
    const getRelativeY = (clientY) => {
      const rect = stack.getBoundingClientRect();
      return Math.max(0, Math.min(rect.height, (clientY - rect.top) + stack.scrollTop));
    };

    let currentTargetIndex = selectedOrig;
    const onMove = (e) => {
      if (!layersHoldOverlayState.isOpen) return;
      const relY = getRelativeY(e.clientY);
      const selY = Math.max(0, Math.min(acc - rowHeights[selectedOrig], relY - selectedHalf));
      selRow.style.transform = `translateY(${selY}px)`;
      // Nearest slot center decides target index, based on selected row center
      const selCenter = selY + selectedHalf;
      let targetIndex = 0, best = Infinity;
      for (let i = 0; i < slotsY.length; i++) {
        const center = slotsY[i] + (rowHeights[i] / 2);
        const d = Math.abs(selCenter - center);
        if (d < best) { best = d; targetIndex = i; }
      }
      if (targetIndex !== currentTargetIndex) {
        currentTargetIndex = targetIndex;
        // Re-render rows based on current order model
        renderAll();
      }
      // Auto-scroll when near edges
      const rect = stack.getBoundingClientRect();
      if (e.clientY - rect.top < 24) {
        stack.scrollTop = Math.max(0, stack.scrollTop - 12);
      } else if (rect.bottom - e.clientY < 24) {
        const maxScroll = Math.max(0, stack.scrollHeight - stack.clientHeight);
        stack.scrollTop = Math.min(maxScroll, stack.scrollTop + 12);
      }
      // Open full panel if sliding left sufficiently
      if (e.clientX - layersHoldOverlayState.startX < -50) {
        closeLayersHoldOverlay();
        showMobileLayersPanel();
        return;
      }
      e.preventDefault();
      e.stopPropagation();
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove, true);
      window.removeEventListener('pointerup', onUp, true);
      // Build new top->bottom order with selected at target index
      const orderIdxs = rows.map((_, i) => i).filter(i => i !== selectedOrig);
      orderIdxs.splice(currentTargetIndex, 0, selectedOrig);
      const newOrder = orderIdxs.map(idx => items[idx]);
      applyVisualOrderToCanvas(newOrder);
      // keep selection
      const draggedObj = items[selectedOrig];
      if (draggedObj) {
        window.mobileCanvas.setActiveObject(draggedObj);
        window.mobileCanvas.requestRenderAll();
      }
      updateLayersButtonThumbnail();
      // Update highlight to dropped index
      try { updateHoldOverlaySelection(currentTargetIndex); } catch(_) {}
      // Do not close; overlay remains until outside tap
    };
    window.addEventListener('pointermove', onMove, { capture: true, passive: false });
    window.addEventListener('pointerup', onUp, { capture: true, passive: true });

  } catch (_) {
    // no-op
  }
}
// Refined combo-lock layers overlay (rolling + long-press reorder)
function openLayersComboOverlay(ev) {
  try {
    if (!window.mobileCanvas) return;
    const objects = window.mobileCanvas.getObjects().filter(o => o.selectable !== false);
    if (!objects.length) return;

    const items = objects.slice().reverse(); // top -> bottom display
    const active = window.mobileCanvas.getActiveObject();
    let wheelOffset = Math.max(0, active ? items.indexOf(active) : 0); // float index
    let reorderMode = false, longPress = 0, moved = false;
    let dragging = false, startY = 0, startOff = 0;
    let activeIdx = null, targetIdx = null, dragLocalY = null;
    const LONG_MS = prefersReducedMotion() ? 250 : 520;
    // Responsive sizing so previews are not oversized on mobile
    const isLandscape = window.innerWidth > window.innerHeight;
    let PREVIEW_W = Math.round(Math.min(72, Math.max(48, window.innerWidth * 0.14)));
    // Make the lock a bit smaller in landscape to avoid overlapping other buttons
    if (isLandscape) {
      PREVIEW_W = Math.round(Math.max(44, Math.min(60, PREVIEW_W)));
    }
    const PREVIEW_H = Math.round(PREVIEW_W * 0.64); // ~16:10 aspect
    const SMALL = PREVIEW_H;
    // Make center slot only moderately larger to keep neighbors in view
    const BIG   = (items.length <= 2) ? Math.round(PREVIEW_H * 1.18) : Math.round(PREVIEW_H * 1.28);
    const GAP   = Math.max(6, Math.round(PREVIEW_H * 0.12));
    const PEEK  = Math.max(6, Math.round(PREVIEW_H * 0.10));
    const STEP_PX = Math.max(36, Math.round(PREVIEW_H));

    const overlay = document.createElement('div');
    overlay.id = 'mobile-layers-combo-overlay';
    overlay.style.cssText = 'position:fixed; inset:0; z-index:15005; background:transparent; pointer-events:none;';
    const col = document.createElement('div');
    // Column height sized to comfortably show center + 1 full neighbor above and below
    const desiredH = BIG + 2 * (SMALL + GAP) + 20;
    const colH = Math.min(Math.round(window.innerHeight * 0.8), Math.max(240, Math.min(520, desiredH)));
    col.style.cssText = `position:absolute; width:${PREVIEW_W}px; height:${colH}px; left:0; right:0; margin:0 auto; pointer-events:auto; touch-action:none; background:transparent;`;
    overlay.appendChild(col);
    // Indicators layer for collapsed view (horizontal lines), reused in combo
    const indLayer = document.createElement('div');
    indLayer.style.cssText = 'position:absolute; inset:0; pointer-events:none; z-index:2000;';
    // Append inside the column so coordinates are relative to the combo, not the whole viewport
    col.appendChild(indLayer);
    document.body.appendChild(overlay);
    // Activate global guard for the duration of the combo overlay
    try { window.layersContextMenuGlobalGuardActive = true; } catch(_) {}

    const btnWrap = document.getElementById('mobile-layers-overlay-btn');
    // Default position near click; overridden by button anchoring below
    col.style.top = Math.max(60, Math.min(window.innerHeight - colH - 20, ev.clientY - Math.round(colH / 2))) + 'px';
    if (btnWrap) {
      const r = btnWrap.getBoundingClientRect();
      // Center overlay over the layers button for both orientations
      const desiredLeft = Math.round(r.left + (r.width - parseInt(col.style.width || '0', 10)) / 2);
      const desiredTop = Math.round(r.top + (r.height - colH) / 2);
      col.style.left = desiredLeft + 'px';
      col.style.top = Math.max(10, Math.min(window.innerHeight - colH - 10, desiredTop)) + 'px';
      col.style.right = 'auto';
      col.style.margin = '0';
      // Dim + button while open
      const addBtn = document.querySelector('#mobile-add-overlay > button');
      if (addBtn) { addBtn.style.opacity = '0.25'; addBtn.style.pointerEvents = 'none'; addBtn.disabled = true; }
    }

    const els = items.map(() => {
      const el = document.createElement('div');
      el.className = 'mobile-layer-item';
      el.style.cssText = `position:absolute; left:50%; width:${PREVIEW_W}px; height:${PREVIEW_H}px; border-radius:10px; border:2px solid rgba(255,255,255,0.7); transform:translate3d(-50%,0,0); will-change:transform; background:#10141c center/cover no-repeat; overflow:hidden; box-shadow:0 6px 18px rgba(0,0,0,0.28);`;
      col.appendChild(el);
      return el;
    });

    // thumbnails
    items.forEach((obj, i) => {
      const el = els[i];
      buildObjectThumbnail(obj, Math.max(PREVIEW_W, PREVIEW_H), (src) => {
        el.style.backgroundImage = `url("${src}")`;
      });
    });

    // Helpers for reorder grid metrics
    function gridMetrics() {
      const n = Math.max(1, items.length);
      const pad = 8;
      const usableH = Math.max(20, colH - 2 * pad);
      const uniformScaleY = Math.min(1, Math.max(0.35, (usableH - (n - 1) * GAP) / (n * SMALL)));
      const step = Math.max(6, (usableH - SMALL * uniformScaleY) / Math.max(1, n - 1));
      const top = (colH / 2) - usableH / 2 + (SMALL * uniformScaleY) / 2;
      return { top, step, uniformScaleY };
    }

    // Initial render so all items are positioned before any drag
    render();

    function render() {
      // Use the explicit column height for stable math
      const centerY = (typeof colH === 'number' ? colH / 2 : (col.getBoundingClientRect().height / 2));
      const sel = Math.max(0, Math.min(items.length - 1, Math.round(wheelOffset)));
      for (let i = 0; i < items.length; i++) {
        const el = els[i];
        let y = 0, scale = 0.92, opacity = 0.95, z = 0;
        let scaleX = scale, scaleY = scale; // allow non-uniform scaling when needed
        if (reorderMode) {
          // Uniform flat grid that always fits available height (landscape or portrait)
          const { top, step, uniformScaleY } = gridMetrics();

          let displayPos = i;
          if (typeof activeIdx === 'number' && typeof targetIdx === 'number') {
            if (i < activeIdx && i >= targetIdx) displayPos = i + 1; // rows between move down
            else if (i > activeIdx && i <= targetIdx) displayPos = i - 1; // rows between move up
          }

          if (i === activeIdx && dragLocalY != null) {
            const pad = 8;
            const anchorY = Math.max(SMALL * uniformScaleY / 2 + pad, Math.min(colH - (SMALL * uniformScaleY) / 2 - pad, dragLocalY));
            y = anchorY; opacity = 1.0; z = 1100; el.style.transition = 'none';
          } else {
            y = top + displayPos * step; opacity = 1.0; z = 900; el.style.transition = 'transform 120ms cubic-bezier(0.22,0.61,0.36,1)';
          }

          // Apply uniform vertical squeeze (including dragged item) to fit all rows
          scaleX = 1.0;
          scaleY = uniformScaleY;
        } else {
          const yTop = centerY - (BIG/2 + GAP + SMALL/2);
          const yBot = centerY + (BIG/2 + GAP + SMALL/2);
          const k = i - wheelOffset;
          if (k <= -1) { const b = Math.abs(k) - 1; y = yTop - b * PEEK; scale = 0.92; opacity = 0.85 - Math.min(0.5,b*0.05); z = 1000 - Math.round(Math.abs(k)*10); }
          else if (k >= 1) { const b = k - 1; y = yBot + b * PEEK; scale = 0.92; opacity = 0.85 - Math.min(0.5,b*0.05); z = 1000 - Math.round(Math.abs(k)*10); }
          else if (k > -1 && k < 0) { const t = k + 1; y = yTop + (centerY - yTop) * t; scale = 0.92 + (1.15 - 0.92) * t; opacity = 0.9 + (1.0 - 0.9) * t; z = 1000 - Math.round(Math.abs(k)*10); }
          else { const t = k; y = centerY + (yBot - centerY) * t; scale = 1.15 + (0.92 - 1.15) * t; opacity = 1.0 + (0.9 - 1.0) * t; z = 1000 - Math.round(Math.abs(k)*10); }
          el.style.transition = dragging ? 'none' : 'transform 160ms cubic-bezier(0.22,0.61,0.36,1)';
          scaleX = scale; scaleY = scale;
        }
        const translateY = (y - SMALL/2);
        el.style.zIndex = String(z || 900);
        el.style.transform = `translate3d(-50%, ${translateY}px, 0) scale(${scaleX}, ${scaleY})`;
        el.style.opacity = String(opacity);
        el.style.borderWidth = (i === sel ? '4px' : '2px');
        el.style.borderColor = 'rgba(255,255,255,0.85)';
      }
      // Update collapsed indicators (hidden counts) at the edges like the test page
      indLayer.innerHTML = '';
      const aboveCount = sel;
      const belowCount = Math.max(0, items.length - 1 - sel);
      const maxW = SMALL;
      const baseW = Math.round(maxW * 0.95);
      const scale = 0.82;
      const spacing = Math.max(6, Math.round(SMALL * 0.22));
      const startGap = Math.max(8, Math.round(SMALL * 0.25));
      const color = getComputedStyle(document.documentElement).getPropertyValue('--muted') || '#8b94a7';
      // Top stack lines
      for (let i = 1; i <= aboveCount; i++) {
        const w = Math.max(14, Math.round(baseW * Math.pow(scale, i - 1)));
        const y = Math.round(centerY - (SMALL / 2) - startGap - i * spacing);
        const line = document.createElement('div');
        line.style.cssText = `position:absolute; left:50%; transform:translateX(-50%); top:${y}px; height:4px; width:${w}px; background:${color.trim()}; opacity:${Math.max(0.25, 0.85 - i * 0.06)}; border-radius:3px;`;
        indLayer.appendChild(line);
      }
      // Bottom stack lines
      for (let i = 1; i <= belowCount; i++) {
        const w = Math.max(14, Math.round(baseW * Math.pow(scale, i - 1)));
        const y = Math.round(centerY + (SMALL / 2) + startGap + i * spacing);
        const line = document.createElement('div');
        line.style.cssText = `position:absolute; left:50%; transform:translateX(-50%); top:${y}px; height:4px; width:${w}px; background:${color.trim()}; opacity:${Math.max(0.25, 0.85 - i * 0.06)}; border-radius:3px;`;
        indLayer.appendChild(line);
      }
    }

    function applyActiveFromWheel() {
      const sel = Math.max(0, Math.min(items.length - 1, Math.round(wheelOffset)));
      const obj = items[sel];
      if (obj && window.mobileCanvas) {
        window.mobileCanvas.setActiveObject(obj);
        window.mobileCanvas.requestRenderAll();
      }
    }

    function animateTo(idx) {
      const start = wheelOffset; const end = Math.max(0, Math.min(items.length - 1, idx));
      const t0 = performance.now(); const dur = 200;
      function step(ts){ const t = Math.min(1,(ts-t0)/dur); const ease = t<0.5?2*t*t:-1+(4-2*t)*t; wheelOffset = start + (end-start)*ease; render(); if(t<1) requestAnimationFrame(step); else applyActiveFromWheel(); }
      requestAnimationFrame(step);
    }

    function nearestAtY(clientY){
      const rect = col.getBoundingClientRect(); const localY = clientY - rect.top; const centerY = rect.height/2; const yTop = centerY - (BIG/2 + GAP + SMALL/2); const yBot = centerY + (BIG/2 + GAP + SMALL/2);
      let best=0, bestD=Infinity; for(let i=0;i<items.length;i++){ let y; const k = i - wheelOffset; if(k<=-1){const b=Math.abs(k)-1;y=yTop-b*PEEK;} else if(k>=1){const b=k-1;y=yBot+b*PEEK;} else if(k>-1&&k<0){const t=k+1;y=yTop+(centerY-yTop)*t;} else {const t=k;y=centerY+(yBot-centerY)*t;} const d=Math.abs(localY-y); if(d<bestD){bestD=d;best=i;} } return best;
    }

    const onDown = (e)=>{
      if (e.pointerType==='mouse' && e.button!==0) return;
      dragging = true; moved = false; reorderMode = false; activeIdx = null; targetIdx = null; dragLocalY = null;
      startY = e.clientY; startOff = wheelOffset; col.setPointerCapture?.(e.pointerId);
      clearTimeout(longPress); longPress = setTimeout(()=>{ if(!moved){ reorderMode=true; activeIdx = nearestAtY(startY); wheelOffset = Math.max(0, Math.min(items.length-1, activeIdx)); const rect = col.getBoundingClientRect(); dragLocalY = startY - rect.top; targetIdx = activeIdx; render(); } }, LONG_MS);
      e.preventDefault();
    };
    const onMove = (e)=>{
      if(!dragging) return; const dyTotal = e.clientY - startY; if(!moved && Math.abs(dyTotal) > 16){ moved = true; clearTimeout(longPress); }
      if (reorderMode) {
        const rect = col.getBoundingClientRect(); dragLocalY = e.clientY - rect.top;
        // Snap preview: compute target from grid instead of nearest stacked layout
        const { top, step } = gridMetrics();
        const localY = dragLocalY;
        const approx = Math.round((localY - top) / Math.max(1, step));
        targetIdx = Math.max(0, Math.min(items.length - 1, approx));
        render();
      }
      else { wheelOffset = Math.max(0, Math.min(items.length - 1, startOff - (e.clientY - startY) / STEP_PX)); render(); }
      e.preventDefault();
    };
    const onUp = (e)=>{
      if(!dragging) return; dragging=false; clearTimeout(longPress);
      if (reorderMode) {
        if (typeof targetIdx==='number' && targetIdx!==activeIdx) {
          const [movedItem] = items.splice(activeIdx, 1);
          items.splice(targetIdx, 0, movedItem);
          // Sync visual nodes order to prevent snap-back
          const movedEl = els.splice(activeIdx, 1)[0];
          els.splice(targetIdx, 0, movedEl);
          activeIdx = targetIdx;
          applyVisualOrderToCanvas(items);
        }
        reorderMode=false; targetIdx=null; dragLocalY=null; wheelOffset = Math.round(activeIdx ?? wheelOffset); render(); applyActiveFromWheel();
      } else if (!moved) { const idx = nearestAtY(e.clientY); animateTo(idx); }
      else { animateTo(Math.round(wheelOffset)); }
      e.preventDefault();
    };

    col.addEventListener('pointerdown', onDown, { passive:false, capture:true });
    col.addEventListener('pointermove', onMove, { passive:false, capture:true });
    col.addEventListener('pointerup', onUp, { passive:false, capture:true });
    col.addEventListener('pointercancel', onUp, { passive:false, capture:true });

    // Suppress native context menus within the combo overlay
    overlay.addEventListener('contextmenu', (e) => e.preventDefault(), { capture: true });
    col.addEventListener('contextmenu', (e) => e.preventDefault(), { capture: true });
    const comboGuard = (e) => { if (e.target && e.target.closest && e.target.closest('#mobile-layers-combo-overlay')) { e.preventDefault(); } };
    document.addEventListener('contextmenu', comboGuard, { capture: true });
    document.addEventListener('dragstart', comboGuard, true);

    function close(){
      try{ document.body.removeChild(overlay); }catch(_){}
      const addBtn = document.querySelector('#mobile-add-overlay > button');
      if (addBtn) { addBtn.style.opacity = ''; addBtn.style.pointerEvents = 'auto'; addBtn.disabled = false; }
      try { collapsedInd.style.display = wasDisplay || 'block'; } catch(_) {}
      // detach selection sync
      try {
        if (window.mobileCanvas && onSelChange) {
          window.mobileCanvas.off('selection:created', onSelChange);
          window.mobileCanvas.off('selection:updated', onSelChange);
          window.mobileCanvas.off('selection:cleared', onSelChange);
        }
      } catch(_) {}
      try { layersHoldOverlayState.comboCtx = null; } catch(_) {}
      // Deactivate global guard now that combo is closed
      try { window.layersContextMenuGlobalGuardActive = false; } catch(_) {}
    }
    const outside = (e)=>{ if (!overlay.contains(e.target)) { close(); } };
    setTimeout(()=>{ document.addEventListener('pointerdown', outside, true); }, 0);

    // Selection sync: auto-scroll combo when canvas selection changes
    const onSelChange = () => {
      try {
        const activeObj = window.mobileCanvas?.getActiveObject();
        if (!activeObj) return;
        const idx = items.indexOf(activeObj);
        if (idx >= 0) animateTo(idx);
      } catch(_) {}
    };
    try {
      if (window.mobileCanvas) {
        window.mobileCanvas.on('selection:created', onSelChange);
        window.mobileCanvas.on('selection:updated', onSelChange);
        window.mobileCanvas.on('selection:cleared', onSelChange);
      }
    } catch(_) {}
    try {
      layersHoldOverlayState.comboCtx = {
        isOpen: true,
        animateTo: (i) => { try { if (typeof i === 'number') animateTo(i); } catch(_) {} },
        getIndexForObject: (obj) => { try { return items.indexOf(obj); } catch(_) { return -1; } }
      };
    } catch(_) {}
  } catch(_) { /* no-op */ }
}

function closeLayersHoldOverlay() {
  layersHoldOverlayState.isOpen = false;
  layersHoldOverlayState.suppressClickTs = Date.now() + 250;
  if (layersHoldOverlayState.overlayEl && layersHoldOverlayState.overlayEl.parentNode) {
    layersHoldOverlayState.overlayEl.parentNode.removeChild(layersHoldOverlayState.overlayEl);
  }
  layersHoldOverlayState.overlayEl = null;
  // Remove arrow button if present
  const arrow = document.getElementById('mobile-layers-overlay-arrow');
  if (arrow && arrow.parentNode) arrow.parentNode.removeChild(arrow);
  // Restore overlay button visuals if we hid them
  try {
    const t = layersHoldOverlayState._toggleBtn;
    if (t) {
      t.style.opacity = t.dataset.prevOpacity || '';
      t.style.pointerEvents = t.dataset.prevPointer || '';
      delete layersHoldOverlayState._toggleBtn;
    }
  } catch (_) {}
}

function applyVisualOrderToCanvas(itemsTopToBottom) {
  // itemsTopToBottom[0] should be brought to front, etc.
  try {
    if (!window.mobileCanvas) return;
    // Ensure background stays at bottom by excluding it from reordering
    if (mobileBackgroundRect) {
      itemsTopToBottom = itemsTopToBottom.filter(o => o !== mobileBackgroundRect);
    }
    // Bring from bottom to top to preserve order
    for (let i = itemsTopToBottom.length - 1; i >= 0; i--) {
      const obj = itemsTopToBottom[i];
      obj.bringToFront();
    }
    // Reassert background to bottom just in case
    if (mobileBackgroundRect) {
      try { window.mobileCanvas.sendToBack(mobileBackgroundRect); } catch(_) {}
    }
    window.mobileCanvas.requestRenderAll();
  } catch (_) {}
}

function buildObjectThumbnail(obj, size, cb) {
  try {
    const off = document.createElement('canvas');
    off.width = size; off.height = size;
    const temp = new fabric.StaticCanvas(off, { enableRetinaScaling: false });
    obj.clone((cloned) => {
      cloned.set({ left: 0, top: 0, originX: 'left', originY: 'top', angle: 0 });
      const s = Math.min(size / (cloned.getScaledWidth() || 1), size / (cloned.getScaledHeight() || 1));
      cloned.scale((cloned.scaleX || 1) * s);
      // Center within square
      const dx = (size - cloned.getScaledWidth()) / 2;
      const dy = (size - cloned.getScaledHeight()) / 2;
      cloned.set({ left: dx, top: dy });
      temp.add(cloned);
      temp.renderAll();
      cb(off.toDataURL('image/png'));
      setTimeout(() => { temp.dispose && temp.dispose(); }, 0);
    });
  } catch (_) {
    cb('');
  }
}

function showMobileZoomMenu() {
  const menu = createMobileSlideUpMenu('Zoom Controls', [
    { icon: '🔍➖', text: 'Zoom Out', action: () => {
      mobileCanvasZoomOut();
    }},
            { icon: '🔍⬜', text: 'Fit to Screen', action: () => {
          requestDebouncedFit(0, false);
        }},
        { icon: '🔍➕', text: 'Zoom In', action: () => {
          mobileCanvasZoomIn();
    }}
  ]);
}
    
    // Transform Menu - thin menu that pushes up viewport
    function showMobileTransformMenu() {
      const existingMenu = document.getElementById('mobile-transform-menu');
      if (existingMenu) {
        hideMobileTransformMenu();
        return;
      }
      
      ensureBottomRail();
      const transformMenu = document.createElement('div');
      transformMenu.id = 'mobile-transform-menu';
      const isLandscape = window.innerWidth > window.innerHeight;
      const toolbarOffset = getMobileToolbarHeight();
      const duration = motionMs();
      
      transformMenu.style.cssText = `
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 50px;
        background: var(--bg-primary);
        border-top: 2px solid var(--accent-color);
        display: flex;
        align-items: center;
        justify-content: flex-start;
        gap: 8px;
        padding: 8px 16px;
        overflow-x: auto;
        overflow-y: hidden;
        scrollbar-width: none;
        -ms-overflow-style: none;
        box-sizing: border-box;
        z-index: 15001;
        transform: translateY(100%);
        transition: transform ${duration}ms ease;
        box-shadow: 0 -2px 8px rgba(0,0,0,0.2);
        pointer-events: auto;
      `;
      
      const transformActions = [
        { icon: '⬆️', action: 'bringFront', tooltip: 'Bring to Front' },
        { icon: '⬇️', action: 'sendBack', tooltip: 'Send to Back' },
        { icon: '↺', action: 'rotateLeft', tooltip: 'Rotate Left' },
        { icon: '↻', action: 'rotateRight', tooltip: 'Rotate Right' },
        { icon: '⇄', action: 'flipH', tooltip: 'Flip Horizontal' },
        { icon: '⇅', action: 'flipV', tooltip: 'Flip Vertical' },
        { icon: '✂️', action: 'crop', tooltip: 'Crop (In-Canvas/Modal)' },
        { icon: '📐', action: 'alignLeft', tooltip: 'Align Left' },
        { icon: '📐', action: 'alignCenter', tooltip: 'Align Center' },
        { icon: '📐', action: 'alignRight', tooltip: 'Align Right' },
        { icon: '⌖', action: 'center', tooltip: 'Center Object' },
        { icon: '📐', action: 'resetScale', tooltip: 'Reset Scale' },
        { icon: '🗑️', action: 'delete', tooltip: 'Delete Selected' },
        { icon: '✕', action: 'close', tooltip: 'Close Menu' }
      ];
      
      transformActions.forEach(item => {
        const button = document.createElement('button');
        button.style.cssText = `
          background: transparent;
          border: 1px solid var(--accent-color);
          border-radius: 10px;
          width: 44px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          color: var(--accent-color);
          cursor: pointer;
          transition: all 0.2s ease;
          flex: 0 0 auto;
        `;
        
        button.innerHTML = item.icon;
        button.title = item.tooltip;
        
        button.addEventListener('click', () => {
          handleTransformAction(item.action);
        });

        // Touch feedback without blocking click
        button.addEventListener('touchstart', () => {
          button.style.background = 'var(--accent-color)';
          button.style.color = 'var(--bg-primary)';
        }, { passive: true });
        
        button.addEventListener('touchend', () => {
          button.style.background = 'transparent';
          button.style.color = 'var(--accent-color)';
        }, { passive: true });
        
        transformMenu.appendChild(button);
      });
      
      const rail = ensureBottomRail();
      rail.appendChild(transformMenu);
      
      // Animate menu in and push up viewport
      requestAnimationFrame(() => {
        transformMenu.style.transform = 'translateY(0)';
        adjustViewportForMenu(true);
        // Ensure we zoom out slightly for breathing room when the bar is visible
        if (!rotationLockActive) requestDebouncedFit(60, true);
      });
    }
    
    function hideMobileTransformMenu() {
      const transformMenu = document.getElementById('mobile-transform-menu');
      if (transformMenu) {
        const duration = motionMs();
        transformMenu.style.transform = 'translateY(100%)';
        adjustViewportForMenu(false);
        
        setTimeout(() => {
          transformMenu.remove();
          teardownBottomRailIfEmpty();
          // Recompute stage padding (clears any landscape thin-menu bias)
          requestMobileViewportLayout();
          requestDebouncedFit(30, true);
        }, duration);
      }
    }
    
    function adjustViewportForMenu(showMenu) {
      // On thin menu open/close:
      // - Landscape: zoom-fit to give breathing room and slight vertical pad
      // - Portrait: reposition only (no extra zoom) since it already fits nicely
      const isLandscape = window.innerWidth > window.innerHeight;
      requestMobileViewportLayout();
      if (!rotationLockActive) {
        requestDebouncedFit(60, isLandscape ? true : false);
      }
    }
    
    function recenterCanvasForMenu(menuHeight) {
      // No-op: centering is fully handled by the viewport layout manager and zoom fit
    }
    
    function handleTransformAction(action) {
      const activeObject = window.mobileCanvas?.getActiveObject();
      if (!activeObject && action !== 'close') {
        
        return;
      }
      
      switch(action) {
        case 'bringFront':
          window.mobileCanvas.bringToFront(activeObject);
          break;
        case 'sendBack':
          sendToBackSafe(activeObject);
          break;
        case 'rotateLeft':
          activeObject.rotate((activeObject.angle || 0) - 90);
          break;
        case 'rotateRight':
          activeObject.rotate((activeObject.angle || 0) + 90);
          break;
        case 'flipH':
          activeObject.set('flipX', !activeObject.flipX);
          break;
        case 'flipV':
          activeObject.set('flipY', !activeObject.flipY);
          break;
        case 'crop': {
          // Prefer in-canvas crop when possible; fallback to modal for rotated/flipped
          if (activeObject.type === 'image') {
            try {
              if ((activeObject.angle && Math.abs(activeObject.angle % 360) > 0.01) || activeObject.flipX || activeObject.flipY) {
                // Use desktop modal crop if available
                if (window.openCropModal) {
                  const src = activeObject._element?.src || activeObject.toDataURL?.();
                  openCropModal(src, activeObject);
                }
              } else {
                if (window.enterInCanvasCropMode) {
                  enterInCanvasCropMode(activeObject);
                } else if (window.openCropModal) {
                  const src = activeObject._element?.src || activeObject.toDataURL?.();
                  openCropModal(src, activeObject);
                }
              }
            } catch(_) {}
          }
          break; }
        case 'alignLeft':
          activeObject.set({ originX: 'left', left: 0 });
          break;
        case 'alignCenter':
          activeObject.set({ originX: 'center', left: window.mobileCanvas.getWidth() / 2 });
          break;
        case 'alignRight':
          activeObject.set({ originX: 'right', left: window.mobileCanvas.getWidth() });
          break;
        case 'center':
          activeObject.set({ originX: 'center', originY: 'center', left: window.mobileCanvas.getWidth() / 2, top: window.mobileCanvas.getHeight() / 2 });
          break;
        case 'resetScale':
          activeObject.set({ scaleX: 1, scaleY: 1 });
          break;
        case 'delete':
          window.mobileCanvas.remove(activeObject);
          window.mobileCanvas.discardActiveObject();
          break;
        case 'close':
          hideMobileTransformMenu();
          return;
      }
      
      if (activeObject) {
        activeObject.setCoords();
        window.mobileCanvas.requestRenderAll();
        
      }
}

function showMobileBackgroundMenu() {
  const menu = createMobileSlideUpMenu('Background', [
    { icon: '🎨', text: 'Solid Color', action: () => {
      const colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.onchange = (e) => {
        if (window.setBackgroundColor) {
          window.setBackgroundColor(e.target.value);
        }
      };
      colorInput.click();
    }},
    { icon: '🖼️', text: 'Background Image', action: () => {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.onchange = (e) => {
        if (e.target.files && e.target.files[0] && window.setBackgroundImage) {
          window.setBackgroundImage(e.target.files[0]);
        }
      };
      fileInput.click();
    }},
    { icon: '🧹', text: 'Clear Background', action: () => {
      if (window.clearBackground) window.clearBackground();
    }},
    { icon: '⚪', text: 'White Background', action: () => {
      if (window.setBackgroundColor) window.setBackgroundColor('#ffffff');
    }},
    { icon: '⚫', text: 'Black Background', action: () => {
      if (window.setBackgroundColor) window.setBackgroundColor('#000000');
    }}
  ]);
}

function showMobileStrokePositionMenu() {
  const menu = createMobileSlideUpMenu('Stroke Position', [
    { icon: '📍', text: 'Inner', action: () => {
      if (window.setStrokePosition) window.setStrokePosition('inner');
    }},
    { icon: '📍', text: 'Center', action: () => {
      if (window.setStrokePosition) window.setStrokePosition('center');
    }},
    { icon: '📍', text: 'Outer', action: () => {
      if (window.setStrokePosition) window.setStrokePosition('outer');
    }}
  ]);
}

function createMobileSlideUpMenu(title, menuItems) {
  // Remove existing mobile slide menu
  const existingMenu = document.getElementById('mobile-slide-menu');
  if (existingMenu) {
    existingMenu.remove();
  }
  
  // Create slide-up menu container
  const menu = document.createElement('div');
  menu.id = 'mobile-slide-menu';
  menu.setAttribute('role', 'dialog');
  menu.setAttribute('aria-modal', 'true');
  menu.setAttribute('aria-label', title);
  const toolbarOffset = getMobileToolbarHeight();
  const duration = motionMs();
  menu.style.cssText = `
    position: fixed;
    bottom: -100%;
    left: 0;
    right: 0;
    background: #1a1919;
    border-top: 3px solid #f4a012;
    border-radius: 20px 20px 0 0;
    padding: 16px;
    z-index: 15001;
    transition: bottom ${duration}ms ease;
    max-height: 50vh;
    overflow-y: auto;
    box-shadow: 0 -4px 20px rgba(0,0,0,0.5);
    width: 100vw;
    box-sizing: border-box;
    padding-bottom: calc(16px + env(safe-area-inset-bottom));
  `;
  
  // Menu header
  const header = document.createElement('div');
  header.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding-bottom: 8px;
    border-bottom: 1px solid #444;
  `;
  header.innerHTML = `
    <h3 style="color: #f4a012; margin: 0; font-size: 16px; font-weight: bold;">${title}</h3>
    <button id="mobile-slide-close" aria-label="Close" style="background: none; border: none; color: #f4a012; font-size: 20px; cursor: pointer; min-width: 40px; min-height: 40px;">×</button>
  `;
  
  // Menu content
  const content = document.createElement('div');
  content.style.cssText = `
    display: flex;
    flex-wrap: nowrap;
    gap: 12px;
    padding-bottom: 20px;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: none;
    -ms-overflow-style: none;
  `;
  
  // Hide scrollbar for webkit browsers
  content.style.cssText += `
    -webkit-scrollbar: none;
  `;
  
  // Add menu items
  menuItems.forEach(item => {
    const button = document.createElement('button');
    button.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #333;
      border: 2px solid #444;
      border-radius: 12px;
      color: #f4a012;
      cursor: pointer;
      padding: 12px 8px;
      min-height: 70px;
      min-width: 80px;
      flex-shrink: 0;
      transition: all 0.2s ease;
      font-size: 12px;
    `;
    button.innerHTML = `
      <div style="font-size: 20px; margin-bottom: 6px;">${item.icon}</div>
      <div style="font-size: 10px; text-align: center; line-height: 1.2;">${item.text}</div>
    `;
    
    button.addEventListener('click', () => {
      item.action();
      hideMobileSlideMenu();
    });
    
    button.addEventListener('touchstart', () => {
      button.style.transform = 'scale(0.95)';
      button.style.background = '#444';
    });
    
    button.addEventListener('touchend', () => {
      button.style.transform = 'scale(1)';
      button.style.background = '#333';
    });
    
    content.appendChild(button);
  });
  
  // Assemble menu
  menu.appendChild(header);
  menu.appendChild(content);
  const mobileLayout = document.getElementById('mobile-layout');
  (mobileLayout || document.body).appendChild(menu);

  // Lock background scroll while menu is open
  bodyOverflowBackup = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  
  // Force immediate visibility for debugging

  
  menu.style.bottom = toolbarOffset + 'px';
  
  
  // Also try with a slight delay as backup
  setTimeout(() => {
    menu.style.bottom = toolbarOffset + 'px';
  }, 50);
  
  // Close functionality
  const closeBtn = menu.querySelector('#mobile-slide-close');
  closeBtn.addEventListener('click', hideMobileSlideMenu);
  
  // Close on background tap
  menu.addEventListener('click', (e) => {
    if (e.target === menu) {
      hideMobileSlideMenu();
    }
  });
  
  
  return menu;
}

function hideMobileSlideMenu() {
  const menu = document.getElementById('mobile-slide-menu');
  if (menu) {
    const duration = motionMs();
    menu.style.bottom = '-100%';
    setTimeout(() => {
      menu.remove();
      if (bodyOverflowBackup !== null) {
        document.body.style.overflow = bodyOverflowBackup;
        bodyOverflowBackup = null;
      }
        updateBottomMenusPosition();
    }, duration);
    
  }
}
function showMobileMainMenu() {
  // Remove existing mobile menu if it exists
  const existingMenu = document.getElementById('mobile-main-menu');
  if (existingMenu) {
    existingMenu.remove();
  }
  
  const colors = getMobileThemeColors();
  
  // Create mobile main menu that slides in from left
  const mobileMenu = document.createElement('div');
  mobileMenu.id = 'mobile-main-menu';
  mobileMenu.style.cssText = `
    position: fixed;
    top: 0;
    left: -100%;
    width: 80vw;
    height: 100vh;
    background: ${colors.menuBg};
    border-right: 3px solid ${colors.accentBorder};
    z-index: 20000;
    transition: left 0.3s ease;
    overflow-y: auto;
    box-shadow: 4px 0 20px rgba(0,0,0,0.5);
  `;
  
  // Create menu content
  const menuContent = document.createElement('div');
  menuContent.style.cssText = `
    padding: 20px;
    height: 100%;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
  `;
  
  // Menu header
  const menuHeader = document.createElement('div');
  menuHeader.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30px;
    padding-bottom: 15px;
    border-bottom: 2px solid ${colors.primaryBorder};
  `;
  menuHeader.innerHTML = `
    <h3 style="color: ${colors.accentText}; margin: 0; font-size: 20px; font-weight: bold;">Menu</h3>
    <button id="mobile-menu-close" style="background: none; border: none; color: ${colors.accentText}; font-size: 28px; cursor: pointer; min-width: 50px; min-height: 50px;">×</button>
  `;
  
  // Menu items
  const menuItems = [
    { icon: '👁️', text: 'Preview', action: () => {
      if (window.generatePreview) {
        window.generatePreview();
      }
      hideMobileMainMenu();
    }},
    { icon: '⬇️', text: 'Download', action: () => {
      if (window.downloadCanvasWithMode) {
        window.downloadCanvasWithMode();
      }
      hideMobileMainMenu();
    }},
    { icon: '✅', text: 'Finished', action: () => {
      const finishedBtn = document.getElementById('desk-pad-finished-btn');
      if (finishedBtn) {
        finishedBtn.click();
      }
      hideMobileMainMenu();
    }},
    { icon: '⬆️', text: 'Upload Image', action: () => {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.multiple = true;
      fileInput.onchange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
          if (window.handleModalFileUpload) {
            window.handleModalFileUpload(e.target.files);
          }
        }
      };
      fileInput.click();
      hideMobileMainMenu();
    }},
    { icon: '📋', text: 'Recent Images', action: () => {
      const recentPopup = document.getElementById('recent-images-popup');
      if (recentPopup) {
        recentPopup.classList.add('show');
      }
      hideMobileMainMenu();
    }},
    { icon: '⚙️', text: 'Pad Size', action: () => {
      showMobilePadSizePopup();
      hideMobileMainMenu();
    }},
    { icon: '🎨', text: 'Background', action: () => {
      const backgroundToolbar = document.getElementById('background-toolbar');
      const backgroundToggleBtn = document.getElementById('background-toggle-btn');
      if (backgroundToolbar && backgroundToggleBtn) {
        backgroundToolbar.classList.add('show');
        backgroundToggleBtn.classList.add('active');
      }
      hideMobileMainMenu();
    }},
    { icon: '🌙', text: 'Toggle Theme', action: () => {
      const themeBtn = document.getElementById('theme-toggle-btn');
      if (themeBtn) {
        themeBtn.click();
      }
      hideMobileMainMenu();
    }},
    { icon: '❌', text: 'Clear Canvas', action: () => {
      if (window.clearCanvas) {
        window.clearCanvas();
      }
      hideMobileMainMenu();
    }}
  ];
  
  // Create menu items
  menuItems.forEach(item => {
    const menuItem = document.createElement('button');
    menuItem.style.cssText = `
      display: flex;
      align-items: center;
      gap: 15px;
      width: 100%;
      padding: 15px 0;
      background: transparent;
      border: none;
      color: ${colors.primaryText};
      cursor: pointer;
      border-bottom: 1px solid ${colors.primaryBorder};
      transition: background 0.2s ease;
      font-size: 16px;
      text-align: left;
    `;
    menuItem.innerHTML = `
      <span style="font-size: 24px; min-width: 30px;">${item.icon}</span>
      <span style="font-weight: 500;">${item.text}</span>
    `;
    
    menuItem.addEventListener('click', item.action);
    menuItem.addEventListener('mouseenter', () => {
      menuItem.style.background = colors.buttonHoverBg;
    });
    menuItem.addEventListener('mouseleave', () => {
      menuItem.style.background = 'transparent';
    });
    
    menuContent.appendChild(menuItem);
  });
  
  // Add close functionality
  const closeBtn = menuContent.querySelector('#mobile-menu-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', hideMobileMainMenu);
  }
  
  // Close on background click (outside menu)
  const backgroundOverlay = document.createElement('div');
  backgroundOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 19999;
    opacity: 0;
    transition: opacity 0.3s ease;
  `;
  
  backgroundOverlay.addEventListener('click', hideMobileMainMenu);
  
  // Assemble menu
  menuContent.appendChild(menuHeader);
  mobileMenu.appendChild(menuContent);
  document.body.appendChild(backgroundOverlay);
  document.body.appendChild(mobileMenu);
  
  // Animate menu in
  setTimeout(() => {
    mobileMenu.style.left = '0';
    backgroundOverlay.style.opacity = '1';
  }, 10);
  
  
}

function hideMobileMainMenu() {
  const mobileMenu = document.getElementById('mobile-main-menu');
  const backgroundOverlay = document.querySelector('div[style*="z-index: 19999"]');
  
  if (mobileMenu) {
    // Animate menu out
    mobileMenu.style.left = '-100%';
    
    if (backgroundOverlay) {
      backgroundOverlay.style.opacity = '0';
    }
    
    // Remove elements after animation
    setTimeout(() => {
      mobileMenu.remove();
      if (backgroundOverlay) {
        backgroundOverlay.remove();
      }
    }, 300);
    
    
  }
}

// Mobile canvas integration functions
function initializeMobileCanvas() {
  if (!window.mobileCanvas) {
    
    return;
  }
  
  // Set up mobile canvas event handlers
  window.mobileCanvas.on('selection:created', function(e) {

    updateMobilePropertiesPanel();
    updateLayersButtonThumbnail();
    try {
      const obj = window.mobileCanvas.getActiveObject();
      if (obj && obj !== mobileLayerToastLastObject) {
        showMobileLayerToast(getReadableObjectName(obj));
        mobileLayerToastLastObject = obj;
      }
    } catch(_) {}
  });
  
  window.mobileCanvas.on('selection:cleared', function(e) {
    
    updateMobilePropertiesPanel();
    updateLayersButtonThumbnail();
    mobileLayerToastLastObject = null;
    scheduleLayersSyncAfterRender();
  });
  
  window.mobileCanvas.on('object:modified', function(e) {
    
    updateMobilePropertiesPanel();
    updateLayersButtonThumbnail();
    // Do not show toast on modify; only on true selection change
  });
  
  // Ensure overlay/toolbar thumbnails refresh on selection change and taps
  if (window.mobileCanvas.on) {
    window.mobileCanvas.on('selection:updated', function() {
      updateLayersButtonThumbnail();
      document.dispatchEvent(new Event('mobileSelectionUpdated'));
      try {
        const obj = window.mobileCanvas.getActiveObject();
        if (obj && obj !== mobileLayerToastLastObject) {
          showMobileLayerToast(getReadableObjectName(obj));
          mobileLayerToastLastObject = obj;
        }
      } catch(_) {}
      scheduleLayersSyncAfterRender();
    });
    window.mobileCanvas.on('mouse:up', function() {
      updateLayersButtonThumbnail();
      document.dispatchEvent(new Event('mobileSelectionUpdated'));
      // Do not show toast on mouse up; selection didn't necessarily change
    });
  }
  
  // Set up mobile touch events
  window.mobileCanvas.on('mouse:down', function(e) {
    try {
      // If there's a target on tap, sync panel on next render (avoids activeObject timing issues)
      if (e && e.target) scheduleLayersSyncAfterRender();
    } catch(_) {}
  });
  
  window.mobileCanvas.on('mouse:up', function(e) {
    
  });
  
  window.mobileCanvas.on('mouse:move', function(e) {
    
  });
  
  // Add object interaction events
  window.mobileCanvas.on('object:moving', function(e) {
    
  });
  
let activeScaleSnapEdge = null; // kept for backward compat, superseded by scalingSnapState
const scalingSnapState = { obj: null, locked: { left: false, right: false, top: false, bottom: false }, threshold: 16, hysteresis: 12 };
const mobileSnapConfig = { useLocking: false, threshold: 25, hysteresis: 12 };
let scalingSession = null;
let isMobileRotatingNow = false;
window.mobileCanvas.on('object:scaling', function(e) {
    // Resize snapping removed by request; keep properties/DPI updates elsewhere
  });
window.mobileCanvas.on('object:scaled', function(){ activeScaleSnapEdge = null; scalingSnapState.obj = null; scalingSnapState.locked = { left:false,right:false,top:false,bottom:false }; scalingSession = null; });
window.mobileCanvas.on('mouse:up', function(){ activeScaleSnapEdge = null; scalingSnapState.obj = null; scalingSnapState.locked = { left:false,right:false,top:false,bottom:false }; scalingSession = null; isMobileRotatingNow = false; });
  
window.mobileCanvas.on('object:rotating', function(e) {
    isMobileRotatingNow = true; // skip snapping during rotation gestures
  });

// Optional visual feedback for edge locks
function setMobileEdgeHighlight(lock) {
  // This function is intentionally minimal; guides for edges are not persisted in this build
  // Could be extended to show thin lines along canvas edges when lock engages
}
  
  
}

function updateMobilePropertiesPanel() {
  // Update mobile properties panel when objects are selected/modified
  const activeObject = window.mobileCanvas.getActiveObject();
  if (activeObject) {
    
  }
}

// Mobile-specific canvas functions
function addImageToMobileCanvas(imageDataUrl, imageName = null) {
  if (!window.mobileCanvas) {
    
    return;
  }
  
  fabric.Image.fromURL(imageDataUrl, function(img) {
    // Scale image to fit mobile canvas
    const canvasWidth = window.mobileCanvas.getWidth();
    const canvasHeight = window.mobileCanvas.getHeight();
    
  
    
    const scale = Math.min(
      canvasWidth / img.width * 0.8,
      canvasHeight / img.height * 0.8
    );
    
    // Assign a human-friendly name from the file (if provided)
    try { if (imageName && typeof imageName === 'string') { img.name = imageName; } } catch(_) {}
    img.scale(scale);
    
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    
    img.set({
      left: centerX,  // Center horizontally (Fabric uses center-origin)
      top: centerY,   // Center vertically (Fabric uses center-origin)
      originX: 'center',  // Ensure center-origin positioning
      originY: 'center'   // Ensure center-origin positioning
    });
    
    // Image positioned and scaled correctly
    
    window.mobileCanvas.add(img);
    window.mobileCanvas.setActiveObject(img);
    window.mobileCanvas.renderAll();
    

  });
}

function addTestSquareToMobileCanvas() {
  if (!window.mobileCanvas) {
    return;
  }
  
  const canvasWidth = window.mobileCanvas.getWidth();
  const canvasHeight = window.mobileCanvas.getHeight();
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;
  
  
  
  // Create a bright red square that should be perfectly centered
  const testSquare = new fabric.Rect({
    left: centerX,
    top: centerY,
    width: 50,
    height: 50,
    fill: '#ff0000',
    stroke: '#ffffff',
    strokeWidth: 2,
    selectable: true,
    name: 'testSquare',
    originX: 'center',  // Ensure center-origin positioning
    originY: 'center'   // Ensure center-origin positioning
  });
  
  
  // Debug DOM element positioning
  setTimeout(() => {
    const canvasElement = document.getElementById('mobile-canvas');
    const containerElement = document.getElementById('mobile-canvas-container');
    const areaElement = document.getElementById('mobile-canvas-area');
    
    // Force remove padding via JavaScript since CSS isn't working
    if (areaElement) {
      areaElement.style.padding = '0px';
      areaElement.style.paddingTop = '0px';
      areaElement.style.paddingRight = '0px';
      areaElement.style.paddingBottom = '0px';
      areaElement.style.paddingLeft = '0px';
      areaElement.style.margin = '0px';
      areaElement.style.marginTop = '0px';
      areaElement.style.marginRight = '0px';
      areaElement.style.marginBottom = '0px';
      areaElement.style.marginLeft = '0px';
    }
    
    if (canvasElement && containerElement && areaElement) {
      const canvasRect = canvasElement.getBoundingClientRect();
      const containerRect = containerElement.getBoundingClientRect();
      const areaRect = areaElement.getBoundingClientRect();
      
      
      
      // Check for any CSS transforms or offsets
      const canvasStyle = window.getComputedStyle(canvasElement);
      const containerStyle = window.getComputedStyle(containerElement);
      const areaStyle = window.getComputedStyle(areaElement);
      
      
    }
  }, 100);
  
  window.mobileCanvas.add(testSquare);
  window.mobileCanvas.setActiveObject(testSquare);
  window.mobileCanvas.renderAll();
}

function addTextToMobileCanvas(text = 'Double tap to edit') {
  if (!window.mobileCanvas) {
    
    return;
  }
  
  const textbox = new fabric.Textbox(text, {
    left: 100,
    top: 100,
    fontSize: 24,
    fill: '#f4a012',
    fontFamily: 'Arial'
  });
  
  window.mobileCanvas.add(textbox);
  window.mobileCanvas.setActiveObject(textbox);
  window.mobileCanvas.renderAll();
  
  
}

// Mobile canvas resize handler - uses zoom system for optimal UX
function resizeMobileCanvas() {
  if (window.mobileCanvas) {
    const canvasSize = calculateMobileCanvasSize();
    
    // Update canvas dimensions only if they've actually changed (pad preset change)
    const currentWidth = window.mobileCanvas.getWidth();
    const currentHeight = window.mobileCanvas.getHeight();
    
    if (currentWidth !== canvasSize.width || currentHeight !== canvasSize.height) {
      
      
    window.mobileCanvas.setDimensions({
      width: canvasSize.width,
      height: canvasSize.height
    });
    
      // Update snap guides for new canvas size
      if (mobileSnapGuides.centerX) {
        mobileSnapGuides.centerX.set({ x1: canvasSize.width/2, y1: 0, x2: canvasSize.width/2, y2: canvasSize.height });
        mobileSnapGuides.centerY.set({ x1: 0, y1: canvasSize.height/2, x2: canvasSize.width, y2: canvasSize.height/2 });
      }
    }
    
    // Update container size to match canvas
    const mobileCanvasContainer = document.getElementById('mobile-canvas-container');
    if (mobileCanvasContainer) {
      mobileCanvasContainer.style.width = canvasSize.width + 'px';
      mobileCanvasContainer.style.height = canvasSize.height + 'px';
    }
    
    // Setup canvas area for scrolling
    const mobileCanvasArea = document.getElementById('mobile-canvas-area');
    if (mobileCanvasArea) {
      mobileCanvasArea.style.overflow = 'auto';
      mobileCanvasArea.style.display = 'flex';
      mobileCanvasArea.style.justifyContent = 'center';
      mobileCanvasArea.style.alignItems = 'center';
    }
    
    // Auto-fit zoom to screen on orientation change
    requestDebouncedFit(0, false);
    
    window.mobileCanvas.renderAll();
  }
}

// Verify theme consistency and fix any issues
function verifyThemeConsistency() {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  const currentTheme = document.documentElement.getAttribute('data-theme');
  
  
  
  // If there's a mismatch, fix it
  if (currentTheme !== savedTheme) {
    
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateMobileThemeButtonIcon();
    return true; // Theme was fixed
  }
  
  return false; // No fix needed
}

// Handle orientation changes with better user feedback
function handleOrientationChange() {
  if (isMobile) {
    // Clear any pending orientation change
    if (orientationChangeTimeout) {
      clearTimeout(orientationChangeTimeout);
    }
    
    // Debounce orientation changes to prevent excessive calls
    orientationChangeTimeout = setTimeout(() => {
    // Store current theme state before any changes
    const currentTheme = document.documentElement.getAttribute('data-theme');
    
    // Verify theme consistency before proceeding
    verifyThemeConsistency();
    
    // Canvas container setup (removed opacity fade for smoother experience)
    const mobileCanvasContainer = document.getElementById('mobile-canvas-container');
    
    // Resize with a longer delay for orientation changes
    setTimeout(() => {
      // Keep menus open; just record state for fit timing
      const reopen = rememberOpenMenus();
      startRotationLock(300);
      // Clear any residual stage padding before recalculation
      const stage = document.getElementById('mobile-canvas-area');
      if (stage) {
        stage.style.paddingRight = '0px';
        stage.style.paddingTop = '0px';
        stage.style.paddingBottom = '0px';
      }
      
      resizeMobileCanvas();
        // If layers panel is open, reconfigure for new orientation without closing it
        const panel = document.getElementById('mobile-layers-panel');
        if (panel) {
          const isLandscapeNow = window.innerWidth > window.innerHeight;
          // Reset anchors that may be wrong for the new orientation
          panel.style.top = isLandscapeNow ? getMobileHeaderHeight() + 'px' : '';
          // Recompute placement and offsets
          sizeAndPositionLayersPanel();
          applyCanvasOffsetForLayersPanel(true);
          // Keep it in place
          panel.style.transition = '';
          panel.style.transform = 'translate(0)';
        }
      updateBottomMenusPosition();
      // If layers panel is open, re-apply canvas offset for current orientation
      const layersPanel = document.getElementById('mobile-layers-panel');
      if (layersPanel) applyCanvasOffsetForLayersPanel(true);
      
      // Ensure theme state is preserved and reapplied
      const preservedTheme = document.documentElement.getAttribute('data-theme') || currentTheme;
      
      
      // Force re-application of theme to ensure consistency
      document.documentElement.setAttribute('data-theme', preservedTheme);
      
      // Update theme colors after orientation change with more robust handling
      updateMobileInterfaceTheme();
      
      // Additional delay to ensure CSS patterns are applied
      setTimeout(() => {
        // Force re-render of pattern backgrounds with theme-aware approach
        const mobileCanvasArea = document.getElementById('mobile-canvas-area');
        const mobileCanvasContainer = document.getElementById('mobile-canvas-container');
        
        if (mobileCanvasArea) {
          // Force reflow for canvas area
          void mobileCanvasArea.offsetWidth; // Force reflow (without display changes that clear backgrounds)
          
          // Ensure theme-specific patterns are applied
          const isLightTheme = preservedTheme === 'light';
          
        }
        
        if (mobileCanvasContainer) {
          // Force reflow for canvas container
          void mobileCanvasContainer.offsetWidth; // Force reflow (without display changes that clear backgrounds)
        }
        
        // Double-check theme consistency
        const finalTheme = document.documentElement.getAttribute('data-theme');
        
        // Canvas container is ready (no opacity changes needed)
        
                                // Note: Theme update is handled separately to avoid circular dependencies
                          
                        // Debug outlines disabled

                        // Reapply background patterns after orientation change
                        reapplyMobileCanvasBackgroundPattern();
                        
        // Refit with current menu state (no closing/reopening) – debounce to 1 fit
        requestMobileViewportLayout();
        const rail = document.getElementById('mobile-bottom-rail');
        const thinOpen = !!(rail && (rail.querySelector('#mobile-transform-menu') || rail.querySelector('#mobile-layers-menu')));
        requestDebouncedFit(thinOpen ? 120 : 60, true);

                        
                      }, 100);

                    }, 500); // Longer delay for orientation change
                    
      orientationChangeTimeout = null;
    }, 50); // Debounce orientation changes by 50ms
                  }
                }

// Add resize event listener for mobile canvas
window.addEventListener('resize', () => {
  if (isMobile) {
    // Clear any pending resize
    if (resizeTimeout) {
      clearTimeout(resizeTimeout);
    }
    
    // Debounce resize events to prevent excessive calls
    resizeTimeout = setTimeout(() => {
    // Store current theme state before any changes
    const currentTheme = document.documentElement.getAttribute('data-theme');
    
    // Verify theme consistency before proceeding
    verifyThemeConsistency();
    
    setTimeout(() => {
      resizeMobileCanvas();
      updateBottomMenusPosition();
      
      // Ensure theme state is preserved and reapplied
      const preservedTheme = document.documentElement.getAttribute('data-theme') || currentTheme;
    
      
      // Force re-application of theme to ensure consistency
      document.documentElement.setAttribute('data-theme', preservedTheme);
      
      // Note: Theme update is handled separately to avoid circular dependencies
      
      // Additional delay to ensure CSS patterns are applied
      setTimeout(() => {
        // Force re-render of pattern backgrounds with theme-aware approach
        const mobileCanvasArea = document.getElementById('mobile-canvas-area');
        const mobileCanvasContainer = document.getElementById('mobile-canvas-container');
        
        if (mobileCanvasArea) {
           // Force reflow for canvas area
          void mobileCanvasArea.offsetWidth; // Force reflow (without display changes that clear backgrounds)
          
          // Ensure theme-specific patterns are applied
          const isLightTheme = preservedTheme === 'light';
          
        }
        
        if (mobileCanvasContainer) {
          // Force reflow for canvas container
          void mobileCanvasContainer.offsetWidth; // Force reflow (without display changes that clear backgrounds)
        }
        
        // Double-check theme consistency
        const finalTheme = document.documentElement.getAttribute('data-theme');
        
        // Note: Theme update is handled separately to avoid circular dependencies
          
        // Debug outlines disabled
        
        // Reapply background patterns after resize
        reapplyMobileCanvasBackgroundPattern();

        // Re-apply sizing and offsets for layers panel if open
        const panel = document.getElementById('mobile-layers-panel');
        if (panel) {
          sizeAndPositionLayersPanel();
          applyCanvasOffsetForLayersPanel(true);
        }
        
        
      }, 50);
      
    }, 100); // Small delay to ensure resize is complete
    
    resizeTimeout = null;
    }, 50); // Debounce resize events by 50ms
  }
});

// Add orientation change listener with improved handling
window.addEventListener('orientationchange', handleOrientationChange);

// Initialize mobile detection
detectMobile();
window.addEventListener('resize', detectMobile);
window.addEventListener('orientationchange', () => {
  setTimeout(detectMobile, 100);
});

// Export functions for use in main.js
window.detectMobile = detectMobile;
window.setupMobileInterface = setupMobileInterface;
window.createMobileBottomToolbar = createMobileBottomToolbar;
window.reapplyMobileCanvasBackgroundPattern = reapplyMobileCanvasBackgroundPattern;

// Make sure mobile interface is set up when the page loads
document.addEventListener('DOMContentLoaded', () => {
  detectMobile();
  if (isMobile) {
    
    // Set up mobile theme listener
    setupMobileThemeListener();
    setupDirectThemeToggleListener(); // Also set up direct listener
    
    // Ensure theme is properly initialized even before modal opens
    initializeMobileTheme();
  }
});

// Function to ensure mobile interface is ready when modal opens
function ensureMobileInterfaceReady() {
  if (isMobile) {
    
    
    // Re-detect mobile in case orientation changed
    detectMobile();
    
    if (isMobile) {
      // Ensure theme is properly initialized
      initializeMobileTheme();
      
      // Set up theme listeners if not already set up
      setupMobileThemeListener();
      setupDirectThemeToggleListener();
      
      
    }
  }
}

// Mobile Canvas Edge Snapping Functions
let lastMobileSnapTime = 0;
let mobileSnapGuides = {
  centerX: null,
  centerY: null
};

function setupMobileCanvasSnapping(canvas) {
  if (!canvas) return;
  
  // Add object moving event listener for snapping (exactly like desktop)
  canvas.on('object:moving', function(opt) {
    // Simple border snapping (reduced logging for performance)
    if (opt.target) {
      applyMobileSnapping(opt.target);
    }
  });
  
  
}
function createMobileSnapGuides(canvas) {
  if (!canvas) return;
  
  const canvasWidth = canvas.getWidth();
  const canvasHeight = canvas.getHeight();
  
  // Create only center guide lines (like desktop version)
  mobileSnapGuides.centerX = new fabric.Line([canvasWidth/2, 0, canvasWidth/2, canvasHeight], {
    stroke: '#f4a012',
    strokeWidth: 1,
    selectable: false,
    evented: false,
    excludeFromExport: true,
    visible: false,
    name: 'snapGuideCenterX'
  });
  
  mobileSnapGuides.centerY = new fabric.Line([0, canvasHeight/2, canvasWidth, canvasHeight/2], {
    stroke: '#f4a012',
    strokeWidth: 1,
    selectable: false,
    evented: false,
    excludeFromExport: true,
    visible: false,
    name: 'snapGuideCenterY'
  });
  
  // Add only center guides to canvas
  canvas.add(mobileSnapGuides.centerX);
  canvas.add(mobileSnapGuides.centerY);
  
  
}

function showMobileSnapGuides(showLeft, showRight, showTop, showBottom, showCenterX, showCenterY) {
  // Only show center guides (ignore edge guide parameters)
  if (mobileSnapGuides.centerX) mobileSnapGuides.centerX.set('visible', showCenterX);
  if (mobileSnapGuides.centerY) mobileSnapGuides.centerY.set('visible', showCenterY);
}

function applyMobileSnapping(obj) {
  const canvas = window.mobileCanvas;
  if (!canvas || !obj) return;
  
  // Only throttle on very large canvases (>5M pixels) for mobile performance
  const totalPixels = canvas.getWidth() * canvas.getHeight();
  
  if (totalPixels > 5000000) { // 5 million pixels (more conservative for mobile)
    const now = Date.now();
    if (now - lastMobileSnapTime < 16) { // ~60fps throttling only for large canvases
      return;
    }
    lastMobileSnapTime = now;
  }
  
  const canvasWidth = canvas.getWidth();
  const canvasHeight = canvas.getHeight();
  
  // Use adjustable snap threshold
  const snapThreshold = Math.max(0, Number.isFinite(mobileSnapThreshold) ? mobileSnapThreshold : 8);
  
  // Get object dimensions (accounting for scaling)
  const halfW = obj.getScaledWidth() / 2;
  const halfH = obj.getScaledHeight() / 2;
  
  // Calculate object edges (since objects are center-origin)
  const left = obj.left - halfW;
  const top = obj.top - halfH;
  const right = obj.left + halfW;
  const bottom = obj.top + halfH;
  
  // Calculate canvas center
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;
  
  let snapped = false;
  
  // Check if object is near center (for potential guide lines)
  const distanceFromCenterX = Math.abs(obj.left - centerX);
  const distanceFromCenterY = Math.abs(obj.top - centerY);
  
  // Check if object is near center (for guide lines) - like desktop version
  const centerGuideThreshold = snapThreshold * 2; // Show guides further out than snap
  const showCenterGuides = (distanceFromCenterX < centerGuideThreshold || distanceFromCenterY < centerGuideThreshold);
  
  // Show/hide center guides only
  showMobileSnapGuides(false, false, false, false, 
                      showCenterGuides && distanceFromCenterX < centerGuideThreshold, 
                      showCenterGuides && distanceFromCenterY < centerGuideThreshold);
  
  // Snap zones calculated and applied
  
  // Snap left edge to canvas left (pixel-perfect)
  if (Math.abs(left - 0) < snapThreshold) {
    obj.set('left', Math.round(halfW));
    snapped = true;
  }
  
  // Snap right edge to canvas right (pixel-perfect)
  if (Math.abs(right - canvasWidth) < snapThreshold) {
    obj.set('left', Math.round(canvasWidth - halfW));
    snapped = true;
  }
  
  // Snap top edge to canvas top (pixel-perfect)
  if (Math.abs(top - 0) < snapThreshold) {
    obj.set('top', Math.round(halfH));
    snapped = true;
  }
  
  // Snap bottom edge to canvas bottom (pixel-perfect)
  if (Math.abs(bottom - canvasHeight) < snapThreshold) {
    obj.set('top', Math.round(canvasHeight - halfH));
    snapped = true;
  }
  
  // Snap to center lines (horizontal and vertical separately)
  // Snap to vertical center line (horizontal alignment)
  if (distanceFromCenterX < snapThreshold) {
    obj.set('left', Math.round(centerX));
    snapped = true;
  }
  
  // Snap to horizontal center line (vertical alignment)
  if (distanceFromCenterY < snapThreshold) {
    obj.set('top', Math.round(centerY));
    snapped = true;
  }
  
  // Hysteresis to reduce re-snap jitter: require extra movement to escape snap
  if (typeof obj._snapState !== 'object') obj._snapState = { was: false, x: obj.left, y: obj.top };
  if (snapped) {
    obj._snapState.was = true;
    obj._snapState.x = Math.round(obj.left);
    obj._snapState.y = Math.round(obj.top);
    obj.set({ left: obj._snapState.x, top: obj._snapState.y });
    canvas.requestRenderAll();
  } else if (obj._snapState.was) {
    const dx = Math.abs((obj.left ?? 0) - (obj._snapState.x ?? 0));
    const dy = Math.abs((obj.top ?? 0) - (obj._snapState.y ?? 0));
    const escape = Math.max(dx, dy);
    if (escape < Math.max(0, mobileUnsnapDistance)) {
      // revert to snapped position until user moves far enough
      obj.set({ left: obj._snapState.x, top: obj._snapState.y });
    } else {
      obj._snapState.was = false;
    }
  }
  
  // Hide all guides if not near center
  if (!showCenterGuides) {
    showMobileSnapGuides(false, false, false, false, false, false);
  }
  
  // Request render to update guide visibility
  canvas.requestRenderAll();
}

// Edge-only snapping used during scaling – snaps the object's edges to canvas edges
function applyEdgeSnapDuringScaling(obj, corner, evt) { /* disabled */ }

function updateMobileCanvasSnappingSettings(canvas) {
  if (!canvas) canvas = window.mobileCanvas;
  if (!canvas) return;
  
  // Update canvas-level snapping settings for mobile
  canvas.set({
    snapAngle: mobileSnapAngle,
    snapThreshold: mobileSnapThreshold,
    snapAngleThreshold: mobileSnapAngle
  });
}

// Mobile Pad Size Popup Functions
function showMobilePadSizePopup() {
  const colors = getMobileThemeColors();
  
  // Remove existing popup
  const existingPopup = document.getElementById('mobile-pad-size-popup');
  if (existingPopup) {
    existingPopup.remove();
  }
  
  const popup = document.createElement('div');
  popup.id = 'mobile-pad-size-popup';
  popup.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.8);
    z-index: 20000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    box-sizing: border-box;
  `;
  
  const modal = document.createElement('div');
  modal.style.cssText = `
    background: ${colors.primaryBg};
    border: 2px solid ${colors.accentBorder};
    border-radius: 12px;
    padding: 20px;
    max-width: 400px;
    width: 100%;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  `;
  
  modal.innerHTML = `
    <div style="text-align: center; margin-bottom: 20px;">
      <h3 style="color: ${colors.primaryText}; margin: 0 0 8px 0; font-size: 18px;">Select Pad Size</h3>
      <p style="color: ${colors.secondaryText}; margin: 0; font-size: 12px;">Current: ${mobilePadPresets[currentMobilePadPreset].name}</p>
    </div>
    <div id="mobile-pad-size-options" style="margin-bottom: 20px;"></div>
    <div style="display: flex; gap: 12px; justify-content: center;">
      <button id="mobile-pad-size-cancel" style="
        background: ${colors.buttonBg};
        color: ${colors.primaryText};
        border: 1px solid ${colors.primaryBorder};
        padding: 12px 24px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        font-weight: bold;
      ">Cancel</button>
      <button id="mobile-pad-size-change" style="
        background: ${colors.accentBorder};
        color: #ffffff;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        font-weight: bold;
      ">Change</button>
    </div>
  `;
  
  // Create pad size options
  const optionsContainer = modal.querySelector('#mobile-pad-size-options');
  let selectedPreset = currentMobilePadPreset;
  
  Object.entries(mobilePadPresets).forEach(([key, preset]) => {
    const option = document.createElement('div');
    option.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px;
      margin-bottom: 8px;
      background: ${key === currentMobilePadPreset ? colors.accentBorder : colors.buttonBg};
      color: ${key === currentMobilePadPreset ? '#ffffff' : colors.primaryText};
      border: 1px solid ${colors.primaryBorder};
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
    `;
    
    option.innerHTML = `
      <div>
        <div style="font-weight: bold; font-size: 14px;">${preset.name}</div>
        <div style="font-size: 11px; opacity: 0.8;">${preset.description}</div>
      </div>
      <div style="font-size: 11px; opacity: 0.7;">${preset.aspect.toFixed(2)}:1</div>
    `;
    
    option.addEventListener('click', () => {
      // Update selection
      selectedPreset = key;
      
      // Update visual selection
      optionsContainer.querySelectorAll('div').forEach(opt => {
        const isSelected = opt === option;
        opt.style.background = isSelected ? colors.accentBorder : colors.buttonBg;
        opt.style.color = isSelected ? '#ffffff' : colors.primaryText;
      });
    });
    
    optionsContainer.appendChild(option);
  });
  
  // Add event listeners
  modal.querySelector('#mobile-pad-size-cancel').addEventListener('click', () => {
    popup.remove();
  });
  
  modal.querySelector('#mobile-pad-size-change').addEventListener('click', () => {
    if (selectedPreset !== currentMobilePadPreset) {
      applyMobilePadPreset(selectedPreset);
    }
    popup.remove();
  });
  
  // Close on background click
  popup.addEventListener('click', (e) => {
    if (e.target === popup) {
      popup.remove();
    }
  });
  
  popup.appendChild(modal);
  document.body.appendChild(popup);
}

function applyMobilePadPreset(presetKey) {
  const preset = mobilePadPresets[presetKey];
  if (!preset) return;
  
  const oldPreset = mobilePadPresets[currentMobilePadPreset];
  currentMobilePadPreset = presetKey;
  
  // Recalculate canvas size with new physical dimensions
  const newCanvasSize = calculateMobileCanvasSize();
  
  // Update the mobile canvas if it exists
  if (window.mobileCanvas) {
    // Store existing objects and old canvas dimensions
    const existingObjects = window.mobileCanvas.getObjects();
    const oldCanvasWidth = window.mobileCanvas.getWidth();
    const oldCanvasHeight = window.mobileCanvas.getHeight();
    
    // Resize canvas
    window.mobileCanvas.setWidth(newCanvasSize.width);
    window.mobileCanvas.setHeight(newCanvasSize.height);
    
    // Update container size
    const mobileCanvasContainer = document.getElementById('mobile-canvas-container');
    if (mobileCanvasContainer) {
      mobileCanvasContainer.style.width = newCanvasSize.width + 'px';
      mobileCanvasContainer.style.height = newCanvasSize.height + 'px';
      mobileCanvasContainer.style.minWidth = newCanvasSize.width + 'px';
      mobileCanvasContainer.style.minHeight = newCanvasSize.height + 'px';
      mobileCanvasContainer.style.maxWidth = newCanvasSize.width + 'px';
      mobileCanvasContainer.style.maxHeight = newCanvasSize.height + 'px';
    }
    
    // Keep existing objects at their current size - only adjust positions for canvas center changes
    // This allows images to maintain their size while canvas changes around them
    const oldCenterX = oldCanvasWidth / 2;
    const oldCenterY = oldCanvasHeight / 2;
    const newCenterX = newCanvasSize.width / 2;
    const newCenterY = newCanvasSize.height / 2;
    
    const centerOffsetX = newCenterX - oldCenterX;
    const centerOffsetY = newCenterY - oldCenterY;
    
    existingObjects.forEach(obj => {
      if (obj.name !== 'snapGuideCenterX' && obj.name !== 'snapGuideCenterY') { // Don't move snap guides
        // Keep object size the same, only adjust position to account for canvas center change
        obj.set({
          left: obj.left + centerOffsetX,
          top: obj.top + centerOffsetY
        });
        obj.setCoords();
      }
    });
    
    // Update snapping settings for new canvas size
    updateMobileCanvasSnappingSettings(window.mobileCanvas);
    
    // Update snap guide positions for new canvas size
    if (mobileSnapGuides.centerX) {
      mobileSnapGuides.centerX.set({ 
        x1: newCanvasSize.width/2, y1: 0, 
        x2: newCanvasSize.width/2, y2: newCanvasSize.height 
      });
    }
    if (mobileSnapGuides.centerY) {
      mobileSnapGuides.centerY.set({ 
        x1: 0, y1: newCanvasSize.height/2, 
        x2: newCanvasSize.width, y2: newCanvasSize.height/2 
      });
    }
    
    // Re-render canvas
    window.mobileCanvas.renderAll();
    
    // Reapply background patterns
    reapplyMobileCanvasBackgroundPattern();
    
    // Auto-fit zoom to screen after pad size change
    requestDebouncedFit(0, false);
  }
  
  
}

// Export the ensure function
window.ensureMobileInterfaceReady = ensureMobileInterfaceReady;

// Debug function to add outlines around canvas elements in landscape mode - DISABLED
function addDebugOutlines() {
  // Function disabled - no more debug outlines
    return;
  
  const width = window.innerWidth;
  const height = window.innerHeight;
  const isLandscape = width > height;
  
  
  
  // Get the Fabric.js canvas element (the actual canvas that Fabric.js created)
  const fabricCanvas = window.mobileCanvas ? window.mobileCanvas.lowerCanvasEl : null;
  const mobileCanvasContainer = document.getElementById('mobile-canvas-container');
  const mobileCanvasArea = document.getElementById('mobile-canvas-area');
  
  // Debug canvas element details
  if (fabricCanvas) {
    const rect = fabricCanvas.getBoundingClientRect();
  } else {
    // Fabric.js canvas element not found
  }
  
  if (mobileCanvasContainer) {
    const rect = mobileCanvasContainer.getBoundingClientRect();
  } else {
    // mobile-canvas-container element not found
  }
  
  if (mobileCanvasArea) {
    const rect = mobileCanvasArea.getBoundingClientRect();
  } else {
    // mobile-canvas-area element not found
  }
  
  if (isLandscape) {
   
    
    if (fabricCanvas) {
      fabricCanvas.style.outline = '3px solid red';
      fabricCanvas.style.outlineOffset = '2px';
   
    } else {
      
    }
    
    if (mobileCanvasContainer) {
      mobileCanvasContainer.style.outline = '3px solid blue';
      mobileCanvasContainer.style.outlineOffset = '2px';
   
    } else {
      
    }
    
    if (mobileCanvasArea) {
      mobileCanvasArea.style.outline = '3px solid green';
      mobileCanvasArea.style.outlineOffset = '2px';
   
    } else {
      
    }
  } else {
    
    
    if (fabricCanvas) {
      fabricCanvas.style.outline = '';
      fabricCanvas.style.outlineOffset = '';
    }
    
    if (mobileCanvasContainer) {
      mobileCanvasContainer.style.outline = '';
      mobileCanvasContainer.style.outlineOffset = '';
    }
    
    if (mobileCanvasArea) {
      mobileCanvasArea.style.outline = '';
      mobileCanvasArea.style.outlineOffset = '';
    }
  }
}

// Export the debug function
window.addDebugOutlines = addDebugOutlines; 

// Debounce mechanism to prevent rapid repeated calls
let backgroundPatternTimeout = null;
let orientationChangeTimeout = null;
let resizeTimeout = null;
// Rotation stabilization
let rotationLockTimeout = null;
let rotationLockActive = false;
let pendingReopenMenus = null;

// Debounce multiple fit requests that can happen during rotation/layout churn
let pendingFitTimeout = null;
let suppressFitUntilTs = 0; // epoch ms; when now < this, fits are ignored
function requestDebouncedFit(delayMs = 60, animated = true) {
  if (performance && suppressFitUntilTs && performance.now() < suppressFitUntilTs) {
    return; // suppressed due to user-driven zoom overlay interaction
  }
  if (pendingFitTimeout) clearTimeout(pendingFitTimeout);
  const effectiveDelay = rotationLockActive ? Math.max(delayMs, 120) : delayMs;
  pendingFitTimeout = setTimeout(() => {
    pendingFitTimeout = null;
    mobileCanvasZoomFit(animated);
  }, Math.max(0, effectiveDelay));
}

function startRotationLock(durationMs = 450) {
  rotationLockActive = true;
  if (rotationLockTimeout) clearTimeout(rotationLockTimeout);
  rotationLockTimeout = setTimeout(() => {
    rotationLockActive = false;
    if (pendingReopenMenus) {
      const reopen = pendingReopenMenus;
      pendingReopenMenus = null;
      restoreOpenMenus(reopen);
      requestDebouncedFit(60, true);
    }
  }, durationMs);
}

// Function to reapply mobile canvas background patterns
function reapplyMobileCanvasBackgroundPattern() {
  // Clear any pending timeout
  if (backgroundPatternTimeout) {
    clearTimeout(backgroundPatternTimeout);
  }
  
  // Debounce the actual pattern application
  backgroundPatternTimeout = setTimeout(() => {
    const mobileCanvasContainer = document.getElementById('mobile-canvas-container');
    const mobileCanvasArea = document.getElementById('mobile-canvas-area');
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const isLightTheme = currentTheme === 'light';
    
    // Check orientation to avoid double pattern in portrait
    const isLandscape = window.innerWidth > window.innerHeight;
    
    // Use inline styles to bypass CSS conflicts
    const patternUrl = 'url("Pattern Master black low gray.png")';
    
    // Apply raw pattern to Fabric.js canvas wrapper (like desktop)
    const canvasWrapper = document.querySelector('#mobile-canvas-container .canvas-container');
    if (canvasWrapper) {
      canvasWrapper.style.backgroundImage = patternUrl;
      canvasWrapper.style.backgroundRepeat = 'repeat';
      canvasWrapper.style.backgroundSize = 'auto';
      canvasWrapper.style.backgroundPosition = 'center';
      // NO tinting - raw pattern like desktop
      canvasWrapper.style.backgroundColor = 'transparent';
      canvasWrapper.style.backgroundBlendMode = 'normal';
    }
    
    // Clear any background from mobile-canvas-container (it should be transparent)
    if (mobileCanvasContainer) {
      mobileCanvasContainer.style.backgroundImage = 'none';
      mobileCanvasContainer.style.backgroundColor = 'transparent';
      mobileCanvasContainer.style.backgroundBlendMode = 'normal';
    }
    
    if (mobileCanvasArea) {
      // Apply subtle pattern to area (main background) - much less visible like desktop
      mobileCanvasArea.style.backgroundImage = patternUrl;
      mobileCanvasArea.style.backgroundRepeat = 'repeat';
      mobileCanvasArea.style.backgroundSize = 'auto';
      mobileCanvasArea.style.backgroundPosition = 'center';
      mobileCanvasArea.style.backgroundBlendMode = 'multiply';
      // Much more subtle opacity like desktop version
      const areaOpacity = isLandscape ? 
        (isLightTheme ? 'rgba(255, 255, 255, 0.995)' : 'rgba(0, 0, 0, 0.90)') :
        (isLightTheme ? 'rgba(255, 255, 255, 0.995)' : 'rgba(0, 0, 0, 0.97)');
      mobileCanvasArea.style.backgroundColor = areaOpacity;
    }
    
    backgroundPatternTimeout = null;
  }, 16); // ~1 frame delay - much more responsive
} 

// Keep bottom menus aligned above toolbar on dynamic UI changes
function updateBottomMenusPosition() {
  try {
    const toolbarOffset = getMobileToolbarHeight();
    const isLandscape = window.innerWidth > window.innerHeight;
    const layersPanel = document.getElementById('mobile-layers-panel');
    const panelWidth = layersPanel && isLandscape ? Math.round(layersPanel.offsetWidth || 0) : 0;
  // In portrait, keep the rail and thin menus anchored to the toolbar; do not rise with the panel
  const bottomOffset = toolbarOffset;
    const rightInset = isLandscape ? panelWidth : 0;

    // Only reposition rail if it already exists; do not create it implicitly
    const rail = document.getElementById('mobile-bottom-rail');
    if (rail) {
      rail.style.bottom = bottomOffset + 'px';
      rail.style.right = rightInset + 'px';
      rail.style.left = '0px';
      rail.style.display = '';
    }

    const applyPos = (el) => {
      if (!el) return;
      // Children of rail are absolute positioned within rail
      el.style.bottom = '0px';
      el.style.left = '0px';
      el.style.right = '0px';
    };

    const slide = document.getElementById('mobile-slide-menu');
    const transform = document.getElementById('mobile-transform-menu');
    const layersBar = document.getElementById('mobile-layers-menu');

    if (slide && slide.style.bottom !== '-100%') {
      // Slide menu is not a child of rail; it stays fixed to viewport
      slide.style.bottom = bottomOffset + 'px';
      slide.style.left = '0px';
      slide.style.right = '0px';
    }
    if (rail) {
      applyPos(transform);
      applyPos(layersBar);
    }
  } catch (_) {
    // no-op
  }
}

// Ensure a unified bottom rail container to host thin menus (transform/layers)
function ensureBottomRail() {
  let rail = document.getElementById('mobile-bottom-rail');
  if (!rail) {
    rail = document.createElement('div');
    rail.id = 'mobile-bottom-rail';
    rail.style.cssText = `
      position: fixed;
      left: 0;
      right: 0;
      bottom: ${getMobileToolbarHeight()}px;
      height: 50px;
      z-index: 15001;
      pointer-events: auto; /* allow children to receive events */
      background: transparent; /* avoid unintended gray bars */
    `;
    const root = document.getElementById('mobile-layout') || document.body;
    root.appendChild(rail);
  }
  // Ensure rail has proper inner positioning context
  rail.style.position = 'fixed';
  rail.style.height = '50px';
  rail.style.pointerEvents = 'auto';
  rail.style.background = 'transparent';
  return rail;
}

function teardownBottomRailIfEmpty() {
  const rail = document.getElementById('mobile-bottom-rail');
  if (!rail) return;
  // Any of our thin menus still present?
  const hasChildren = !!(rail.querySelector('#mobile-transform-menu') || rail.querySelector('#mobile-layers-menu'));
  if (!hasChildren) {
    rail.remove();
  }
}

function rememberOpenMenus() {
  return {
    transform: !!document.getElementById('mobile-transform-menu'),
    layersBar: !!document.getElementById('mobile-layers-menu'),
    slideMenu: !!document.getElementById('mobile-slide-menu'),
  };
}

function restoreOpenMenus(state) {
  if (!state) return;
  if (state.transform) showMobileTransformMenu();
  if (state.layersBar) showMobileLayersMenu();
  // We intentionally do not auto-reopen the slide menu on rotation to avoid layout conflicts
}

// Instantly remove overlay menus (no animation) to avoid visible slide-out during rotation
function forceCloseOverlayMenus() {
  const ids = ['mobile-transform-menu','mobile-layers-menu','mobile-slide-menu'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el && el.parentNode) {
      el.parentNode.removeChild(el);
    }
  });
}

// Push/reflow canvas for layers panel and refit zoom
function applyCanvasOffsetForLayersPanel(open) {
  const mobileCanvasArea = document.getElementById('mobile-canvas-area');
  const isLandscape = window.innerWidth > window.innerHeight;
  if (!mobileCanvasArea) return;
  const duration = motionMs();
  const layersPanel = document.getElementById('mobile-layers-panel');
  const panelWidth = layersPanel ? layersPanel.offsetWidth : 0;
  const panelHeight = layersPanel ? layersPanel.offsetHeight : 0;
  const headerH = getMobileHeaderHeight();
  const toolbarH = getMobileToolbarHeight();
  const layersBarH = getMobileLayersBarHeight();

  if (open) {
    if (isLandscape) {
      // Horizontal push handled by layout manager; avoid double-setting here
      mobileCanvasArea.style.transition = `padding ${duration}ms ease`;
      mobileCanvasArea.style.paddingTop = '0px';
      mobileCanvasArea.style.paddingBottom = '0px';
      requestMobileViewportLayout();
    } else {
      // In portrait, rely on the viewport layout manager to size the stage.
      // Avoid adding extra padding here to prevent double-counting, which shifts the canvas too high.
      mobileCanvasArea.style.transition = `padding ${duration}ms ease`;
      mobileCanvasArea.style.paddingRight = '0px';
      mobileCanvasArea.style.paddingTop = '0px';
      mobileCanvasArea.style.paddingBottom = '0px';
      requestMobileViewportLayout();
    }
  } else {
    mobileCanvasArea.style.transition = `padding ${duration}ms ease`;
    mobileCanvasArea.style.paddingRight = '0px';
    mobileCanvasArea.style.paddingTop = '0px';
    mobileCanvasArea.style.paddingBottom = '0px';
  }

  setTimeout(() => {
    if (window.mobileCanvas) requestDebouncedFit(duration, true);
  }, duration);
}

// Dynamically size the layers panel to content and viewport
function sizeAndPositionLayersPanel() {
  const panel = document.getElementById('mobile-layers-panel');
  if (!panel) return;
  const header = panel.querySelector('div');
  const list = document.getElementById('mobile-layers-list');
  const isLandscape = window.innerWidth > window.innerHeight;
  const toolbarOffset = getMobileToolbarHeight();

  if (isLandscape) {
    // Width: clamp between 240px and 35vw based on content
    const contentWidth = Math.min(window.innerWidth * 0.35, Math.max(240, (list?.scrollWidth || 300) + 48));
    panel.style.width = Math.round(contentWidth) + 'px';
    const headerH = getMobileHeaderHeight();
    const toolbarH = getMobileToolbarHeight();
    // In landscape, let the panel extend to the toolbar (so it visually meets the bottom menu).
    // The thin bottom rail/menus should overlay on top of the panel edge if present.
    const railEl = document.getElementById('mobile-bottom-rail');
    const railH = 0; // ignore rail height in landscape so panel reaches the toolbar
    panel.style.height = `calc(100dvh - ${headerH}px - ${toolbarH}px)`;
    panel.style.top = headerH + 'px';
    panel.style.right = '0';
    panel.style.left = '';
    panel.style.bottom = (toolbarH + railH) + 'px';
    // Ensure any portrait-only anchors are cleared
    panel.style.top = headerH + 'px';
    panel.style.borderLeft = '3px solid var(--accent-color)';
    panel.style.borderTop = 'none';
  } else {
    // Height: clamp between 160px and 25vh based on content
    const headerH = header?.offsetHeight || 48;
    const contentH = (list?.scrollHeight || 300) + headerH + 24;
    const maxH = Math.round(window.innerHeight * 0.25);
    const railEl = document.getElementById('mobile-bottom-rail');
    const railH = railEl ? Math.round(railEl.offsetHeight || 50) : 0;
    // Panel height should stop exactly at top of thin menu rail, so allow up to 35vh
    const maxPortraitH = Math.round(window.innerHeight * 0.35);
    const clampedH = Math.min(maxPortraitH, Math.max(160, contentH));
    panel.style.height = clampedH + 'px';
    panel.style.left = '0';
    panel.style.right = '0';
    // Clear landscape anchors to avoid sticking to top after rotation
    panel.style.top = '';
    // Position so panel bottom sits at top of the thin menu/toolbar combination
    const toolbarH = getMobileToolbarHeight();
    const bottomOffset = toolbarH + railH;
    panel.style.bottom = bottomOffset + 'px';
    panel.style.width = '100vw';
    panel.style.borderTop = '3px solid var(--accent-color)';
    panel.style.borderLeft = 'none';
  }
}