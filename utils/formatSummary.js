export function formatExtractedText(rawText, referenceMap = {}) {
  const refPattern = /SIBTF\s*-\s*SIF\d+\s*-\s*[A-Z]/g;
  const fullRefPattern = /\(Ref:.*?\)/g;

  if (typeof rawText !== 'string') return ['Invalid extracted text.'];

  let cleanedText = rawText.replace(/\n/g, ' ');
  let splitLines = cleanedText.split(/\s*\*\s*/);
  const lines = splitLines.map(l => l.trim()).filter(Boolean);
  const formatted = [];

  for (let line of lines) {
    // ✅ Stop parsing once this heading appears
    if (line.includes('# PDF File Matching Analysis Report')) break;

    // ❌ Skip headings like ## or "Master Summary Report"
    if (line.startsWith('##')) continue;
    if (line.includes('Master Summary Report')) continue;

    const matches = line.match(refPattern);
    if (matches) {
      matches.forEach(match => {
        const cleanRef = match.trim();
        const sourceFile = referenceMap[cleanRef];
        if (sourceFile) {
          const styledButton = `<button data-source="${sourceFile}" class="view-source" style="
            background-color: #2563eb;
            color: white;
            border: none;
            padding: 10px 8px;
            margin-left: 8px;
            font-size: 0.85rem;
            border-radius: 6px;
            cursor: pointer;
            transition: background-color 0.2s ease;
          " onmouseover="this.style.backgroundColor='#1e40af'" onmouseout="this.style.backgroundColor='#2563eb'">
            View Source
          </button>`;
          line = line.replace(match, `${match} ${styledButton}`);
        }
      });
    }

    line = line.replace(fullRefPattern, match => `${match}<br>`);
    formatted.push(`${line}<br>`);
  }

  return formatted;
}
