// Load HTML components (social, footer)
async function loadComponents() {
    const components = [
        { id: 'social-container', path: '/components/social.html' },
        { id: 'footer-container', path: '/components/footer.html' }
    ];

    await Promise.all(components.map(async (component) => {
        const element = document.getElementById(component.id);
        if (element) {
            try {
                const response = await fetch(component.path);
                if (response.ok) {
                    element.innerHTML = await response.text();
                }
            } catch (error) {
                console.error(`Error loading ${component.path}:`, error);
            }
        }
    }));
}

window.addEventListener('DOMContentLoaded', async event => {
    // Load components first
    await loadComponents();

    // Load latest album and full album list for homepage
    loadAlbums();

    // Newest shop items for homepage
    loadShopPreview();

    // Hidden spring/autumn switch
    setupSeasonToggle();
});

// Line icons for the hidden footer switches (stroke follows the text colour)
const SWITCH_ICON = {
    leaf: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>',
    sprout: '<path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/>'
};

function switchIcon(paths) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths + '</svg>';
}

// Hidden season switch in the footer (the tiny leaf after "created with love")
function setupSeasonToggle() {
    const toggle = document.querySelector('.season-toggle');
    if (!toggle || !window.season) return;

    const refresh = () => {
        const autumn = window.season.current() === 'autumn';
        toggle.innerHTML = switchIcon(autumn ? SWITCH_ICON.sprout : SWITCH_ICON.leaf);
        toggle.title = autumn ? 'Spring' : 'Autumn';
        stopFalling();
        startFalling(autumn ? LEAVES : FLOWERS);
    };

    toggle.addEventListener('click', () => {
        window.season.set(window.season.current() === 'autumn' ? 'spring' : 'autumn');
        refresh();
    });
    refresh();
}

// Pixel leaves falling all the time in autumn mode, like in Mind of Seasons,
// and colourful little flowers in spring.
// Drawn on a low-res canvas that the browser scales up without smoothing.
const LEAF_PIXEL = 3;       // one leaf pixel = 3x3 screen pixels
const LEAF_DENSITY = 60000; // one leaf per this many screen px² (so ~15 on a laptop)

// Diamond-shaped leaf
const LEAVES = {
    colors: [
        '#8b3a3a', '#a04646', '#783232', '#aa5555', // red / burgundy
        '#9b8b3b', '#aa9646', '#8c7d32', '#b4a050'  // yellow / olive
    ],
    size: () => 7 + Math.floor(Math.random() * 4),
    pixel: (lx, ly, size) => Math.abs(lx) / (size / 3) + Math.abs(ly) / (size / 2) <= 1
};

// Five petals around a yellow middle
const FLOWER_CENTER = '#e8c547';
const FLOWERS = {
    colors: [
        '#e88aa8', '#f2a7c3', '#d8698f', // pink
        '#b79be0', '#9d86d4',            // lilac
        '#8fb8ea', '#f4f1ec', '#f2a477'  // blue / white / peach
    ],
    size: () => 9 + Math.floor(Math.random() * 3),
    pixel: (lx, ly, size) => {
        const r = Math.hypot(lx, ly), max = size / 2;
        if (r <= max * 0.32) return FLOWER_CENTER;
        return r <= max * (0.3 + 0.7 * Math.abs(Math.cos(2.5 * Math.atan2(ly, lx))));
    }
};

let leafAnimation = null;

