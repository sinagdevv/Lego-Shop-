// =============================================================
// Cart count — shared across landing.html and index.html via localStorage
// =============================================================
const CART_KEY = 'bbb_cart_count';

function getCartCount(){
  return parseInt(localStorage.getItem(CART_KEY) || '0', 10);
}

function setCartCount(value){
  localStorage.setItem(CART_KEY, String(value));
  document.getElementById('cartCount').textContent = value;
}

setCartCount(getCartCount());

// Keep cart badge in sync if it changes in another tab/page
window.addEventListener('storage', (e) => {
  if (e.key === CART_KEY) {
    document.getElementById('cartCount').textContent = getCartCount();
  }
});

// =============================================================
// Mobile hamburger menu
// =============================================================
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');

hamburger.addEventListener('click', () => {
  const isOpen = navLinks.classList.toggle('is-open');
  hamburger.setAttribute('aria-expanded', String(isOpen));
});

// =============================================================
// Variant selector
// =============================================================
const swatches = document.querySelectorAll('.swatch');
const variantChosen = document.getElementById('variantChosen');

swatches.forEach((swatch) => {
  swatch.addEventListener('click', () => {
    swatches.forEach((s) => {
      s.classList.remove('is-selected');
      s.setAttribute('aria-pressed', 'false');
    });
    swatch.classList.add('is-selected');
    swatch.setAttribute('aria-pressed', 'true');
    variantChosen.textContent = swatch.dataset.name;
  });
});

// =============================================================
// Quantity stepper
// =============================================================
const MIN_QTY = 2;
const MAX_QTY = 8; // matches stock count

let qty = MIN_QTY;
const qtyValue = document.getElementById('qtyValue');
const stepDown = document.getElementById('stepDown');
const stepUp = document.getElementById('stepUp');
const stockText = document.getElementById('stockText');

function renderQty(){
  qtyValue.textContent = qty;
  stepDown.disabled = qty <= MIN_QTY;
  stepUp.disabled = qty >= MAX_QTY;
  stockText.textContent = `${MAX_QTY} sets in stock`;
}

stepDown.addEventListener('click', () => {
  if (qty > MIN_QTY) {
    qty -= 1;
    renderQty();
  }
});

stepUp.addEventListener('click', () => {
  if (qty < MAX_QTY) {
    qty += 1;
    renderQty();
  }
});

renderQty();

// =============================================================
// Add to cart / Buy now
// =============================================================
const addToCartBtn = document.getElementById('addToCartBtn');
const buyNowBtn = document.getElementById('buyNowBtn');
const purchaseToast = document.getElementById('purchaseToast');

let toastTimer = null;

function showToast(message){
  purchaseToast.textContent = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    purchaseToast.textContent = '';
  }, 3000);
}

addToCartBtn.addEventListener('click', () => {
  setCartCount(getCartCount() + qty);
  showToast(`Added ${qty} to cart.`);
});

buyNowBtn.addEventListener('click', () => {
  showToast('Proceeding to checkout…');
});

// =============================================================
// Accordion — only one section open at a time
// =============================================================
const accordionTriggers = document.querySelectorAll('.accordion__trigger');

accordionTriggers.forEach((trigger) => {
  trigger.addEventListener('click', () => {
    const panel = document.getElementById(trigger.getAttribute('aria-controls'));
    const isOpen = trigger.getAttribute('aria-expanded') === 'true';

    accordionTriggers.forEach((t) => {
      t.setAttribute('aria-expanded', 'false');
      document.getElementById(t.getAttribute('aria-controls')).style.maxHeight = null;
    });

    if (!isOpen) {
      trigger.setAttribute('aria-expanded', 'true');
      panel.style.maxHeight = panel.scrollHeight + 'px';
    }
  });
});

// =============================================================
// Footer email signup — format validation, no backend
// =============================================================
const signupForm = document.getElementById('signupForm');
const signupEmail = document.getElementById('signupEmail');
const signupMsg = document.getElementById('signupMsg');
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

signupForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const value = signupEmail.value.trim();

  if (EMAIL_PATTERN.test(value)) {
    signupMsg.textContent = "You're on the list!";
    signupMsg.style.color = 'var(--ink-navy)';
    signupForm.reset();
  } else {
    signupMsg.textContent = 'Enter a valid email address.';
    signupMsg.style.color = '#5c1a00';
  }
});