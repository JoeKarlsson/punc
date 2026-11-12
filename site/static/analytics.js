// Plausible (self-hosted, as on joekarlsson.com), skipped for bots and
// headless browsers. Also reports the 404 page and script errors as events,
// so broken links and crashes on the live site show up in the dashboard.
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
  var report = function (message, source) {
    window.plausible('JS Error', {
      props: { message: String(message).slice(0, 200), source: source, path: location.pathname }
    });
  };
  window.addEventListener('error', function (e) {
    report(e.message, e.filename + ':' + e.lineno);
  });
  window.addEventListener('unhandledrejection', function (e) {
    report(e.reason && e.reason.message ? e.reason.message : e.reason, 'promise');
  });
})();