function startFalling(kind) {
    if (leafAnimation || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const canvas = document.createElement('canvas');
    canvas.className = 'leaf-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    let width = 0, height = 0, target = 0;
    const resize = () => {
        width = canvas.width = Math.ceil(window.innerWidth / LEAF_PIXEL);
        height = canvas.height = Math.ceil(window.innerHeight / LEAF_PIXEL);
        target = Math.max(6, Math.round(window.innerWidth * window.innerHeight / LEAF_DENSITY));
    };
    resize();
    window.addEventListener('resize', resize);

    const newLeaf = (anywhere) => ({
        x: Math.random() * width,
        y: anywhere ? Math.random() * height : -10 - Math.random() * height * 0.5,
        color: kind.colors[Math.floor(Math.random() * kind.colors.length)],
        size: kind.size(),
        fall: 8 + Math.random() * 10,
        swaySpeed: 1 + Math.random() * 2,
        swayAmp: 7 + Math.random() * 10,
        swayOffset: Math.random() * Math.PI * 2,
        rotation: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 3,
        time: Math.random() * 100
    });
    const leaves = Array.from({ length: target }, () => newLeaf(true));

    // Filled pixel by pixel, so the edges stay crisp. kind.pixel says whether a pixel
    // belongs to the shape, or returns its own colour (the flower's middle)
    const drawLeaf = (leaf) => {
        const cos = Math.cos(leaf.rotation), sin = Math.sin(leaf.rotation);
        const cx = Math.round(leaf.x), cy = Math.round(leaf.y), r = Math.ceil(leaf.size / 2);
        for (let py = -r; py <= r; py++) {
            for (let px = -r; px <= r; px++) {
                const lx = px * cos + py * sin, ly = -px * sin + py * cos;
                const hit = kind.pixel(lx, ly, leaf.size);
                if (!hit) continue;
                ctx.fillStyle = hit === true ? leaf.color : hit;
                ctx.fillRect(cx + px, cy + py, 1, 1);
            }
        }
    };

    let last = performance.now();
    const frame = (now) => {
        const dt = Math.min((now - last) / 1000, 0.1);
        last = now;
        ctx.clearRect(0, 0, width, height);
        for (let i = leaves.length - 1; i >= 0; i--) {
            const leaf = leaves[i];
            leaf.time += dt;
            leaf.y += leaf.fall * dt;
            leaf.x += Math.sin(leaf.time * leaf.swaySpeed + leaf.swayOffset) * leaf.swayAmp * dt;
            leaf.rotation += leaf.spin * dt;
            if (leaf.y > height + 10 || leaf.x < -20 || leaf.x > width + 20) leaves.splice(i, 1);
            else drawLeaf(leaf);
        }
        while (leaves.length < target) leaves.push(newLeaf(false));
        leafAnimation.id = requestAnimationFrame(frame);
    };
    leafAnimation = { canvas, resize, id: requestAnimationFrame(frame) };
}

function stopFalling() {
    if (!leafAnimation) return;
    cancelAnimationFrame(leafAnimation.id);
    window.removeEventListener('resize', leafAnimation.resize);
    leafAnimation.canvas.remove();
    leafAnimation = null;
}

// Function to load the latest album and the full album list (homepage only)
async function loadAlbums() {
    const latestContainer = document.getElementById('latest-album-container');
    const listContainer = document.getElementById('albums-container');
    if (!latestContainer && !listContainer) return; // Only run on homepage

    try {
        const response = await fetch('albums.json');
        const albums = await response.json();

        // Sort albums by date (newest first)
        albums.sort((a, b) => new Date(b.date) - new Date(a.date));

        if (latestContainer && albums.length) {
            const latestAlbum = albums[0];
            latestContainer.innerHTML = `
                <a href="${latestAlbum.url}" class="album-link">
                    <img class="img-fluid album-img" src="${latestAlbum.image}" alt="${latestAlbum.title}">
                    <h3>${latestAlbum.title}</h3>
                </a>
            `;
        }

        if (listContainer) {
            listContainer.innerHTML = '';
            albums.forEach(album => {
                listContainer.appendChild(createAlbumElement(album));
            });
        }

    } catch (error) {
        console.error('Error loading albums:', error);
        const message = '<p class="text-white-50 text-center">Unable to load albums at this time.</p>';
        if (latestContainer) latestContainer.innerHTML = message;
        if (listContainer) listContainer.innerHTML = message;
    }
}

// Newest items from shop.json on the homepage
const SHOP_PREVIEW_COUNT = 8;

async function loadShopPreview() {
    const container = document.getElementById('shop-preview-container');
    if (!container) return; // Only run on homepage

    try {
        const response = await fetch('shop.json');
        const shop = await response.json();

        const newest = shop.items
            .slice()
            .sort((a, b) => new Date(b.added) - new Date(a.added))
            .slice(0, SHOP_PREVIEW_COUNT);

        container.innerHTML = newest.map(item => `
            <div class="col-album text-center">
                <a href="shop?item=${item.id}" class="album-link">
                    <img class="img-fluid album-img shop-preview-img" src="${item.image}" alt="${item.title}">
                    <h3>${item.title}</h3>
                    <p class="shop-preview-price">${item.kind} &middot; ${item.price} zł${item.kind === 'Merch' ? ' &middot; pre-order' : ''}</p>
                </a>
            </div>
        `).join('') + (shop.bundles || []).map(bundle => `
            <p class="shop-preview-bundle">${bundle.title} for ${bundle.price} zł</p>
        `).join('') + '<p class="shop-preview-bundle">Vinyl and merch only until October 25 - then gone forever</p>' +
            '<p class="shop-preview-bundle">Free stickers with every order</p>';
    } catch (error) {
        console.error('Error loading shop:', error);
        container.innerHTML = '<p class="text-white-50 text-center">Unable to load the shop at this time.</p>';
    }
}

// Function to create an album element
function createAlbumElement(album) {
    const div = document.createElement('div');
    div.className = 'col-album text-center';

    div.innerHTML = `
        <a href="${album.url}" class="album-link">
            <img class="img-fluid album-img" src="${album.image}" alt="${album.title}">
            <h3>${album.title}</h3>
        </a>
    `;

    return div;
}
