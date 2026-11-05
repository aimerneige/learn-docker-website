export type Lang = 'yaml' | 'dockerfile' | 'shell';
export interface Token {
  c: string;
  s: string;
}

const tok = (c: string, s: string): Token => ({ c, s });

/** Splits "value  # comment" respecting quotes. */
function splitComment(s: string): [string, string] {
  let q: string | null = null;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (q) {
      if (ch === q) q = null;
    } else if (ch === '"' || ch === "'") q = ch;
    else if (ch === '#' && (i === 0 || /\s/.test(s[i - 1]))) return [s.slice(0, i), s.slice(i)];
  }
  return [s, ''];
}

function value(s: string, out: Token[]) {
  const re = /("(?:[^"\\]|\\.)*"|'[^']*')|(\s+)|([[\]{},])|([^\s[\]{},]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    if (m[1]) out.push(tok('str', m[1]));
    else if (m[2]) out.push(tok('', m[2]));
    else if (m[3]) out.push(tok('punct', m[3]));
    else {
      const w = m[4];
      if (/^-?\d+(\.\d+)?[a-zA-Z]?$/.test(w)) out.push(tok('num', w));
      else if (/^(true|false|null|yes|no)$/.test(w)) out.push(tok('bool', w));
      else if (/^[&*][\w-]+$/.test(w)) out.push(tok('anchor', w));
      else out.push(tok('plain', w));
    }
  }
}

function yaml(line: string): Token[] {
  const out: Token[] = [];
  const indent = line.match(/^\s*/)![0];
  let rest = line.slice(indent.length);
  if (indent) out.push(tok('', indent));
  if (rest.startsWith('#')) return [...out, tok('comment', rest)];
  const [code, comment] = splitComment(rest);
  rest = code;
  while (rest.startsWith('- ')) {
    out.push(tok('punct', '- '));
    rest = rest.slice(2);
  }
  const km = rest.match(/^(<<|[\w.\-/"']+)(:)(?=\s|$)/);
  if (km) {
    out.push(tok(km[1] === '<<' ? 'anchor' : 'key', km[1]), tok('punct', km[2]));
    rest = rest.slice(km[0].length);
  }
  value(rest, out);
  if (comment) out.push(tok('comment', comment));
  return out;
}

const DF_KEYWORDS =
  /^(FROM|RUN|CMD|LABEL|EXPOSE|ENV|ADD|COPY|ENTRYPOINT|VOLUME|USER|WORKDIR|ARG|ONBUILD|STOPSIGNAL|HEALTHCHECK|SHELL)\b/i;

function words(s: string, out: Token[], shell: boolean) {
  const re = /("(?:[^"\\]|\\.)*"|'[^']*')|(\s+)|(\$\{?\w+\}?)|(--?[\w-]+(?:=[^\s]*)?)|(\\$|&&|\|\||[[\],;|])|([^\s"'$\\[\],;|]+|.)/g;
  let m: RegExpExecArray | null;
  let wordIndex = 0;
  while ((m = re.exec(s))) {
    if (m[1]) out.push(tok('str', m[1]));
    else if (m[2]) out.push(tok('', m[2]));
    else if (m[3]) out.push(tok('var', m[3]));
    else if (m[4]) {
      const eq = m[4].indexOf('=');
      if (eq > 0) out.push(tok('flag', m[4].slice(0, eq + 1)), tok('plain', m[4].slice(eq + 1)));
      else out.push(tok('flag', m[4]));
    } else if (m[5]) out.push(tok('punct', m[5]));
    else {
      const w = m[6];
      if (shell && wordIndex < 2 && /^[a-z]/.test(w)) out.push(tok(wordIndex === 0 ? 'kw' : 'sub', w));
      else if (w === 'AS') out.push(tok('kw', w));
      else if (/^\d+(\.\d+)?$/.test(w)) out.push(tok('num', w));
      else out.push(tok('plain', w));
      wordIndex++;
    }
  }
}

function dockerfile(line: string): Token[] {
  const out: Token[] = [];
  const indent = line.match(/^\s*/)![0];
  let rest = line.slice(indent.length);
  if (indent) out.push(tok('', indent));
  if (rest.startsWith('#')) return [...out, tok('comment', rest)];
  const km = rest.match(DF_KEYWORDS);
  if (km) {
    out.push(tok('kw', km[0]));
    rest = rest.slice(km[0].length);
  }
  words(rest, out, false);
  return out;
}

function shell(line: string): Token[] {
  const out: Token[] = [];
  const indent = line.match(/^\s*/)![0];
  const rest = line.slice(indent.length);
  if (indent) out.push(tok('', indent));
  if (rest.startsWith('#')) return [...out, tok('comment', rest)];
  words(rest, out, !indent);
  return out;
}

export function highlight(line: string, lang: Lang): Token[] {
  if (!line) return [];
  if (lang === 'yaml') return yaml(line);
  if (lang === 'dockerfile') return dockerfile(line);
  return shell(line);
}
