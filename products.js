/**
 * BrickByBrick - Product Catalog & Configuration
 * Vanilla JavaScript Product Data Store
 */

// ===================================================
// FRONTEND CONFIGURATION
// ===================================================
// Replace these placeholders with your actual credentials:
// 1. GOOGLE_CLIENT_ID from Google Cloud Console OAuth 2.0 Credentials
// 2. APPS_SCRIPT_URL from Google Apps Script Web App Deployment
window.BRICKBYBRICK_CONFIG = {
  GOOGLE_CLIENT_ID: "444186995295-ihrvod29i5im5hvv4v2soivv886nd92a.apps.googleusercontent.com",
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbyFe4q1XuvY7UhmcZ4zY2oIG37GSM4NosdHxKYbFVogcqp-UJmD_Q9UsB_4FWg2Msht/exec"
};

// Config validation helpers
function isGoogleAuthConfigured() {
  const cid = window.BRICKBYBRICK_CONFIG?.GOOGLE_CLIENT_ID;
  if (!cid || typeof cid !== "string") return false;
  const clean = cid.trim();
  if (clean === "" || /YOUR_GOOGLE|PASTE_YOUR|REPLACE_ME/i.test(clean)) return false;
  return true;
}

function isAppsScriptConfigured() {
  const url = window.BRICKBYBRICK_CONFIG?.APPS_SCRIPT_URL;
  if (!url || typeof url !== "string") return false;
  const clean = url.trim();
  if (clean === "" || /YOUR_GOOGLE|PASTE_YOUR|REPLACE_ME/i.test(clean)) return false;
  return clean.includes("/exec");
}

