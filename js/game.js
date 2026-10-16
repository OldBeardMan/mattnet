// Mind Of Seasons page - click a screenshot to see it big (same dialog as the shop's merch zoom)

(function () {
    const gallery = document.getElementById('game-gallery');
    if (!gallery) return;

    const dialog = document.createElement('dialog');
    dialog.className = 'shop-zoom-dialog game-zoom-dialog';
    dialog.innerHTML = `
        <button type="button" class="shop-zoom-close" aria-label="Close">&times;</button>
        <img alt="">
    `;
    // Any click (on the picture, the backdrop or the X) closes it
    dialog.addEventListener('click', () => dialog.close());
    document.body.appendChild(dialog);

    const big = dialog.querySelector('img');

    gallery.querySelectorAll('.screenshot-item').forEach(item => {
        item.addEventListener('click', () => {
            const thumb = item.querySelector('img');
            big.src = item.dataset.full;
            big.alt = thumb.alt;
            dialog.showModal();
        });
    });
})();
