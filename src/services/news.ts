export interface NewsItem {
  title: string;
  publisher: string;
  link: string;
  time: number;
}

const SEARCH = 'https://query1.finance.yahoo.com/v1/finance/search';

/** Fetch recent market news for the given symbols (falls back to indices). */
export async function fetchNews(symbols: string[]): Promise<NewsItem[]> {
  const queries = symbols.length ? symbols.slice(0, 5) : ['^NSEI', '^GSPC', 'gold'];
  const seen = new Set<string>();
  const out: NewsItem[] = [];

  await Promise.all(
    queries.map(async (q) => {
      try {
        const res = await fetch(`${SEARCH}?q=${encodeURIComponent(q)}&newsCount=5&quotesCount=0`, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
        });
        const data = await res.json();
        (data.news || []).forEach((n: any) => {
          if (n.title && !seen.has(n.title)) {
            seen.add(n.title);
            out.push({ title: n.title, publisher: n.publisher || '', link: n.link || '', time: n.providerPublishTime || 0 });
          }
        });
      } catch {
        // ignore per-query failures
      }
    })
  );

  return out.sort((a, b) => b.time - a.time).slice(0, 30);
}
