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

    // Load and render blog posts (for news.html)
    loadBlogPosts();

    // Load latest news and album for homepage
    loadLatestNews();
    loadLatestAlbum();

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

    // Activate Bootstrap scrollspy on the main nav element
    const mainNav = document.body.querySelector('#mainNav');
    if (mainNav) {
        new bootstrap.ScrollSpy(document.body, {
            target: '#mainNav',
            rootMargin: '0px 0px -40%',
        });
    }

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

// Function to load and render blog posts from JSON
async function loadBlogPosts() {
    try {
        // Determine the correct path based on current location
        const isInSubfolder = window.location.pathname.includes('/pages/');
        const jsonPath = isInSubfolder ? '../blog-posts.json' : 'blog-posts.json';

        const response = await fetch(jsonPath);
        const posts = await response.json();

        // Sort posts by date (newest first)
        posts.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Get container
        const container = document.getElementById('blog-posts-container');

        if (!container) return;

        // Clear container
        container.innerHTML = '';

        // Render each post
        posts.forEach(post => {
            const postElement = createPostElement(post);
            container.appendChild(postElement);
        });

    } catch (error) {
        console.error('Error loading blog posts:', error);
        const container = document.getElementById('blog-posts-container');
        if (container) {
            container.innerHTML = '<p class="text-white-50 text-center">Unable to load news posts at this time.</p>';
        }
    }
}

// Function to create a post element
function createPostElement(post) {
    const article = document.createElement('article');
    article.className = 'blog-post';
    article.style.cursor = 'pointer';

    // Format date
    const date = new Date(post.date);
    const formattedDate = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Check if image exists
    const hasImage = post.image && post.image.trim() !== '';
    const hasEmbeds = post.embeds && post.embeds.length > 0;

    // Create image HTML if image exists
    const imageHTML = hasImage
        ? `<div class="blog-post-image">
            <img src="${post.image}" alt="${post.title}">
           </div>`
        : '';

    // Create embeds HTML - show in place of image if no image, otherwise after content
    const embedsHTML = renderEmbeds(post.embeds);
    const mediaHTML = hasImage ? imageHTML : embedsHTML;
    const bottomEmbedsHTML = hasImage ? embedsHTML : '';

    article.innerHTML = `
        <div class="blog-post-header">
            <h3 class="blog-post-title">${post.title}</h3>
            <p class="blog-post-date">${formattedDate} • by ${post.author}</p>
        </div>
        ${mediaHTML}
        <div class="blog-post-content">
            <p>${post.content}</p>
        </div>
        ${bottomEmbedsHTML}
        <div class="blog-post-stats" data-post-id="${post.id}">
        </div>
    `;

    // Check if we're on the homepage or news page
    const isNewsPage = window.location.pathname.includes('news.html') || window.location.pathname.includes('/news');

    // Add click event - redirect to news.html on homepage, open modal on news page
    article.addEventListener('click', (event) => {
        // Don't trigger if clicking on embeds
        if (event.target.closest('.post-embeds')) {
            return;
        }
        if (isNewsPage) {
            openPostModal(post);
        } else {
            window.location.href = '/news';
        }
    });

    return article;
}

// Function to open modal with post details
function openPostModal(post) {
    const modal = document.getElementById('post-modal');
    const modalTitle = document.getElementById('modal-post-title');
    const modalDate = document.getElementById('modal-post-date');
    const modalAuthor = document.getElementById('modal-post-author');
    const modalContent = document.getElementById('modal-post-content');
    const modalImage = document.getElementById('modal-post-image');

    // Format date
    const date = new Date(post.date);
    const formattedDate = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Check if image exists
    const hasImage = post.image && post.image.trim() !== '';
    const embedsHTML = renderEmbeds(post.embeds);

    // Set modal content
    modalTitle.textContent = post.title;
    modalDate.textContent = formattedDate;
    modalAuthor.textContent = `by ${post.author}`;

    // If no image, show embeds in place of image; otherwise show embeds after content
    if (hasImage) {
        modalImage.innerHTML = `<img src="${post.image}" alt="${post.title}">`;
        modalImage.style.display = 'block';
        modalContent.innerHTML = `<p>${post.content}</p>${embedsHTML}`;
    } else {
        modalImage.innerHTML = embedsHTML;
        modalImage.style.display = embedsHTML ? 'block' : 'none';
        modalContent.innerHTML = `<p>${post.content}</p>`;
    }

    // Load Giscus comments for this specific post
    loadGiscusComments(post);

    // Show modal
    modal.classList.add('show');
}

// Function to load Giscus comments dynamically
function loadGiscusComments(post) {
    const giscusContainer = document.querySelector('.giscus');

    // Clear existing comments
    giscusContainer.innerHTML = '';

    // Remove existing Giscus script if present
    const existingScript = document.querySelector('script[src*="giscus.app"]');
    if (existingScript) {
        existingScript.remove();
    }

    // Create new Giscus script with post-specific term
    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.setAttribute('data-repo', 'OldBeardMan/mattnet');
    script.setAttribute('data-repo-id', 'R_kgDOQPnOgw');
    script.setAttribute('data-category', 'Announcements');
    script.setAttribute('data-category-id', 'DIC_kwDOQPnOg84CzS2L');
    script.setAttribute('data-mapping', 'specific');
    script.setAttribute('data-term', `post-${post.id}-${post.title}`);
    script.setAttribute('data-strict', '0');
    script.setAttribute('data-reactions-enabled', '1');
    script.setAttribute('data-emit-metadata', '0');
    script.setAttribute('data-input-position', 'top');
    script.setAttribute('data-theme', 'dark');
    script.setAttribute('data-lang', 'en');
    script.setAttribute('data-loading', 'lazy');
    script.setAttribute('crossorigin', 'anonymous');
    script.async = true;

    // Append script to Giscus container
    giscusContainer.appendChild(script);
}

