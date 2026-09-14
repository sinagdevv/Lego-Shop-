const CART_KEY='brickbybrick_cart_count';
const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
function cartCount(){return Number(localStorage.getItem(CART_KEY)||0)}
function renderCart(){const n=cartCount();const el=$('#cartCount');if(el)el.textContent=n;const btn=$('.cart');if(btn)btn.setAttribute('aria-label','Cart, '+n+' items')}
renderCart();window.addEventListener('storage',renderCart);
const menu=$('#menuToggle'),nav=$('#navLinks');
if(menu)menu.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',open);menu.setAttribute('aria-label',open?'Close menu':'Open menu')});
$$('.nav-links a').forEach(a=>a.addEventListener('click',()=>{nav?.classList.remove('open');menu?.setAttribute('aria-expanded','false')}));
const image=$('#galleryImage');
const titleEl=$('#productTitle'),crumbEl=$('#breadcrumbProduct'),chosen=$('#variantChosen'),variantList=$('#variantList');
const nameOverrides={hellokitty:'Hello Kitty',mickeymouse:'Mickey Mouse',minniemouse:'Minnie Mouse',cinnamonroll:'Cinnamoroll',pochaco:'Pochaco'};
function productName(src){const base=src.split('/').pop().replace(/\.png$/i,'');return nameOverrides[base]||base.charAt(0).toUpperCase()+base.slice(1)}
function setImage(src,alt){if(!image)return;const name=productName(src),label=name+' Display Set';image.src=src;image.alt=alt||name+' pixel-art collectible brick figure';if(titleEl)titleEl.textContent=label;if(crumbEl)crumbEl.textContent=label;document.title=label+' — BrickByBrick';if(chosen)chosen.textContent=name;$$('.thumb').forEach(t=>t.classList.toggle('selected',t.dataset.image===src));$$('.variant').forEach(v=>{const active=v.dataset.image===src;v.classList.toggle('active',active);v.setAttribute('aria-pressed',active?'true':'false')})}
$$('.thumb').forEach(t=>t.addEventListener('click',()=>setImage(t.dataset.image,t.dataset.alt)));
if(variantList){$$('.thumb').forEach(t=>{const name=productName(t.dataset.image),button=document.createElement('button');button.className='variant';button.type='button';button.dataset.name=name;button.dataset.image=t.dataset.image;button.setAttribute('aria-pressed',t.classList.contains('selected')?'true':'false');button.textContent=name;variantList.appendChild(button)});}
const currentPrice=$('.price-row>strong'),originalPrice=$('.price-row del'),discountBadge=$('#discountBadge');
if(currentPrice&&originalPrice&&discountBadge){const current=Number(currentPrice.textContent.replace(/[^\d]/g,'')),original=Number(originalPrice.textContent.replace(/[^\d]/g,''));if(original>current)discountBadge.textContent='SAVE '+Math.round((1-current/original)*100)+'%'}
$$('.variant').forEach(v=>v.addEventListener('click',()=>setImage(v.dataset.image,v.dataset.name+' pixel-art collectible brick figure')));
let qty=1;const qtyEl=$('#qtyValue'),down=$('#stepDown'),up=$('#stepUp');
function renderQty(){if(qtyEl)qtyEl.textContent=qty;if(down)down.disabled=qty<=1;if(up)up.disabled=qty>=12}if(down)down.addEventListener('click',()=>{if(qty>1){qty--;renderQty()}});if(up)up.addEventListener('click',()=>{if(qty<12){qty++;renderQty()}});renderQty();
let timer;function toast(msg){const t=$('#purchaseToast');if(!t)return;t.textContent=msg;clearTimeout(timer);timer=setTimeout(()=>t.textContent='',2800)}
const add=$('#addToCartBtn');if(add)add.addEventListener('click',()=>{localStorage.setItem(CART_KEY,String(cartCount()+qty));renderCart();toast('Added to cart!')});const buy=$('#buyNowBtn');if(buy)buy.addEventListener('click',()=>toast('Proceeding to checkout…'));
$$('.accordion-trigger').forEach(trigger=>trigger.addEventListener('click',()=>{const panel=document.getElementById(trigger.getAttribute('aria-controls')),open=trigger.getAttribute('aria-expanded')==='true';$$('.accordion-trigger').forEach(t=>{t.setAttribute('aria-expanded','false');const p=document.getElementById(t.getAttribute('aria-controls'));if(p)p.style.maxHeight=null});if(!open){trigger.setAttribute('aria-expanded','true');panel.style.maxHeight=panel.scrollHeight+'px'}}));
const form=$('#signupForm');if(form)form.addEventListener('submit',e=>{e.preventDefault();const input=$('#signupEmail'),msg=$('#signupMsg');if(input.checkValidity()){msg.textContent="You're on the list!";input.value=''}else{msg.textContent='Enter a valid email address.';input.focus()}});
