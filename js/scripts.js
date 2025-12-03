window.addEventListener('DOMContentLoaded', event => {

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

    // Create image HTML if image exists
    const imageHTML = post.image && post.image.trim() !== ''
        ? `<div class="blog-post-image">
            <img src="${post.image}" alt="${post.title}">
           </div>`
        : '';

    article.innerHTML = `
        <div class="blog-post-header">
            <h3 class="blog-post-title">${post.title}</h3>
            <p class="blog-post-date">${formattedDate}</p>
        </div>
        ${imageHTML}
        <div class="blog-post-content">
            <p>${post.content}</p>
        </div>
        <div class="blog-post-stats" data-post-id="${post.id}">
            <span class="stat-item">
                <i class="fas fa-comment"></i>
            </span>
            <span class="stat-item">
                <i class="fas fa-heart"></i>
            </span>
        </div>
    `;

    // Check if we're on the homepage or news page
    const isHomepage = !window.location.pathname.includes('news.html');

    // Add click event - redirect to news.html on homepage, open modal on news page
    article.addEventListener('click', () => {
        if (isHomepage) {
            window.location.href = '/news.html';
        } else {
            openPostModal(post);
        }
    });

    return article;
}

// Function to open modal with post details
function openPostModal(post) {
    const modal = document.getElementById('post-modal');
    const modalTitle = document.getElementById('modal-post-title');
    const modalDate = document.getElementById('modal-post-date');
    const modalContent = document.getElementById('modal-post-content');
    const modalImage = document.getElementById('modal-post-image');

    // Format date
    const date = new Date(post.date);
    const formattedDate = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Set modal content
    modalTitle.textContent = post.title;
    modalDate.textContent = formattedDate;
    modalContent.innerHTML = `<p>${post.content}</p>`;

    // Set image if exists
    if (post.image && post.image.trim() !== '') {
        modalImage.innerHTML = `<img src="${post.image}" alt="${post.title}">`;
        modalImage.style.display = 'block';
    } else {
        modalImage.innerHTML = '';
        modalImage.style.display = 'none';
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
