/**
 * BrickByBrick - UI Interactions & Product Showcase
 */

// Mobile Navigation Toggle
const menuToggle = document.getElementById('menuToggle');
const navLinks = document.getElementById('navLinks');

if (menuToggle && navLinks) {
  menuToggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', isOpen);
    menuToggle.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
  });
}

document.querySelectorAll('.nav-links a').forEach(link => {
  link.addEventListener('click', () => {
    if (navLinks) navLinks.classList.remove('open');
    if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');
  });
});

// Product Gallery & Variant Selection
const galleryImage = document.getElementById('galleryImage');
const titleEl = document.getElementById('productTitle');
const crumbEl = document.getElementById('breadcrumbProduct');
const chosenEl = document.getElementById('variantChosen');
const variantList = document.getElementById('variantList');
const priceEl = document.querySelector('.price-row strong');
const delPriceEl = document.querySelector('.price-row del');
const discountBadge = document.getElementById('discountBadge');
const stockEl = document.querySelector('.stock');

let currentProductId = 'kuromi';

function extractProductId(src) {
  if (!src) return 'kuromi';
  return src.split('/').pop().replace(/\.png$/i, '').toLowerCase();
}

function selectProduct(productId, customAlt) {
  const cleanId = extractProductId(productId);
  const product = (typeof getProductById === 'function' && getProductById(cleanId)) || {
    id: cleanId,
    name: cleanId.charAt(0).toUpperCase() + cleanId.slice(1) + ' Display Set',
    character: cleanId.charAt(0).toUpperCase() + cleanId.slice(1),
    price: 899,
    originalPrice: 1099,
    stock: 12,
    image: `images/${cleanId}.png`
  };

  currentProductId = product.id;

  if (galleryImage) {
    galleryImage.src = product.image;
    galleryImage.alt = customAlt || `${product.character} pixel-art collectible brick figure`;
  }

  const titleText = product.name || `${product.character} Display Set`;
  if (titleEl) titleEl.textContent = titleText;
  if (crumbEl) crumbEl.textContent = titleText;
  if (chosenEl) chosenEl.textContent = product.character;
  document.title = `${titleText} — BrickByBrick`;

  if (priceEl && typeof formatPrice === 'function') {
    priceEl.textContent = formatPrice(product.price);
  }
  if (delPriceEl && typeof formatPrice === 'function') {
    delPriceEl.textContent = formatPrice(product.originalPrice || 1099);
  }
  if (discountBadge && product.originalPrice && product.price) {
    const pct = Math.round((1 - product.price / product.originalPrice) * 100);
    discountBadge.textContent = `SAVE ${pct}%`;
  }
  if (stockEl) {
    stockEl.textContent = `${product.stock || 12} in stock`;
  }

  // Update thumbnail active states
  document.querySelectorAll('.thumb').forEach(t => {
    const isSelected = extractProductId(t.dataset.image) === currentProductId;
    t.classList.toggle('selected', isSelected);
  });

  // Update variant button states
  document.querySelectorAll('.variant').forEach(v => {
    const isActive = extractProductId(v.dataset.image) === currentProductId;
    v.classList.toggle('active', isActive);
    v.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
}

// Attach thumbnail click handlers
document.querySelectorAll('.thumb').forEach(thumb => {
  thumb.addEventListener('click', () => {
    selectProduct(thumb.dataset.image, thumb.dataset.alt);
  });
});

// Build variant buttons if variantList container exists
if (variantList && variantList.children.length === 0) {
  document.querySelectorAll('.thumb').forEach(t => {
    const prodId = extractProductId(t.dataset.image);
    const prod = (typeof getProductById === 'function' && getProductById(prodId));
    const charName = prod ? prod.character : (t.dataset.alt || prodId).split(' ')[0];

    const btn = document.createElement('button');
    btn.className = 'variant';
    btn.type = 'button';
    btn.dataset.id = prodId;
    btn.dataset.image = t.dataset.image;
    btn.textContent = charName;
    btn.setAttribute('aria-pressed', t.classList.contains('selected') ? 'true' : 'false');

    btn.addEventListener('click', () => {
      selectProduct(t.dataset.image, t.dataset.alt);
    });

    variantList.appendChild(btn);
  });
}

// Quantity Stepper
let currentQuantity = 1;
const qtyValueEl = document.getElementById('qtyValue');
const stepDownBtn = document.getElementById('stepDown');
const stepUpBtn = document.getElementById('stepUp');

function updateQuantityDisplay() {
  if (qtyValueEl) qtyValueEl.textContent = currentQuantity;
  if (stepDownBtn) stepDownBtn.disabled = currentQuantity <= 1;
  if (stepUpBtn) stepUpBtn.disabled = currentQuantity >= 12;
}

if (stepDownBtn) {
  stepDownBtn.addEventListener('click', () => {
    if (currentQuantity > 1) {
      currentQuantity--;
      updateQuantityDisplay();
    }
  });
}

if (stepUpBtn) {
  stepUpBtn.addEventListener('click', () => {
    if (currentQuantity < 12) {
      currentQuantity++;
      updateQuantityDisplay();
    }
  });
}

updateQuantityDisplay();

// Add to Cart Button
const addToCartButton = document.getElementById('addToCartBtn');
if (addToCartButton) {
  addToCartButton.addEventListener('click', () => {
    if (typeof addToCart === 'function') {
      addToCart(currentProductId, currentQuantity);
    }
  });
}

// Buy Now Button
const buyNowButton = document.getElementById('buyNowBtn');
if (buyNowButton) {
  buyNowButton.addEventListener('click', () => {
    if (typeof buyNow === 'function') {
      buyNow(currentProductId, currentQuantity);
    }
  });
}

// Accordion Behavior
document.querySelectorAll('.accordion-trigger').forEach(trigger => {
  trigger.addEventListener('click', () => {
    const panelId = trigger.getAttribute('aria-controls');
    const panel = document.getElementById(panelId);
    const isExpanded = trigger.getAttribute('aria-expanded') === 'true';

    // Close other panels
    document.querySelectorAll('.accordion-trigger').forEach(t => {
      t.setAttribute('aria-expanded', 'false');
      const p = document.getElementById(t.getAttribute('aria-controls'));
      if (p) p.style.maxHeight = null;
    });

    if (!isExpanded && panel) {
      trigger.setAttribute('aria-expanded', 'true');
      panel.style.maxHeight = panel.scrollHeight + 'px';
    }
  });
});

// Newsletter Signup Form
const signupForm = document.getElementById('signupForm');
if (signupForm) {
  signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('signupEmail');
    const msg = document.getElementById('signupMsg');

    if (input && input.checkValidity()) {
      if (msg) msg.textContent = "You're on the list! Welcome to the builder club.";
      input.value = '';
    } else if (msg) {
      msg.textContent = 'Please enter a valid email address.';
      if (input) input.focus();
    }
  });
}