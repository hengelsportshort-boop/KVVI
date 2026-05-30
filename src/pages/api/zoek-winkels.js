export const prerender = false;

const WINKELS = [
  { naam: 'Visdeal', url: 'visdeal.nl' },
  { naam: 'Lemmens Diest', url: 'lemmensdiest.be' },
  { naam: 'Reniers Fishing', url: 'reniersfishing.be' },
  { naam: 'Preston Fishing', url: 'prestonfishing.nl' },
  { naam: 'De Wedstrijdvisser', url: 'dewedstrijdvisserwebshop.be' },
  { naam: 'Lisarde', url: 'lisarde.be' },
  { naam: 'Carpshop24', url: 'carpshop24.com' },
];

export async function POST({ request }) {
  try {
    const { query } = await request.json();
    if (!query || typeof query !== 'string' || query.length < 2) {
      return new Response(JSON.stringify({ results: [] }), { status: 400 });
    }

    const { search } = await import('duck-duck-scrape');
    const results = [];

    for (const winkel of WINKELS) {
      try {
        const searchResults = await search(`site:${winkel.url} ${query}`, {
          safeSearch: 0,
          maxResults: 2
        });
        if (searchResults && searchResults.result) {
          for (const r of searchResults.result.slice(0, 2)) {
            if (r.url && r.title) {
              results.push({
                winkel: winkel.naam,
                title: r.title,
                url: r.url,
                snippet: r.description || '',
              });
            }
          }
        }
      } catch (e) {
        // Skip shop on error
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, results: [] }), { status: 500 });
  }
}
