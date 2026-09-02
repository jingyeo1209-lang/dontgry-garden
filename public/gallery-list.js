(function (global) {
    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function initGalleryList(options) {
        const articles = options.articles || [];
        const pageSize = options.pageSize || 8;
        const galleryEl = document.querySelector(options.gallery);
        const searchEl = document.querySelector(options.search);
        const pagerEl = document.querySelector(options.pager);
        const controlsEl = options.controls
            ? document.querySelector(options.controls)
            : (pagerEl && pagerEl.closest('.gallery-controls'));

        if (!galleryEl || !searchEl || !pagerEl) return;

        let query = '';
        let page = 1;

        function filtered() {
            const q = query.trim().toLowerCase();
            if (!q) return articles.slice();
            return articles.filter(function (item) {
                return String(item.title).toLowerCase().indexOf(q) !== -1;
            });
        }

        function render() {
            const list = filtered();
            const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
            if (page > totalPages) page = totalPages;

            const start = (page - 1) * pageSize;
            const slice = list.slice(start, start + pageSize);

            if (!slice.length) {
                galleryEl.innerHTML = '<div class="gallery-empty">검색 결과가 없습니다.</div>';
            } else {
                galleryEl.innerHTML = slice.map(function (item) {
                    var img = item.img || item.coverImage || "";
                    var coverHtml = img
                        ? '<img src="' + escapeHtml(img) + '" alt="" loading="lazy">'
                        : '<div class="card-cover-fallback"></div>';
                    return (
                        '<a href="' + escapeHtml(item.url) + '" class="card">' +
                            '<div class="card-cover">' + coverHtml + '</div>' +
                            '<div class="card-body"><div class="card-title">' + escapeHtml(item.title) + '</div></div>' +
                        '</a>'
                    );
                }).join('');
            }

            var html = '';
            html += '<button type="button" data-nav="prev" aria-label="이전 페이지"' +
                (page <= 1 ? ' disabled' : '') + '>‹</button>';
            html += '<span class="page-info">' + page + ' / ' + totalPages + '</span>';
            html += '<button type="button" data-nav="next" aria-label="다음 페이지"' +
                (page >= totalPages ? ' disabled' : '') + '>›</button>';
            pagerEl.innerHTML = html;

            pagerEl.style.display = totalPages > 1 ? 'flex' : 'none';
            if (controlsEl) {
                controlsEl.classList.toggle('is-empty', list.length === 0);
            }
        }

        searchEl.addEventListener('input', function () {
            query = searchEl.value;
            page = 1;
            render();
        });

        pagerEl.addEventListener('click', function (e) {
            var btn = e.target.closest('button');
            if (!btn || btn.disabled) return;
            if (btn.dataset.nav === 'prev') page -= 1;
            else if (btn.dataset.nav === 'next') page += 1;
            render();
            galleryEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });

        render();
    }

    /** articles-data.js (GARDEN_ARTICLES) 또는 articles.json 에서 목록 로드 */
    function loadGalleryFromJson(section, options) {
        const galleryEl = document.querySelector(options.gallery);

        function start(articles) {
            initGalleryList(Object.assign({}, options, { articles: articles || [] }));
        }

        // script 로 로드된 데이터 우선 (file:// 에서도 동작)
        if (global.GARDEN_ARTICLES && global.GARDEN_ARTICLES[section]) {
            start(global.GARDEN_ARTICLES[section]);
            return Promise.resolve();
        }

        if (galleryEl) {
            galleryEl.innerHTML = '<div class="gallery-empty">글을 불러오는 중…</div>';
        }

        return fetch('/api/articles?category=' + encodeURIComponent(section))
            .then(function (res) {
                if (!res.ok) throw new Error('articles api failed');
                return res.json();
            })
            .then(function (data) {
                var raw = (data && data.articles) || [];
                var articles = raw.map(function (item) {
                    return {
                        title: item.title,
                        url: item.url,
                        img: item.coverImage || item.img || "",
                    };
                });
                start(articles);
            })
            .catch(function () {
                if (galleryEl) {
                    galleryEl.innerHTML = '<div class="gallery-empty">글 목록을 불러오지 못했습니다.</div>';
                }
            });
    }

    global.initGalleryList = initGalleryList;
    global.loadGalleryFromJson = loadGalleryFromJson;
})(window);
