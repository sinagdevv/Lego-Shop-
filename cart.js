/**
 * BrickByBrick - Shopping Cart Module
 * Persistent Cart Drawer, Quantity Control & Toast Notifications
 */

const CART_STORAGE_KEY = 'brickbybrick_cart';

// Read raw cart array from localStorage
function getCart() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Error reading cart from localStorage:', e);
    return [];
  }
}

// Save cart array to localStorage and notify UI
function saveCart(cart) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    // Also maintain legacy count key for any external scripts
    const count = getCartTotalItemCount();
    localStorage.setItem('brickbybrick_cart_count', String(count));
    
    window.dispatchEvent(new CustomEvent('brickbybrick:cart-change', { detail: cart }));
    renderCartBadges();
    renderCartDrawerContent();
  } catch (e) {
    console.error('Error saving cart to localStorage:', e);
  }
}

// Calculate total number of items
function getCartTotalItemCount() {
  const cart = getCart();
  return cart.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
}

// Calculate subtotal price
function getCartSubtotal() {
  const cart = getCart();
  return cart.reduce((sum, item) => {
    const qty = Math.max(1, Number(item.quantity) || 1);
    const price = Number(item.price) || 0;
    return sum + (qty * price);
  }, 0);
}

// Add item to cart
function addToCart(productId, quantity = 1) {
  const product = getProductById(productId);
  if (!product) {
    console.error('Product not found:', productId);
    return false;
  }

  const cleanQty = Math.max(1, Math.min(99, parseInt(quantity, 10) || 1));
  const cart = getCart();
  const existingIndex = cart.findIndex(item => item.id === product.id);

  if (existingIndex > -1) {
    cart[existingIndex].quantity += cleanQty;
    // Don't exceed stock if defined
    if (product.stock && cart[existingIndex].quantity > product.stock) {
      cart[existingIndex].quantity = product.stock;
    }
  } else {
    cart.push({
      id: product.id,
      character: product.character,
      price: product.price,
      quantity: cleanQty,
      image: product.image
    });
  }

  saveCart(cart);
  showToast(`${product.character} added to cart!`);
  return true;
}

// Buy Now flow: adds item to cart and proceeds directly to checkout or auth
function buyNow(productId, quantity = 1) {
  const success = addToCart(productId, quantity);
  if (!success) return;

  if (isAuthenticated()) {
    window.location.href = 'checkout.html';
  } else {
    showAuthModal('checkout.html');
  }
}

// Update quantity of an item
function updateCartQuantity(productId, newQty) {
  const cleanQty = parseInt(newQty, 10);
  const cart = getCart();
  const itemIndex = cart.findIndex(item => item.id === productId);

  if (itemIndex === -1) return;

  if (cleanQty <= 0) {
    removeFromCart(productId);
    return;
  }

  const product = getProductById(productId);
  const maxStock = product?.stock || 99;
  cart[itemIndex].quantity = Math.min(cleanQty, maxStock);
  saveCart(cart);
}

// Increment quantity by 1
function incrementCartItem(productId) {
  const cart = getCart();
  const item = cart.find(i => i.id === productId);
  if (item) {
    updateCartQuantity(productId, item.quantity + 1);
  }
}

// Decrement quantity by 1
function decrementCartItem(productId) {
  const cart = getCart();
  const item = cart.find(i => i.id === productId);
  if (item) {
    updateCartQuantity(productId, item.quantity - 1);
  }
}

// Remove item from cart completely
function removeFromCart(productId) {
  let cart = getCart();
  const removed = cart.find(item => item.id === productId);
  cart = cart.filter(item => item.id !== productId);
  saveCart(cart);

  if (removed) {
    showToast(`${removed.character} removed from cart`);
  }
}

// Empty entire cart
function clearCart() {
  saveCart([]);
}

// Update badges in navbars across pages
function renderCartBadges() {
  const count = getCartTotalItemCount();
  const badges = document.querySelectorAll('.cart b, #cartCount');
  badges.forEach(b => {
    b.textContent = count;
  });

  const cartButtons = document.querySelectorAll('.cart');
  cartButtons.forEach(btn => {
    btn.setAttribute('aria-label', count > 0 ? `Open shopping cart (${count} items)` : 'Open shopping cart');
  });
}

// Global Toast Notification Helper
let toastTimer = null;
function showToast(message, type = 'success') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `pixel-toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-stud">■</span>
    <span class="toast-text">${message}</span>
  `;

  container.appendChild(toast);

  // Trigger entrance
  requestAnimationFrame(() => {
    toast.classList.add('visible');
  });

  // Remove after 3 seconds
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 250);
  }, 3000);
}

