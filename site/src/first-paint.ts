// Big data downloads (a book's text, the shelf, the numbers) wait for the
// page's first paint. Fetched earlier, they compete with the fonts and CSS on
// a slow phone, and Lighthouse's mobile simulation counts them in the page's
// LCP.
// Lets the browser paint and handle input between steps of a long job, so no
// one task blocks the main thread for long.
export const yieldToBrowser = () => new Promise<void>(resolve => setTimeout(resolve, 0));

// Resolves once the browser has painted the page (or after 2 s: a tab opened in
// the background never reports a first paint).
export function afterFirstPaint(): Promise<void> {
  return new Promise(resolve => {
    if (!PerformanceObserver.supportedEntryTypes?.includes('paint')) return resolve();
    const observer = new PerformanceObserver(list => {
      if (list.getEntriesByName('first-contentful-paint').length > 0) {
        observer.disconnect();
        resolve();
      }
    });
    observer.observe({ type: 'paint', buffered: true });
    setTimeout(() => {
      observer.disconnect();
      resolve();
    }, 2000);
  });
}
