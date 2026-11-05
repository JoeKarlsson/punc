// "Copy link" in the share line under every page.
export function initShare(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-copy-link]').forEach(button => {
    button.addEventListener('click', async () => {
      await navigator.clipboard.writeText(button.dataset['copyLink'] ?? location.href);
      button.textContent = 'Copied';
      setTimeout(() => (button.textContent = 'copy the link'), 2000);
    });
  });
}
