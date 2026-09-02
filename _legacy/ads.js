(function () {
    var cfg = window.GARDEN_ADS || {};
    var client = cfg.client || '';
    var slots = cfg.slots || {};

    function resolveSlot(key) {
        var slot = slots[key];
        if (slot) return String(slot).trim();
        if (key === 'footer' && slots.banner) return String(slots.banner).trim();
        return '';
    }

    function mount(el) {
        var unit = el.getAttribute('data-ad-unit');
        if (!unit) return;

        var slot = resolveSlot(unit);
        if (!client || !slot) {
            el.remove();
            return;
        }

        var ins = document.createElement('ins');
        ins.className = 'adsbygoogle';
        ins.style.display = 'block';
        ins.setAttribute('data-ad-client', client);
        ins.setAttribute('data-ad-slot', slot);
        ins.setAttribute('data-ad-format', 'auto');
        ins.setAttribute('data-full-width-responsive', 'true');
        el.appendChild(ins);

        try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (err) {
            console.warn('AdSense load failed:', err);
        }
    }

    function initAds() {
        document.querySelectorAll('.ad-slot').forEach(mount);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAds);
    } else {
        initAds();
    }
})();
