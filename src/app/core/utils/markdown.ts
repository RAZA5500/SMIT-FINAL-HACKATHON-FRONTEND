/**
 * Tiny, safe markdown renderer for AI replies: escapes all HTML first, then supports
 * **bold**, *italic*, `code`, bullet / numbered lists, headings and line breaks.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function inline(text: string): string {
  return text
    .replace(/`([^`]+)`/g, '<code class="rounded bg-slate-100 px-1 py-0.5 font-mono text-[0.85em] dark:bg-slate-800">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold">$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
}

export function renderMarkdown(source: string): string {
  const lines = escapeHtml(source.trim()).split(/\r?\n/);
  const html: string[] = [];
  let list: 'ul' | 'ol' | null = null;

  const closeList = () => {
    if (list) html.push(`</${list}>`);
    list = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const bullet = /^\s*[-*•]\s+(.*)$/.exec(line);
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    const heading = /^\s*#{1,4}\s+(.*)$/.exec(line);

    if (bullet) {
      if (list !== 'ul') {
        closeList();
        html.push('<ul class="my-1.5 list-disc space-y-1 pl-5">');
        list = 'ul';
      }
      html.push(`<li>${inline(bullet[1])}</li>`);
    } else if (numbered) {
      if (list !== 'ol') {
        closeList();
        html.push('<ol class="my-1.5 list-decimal space-y-1 pl-5">');
        list = 'ol';
      }
      html.push(`<li>${inline(numbered[1])}</li>`);
    } else if (heading) {
      closeList();
      html.push(`<p class="mt-2 font-semibold">${inline(heading[1])}</p>`);
    } else if (line.trim() === '') {
      closeList();
      html.push('<div class="h-2"></div>');
    } else {
      closeList();
      html.push(`<p>${inline(line)}</p>`);
    }
  }
  closeList();
  return html.join('');
}
