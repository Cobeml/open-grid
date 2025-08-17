'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

type SnapshotRef = { timestamp: number; blobId: string; size?: number };

type Manifest = {
  version: number;
  kind: string;
  aggregator: string;
  createdAt: number;
  meta: {
    city: string;
    nodeCount: number;
    stepMinutes: number;
    totalSnapshots: number;
  };
  snapshots: SnapshotRef[];
};

export default function WalrusViewerPage() {
  const [manifestId, setManifestId] = useState('');
  const [inputId, setInputId] = useState('');
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [selectedSnapshot, setSelectedSnapshot] = useState<SnapshotRef | null>(null);
  const [snapshotData, setSnapshotData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      setManifestId(hash);
      setInputId(hash);
    }
  }, []);

  const loadManifest = async () => {
    if (!inputId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/walrus/${encodeURIComponent(inputId)}`);
      if (!res.ok) throw new Error(`Failed to fetch manifest: ${res.status}`);
      const data = await res.json();
      setManifest(data);
      setManifestId(inputId);
      window.location.hash = inputId;
    } catch (e: any) {
      setError(e.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const loadSnapshot = async (snap: SnapshotRef) => {
    setLoading(true);
    setError(null);
    setSelectedSnapshot(snap);
    try {
      const res = await fetch(`/api/walrus/${encodeURIComponent(snap.blobId)}`);
      if (!res.ok) throw new Error(`Failed to fetch snapshot: ${res.status}`);
      const data = await res.json();
      setSnapshotData(data);
    } catch (e: any) {
      setError(e.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const sortedSnapshots = useMemo(() => {
    return manifest?.snapshots?.slice().sort((a, b) => b.timestamp - a.timestamp) || [];
  }, [manifest]);

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Walrus Time Series Viewer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              value={inputId}
              onChange={(e) => setInputId(e.target.value)}
              placeholder="Enter Manifest Blob ID"
            />
            <Button onClick={loadManifest} disabled={loading || !inputId}>
              Load Manifest
            </Button>
          </div>
          {error && <div className="text-red-400 mt-3 text-sm">{error}</div>}
        </CardContent>
      </Card>

      {manifest && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Snapshots</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-400 mb-3">
                {manifest.meta.city} • {manifest.meta.nodeCount} nodes • every {manifest.meta.stepMinutes}m
              </div>
              <div className="max-h-96 overflow-auto space-y-2">
                {sortedSnapshots.map((snap) => (
                  <button
                    key={snap.blobId}
                    onClick={() => loadSnapshot(snap)}
                    className={`w-full text-left p-3 rounded border transition-colors ${
                      selectedSnapshot?.blobId === snap.blobId
                        ? 'bg-gray-800 border-gray-600'
                        : 'bg-gray-800/40 border-gray-800 hover:border-gray-700'
                    }`}
                  >
                    <div className="text-white text-sm">
                      {format(new Date(snap.timestamp * 1000), 'PPpp')}
                    </div>
                    <div className="text-xs text-gray-400 font-mono truncate">
                      {snap.blobId}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-white">Snapshot Detail</CardTitle>
            </CardHeader>
            <CardContent>
              {!snapshotData && <div className="text-gray-400">Select a snapshot</div>}
              {snapshotData && (
                <div className="space-y-4">
                  <div className="text-sm text-gray-400">
                    {snapshotData.nodeCount} nodes at{' '}
                    {format(new Date(snapshotData.snapshotTimestamp * 1000), 'PPpp')}
                  </div>
                  <div className="max-h-[28rem] overflow-auto text-xs">
                    <pre className="whitespace-pre-wrap break-words text-gray-300">
                      {JSON.stringify(snapshotData, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}