// Cart Drawer Setup & DOM Injection
function ensureCartDrawerDOM() {
  if (document.getElementById('cartDrawer')) return;

  const drawerHtml = `
    <div class="cart-backdrop" id="cartBackdrop" aria-hidden="true"></div>
    <aside class="cart-drawer" id="cartDrawer" aria-hidden="true" aria-labelledby="cartTitle" role="dialog">
      <div class="cart-drawer-head">
        <div class="drawer-title-wrap">
          <span class="drawer-title-icon">▱</span>
          <h2 id="cartTitle">YOUR CART</h2>
        </div>
        <button class="cart-close" id="cartClose" type="button" aria-label="Close cart">×</button>
      </div>

      <div class="cart-drawer-body" id="cartDrawerBody">
        <!-- Rendered dynamically -->
      </div>

      <div class="cart-drawer-foot" id="cartDrawerFoot">
        <div class="cart-summary-line">
          <span>Subtotal</span>
          <strong id="cartDrawerSubtotal">₱0</strong>
        </div>
        <div class="cart-shipping-notice">
          <span class="badge-free">FREE</span> Free nationwide shipping
        </div>
        <div class="cart-total-line">
          <span>TOTAL</span>
          <strong id="cartDrawerTotal">₱0</strong>
        </div>
        <button class="button primary cart-checkout-btn" id="drawerCheckoutBtn" type="button">
          CHECKOUT →
        </button>
      </div>
    </aside>
  `;

  document.body.insertAdjacentHTML('beforeend', drawerHtml);

  // Bind close and backdrop handlers
  const drawer = document.getElementById('cartDrawer');
  const backdrop = document.getElementById('cartBackdrop');
  const closeBtn = document.getElementById('cartClose');
  const checkoutBtn = document.getElementById('drawerCheckoutBtn');

  if (closeBtn) closeBtn.addEventListener('click', closeCartDrawer);
  if (backdrop) backdrop.addEventListener('click', closeCartDrawer);

  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      const cart = getCart();
      if (cart.length === 0) return;

      closeCartDrawer();
      if (isAuthenticated()) {
        window.location.href = 'checkout.html';
      } else {
        showAuthModal('checkout.html');
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.classList.contains('open')) {
      closeCartDrawer();
    }
  });
}

// Render dynamic items inside the Cart Drawer
function renderCartDrawerContent() {
  const body = document.getElementById('cartDrawerBody');
  const foot = document.getElementById('cartDrawerFoot');
  const subtotalEl = document.getElementById('cartDrawerSubtotal');
  const totalEl = document.getElementById('cartDrawerTotal');
  const checkoutBtn = document.getElementById('drawerCheckoutBtn');

  if (!body) return;

  const cart = getCart();

  if (cart.length === 0) {
    body.innerHTML = `
      <div class="cart-empty-state">
        <div class="empty-icon">▦</div>
        <h3>YOUR CART IS EMPTY</h3>
        <p>No builds in your bag yet. Pick a character from the collection to start building!</p>
        <a href="index.html" class="button outline small-btn" onclick="closeCartDrawer()">Browse Characters</a>
      </div>
    `;
    if (foot) foot.classList.add('is-empty');
    if (checkoutBtn) checkoutBtn.disabled = true;
    return;
  }

  if (foot) foot.classList.remove('is-empty');
  if (checkoutBtn) checkoutBtn.disabled = false;

  let itemsHtml = '<ul class="cart-items-list" role="list">';
  cart.forEach(item => {
    const itemSubtotal = (Number(item.price) || 0) * (Number(item.quantity) || 1);
    itemsHtml += `
      <li class="cart-item" data-id="${item.id}">
        <div class="cart-item-img pixel-frame">
          <img src="${item.image}" alt="${item.character} build">
        </div>
        <div class="cart-item-details">
          <div class="cart-item-top">
            <h4 class="cart-item-title">${item.character}</h4>
            <button type="button" class="cart-remove-btn" onclick="removeFromCart('${item.id}')" aria-label="Remove ${item.character}">
              Remove
            </button>
          </div>
          <div class="cart-item-calc">
            ${formatPrice(item.price)} × ${item.quantity} = <strong>${formatPrice(itemSubtotal)}</strong>
          </div>
          <div class="cart-item-actions">
            <div class="cart-stepper" aria-label="Quantity for ${item.character}">
              <button type="button" class="cart-step-btn" onclick="decrementCartItem('${item.id}')" aria-label="Decrease quantity">−</button>
              <span class="cart-step-val">${item.quantity}</span>
              <button type="button" class="cart-step-btn" onclick="incrementCartItem('${item.id}')" aria-label="Increase quantity">+</button>
            </div>
          </div>
        </div>
      </li>
    `;
  });
  itemsHtml += '</ul>';

  body.innerHTML = itemsHtml;

  const subtotal = getCartSubtotal();
  if (subtotalEl) subtotalEl.textContent = formatPrice(subtotal);
  if (totalEl) totalEl.textContent = formatPrice(subtotal);
}

// Open Cart Drawer
function openCartDrawer() {
  ensureCartDrawerDOM();
  renderCartDrawerContent();

  const drawer = document.getElementById('cartDrawer');
  const backdrop = document.getElementById('cartBackdrop');

  if (drawer && backdrop) {
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    backdrop.classList.add('open');
    backdrop.setAttribute('aria-hidden', 'false');
    document.body.classList.add('cart-open');

    const closeBtn = document.getElementById('cartClose');
    if (closeBtn) closeBtn.focus();
  }
}

// Close Cart Drawer
function closeCartDrawer() {
  const drawer = document.getElementById('cartDrawer');
  const backdrop = document.getElementById('cartBackdrop');

  if (drawer && backdrop) {
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    backdrop.classList.remove('open');
    backdrop.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('cart-open');
  }
}

// Setup Cart button listeners
function initCartListeners() {
  ensureCartDrawerDOM();
  renderCartBadges();

  document.querySelectorAll('.cart').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openCartDrawer();
    });
  });

  window.addEventListener('storage', (e) => {
    if (e.key === CART_STORAGE_KEY || e.key === 'brickbybrick_cart_count') {
      renderCartBadges();
      renderCartDrawerContent();
    }
  });
}

document.addEventListener('DOMContentLoaded', initCartListeners);
