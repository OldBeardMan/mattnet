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
});

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
