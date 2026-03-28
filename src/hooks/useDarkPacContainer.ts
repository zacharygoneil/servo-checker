import { useEffect } from 'react';

const PAC_STYLES = {
  backgroundColor: '#1A1A1A',
  border: '1px solid #2A2A2A',
  borderRadius: '16px',
  boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
  fontFamily: '"JetBrains Mono", monospace',
  marginTop: '4px',
  overflow: 'hidden',
};

const ITEM_STYLES = {
  backgroundColor: '#1A1A1A',
  color: '#BBBBBB',
  borderTop: '1px solid #2A2A2A',
  padding: '12px 16px',
  fontSize: '13px',
};

function applyDarkStyles(container: HTMLElement) {
  Object.assign(container.style, PAC_STYLES);

  // Style each item
  container.querySelectorAll<HTMLElement>('.pac-item').forEach((item, i) => {
    Object.assign(item.style, ITEM_STYLES);
    if (i === 0) item.style.borderTop = 'none';
  });

  // Hide the "powered by Google" logo bar background
  const logo = container.querySelector<HTMLElement>('.pac-logo');
  if (logo) logo.style.backgroundColor = '#1A1A1A';

  // Highlight matched text in amber
  container.querySelectorAll<HTMLElement>('.pac-matched').forEach((el) => {
    el.style.color = '#F59E0B';
  });

  // Query text (bold part of name)
  container.querySelectorAll<HTMLElement>('.pac-item-query').forEach((el) => {
    el.style.color = '#F2F2F2';
    el.style.fontWeight = '600';
  });

  // Hide pin icons
  container.querySelectorAll<HTMLElement>('.pac-icon').forEach((el) => {
    el.style.display = 'none';
  });
}

/**
 * Watches the document for the Google Places .pac-container being injected
 * and applies dark styles inline — overriding Google's own stylesheet which
 * loads after ours and can't be beaten with CSS alone.
 */
export function useDarkPacContainer() {
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement && node.classList.contains('pac-container')) {
            applyDarkStyles(node);

            // Re-apply when items are added (each keystroke re-renders items)
            const itemObserver = new MutationObserver(() => applyDarkStyles(node));
            itemObserver.observe(node, { childList: true, subtree: true });
          }
        }
      }
    });

    observer.observe(document.body, { childList: true });
    return () => observer.disconnect();
  }, []);
}
