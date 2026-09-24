// Spring/autumn mode. Loaded in <head> so the page never flashes the wrong colours.
// Autumn turns on by itself between Sep 23 and Dec 21. A manual choice (the leaf in
// the footer) wins, but only until the calendar season changes.
(function () {
    const root = document.documentElement;

    function calendarSeason(date = new Date()) {
        const md = (date.getMonth() + 1) * 100 + date.getDate();
        return md >= 923 && md <= 1221 ? 'autumn' : 'spring';
    }

    function readChoice() {
        try {
            const saved = JSON.parse(localStorage.getItem('season'));
            // Ignore a choice made in a different calendar season
            if (saved && saved.during === calendarSeason()) return saved.season;
        } catch (e) {}
        return null;
    }

    function apply(season) {
        root.classList.toggle('autumn-mode', season === 'autumn');
    }

    window.season = {
        current: () => (root.classList.contains('autumn-mode') ? 'autumn' : 'spring'),
        set(season) {
            apply(season);
            try {
                if (season === calendarSeason()) localStorage.removeItem('season');
                else localStorage.setItem('season', JSON.stringify({ season, during: calendarSeason() }));
            } catch (e) {}
        }
    };

    apply(readChoice() || calendarSeason());
})();
