import { NextRequest } from 'next/server';

const AGGREGATOR_URL = 'http://aggregator.testnet.walrus.site';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ blobId: string }> }
) {
  const { blobId } = await params;
  const res = await fetch(`${AGGREGATOR_URL}/${encodeURIComponent(blobId)}`);
  if (!res.ok) {
    return new Response(await res.text(), { status: res.status });
  }
  const arrayBuf = await res.arrayBuffer();
  return new Response(arrayBuf, {
    status: 200,
    headers: {
      'Content-Type': res.headers.get('content-type') || 'application/octet-stream',
      'Cache-Control': 's-maxage=60, stale-while-revalidate=600',
    },
  });
}


