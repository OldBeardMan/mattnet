window.addEventListener('DOMContentLoaded', event => {

    // Load and render blog posts
    loadBlogPosts();

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
    `;

    return article;
}
