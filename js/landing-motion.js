// Reveal script for landing page
// Adds `.is-visible` to elements with `[data-reveal]` using IntersectionObserver.
(function () {
	'use strict';

	function revealAll(els) {
		els.forEach(function (el) { el.classList.add('is-visible'); });
	}

	function init() {
		var els = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));
		if (!els.length) return;

		// Respect reduced motion preference
		if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			revealAll(els);
			return;
		}

		// Use IntersectionObserver when available
		if ('IntersectionObserver' in window) {
			try {
				var io = new IntersectionObserver(function (entries, observer) {
					entries.forEach(function (entry) {
						if (entry.isIntersecting) {
							entry.target.classList.add('is-visible');
							observer.unobserve(entry.target);
						}
					});
				}, { threshold: 0.06 });

				els.forEach(function (el) { io.observe(el); });
				return;
			} catch (e) {
				// fall through to immediate reveal
			}
		}

		// Fallback: reveal everything
		revealAll(els);
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();

