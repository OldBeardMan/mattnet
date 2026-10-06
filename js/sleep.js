// Sleep (dark) mode, an autumn night - css/sleep.css only applies it
// in autumn mode and hides the switch in spring. Loaded in <head> so the page never flashes
// the wrong colours. The hidden "Go to sleep" / "Wake up" switch in the footer remembers the choice.
(function () {
    const root = document.documentElement;

    function isAsleep() {
        try { return localStorage.getItem('sleep') === '1'; } catch (e) { return false; }
    }

    // Line icons, stroke follows the text colour
    const MOON = '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>';
    const SUN = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>';

    function apply(asleep) {
        root.classList.toggle('sleep-mode', asleep);
        const button = document.querySelector('.sleep-toggle');
        if (!button) return;
        const label = asleep ? 'Wake up' : 'Go to sleep';
        button.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (asleep ? SUN : MOON) + '</svg>';
        button.title = label;
        button.setAttribute('aria-label', label);
    }

    apply(isAsleep());

    // The footer is loaded later by scripts.js, so wait for it before adding the switch
    function addButton() {
        const note = document.querySelector('.footer-note');
        if (!note || note.querySelector('.sleep-toggle')) return !!note;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'sleep-toggle';
        button.addEventListener('click', function () {
            const asleep = !root.classList.contains('sleep-mode');
            apply(asleep);
            try {
                if (asleep) localStorage.setItem('sleep', '1');
                else localStorage.removeItem('sleep');
            } catch (e) {}
        });
        note.appendChild(button);
        apply(root.classList.contains('sleep-mode'));
        return true;
    }

    document.addEventListener('DOMContentLoaded', function () {
        if (addButton()) return;
        const observer = new MutationObserver(function () {
            if (addButton()) observer.disconnect();
        });
        observer.observe(document.body, { childList: true, subtree: true });
    });
})();
