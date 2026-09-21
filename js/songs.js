// Interactive song archive table (hidden page: /songs)

(function () {
    const songs = SONG_DB.songs.map((song, i) => ({ ...song, index: i + 1 }));
    const albums = SONG_DB.albums;
    const albumByTitle = Object.fromEntries(albums.map(a => [a.title, a]));

    const searchInput = document.getElementById('songSearch');
    const albumFilter = document.getElementById('albumFilter');
    const typeFilter = document.getElementById('typeFilter');
    const availFilter = document.getElementById('availFilter');
    const resetButton = document.getElementById('resetFilters');
    const tbody = document.getElementById('songsBody');
    const statsBox = document.getElementById('songsStats');
    const albumNoteBox = document.getElementById('albumNote');
    const emptyNote = document.getElementById('songsEmpty');

    let sortKey = 'index';
    let sortDir = 1;

    // Escape anything coming from the data file before it goes into the DOM
    function escapeHtml(value) {
        return String(value).replace(/[&<>"']/g, c => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[c]));
    }

    function formatTotal(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.round((seconds % 3600) / 60);
        if (!hours) return `${minutes} min`;
        return `${hours} h ${minutes} min`;
    }

    function matchesType(song, type) {
        if (!type) return true;
        if (type === 'Album') return song.type.startsWith('Album');
        return song.type.includes(type);
    }

    // Fill the dropdowns from the data itself
    albumFilter.innerHTML = '<option value="">All albums &amp; singles</option>' +
        albums.map(a => `<option value="${escapeHtml(a.title)}">${escapeHtml(a.title)}</option>`).join('');

    const availOptions = [...new Set(songs.flatMap(s => s.availability))].sort();
    availFilter.innerHTML = '<option value="">Anywhere</option>' +
        availOptions.map(a => `<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`).join('');

    // Notes that belong to a whole release, listed under the table
    const notesBox = document.getElementById('albumNotes');
    const notesList = document.getElementById('albumNotesList');

    function renderAlbumNotes(visibleAlbums) {
        const noted = albums.filter(a => a.note && visibleAlbums.has(a.title) && a.title !== albumFilter.value);
        notesList.innerHTML = noted.map(a => {
            const name = a.url
                ? `<a href="/${a.url}">${escapeHtml(a.title)}</a>`
                : escapeHtml(a.title);
            return `<li><strong>${name}</strong> - ${escapeHtml(a.note)}</li>`;
        }).join('');
        notesBox.hidden = noted.length === 0;
    }

    function currentRows() {
        const query = searchInput.value.trim().toLowerCase();
        const album = albumFilter.value;
        const type = typeFilter.value;
        const avail = availFilter.value;

        const rows = songs.filter(song => {
            if (album && song.album !== album) return false;
            if (!matchesType(song, type)) return false;
            if (avail && !song.availability.includes(avail)) return false;
            if (query) {
                const haystack = `${song.title} ${song.album} ${song.note} ${song.dateText} ${song.availability.join(' ')}`.toLowerCase();
                if (!haystack.includes(query)) return false;
            }
            return true;
        });

        rows.sort((a, b) => {
            let result;
            if (typeof a[sortKey] === 'number') {
                result = a[sortKey] - b[sortKey];
            } else {
                result = String(a[sortKey]).localeCompare(String(b[sortKey]), 'en', { sensitivity: 'base' });
            }
            if (result === 0) result = a.index - b.index;
            return result * sortDir;
        });

        return rows;
    }

    function renderRow(song) {
        const album = albumByTitle[song.album] || {};
        const albumCell = album.url
            ? `<a href="/${album.url}">${escapeHtml(song.album)}</a>`
            : escapeHtml(song.album);

        const tags = song.availability
            .map(a => `<span class="songs-tag songs-tag-${a.toLowerCase().replace(/[^a-z0-9]+/g, '-')}">${escapeHtml(a)}</span>`)
            .join('');

        const noteDot = song.note ? ' <span class="songs-note-dot" title="Has a note">i</span>' : '';
        const approx = song.dateApprox ? '<span class="songs-approx" title="Exact day unknown">*</span>' : '';

        const row = document.createElement('tr');
        row.className = song.note ? 'songs-row songs-row-note' : 'songs-row';
        row.innerHTML = `
            <td class="songs-num songs-index">${song.index}</td>
            <td class="songs-title">${escapeHtml(song.title)}${noteDot}</td>
            <td>${albumCell}</td>
            <td class="songs-num">${escapeHtml(song.duration)}</td>
            <td class="songs-date">${escapeHtml(song.dateText)}${approx}</td>
            <td class="songs-tags">${tags}</td>
            <td class="songs-type">${escapeHtml(song.type)}</td>
        `;

        if (!song.note) return [row];

        const detail = document.createElement('tr');
        detail.className = 'songs-detail';
        detail.hidden = true;
        detail.innerHTML = `<td colspan="7"><strong>Note:</strong> ${escapeHtml(song.note)}</td>`;

        row.addEventListener('click', event => {
            if (event.target.closest('a')) return; // let album links work
            detail.hidden = !detail.hidden;
            row.classList.toggle('songs-row-open', !detail.hidden);
        });

        return [row, detail];
    }

    function render() {
        const rows = currentRows();

        const fragment = document.createDocumentFragment();
        rows.forEach(song => renderRow(song).forEach(el => fragment.appendChild(el)));
        tbody.innerHTML = '';
        tbody.appendChild(fragment);

        emptyNote.hidden = rows.length > 0;

        const totalSeconds = rows.reduce((sum, song) => sum + song.seconds, 0);
        const visibleAlbums = new Set(rows.map(song => song.album));
        const albumCount = visibleAlbums.size;
        statsBox.innerHTML = `
            <span><strong>${rows.length}</strong> of ${songs.length} songs</span>
            <span><strong>${albumCount}</strong> release${albumCount === 1 ? '' : 's'}</span>
            <span><strong>${formatTotal(totalSeconds)}</strong> of music</span>
        `;

        const album = albumByTitle[albumFilter.value];
        if (album && album.note) {
            albumNoteBox.innerHTML = `<strong>${escapeHtml(album.title)}:</strong> ${escapeHtml(album.note)}`;
            albumNoteBox.hidden = false;
        } else {
            albumNoteBox.hidden = true;
        }

        renderAlbumNotes(visibleAlbums);

        document.querySelectorAll('.songs-sortable').forEach(th => {
            th.classList.toggle('songs-sorted', th.dataset.sort === sortKey);
            th.classList.toggle('songs-sorted-desc', th.dataset.sort === sortKey && sortDir === -1);
        });
    }

    [searchInput, albumFilter, typeFilter, availFilter].forEach(control => {
        control.addEventListener('input', render);
    });

    resetButton.addEventListener('click', () => {
        searchInput.value = '';
        albumFilter.value = '';
        typeFilter.value = '';
        availFilter.value = '';
        sortKey = 'index';
        sortDir = 1;
        render();
    });

    document.querySelectorAll('.songs-sortable').forEach(th => {
        th.addEventListener('click', () => {
            const key = th.dataset.sort;
            if (key === sortKey) {
                sortDir = -sortDir;
            } else {
                sortKey = key;
                sortDir = 1;
            }
            render();
        });
    });

    render();
})();
