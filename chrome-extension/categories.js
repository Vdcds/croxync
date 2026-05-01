function detectCategory(content, type) {
  if (type === 'url' || isUrlExt(content.trim())) {
    return 'links';
  }

  var text = content.trim();

  if (isCodeExt(text)) {
    return 'code';
  }

  if (isListExt(text)) {
    return 'lists';
  }

  if (text.split('\n').length >= 3 || text.length > 100) {
    return 'notes';
  }

  return 'general';
}

function isUrlExt(text) {
  try { new URL(text); return true; } catch (e) { return false; }
}

function isCodeExt(text) {
  var lines = text.split('\n');

  var strongPatterns = [
    /=>/, /\bfunction\b/, /\bclass\b/, /\bimport\b.*\bfrom\b/, /\bexport\b/,
    /\bconst\b.*=/, /\blet\b.*=/, /\bvar\b.*=/, /\breturn\b/, /\bdef\b/,
    /\bfunc\b/, /\basync\b/, /\bawait\b/, /\btry\b.*\{/, /\bcatch\b/,
    /\binterface\b/, /\btype\b.*=/, /\benum\b/, /\bstruct\b/,
    /#include/, /#define/, /\bSELECT\b.*\bFROM\b/i, /\bCREATE\s+TABLE\b/i,
    /\$\{.*\}/, /\bconsole\./, /\bprint\s*\(/, /\{/,
    /\}\s*$/, /\bxmlns/, /<\/?\w+\s*.*?>/,
    /\{\s*["\w]+\s*:/, /\[\s*["\w]+\s*,/,
  ];

  var strongMatches = 0;
  for (var i = 0; i < strongPatterns.length; i++) {
    if (strongPatterns[i].test(text)) strongMatches++;
  }

  var lineCount = lines.length;
  var semicolons = (text.match(/;/g) || []).length;
  var braces = (text.match(/[{}]/g) || []).length;
  var brackets = (text.match(/[\[\]]/g) || []).length;
  var parens = (text.match(/[()]/g) || []).length;
  var codeChars = semicolons + braces + brackets + parens;

  if (strongMatches >= 2) return true;
  if (strongMatches >= 1 && (semicolons > 2 || braces > 2 || brackets > 2)) return true;
  if (text.length > 50 && codeChars > text.length * 0.08) return true;
  if (lineCount === 1 && strongMatches >= 1) return true;

  if (lineCount > 2) {
    var indented = 0;
    for (var j = 0; j < lines.length; j++) {
      if (/^\s{2,}|\t/.test(lines[j])) indented++;
    }
    if (indented / lineCount > 0.4 && codeChars > 3) return true;
  }

  return false;
}

function isListExt(text) {
  var lines = text.split('\n').filter(function(l) { return l.trim().length > 0; });
  if (lines.length < 2) return false;

  var bulletCount = 0;
  var numberedCount = 0;
  for (var i = 0; i < lines.length; i++) {
    var trimmed = lines[i].trim();
    if (/^[-*•]\s/.test(trimmed)) bulletCount++;
    if (/^\d+[.)]\s/.test(trimmed)) numberedCount++;
  }

  return (bulletCount + numberedCount) / lines.length > 0.5;
}