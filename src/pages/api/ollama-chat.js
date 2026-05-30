export const prerender = false;

const OLLAMA_BASE = 'http://127.0.0.1:11434';
const MODEL = 'llama3.2';

const BRONNEN = {
  forums: [
    { naam: 'MaggotDrowning', url: 'maggotdrowning.com', type: 'forum' },
    { naam: 'ScienceDirect', url: 'sciencedirect.com', type: 'artikel' },
    { naam: 'FishingMagic', url: 'fishingmagic.com', type: 'artikel' },
    { naam: 'Witvisforum', url: 'witvisforum.be', type: 'forum' },
  ],
  winkels: [
    { naam: 'Visdeal', url: 'visdeal.nl', type: 'winkel' },
    { naam: 'Lemmens Diest', url: 'lemmensdiest.be', type: 'winkel' },
    { naam: 'Reniers Fishing', url: 'reniersfishing.be', type: 'winkel' },
    { naam: 'Preston Fishing', url: 'prestonfishing.nl', type: 'winkel' },
    { naam: 'De Wedstrijdvisser', url: 'dewedstrijdvisserwebshop.be', type: 'winkel' },
    { naam: 'Lisarde', url: 'lisarde.be', type: 'winkel' },
    { naam: 'Carpshop24', url: 'carpshop24.com', type: 'winkel' },
  ],
};

const PRODUCT_TRIGGERS = [
  'koop', 'kopen', 'prijs', 'kost', 'webshop', 'winkel', 'bestel',
  'shimano', 'daiwa', 'guru', 'preston', 'sensas', 'tubertini',
  'visdeal', 'lemmens', 'reniers', 'lisarde', 'carpshop',
  'reflo', 'accu', 'power', 'topkit',
];

const INFO_TRIGGERS = [
  'hoe', 'wat', 'waarom', 'tip', 'techniek', 'strategie',
  'weer', 'wind', 'druk', 'temperatuur', 'seizoen', 'winter',
  'voederen', 'aas', 'hengel', 'materiaal', 'lijn', 'haak',
  'vissen', 'vistechniek', 'wedstrijd', 'competitie', 'wedstrijdvisser',
  'visvergunning', 'regel', 'soort', 'baars', 'snoek', 'karper',
  'voorn', 'brasem', 'paling', 'forel', 'winde', 'zeelt', 'roofvis',
  'witvis', 'witvisforum', 'vangen', 'vangkanaal', 'viste',
  'hengelmap', 'stek', 'stekken', 'visstek', 'viswater',
  'diepte', 'bodem', 'voer', 'lokvoer', 'maden', 'wormen',
  'boilies', 'method', 'feeder', 'match', 'vlotter', 'dobber',
  'onderlijn', 'elastiek', 'topkit', 'pole', 'winter',
  'lente', 'zomer', 'herfst',
];

function isProductVraag(msg) {
  const m = msg.toLowerCase();
  return PRODUCT_TRIGGERS.some(t => m.includes(t));
}

function isInfoVraag(msg) {
  const m = msg.toLowerCase();
  return INFO_TRIGGERS.some(t => m.includes(t));
}

const SYSTEM_PROMPT = `Je bent de KVVI Hengel-Assistent, expert in hengelsport (visserij) in West-Vlaanderen, België.

Taal en stijl:
- Antwoord in het Nederlands (Vlaams), beknopt (max 3-4 zinnen)
- Gebruik correcte vaktermen
- Wees enthousiast en behulpzaam. Verwijs naar KVVI club waar relevant.

Hoe omgaan met bronnen:
- Als er forums of artikels in de context staan, gebruik die info voor je antwoord
- Vertaal Engelse bronnen naar correct Nederlands
- Als er geen bronnen gevonden zijn, antwoord dan op basis van je eigen kennis

Bronnen: webshops (Visdeal, Lemmens Diest, Reniers Fishing, Preston Fishing, De Wedstrijdvisser, Lisarde, Carpshop24) en fora/artikels (MaggotDrowning, ScienceDirect, FishingMagic, Witvisforum).`;

function ndjson(line) {
  return new TextEncoder().encode(JSON.stringify(line) + '\n');
}