// ===================================================
// CENTRAL PRODUCT CATALOG
// ===================================================
window.BRICKBYBRICK_PRODUCTS = {
  kuromi: {
    id: "kuromi",
    name: "Kuromi Display Set",
    character: "Kuromi",
    price: 899,
    originalPrice: 1099,
    image: "images/kuromi.png",
    stock: 12,
    pieces: 600,
    model: "BB-SK-600",
    description: "A cheerful, display-ready character build with snap-fit pieces, numbered stages, and a tiny personality-packed silhouette."
  },
  stitch: {
    id: "stitch",
    name: "Stitch Display Set",
    character: "Stitch",
    price: 899,
    originalPrice: 1099,
    image: "images/stitch.png",
    stock: 15,
    pieces: 600,
    model: "BB-SK-601",
    description: "Cosmic mischief captured in vibrant blues. Features posable ears and a sturdy display stand."
  },
  alien: {
    id: "alien",
    name: "Alien Explorer Set",
    character: "Alien",
    price: 899,
    originalPrice: 1099,
    image: "images/alien.png",
    stock: 10,
    pieces: 600,
    model: "BB-SK-602",
    description: "The beloved three-eyed extraterrestrial ready to gaze into your collection from Pizza Planet."
  },
  cinnamonroll: {
    id: "cinnamonroll",
    name: "Cinnamoroll Cloud Set",
    character: "Cinnamoroll",
    price: 899,
    originalPrice: 1099,
    image: "images/cinnamonroll.png",
    stock: 14,
    pieces: 600,
    model: "BB-SK-603",
    description: "Fluffy white puppy born from a cloud with long ears and an unmistakable spiral tail."
  },
  crab: {
    id: "crab",
    name: "Crab Coastal Set",
    character: "Crab",
    price: 899,
    originalPrice: 1099,
    image: "images/crab.png",
    stock: 9,
    pieces: 600,
    model: "BB-SK-604",
    description: "A spirited beachside companion with articulated claws and a bold crimson shell."
  },
  goofy: {
    id: "goofy",
    name: "Goofy Classic Set",
    character: "Goofy",
    price: 899,
    originalPrice: 1099,
    image: "images/goofy.png",
    stock: 8,
    pieces: 600,
    model: "BB-SK-605",
    description: "Everyone's favorite lovable tall pal wearing his classic green cap and orange vest."
  },
  hellokitty: {
    id: "hellokitty",
    name: "Hello Kitty Bow Set",
    character: "Hello Kitty",
    price: 899,
    originalPrice: 1099,
    image: "images/hellokitty.png",
    stock: 16,
    pieces: 600,
    model: "BB-SK-606",
    description: "The timeless global icon with signature red bow and cute pixelated whiskers."
  },
  lotso: {
    id: "lotso",
    name: "Lotso Bear Set",
    character: "Lotso",
    price: 899,
    originalPrice: 1099,
    image: "images/lotso.png",
    stock: 11,
    pieces: 600,
    model: "BB-SK-607",
    description: "The iconic magenta strawberry-scented teddy bear with distinctive cane and plush styling."
  },
  luigi: {
    id: "luigi",
    name: "Luigi Hero Set",
    character: "Luigi",
    price: 899,
    originalPrice: 1099,
    image: "images/luigi.png",
    stock: 13,
    pieces: 600,
    model: "BB-SK-608",
    description: "The taller brother in emerald green overalls, ready to jump right onto your display desk."
  },
  mario: {
    id: "mario",
    name: "Mario Adventure Set",
    character: "Mario",
    price: 899,
    originalPrice: 1099,
    image: "images/mario.png",
    stock: 18,
    pieces: 600,
    model: "BB-SK-609",
    description: "The legendary red-capped plumber icon recreated in 600 snap-fit pixel-art bricks."
  },
  melody: {
    id: "melody",
    name: "My Melody Sweet Set",
    character: "Melody",
    price: 899,
    originalPrice: 1099,
    image: "images/melody.png",
    stock: 12,
    pieces: 600,
    model: "BB-SK-610",
    description: "Sweet pink-hooded rabbit character bringing warmth, kindness, and pastel perfection."
  },
  mickeymouse: {
    id: "mickeymouse",
    name: "Mickey Mouse Set",
    character: "Mickey Mouse",
    price: 899,
    originalPrice: 1099,
    image: "images/mickeymouse.png",
    stock: 20,
    pieces: 600,
    model: "BB-SK-611",
    description: "The true original mouse in bright red shorts and yellow shoes. A centerpiece for any shelf."
  },
  minniemouse: {
    id: "minniemouse",
    name: "Minnie Mouse Set",
    character: "Minnie Mouse",
    price: 899,
    originalPrice: 1099,
    image: "images/minniemouse.png",
    stock: 15,
    pieces: 600,
    model: "BB-SK-612",
    description: "Classic polka-dot style and cheerful smile. Perfectly pairs with Mickey Mouse."
  },
  patrick: {
    id: "patrick",
    name: "Patrick Star Set",
    character: "Patrick",
    price: 899,
    originalPrice: 1099,
    image: "images/patrick.png",
    stock: 14,
    pieces: 600,
    model: "BB-SK-613",
    description: "Bikini Bottom's pinkest resident wearing his iconic lime-and-purple floral swim trunks."
  },
  pikachu: {
    id: "pikachu",
    name: "Pikachu Spark Set",
    character: "Pikachu",
    price: 899,
    originalPrice: 1099,
    image: "images/pikachu.png",
    stock: 22,
    pieces: 600,
    model: "BB-SK-614",
    description: "High-voltage collectible with rosy red cheeks and lightning bolt tail in brick form."
  },
  pluto: {
    id: "pluto",
    name: "Pluto Pup Set",
    character: "Pluto",
    price: 899,
    originalPrice: 1099,
    image: "images/pluto.png",
    stock: 10,
    pieces: 600,
    model: "BB-SK-615",
    description: "Loyal golden hound with floppy black ears, green collar, and enthusiastic posture."
  },
  png: {
    id: "png",
    name: "Spark Mystery Build",
    character: "Mystery",
    price: 899,
    originalPrice: 1099,
    image: "images/png.png",
    stock: 7,
    pieces: 600,
    model: "BB-SK-616",
    description: "A special edition mystery build for builders who love surprises and rare figures."
  },
  pochaco: {
    id: "pochaco",
    name: "Pochacco Sporty Set",
    character: "Pochacco",
    price: 899,
    originalPrice: 1099,
    image: "images/pochaco.png",
    stock: 11,
    pieces: 600,
    model: "BB-SK-617",
    description: "Curious and sporty puppy with cute black floppy ears and cheerful disposition."
  },
  psyduck: {
    id: "psyduck",
    name: "Psyduck Pocket Build",
    character: "Psyduck",
    price: 899,
    originalPrice: 1099,
    image: "images/psyduck.png",
    stock: 13,
    pieces: 600,
    model: "BB-SK-618",
    description: "Perpetually puzzled yellow duck with paws on head, channeling mysterious psychic charm."
  },
  squidward: {
    id: "squidward",
    name: "Squidward Art Set",
    character: "Squidward",
    price: 899,
    originalPrice: 1099,
    image: "images/squidward.png",
    stock: 9,
    pieces: 600,
    model: "BB-SK-619",
    description: "The sophisticated clarinetist of Conch Street captured in unimpressed glory."
  }
};

// Format currency in Philippine Peso
function formatPrice(amount) {
  const num = Number(amount) || 0;
  return '₱' + num.toLocaleString('en-PH');
}

// Lookup product safely by id or character name
function getProductById(idOrName) {
  if (!idOrName) return null;
  const key = String(idOrName).toLowerCase().replace(/[^a-z0-9]/g, '');
  if (window.BRICKBYBRICK_PRODUCTS[key]) {
    return window.BRICKBYBRICK_PRODUCTS[key];
  }
  // Search by character name
  const all = Object.values(window.BRICKBYBRICK_PRODUCTS);
  return all.find(p => p.character.toLowerCase().replace(/[^a-z0-9]/g, '') === key) || null;
}
