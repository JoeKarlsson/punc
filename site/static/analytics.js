// Plausible (self-hosted, as on joekarlsson.com), skipped for bots and
// headless browsers. Also reports the 404 page and the first script error on
// each page as events, so broken links and crashes on the live site show up
// in the dashboard. Errors thrown by browser extensions are skipped.
(function () {
  if (navigator.webdriver || /bot|crawl|spider|scrape|headless/i.test(navigator.userAgent) || !navigator.languages || navigator.languages.length === 0) return;
  // Queue events until the script arrives
  window.plausible =
    window.plausible ||
    function () {
      (window.plausible.q = window.plausible.q || []).push(arguments);
    };
  var s = document.createElement('script');
  s.defer = true;
  s.dataset.domain = 'punc.joekarlsson.com';
  s.src = 'https://plausible.joekarlsson.io/js/script.tagged-events.outbound-links.file-downloads.js';
  document.head.appendChild(s);

  if (document.body.dataset.notFound) window.plausible('404', { props: { path: location.pathname } });

  var extension = /(?:chrome|moz|safari-web)-extension:\/\//;
  // The site makes no Trusted Types policies, so any refused one is an extension's
  var trustedTypesRefusal = /TrustedTypePolicy|Policy "[^"]+" disallowed/i;
  // Only the first error per page: one crash can throw on every frame
  var reported = false;
  var report = function (message, source, stack) {
    var text = String(message);
    if (reported || extension.test(source) || extension.test(stack || '') || extension.test(text) || trustedTypesRefusal.test(text)) return;
    reported = true;
    window.plausible('JS Error', {
      props: { message: text.slice(0, 200), source: source, path: location.pathname }
    });
  };
  window.addEventListener('error', function (e) {
    report(e.message, e.filename + ':' + e.lineno, e.error && e.error.stack);
  });
  window.addEventListener('unhandledrejection', function (e) {
    var reason = e.reason;
    report(reason && reason.message ? reason.message : reason, 'promise', reason && reason.stack);
  });
})();