export async function POST({ request }) {
  try {
    const { message, history } = await request.json();
    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'Geen bericht ontvangen' }), { status: 400 });
    }

    let zoekResultaten = [];
    let context = '';

    const zoekForums = isInfoVraag(message);
    const zoekProducten = isProductVraag(message);

    if (zoekForums || zoekProducten) {
      try {
        const { search } = await import('duck-duck-scrape');
        const bronnen = [];

        if (zoekProducten) bronnen.push(...BRONNEN.winkels);
        if (zoekForums) bronnen.push(...BRONNEN.forums);

        const zoekMetTimeout = (promise, ms) => {
          const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms));
          return Promise.race([promise, timeout]);
        };

        const zoekOpdrachten = bronnen.map(bron =>
          zoekMetTimeout(
            search(`site:${bron.url} ${message}`, { safeSearch: 0, maxResults: 1 }),
            3000
          ).then(sr => {
            if (sr && sr.result) {
              for (const r of sr.result.slice(0, 1)) {
                if (r.url && r.title) {
                  zoekResultaten.push({
                    bron: bron.naam,
                    type: bron.type,
                    title: r.title,
                    url: r.url,
                    snippet: r.description || '',
                  });
                }
              }
            }
          }).catch(() => {})
        );

        for (let i = 0; i < zoekOpdrachten.length; i += 3) {
          await Promise.all(zoekOpdrachten.slice(i, i + 3));
        }

        if (zoekResultaten.length > 0) {
          const forumR = zoekResultaten.filter(r => r.type === 'forum' || r.type === 'artikel');
          const winkelR = zoekResultaten.filter(r => r.type === 'winkel');
          let contextParts = [];
          if (forumR.length > 0) {
            contextParts.push('Informatie uit forums en artikels:\n' + forumR.map(r =>
              `- [${r.bron}] ${r.title}: ${r.url}`
            ).join('\n'));
          }
          if (winkelR.length > 0) {
            contextParts.push('Producten uit webshops:\n' + winkelR.map(r =>
              `- [${r.bron}] ${r.title}: ${r.url}`
            ).join('\n'));
          }
          context = '\n\n' + contextParts.join('\n\n');
        } else {
          context = '\n\nGeen relevante bronnen gevonden.';
        }
      } catch (e) {
        context = '\n\nBronnen zoeken niet beschikbaar.';
      }
    }

    const msgs = [{ role: 'system', content: SYSTEM_PROMPT }];
    if (Array.isArray(history)) {
      for (const h of history) {
        if (h.role === 'user' || h.role === 'assistant') {
          msgs.push({ role: h.role, content: h.content });
        }
      }
    }
    msgs.push({ role: 'user', content: message + context });

    const ac = new AbortController();
    const timeoutId = setTimeout(() => ac.abort(), 35000);

    const ollamaRes = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        messages: msgs,
        stream: true,
        options: { temperature: 0.7, num_predict: 200 }
      }),
      signal: ac.signal
    });
    clearTimeout(timeoutId);

    if (!ollamaRes.ok) {
      const errText = await ollamaRes.text();
      throw new Error(`Ollama error ${ollamaRes.status}: ${errText}`);
    }

    const encoder = new TextEncoder();
    const reader = ollamaRes.body.getReader();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(ndjson({ type: 'zoek', resultaten: zoekResultaten.length > 0 ? zoekResultaten : undefined }));

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(l => l.trim());
            for (const line of lines) {
              try {
                const parsed = JSON.parse(line);
                if (parsed.done) continue;
                const token = parsed.message?.content || '';
                if (token) {
                  controller.enqueue(ndjson({ type: 'token', text: token }));
                }
              } catch {}
            }
          }
        } catch (err) {
          controller.enqueue(ndjson({ type: 'error', text: 'Fout bij streamen van antwoord.' }));
        }

        controller.enqueue(ndjson({ type: 'done' }));
        controller.close();
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache',
      }
    });
  } catch (err) {
    const msg = err.name === 'AbortError'
      ? 'De assistent reageert niet (timeout).'
      : err.message.includes('ECONNREFUSED')
        ? 'Ollama is niet actief. Start Ollama via Terminal: ollama serve'
        : err.message.includes('Ollama error 404')
          ? 'Model niet gevonden. Installeer met: ollama pull llama3.2'
          : err.message;
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
}
