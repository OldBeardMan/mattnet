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

    // Hidden spring/autumn switch
    setupSeasonToggle();
});

// Hidden season switch in the footer (the tiny leaf after "created with love")
function setupSeasonToggle() {
    const toggle = document.querySelector('.season-toggle');
    if (!toggle || !window.season) return;

    const refresh = () => {
        const autumn = window.season.current() === 'autumn';
        toggle.textContent = autumn ? '🌱' : '🍂';
        if (autumn) startLeaves();
        else stopLeaves();
    };

    toggle.addEventListener('click', () => {
        window.season.set(window.season.current() === 'autumn' ? 'spring' : 'autumn');
        refresh();
    });
    refresh();
}

// Pixel leaves falling all the time in autumn mode, like in Mind of Seasons.
// Drawn on a low-res canvas that the browser scales up without smoothing.
const LEAF_PIXEL = 3;       // one leaf pixel = 3x3 screen pixels
const LEAF_DENSITY = 60000; // one leaf per this many screen px² (so ~15 on a laptop)
const LEAF_COLORS = [
    '#8b3a3a', '#a04646', '#783232', '#aa5555', // red / burgundy
    '#9b8b3b', '#aa9646', '#8c7d32', '#b4a050'  // yellow / olive
];
let leafAnimation = null;

function startLeaves() {
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
        color: LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)],
        size: 7 + Math.floor(Math.random() * 4),
        fall: 8 + Math.random() * 10,
        swaySpeed: 1 + Math.random() * 2,
        swayAmp: 7 + Math.random() * 10,
        swayOffset: Math.random() * Math.PI * 2,
        rotation: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 3,
        time: Math.random() * 100
    });
    const leaves = Array.from({ length: target }, () => newLeaf(true));

    // Diamond-shaped leaf filled pixel by pixel, so the edges stay crisp
    const drawLeaf = (leaf) => {
        const hw = leaf.size / 3, hh = leaf.size / 2;
        const cos = Math.cos(leaf.rotation), sin = Math.sin(leaf.rotation);
        const cx = Math.round(leaf.x), cy = Math.round(leaf.y), r = Math.ceil(hh);
        ctx.fillStyle = leaf.color;
        for (let py = -r; py <= r; py++) {
            for (let px = -r; px <= r; px++) {
                const lx = px * cos + py * sin, ly = -px * sin + py * cos;
                if (Math.abs(lx) / hw + Math.abs(ly) / hh <= 1) ctx.fillRect(cx + px, cy + py, 1, 1);
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

function stopLeaves() {
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
