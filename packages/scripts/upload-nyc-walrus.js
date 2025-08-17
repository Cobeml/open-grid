#!/usr/bin/env node
/*
  Upload NYC 35-node time series snapshots to Walrus testnet via REST API.
  - Generates mock usage readings for each node over time windows
  - Uploads each snapshot as a blob
  - Builds and uploads a manifest referencing blob IDs and timestamps
  - Prints the manifest Blob ID for frontend use
*/

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// __filename and __dirname are available in CommonJS

const AGGREGATOR_URL = 'http://aggregator.testnet.walrus.site';
const UPLOAD_RELAY_URL = 'http://upload-relay.testnet.walrus.space/v1';

// Load NYC nodes (35 nodes) from packages/scripts/nyc-nodes-data.js (CommonJS export)
// We use dynamic import of CJS by creating a require shim
const nycData = require('./nyc-nodes-data.js');
const NYC_NODES = nycData.NYC_NODES;

function toBase64Url(bytes) {
  return Buffer.from(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function computeBlobId(buffer) {
  // Walrus uses a base64-url encoded hash as blob_id (docs examples use SHA256)
  const hash = crypto.createHash('sha256').update(buffer).digest();
  return toBase64Url(hash);
}

async function getTipConfig() {
  const res = await fetch(`${UPLOAD_RELAY_URL}/tip-config`);
  if (!res.ok) {
    return { kind: 'unknown' };
  }
  try {
    return await res.json();
  } catch {
    return { kind: 'unknown' };
  }
}

async function walrusUpload(buffer, blobId, tip) {
  const params = new URLSearchParams({ blob_id: blobId });
  if (tip && tip.tx_id && tip.nonce) {
    params.set('tx_id', tip.tx_id);
    params.set('nonce', tip.nonce);
  }
  const url = `${UPLOAD_RELAY_URL}/blob-upload-relay?${params.toString()}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
    },
    body: buffer,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Walrus upload failed: ${res.status} ${res.statusText} ${text}`);
  }
  return res.json();
}

async function walrusDownload(blobId) {
  const url = `${AGGREGATOR_URL}/${encodeURIComponent(blobId)}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Walrus download failed: ${res.status} ${res.statusText} ${text}`);
  }
  const arrayBuf = await res.arrayBuffer();
  return Buffer.from(arrayBuf);
}

function generateTimeSeries({ intervals = 24, stepMinutes = 60, baseSeed = 42 }) {
  // returns array of timestamps (unix seconds), newest last
  const now = Math.floor(Date.now() / 1000);
  const series = [];
  for (let i = intervals - 1; i >= 0; i -= 1) {
    series.push(now - i * stepMinutes * 60);
  }
  return series;
}

function randomForNode(nodeId, timestamp) {
  // deterministic-ish random using sha256
  const h = crypto.createHash('sha256').update(`${nodeId}:${timestamp}`).digest();
  const num = h.readUInt32BE(0);
  return num / 0xffffffff;
}

function generateSnapshotPayload(timestamp) {
  // One reading per node
  const readings = NYC_NODES.map((node) => {
    const r = randomForNode(node.id, timestamp);
    // usage between 1,000 and 9,000 kWh
    const kWh = Math.round(1000 + r * 8000);
    return {
      nodeId: String(node.id),
      name: node.name,
      location: node.location,
      district: node.district,
      type: node.type,
      priority: node.priority,
      kWh,
      timestamp,
    };
  });
  return {
    version: 1,
    city: 'NYC',
    snapshotTimestamp: timestamp,
    nodeCount: NYC_NODES.length,
    readings,
  };
}

async function main() {
  const intervals = Number(process.env.WALRUS_INTERVALS || 24); // 24 hourly snapshots by default
  const stepMinutes = Number(process.env.WALRUS_STEP_MINUTES || 60);
  const times = generateTimeSeries({ intervals, stepMinutes });

  console.log(`Generating ${times.length} snapshots for ${NYC_NODES.length} nodes...`);

  // Tip handling
  const tipConfig = await getTipConfig();
  let tip = null;
  if (tipConfig && tipConfig.send_tip) {
    const txId = process.env.WALRUS_TX_ID;
    const nonce = process.env.WALRUS_NONCE;
    if (!txId || !nonce) {
      console.error('This relay requires a tip. Provide WALRUS_TX_ID and WALRUS_NONCE env vars.');
      console.error('Example: WALRUS_TX_ID=... WALRUS_NONCE=... npm run -w @open-grid/scripts walrus:upload-nyc');
      console.error('Fetch tip config at', `${UPLOAD_RELAY_URL}/tip-config`);
      process.exit(1);
    }
    tip = { tx_id: txId, nonce };
  }

  const uploaded = [];
  for (const ts of times) {
    const payload = generateSnapshotPayload(ts);
    const json = JSON.stringify(payload);
    const buffer = Buffer.from(json);
    const blobId = computeBlobId(buffer);
    console.log(`Uploading snapshot ${new Date(ts * 1000).toISOString()} -> blob ${blobId}`);
    const resp = await walrusUpload(buffer, blobId, tip);
    uploaded.push({ timestamp: ts, blobId, size: buffer.length, cert: resp.confirmation_certificate || null });
  }

  const manifest = {
    version: 1,
    kind: 'nyc-node-time-series',
    aggregator: AGGREGATOR_URL,
    createdAt: Math.floor(Date.now() / 1000),
    meta: {
      city: 'NYC',
      nodeCount: NYC_NODES.length,
      stepMinutes,
      totalSnapshots: uploaded.length,
      schema: {
        reading: ['nodeId', 'name', 'location', 'district', 'type', 'priority', 'kWh', 'timestamp'],
      },
    },
    snapshots: uploaded.sort((a, b) => a.timestamp - b.timestamp),
  };

  const manifestBuf = Buffer.from(JSON.stringify(manifest, null, 2));
  const manifestId = computeBlobId(manifestBuf);
  console.log(`Uploading manifest -> blob ${manifestId}`);
  await walrusUpload(manifestBuf, manifestId, tip);

  // Save a local copy for reference
  const outDir = path.join(__dirname, '.out');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, `manifest-${manifestId}.json`), manifestBuf);

  console.log('DONE');
  console.log('Manifest Blob ID:', manifestId);
  console.log(`Use GET ${AGGREGATOR_URL}/${manifestId}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


