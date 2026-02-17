// Load HTML components (navbar, social, footer)
async function loadComponents() {
    const components = [
        { id: 'navbar-container', path: '/components/navbar.html' },
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

    // Set active nav link based on current page
    const currentPath = window.location.pathname;
    document.querySelectorAll('#mainNav .nav-link').forEach(link => {
        const linkPath = link.getAttribute('data-page');
        if (linkPath === currentPath ||
            (linkPath === '/' && (currentPath === '/' || currentPath === '/index.html')) ||
            (currentPath.startsWith(linkPath) && linkPath !== '/')) {
            link.classList.add('active');
        }
    });
}

window.addEventListener('DOMContentLoaded', async event => {
    // Load components first
    await loadComponents();

    // Load and render albums
    loadAlbums();
});

// Function to load and render albums from JSON
async function loadAlbums() {
    try {
        const response = await fetch('albums.json');
        const albums = await response.json();

        // Sort albums by date (newest first)
        albums.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Get container
        const container = document.getElementById('albums-container');

        if (!container) return;

        // Clear container
        container.innerHTML = '';

        // Render each album
        albums.forEach(album => {
            const albumElement = createAlbumElement(album);
            container.appendChild(albumElement);
        });

    } catch (error) {
        console.error('Error loading albums:', error);
        const container = document.getElementById('albums-container');
        if (container) {
            container.innerHTML = '<p class="text-white-50 text-center">Unable to load albums at this time.</p>';
        }
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