// Function to close modal
function closePostModal() {
    const modal = document.getElementById('post-modal');
    modal.classList.remove('show');
}

// Set up modal close functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('post-modal');
    const closeBtn = document.querySelector('.post-modal-close');

    // Close when clicking X button
    if (closeBtn) {
        closeBtn.addEventListener('click', closePostModal);
    }

    // Close when clicking outside the modal content
    if (modal) {
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                closePostModal();
            }
        });
    }

    // Close when pressing Escape key
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closePostModal();
        }
    });
});

// Function to load latest news for homepage
async function loadLatestNews() {
    const container = document.getElementById('latest-news-container');
    if (!container) return; // Only run on homepage

    try {
        const response = await fetch('blog-posts.json');
        const posts = await response.json();

        // Sort by date and get the latest
        posts.sort((a, b) => new Date(b.date) - new Date(a.date));
        const latestPost = posts[0];

        if (latestPost) {
            const postElement = createPostElement(latestPost);
            container.appendChild(postElement);
        }

    } catch (error) {
        console.error('Error loading latest news:', error);
        container.innerHTML = '<p class="text-white-50 text-center">Unable to load latest news.</p>';
    }
}

// Function to parse embed URL and return embed HTML
function parseEmbed(url) {
    // YouTube
    const youtubeRegex = /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const youtubeMatch = url.match(youtubeRegex);
    if (youtubeMatch) {
        return `<div class="embed-container embed-youtube">
            <iframe src="https://www.youtube.com/embed/${youtubeMatch[1]}"
                    frameborder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowfullscreen></iframe>
        </div>`;
    }

    // Spotify - track, album, playlist, artist
    const spotifyRegex = /open\.spotify\.com\/(track|album|playlist|artist)\/([a-zA-Z0-9]+)/;
    const spotifyMatch = url.match(spotifyRegex);
    if (spotifyMatch) {
        const type = spotifyMatch[1];
        const id = spotifyMatch[2];
        const height = type === 'track' ? '152' : '352';
        return `<div class="embed-container embed-spotify">
            <iframe src="https://open.spotify.com/embed/${type}/${id}"
                    width="100%"
                    height="${height}"
                    frameborder="0"
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"></iframe>
        </div>`;
    }

    // Bandcamp - album or track
    const bandcampRegex = /([a-zA-Z0-9-]+)\.bandcamp\.com\/(album|track)\/([a-zA-Z0-9-]+)/;
    const bandcampMatch = url.match(bandcampRegex);
    if (bandcampMatch) {
        // Bandcamp requires fetching the embed ID, so we'll use their player URL format
        // For simplicity, we'll create a link that opens in new tab with a styled button
        return `<div class="embed-container embed-bandcamp">
            <a href="${url}" target="_blank" rel="noopener noreferrer" class="bandcamp-link">
                <img src="https://s4.bcbits.com/img/bclogo.png" alt="Bandcamp" class="bandcamp-logo">
                <span>Listen on Bandcamp</span>
            </a>
        </div>`;
    }

    // SoundCloud
    const soundcloudRegex = /soundcloud\.com\/([a-zA-Z0-9-_]+)\/([a-zA-Z0-9-_]+)/;
    if (soundcloudRegex.test(url)) {
        return `<div class="embed-container embed-soundcloud">
            <iframe width="100%"
                    height="166"
                    scrolling="no"
                    frameborder="no"
                    allow="autoplay"
                    src="https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%237464a1&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false"></iframe>
        </div>`;
    }

    // Generic link fallback
    return `<div class="embed-container embed-link">
        <a href="${url}" target="_blank" rel="noopener noreferrer" class="generic-link">
            🔗 ${url}
        </a>
    </div>`;
}

// Function to render all embeds for a post
function renderEmbeds(embeds) {
    if (!embeds || embeds.length === 0) return '';

    const embedsHTML = embeds.map(url => parseEmbed(url)).join('');
    return `<div class="post-embeds">${embedsHTML}</div>`;
}

// Function to load latest album for homepage
async function loadLatestAlbum() {
    const container = document.getElementById('latest-album-container');
    if (!container) return; // Only run on homepage

    try {
        const response = await fetch('albums.json');
        const albums = await response.json();

        // Sort by date and get the latest
        albums.sort((a, b) => new Date(b.date) - new Date(a.date));
        const latestAlbum = albums[0];

        if (latestAlbum) {
            container.innerHTML = `
                <a href="${latestAlbum.url}" class="album-link">
                    <img class="img-fluid album-img" src="${latestAlbum.image}" alt="${latestAlbum.title}">
                    <h3>${latestAlbum.title}</h3>
                </a>
            `;
        }

    } catch (error) {
        console.error('Error loading latest album:', error);
        container.innerHTML = '<p class="text-white-50 text-center">Unable to load latest album.</p>';
    }
}
