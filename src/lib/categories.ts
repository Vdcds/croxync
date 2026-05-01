export function detectCategory(content: string, type?: string): string {
  if (type === "url" || isUrl(content.trim())) {
    return "links";
  }

  const text = content.trim();

  // Detect code patterns
  if (isCode(text)) {
    return "code";
  }

  // Detect lists (lines starting with -, *, •, or numbered items)
  if (isList(text)) {
    return "lists";
  }

  // Detect notes (multi-line text or longer single-line)
  if (text.split("\n").length >= 3 || text.length > 100) {
    return "notes";
  }

  return "general";
}

function isUrl(text: string): boolean {
  try {
    const url = new URL(text);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isCode(text: string): boolean {
  const lines = text.split("\n");

  // Strong signals - these are almost certainly code
  const strongCodePatterns = [
    /=>/,                       // arrow functions
    /\bfunction\b/,            // function keyword
    /\bclass\b/,               // class keyword
    /\bimport\b.*\bfrom\b/,    // import from
    /\bexport\b/,              // export
    /\bconst\b.*=/,            // const x =
    /\blet\b.*=/,              // let x =
    /\bvar\b.*=/,              // var x =
    /\breturn\b/,              // return
    /\bdef\b/,                 // Python def
    /\bdefn\b/,                // Clojure defn
    /\bfn\b.*=>/,              // Rust fn
    /\bfunc\b/,                // Go func
    /\bfunc\b.*\{/,            // Swift func
    /\bpublic\b.*\{/,          // Java/C#
    /\bprivate\b.*\{/,         // Java/C#
    /\basync\b/,               // async
    /\bawait\b/,               // await
    /\btry\b.*\{/,             // try {
    /\bcatch\b/,               // catch
    /\binterface\b/,           // TypeScript interface
    /\btype\b.*=/,             // TypeScript type =
    /\benum\b/,                // enum
    /\bstruct\b/,              // Rust/C struct
    /\bimpl\b/,                // Rust impl
    /\bmod\b/,                 // Rust mod
    /\buse\b/,                 // Rust use
    /#include/,                 // C/C++ include
    /#define/,                  // C macro
    /\bSELECT\b.*\bFROM\b/i,   // SQL
    /\bCREATE\s+TABLE\b/i,      // SQL
    /\bINSERT\s+INTO\b/i,      // SQL
    /\bxmlns/,                  // XML
    /<\/?\w+\s*.*?>/,          // HTML/XML tags with attributes
    /\{\s*["\w]+\s*:/,        // JSON-like objects
    /\[\s*["\w]+\s*,/,        // Array literals
    /\$\{.*\}/,                // Template literals
    /```/,                     // Markdown code fences
    /^\s*\{/,                  // Starts with {
    /\}\s*$/,                   // Ends with }
    /\bconsole\./,              // console.log
    /\bprint\s*\(/,            // print()
    /\bSystem\.out/,           // Java print
    /\becho\b/,                // PHP echo
  ];

  let strongMatches = 0;
  for (const pattern of strongCodePatterns) {
    if (pattern.test(text)) strongMatches++;
  }

  // Medium signals - combined they indicate code
  const lineCount = lines.length;
  const hasSemicolons = (text.match(/;/g) || []).length;
  const hasBraces = (text.match(/[{}]/g) || []).length;
  const hasBrackets = (text.match(/[\[\]]/g) || []).length;
  const hasEquals = (text.match(/[^!<>=]=[^[!<>]/g) || []).length;
  const hasParens = (text.match(/[()]/g) || []).length;
  const hasAngleBrackets = (text.match(/[<>]/g) || []).length;

  // If 2+ strong signals, it's code
  if (strongMatches >= 2) return true;
  // If 1 strong signal + structural signals, it's code
  if (strongMatches >= 1 && (hasSemicolons > 2 || hasBraces > 2 || hasBrackets > 2)) return true;

  // Heuristic: high density of programming characters
  const codeCharCount = hasSemicolons + hasBraces + hasBrackets + hasEquals + hasParens;
  const totalChars = text.length;
  if (totalChars > 50 && codeCharCount > totalChars * 0.08) return true;

  // Single line with strong pattern
  if (lineCount === 1 && strongMatches >= 1) return true;

  // Multi-line with indentation patterns (4 spaces or tabs)
  if (lineCount > 2) {
    const indentedLines = lines.filter(l => /^\s{2,}|\t/.test(l)).length;
    if (indentedLines / lineCount > 0.4 && codeCharCount > 3) return true;
  }

  return false;
}

function isList(text: string): boolean {
  const lines = text.split("\n").filter(l => l.trim().length > 0);
  if (lines.length < 2) return false;

  let bulletCount = 0;
  let numberedCount = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^[-*•]\s/.test(trimmed)) bulletCount++;
    if (/^\d+[.)]\s/.test(trimmed)) numberedCount++;
  }

  // If more than half the lines are bullet or numbered items
  return (bulletCount + numberedCount) / lines.length > 0.5;
}

export function detectType(content: string): string {
  if (isUrl(content.trim())) return "url";
  return "text";
}