// Copy buttons: the link in the share line under every page, and the marks on a book page.
// Both labels sit stacked in one cell (styles.css .copy-button), so "Copied" crossfades in
// without the button changing width. A status line beside it tells a screen reader what
// happened, and shows the error when the copy fails.
export function setUpCopyButton(button: HTMLButtonElement, text: () => string): void {
  const done = button.querySelector<HTMLElement>('.copy-done');
  if (!done) throw new Error('A copy button needs its .copy-done label');
  const status = document.createElement('span');
  status.className = 'copy-status';
  status.setAttribute('role', 'status');
  button.after(status);
  let timer = 0;
  button.addEventListener('click', async () => {
    clearTimeout(timer);
    delete button.dataset['copied'];
    try {
      await navigator.clipboard.writeText(text());
    } catch (error) {
      status.classList.remove('visually-hidden');
      status.textContent = `Couldn't copy: ${error instanceof Error ? error.message : String(error)}`;
      return;
    }
    status.classList.add('visually-hidden');
    status.textContent = done.textContent;
    button.dataset['copied'] = '';
    timer = window.setTimeout(() => {
      delete button.dataset['copied'];
      status.textContent = '';
    }, 2000);
  });
}

export function initShare(): void {
  document
    .querySelectorAll<HTMLButtonElement>('[data-copy-link]')
    .forEach(button => setUpCopyButton(button, () => button.dataset['copyLink'] ?? location.href));
}
