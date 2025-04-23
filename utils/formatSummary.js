export function formatExtractedText(rawText, referenceMap = {}) {
  const refPattern     = /SIBTF\s*-\s*SIF\d+\s*-\s*[A-Z]/g;
  const fullRefPattern = /\(Ref:.*?\)/g;

  if (typeof rawText !== 'string') {
    return ['Invalid extracted text.'];
  }

  // collapse newlines, split into lines
  const cleanedText = rawText.replace(/\n+/g, ' ');
  const rawLines    = cleanedText
    .split(/\s*\*\s*/)
    .map(l => l.trim())
    .filter(Boolean);

  const formatted = [];

  for (let line of rawLines) {
    // <-- here we stop **before** rendering the heading itself
    if (line.includes('## Detailed Matching Report')) {
      break;
    }

    // skip other headings
    if (line.startsWith('##') || line.includes('Master Summary Report')) {
      continue;
    }

    // inject button after every SIBTF-… reference
    const withButtons = line.replace(refPattern, (match) => {
      const key        = match.trim();
      const sourceFile = referenceMap[key];
      if (!sourceFile) return match;

      return `${match}<button
        data-source="${sourceFile}"
        class="view-source"
        style="background:#2563eb;color:white;border:none;
               padding:6px 8px;margin-left:8px;
               font-size:0.85rem;border-radius:6px;
               cursor:pointer;transition:background 0.2s;"
        onmouseover="this.style.background='#1e40af'"
        onmouseout="this.style.background='#2563eb'">
          View Source
       </button>`;
    });

    // preserve full-Ref line breaks
    const finalLine = withButtons.replace(fullRefPattern, m => `${m}<br>`);

    formatted.push(`${finalLine}<br>`);
  }

  return formatted;
}
