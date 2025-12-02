window.addEventListener('DOMContentLoaded', event => {

    // Load and render albums
    loadAlbums();

    // Navbar shrink function
    var navbarShrink = function () {
        const navbarCollapsible = document.body.querySelector('#mainNav');
        if (!navbarCollapsible) {
            return;
        }
        if (window.scrollY === 0) {
            navbarCollapsible.classList.remove('navbar-shrink')
        } else {
            navbarCollapsible.classList.add('navbar-shrink')
        }
    };

    // Shrink the navbar
    navbarShrink();

    // Shrink the navbar when page is scrolled
    document.addEventListener('scroll', navbarShrink);

    // Collapse responsive navbar when toggler is visible
    const navbarToggler = document.body.querySelector('.navbar-toggler');
    const responsiveNavItems = [].slice.call(
        document.querySelectorAll('#navbarResponsive .nav-link')
    );
    responsiveNavItems.map(function (responsiveNavItem) {
        responsiveNavItem.addEventListener('click', () => {
            if (window.getComputedStyle(navbarToggler).display !== 'none') {
                navbarToggler.click();
            }
        });
    });

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
