import re, json

src = open('src/data/games.ts', encoding='utf-8').read()

m_games = re.search(r"export const games: Game\[\] = redactLibrary\(handOverPremium\(applyLibraryPatch\(\[([\s\S]+)\]\)\)\);", src)
m_all  = re.search(r"export const allGames: Game\[\] = redactLibrary\(handOverPremium\(applyLibraryPatch\(\[([\s\S]+)\]\)\)\);", src)

if not m_games or not m_all:
    raise SystemExit('missing library literal(s)')

def normalize(body):
    body = (body
        .replace(r'\bhandOverPremium\b', 'true')
        .replace(r'\bredactLibrary\b', 'true')
        .replace(r'\bapplyLibraryPatch\b', 'true')
        .replace(r'\bNON_FRAMABLE_HOSTS\b', '[]')
        .replace(r'\bIMG\b', '')
        .replace(r'\bPREMIUM_HOST\b', '')
        .replace(r'\bLIBRARY_PATCH\b', '{}')
        .replace(r'\bredactText\b', '(x=>x)')
        .replace(r'\bredactLabel\b', '(x=>x)'))

    def js_str_to_json(s):
        inner = s[1:-1]
        out = []
        i = 0
        while i < len(inner):
            c = inner[i]
            if c != '\\':
                out.append(c); i += 1; continue
            nxt = inner[i+1] if i+1 < len(inner) else ''
            if nxt in ('"', "'", '\\', '/'):
                out.append('\\' + nxt); i += 2; continue
            if nxt == 'n':
                out.append('\\n'); i += 2; continue
            if nxt == 't':
                out.append('\\t'); i += 2; continue
            if nxt == 'r':
                out.append('\\r'); i += 2; continue
            if nxt == 'b':
                out.append('\\b'); i += 2; continue
            if nxt == 'f':
                out.append('\\f'); i += 2; continue
            if nxt == 'u':
                hexv = inner[i+2:i+6]
                if re.fullmatch(r'[0-9a-fA-F]{4}', hexv):
                    out.append('\\u' + hexv); i += 6; continue
            out.append(c + nxt); i += 2
        return json.dumps(inner)

    body = re.sub(r"'(?:[^'\\]|\\.)*'", lambda mm: js_str_to_json(mm.group(0)), body)
    body = body.replace('true', ' true ').replace('false', ' false ').replace('undefined', ' null ')
    body = re.sub(r'\btrue\b', 'true', body)
    body = re.sub(r'\bfalse\b', 'false', body)
    body = re.sub(r'\bnull\b', 'null', body)

    # Trim any stray whitespace inside JSON boolean/null tokens that prior
    # whitespace-normalization passes may have introduced.
    body = re.sub(r'\s*true\s*', 'true', body)
    body = re.sub(r'\s*false\s*', 'false', body)
    body = re.sub(r'\s*null\s*', 'null', body)

    # Strip only top-level TS type annotations on object properties like
    #   description: string,
    # while keeping real values intact (numbers, arrays, object literals, etc.).
    def _replacer(m):
        before = m.group(1).rstrip()
        after = m.group(2).lstrip()
        return before + after
    body = re.sub(r'(\s*)([A-Za-z_$][A-Za-z0-9_$]*\s*):\s*(string|boolean|number|Game|GameServer|GameMode|GameMedia|LibraryPatch)(,|}|\s*\n)', _replacer, body)
    body = re.sub(r':\s*\{[^{}]*\}(?=\s*,)', '', body)
    body = re.sub(r':\s*\[[^\]]*\](?=\s*,)', '', body)

    known = set("""id title category tags description controls thumbnail sourceUrl type heavy isNew
openInNewTab htmlGame lockLinks standalone extensionNotice extensionUrl servers media cover
modes note label external query lead name fact facts logo banner screenshots trailer videos
poster caption author src""".split())

    # Defensive: also normalize any remaining TS function-type annotations.
    body = re.sub(r':\s*function(?:\s*\{[^}]*\})?(?=,|}|\s*\n)', '', body)

    # Normalize only inside TS object-literal body blocks, never inside arrow
    # parameter lists. We operate on the body line-by-line for that reason.
    # Only normalize TS shorthand reuse inside object literal value position.
    # Maintain a small brace-depth counter so arrow-param lists (which look like
    # `(a, b, c): Type =>`) are never touched.
    depth = 0
    out = []
    for line in body.splitlines():
        # Track depth changes from braces on this line before normalizing.
        opens = line.count('{')
        closes = line.count('}')
        new_depth = depth + opens - closes

        normalized = line
        if depth > 0:
            # TS shorthand reuse inside object literals: bare `key,` at value position.
            m = re.search(r'([A-Za-z_$][A-Za-z0-9_$]*)\s*,\s*$', line)
            if m and m.group(1) in known:
                normalized = re.sub(r'([A-Za-z_$][A-Za-z0-9_$]*)\s*,\s*$', r'\1: true,', line)
            # TS shorthand reuse immediately after a colon: rare after the prior pass.
            m2 = re.search(r':\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*(?=,|\s*\n)', normalized)
            if m2 and m2.group(1) in known:
                normalized = re.sub(r'(:\s+)([A-Za-z_$][A-Za-z0-9_$]*)\s*(?=,|\s*\n)', r'\1\2: true', normalized)

        out.append(normalized)
        depth = max(0, new_depth)
    body = '\n'.join(out)

    # The games literal body has already been normalized by the object-literal pass
    # above for any shorthand reuse that appears in object bodies. The only remaining
    # bareword tokens are TS arrow param lists such as
    #   `([title, category, tags, description, controls]): Game[] => { return { ... } }`
    # in the `allGames` literal. Those are not part of either JSON payload we parse
    # below, so leave them alone.
    return body


def first_error_position(payload):
    # find first char that JSON.parse would choke on
    i = 0
    s = payload
    n = len(s)
    while i < n:
        c = s[i]
        if c in ' \t\r\n':
            i += 1; continue
        return i
    return -1

games_body  = normalize(m_games.group(1))
all_body    = normalize(m_all.group(1))

games_payload  = '[' + games_body + ']'
all_payload    = '[' + all_body + ']'

def load(payload, name):
    try:
        return json.loads(payload)
    except Exception as e:
        pos = first_error_position(payload)
        ctx = payload[max(0,pos-120):pos+120]
        print('parse error in', name, e)
        print('pos=', pos)
        print('--- context ---')
        print(ctx)
        raise SystemExit(1)

games_list = load(games_payload, 'games')
all_list   = load(all_payload, 'allGames')

def slim(g):
    return {
        "title": g.get("title"),
        "category": g.get("category"),
        "type": g.get("type"),
        "open_in_new_tab": bool(g.get("openInNewTab")),
        "thumbnail": g.get("thumbnail") or "",
        "source_url": g.get("sourceUrl") or "",
        "servers": [
            {
                "label": s.get("label"),
                "url": s.get("url") or "",
                "external": bool(s.get("external")),
                "modes": [{"label": m2.get("label"), "query": m2.get("query") or ""} for m2 in (s.get("modes") or [])]
            } for s in (g.get("servers") or [])
        ],
        "html_game": bool(g.get("htmlGame")),
        "id": g.get("id"),
    }

all_ids_game  = {g.get("id") for g in games_list}
deduped_all   = []
seen          = set()
for g in all_list:
    gid = g.get("id")
    if gid in seen:
        continue
    seen.add(gid)
    deduped_all.append(g)

print(json.dumps({ "games": [slim(g) for g in games_list], "allGames": [slim(g) for g in deduped_all] }, indent=2))
