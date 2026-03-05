'use client';

import { useState } from 'react';
import SpriteCard from './SpriteCard';
import EditSpriteModal from './EditSpriteModal';
import DownloadModal from '@/components/download/DownloadModal';
import type { SpriteListItem } from '@/lib/types/sprite';

interface GalleryGridProps {
  sprites: SpriteListItem[];
  onDelete?: (id: string) => void;
  onRefresh?: () => void;
}

export default function GalleryGrid({ sprites, onDelete, onRefresh }: GalleryGridProps) {
  const [selectedSprite, setSelectedSprite] = useState<SpriteListItem | null>(null);
  const [editingSprite, setEditingSprite] = useState<SpriteListItem | null>(null);

  if (sprites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-2xl bg-white/[0.03]">
          <svg className="h-12 w-12 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
        <h3 className="font-display text-xl font-bold text-text-primary">No sprites yet</h3>
        <p className="mt-2 text-sm text-text-secondary">
          Upload your first sprite to get started
        </p>
      </div>
    );
  }

  return (
    <>
      <div
        className="grid gap-6"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
      >
        {sprites.map((sprite, i) => (
          <div
            key={sprite.id}
            className="animate-fade-in"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <SpriteCard
              sprite={sprite}
              onDownloadClick={setSelectedSprite}
              onDelete={onDelete}
              onEdit={setEditingSprite}
            />
          </div>
        ))}
      </div>

      <DownloadModal
        sprite={selectedSprite}
        open={selectedSprite !== null}
        onClose={() => setSelectedSprite(null)}
      />

      <EditSpriteModal
        sprite={editingSprite}
        open={editingSprite !== null}
        onClose={() => setEditingSprite(null)}
        onSaved={() => {
          if (onRefresh) onRefresh();
        }}
      />
    </>
  );
}
