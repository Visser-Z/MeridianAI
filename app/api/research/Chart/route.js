export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return Response.json({ error: 'Symbol required' }, { status: 400 });
  }

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1mo`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const data = await res.json();
    const result = data.chart.result[0];
    const timestamps = result.timestamp;
    const closes = result.indicators.quote[0].close;
    const meta = result.meta;

    const points = timestamps.map((t, i) => ({
      date: new Date(t * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      price: closes[i] ? parseFloat(closes[i].toFixed(2)) : null,
    })).filter(p => p.price !== null);

    return Response.json({
      points,
      currency: meta.currency,
      currentPrice: parseFloat(meta.regularMarketPrice.toFixed(2)),
      previousClose: parseFloat(meta.chartPreviousClose.toFixed(2)),
      symbol: meta.symbol,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}