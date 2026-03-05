'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Save, X, Loader2, Hash } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { CATEGORIES, PRESET_TAGS } from '@/lib/utils/constants';
import { normalizeTag, tagsInclude, displayTag, normalizeTags } from '@/lib/utils/format';
import CustomSelect from '@/components/ui/CustomSelect';
import type { SpriteListItem } from '@/lib/types/sprite';

interface EditSpriteModalProps {
  sprite: SpriteListItem | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function EditSpriteModal({ sprite, open, onClose, onSaved }: EditSpriteModalProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Other');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Populate fields when sprite changes
  useEffect(() => {
    if (sprite && open) {
      setTitle(sprite.title);
      setCategory(sprite.category || 'Other');
      setSelectedTags(sprite.tags || []);
      setCustomTagInput('');
      setError('');
    }
  }, [sprite, open]);

  const toggleTag = useCallback((tag: string) => {
    const normalized = normalizeTag(tag);
    setSelectedTags((prev) =>
      tagsInclude(prev, tag)
        ? prev.filter((t) => normalizeTag(t) !== normalized)
        : [...prev, normalized]
    );
  }, []);

  const addCustomTag = useCallback(() => {
    const raw = customTagInput.trim().replace(/^#/, '').trim();
    const tag = normalizeTag(raw);
    if (tag && !tagsInclude(selectedTags, tag)) {
      setSelectedTags((prev) => [...prev, tag]);
    }
    setCustomTagInput('');
  }, [customTagInput, selectedTags]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCustomTag();
    }
  };

  const removeTag = useCallback((tag: string) => {
    const normalized = normalizeTag(tag);
    setSelectedTags((prev) => prev.filter((t) => normalizeTag(t) !== normalized));
  }, []);

  const handleSave = async () => {
    if (!sprite) return;
    if (!title.trim()) {
      setError('Title cannot be empty');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const res = await fetch(`/api/sprites/${sprite.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          category,
          tags: normalizeTags(selectedTags),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (!sprite) return null;

  const editableCategories = CATEGORIES.filter((c) => c !== 'All');

  return (
    <Modal open={open} onClose={onClose} title="Edit Sprite">
      {/* Title input */}
      <div className="mb-5">
        <label className="mb-2 block text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
          Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="h-10 w-full rounded-lg border border-[var(--border-default)] bg-bg-elevated px-3 text-sm text-text-primary placeholder:text-text-disabled focus:border-accent-primary focus:outline-none"
          placeholder="Sprite title..."
        />
      </div>

      {/* Category dropdown */}
      <div className="mb-5">
        <label className="mb-2 block text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
          Category
        </label>
        <CustomSelect
          value={category}
          onChange={setCategory}
          options={editableCategories.map((cat) => ({ value: cat, label: cat }))}
          className="w-full"
        />
      </div>

      {/* Tags section */}
      <div className="mb-5">
        <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
          <Hash className="mr-1 inline h-3 w-3" />
          Hashtags
        </p>

        {/* Preset tags */}
        <div className="mb-3 flex flex-wrap gap-1.5">
          {PRESET_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                tagsInclude(selectedTags, tag)
                  ? 'bg-accent-primary text-text-inverse'
                  : 'bg-white/[0.06] text-text-secondary hover:bg-white/[0.10]'
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>

        {/* Custom tag input */}
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={customTagInput}
            onChange={(e) => setCustomTagInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add custom tag..."
            className="h-9 flex-1 rounded-lg border border-[var(--border-default)] bg-bg-elevated px-3 text-sm text-text-primary placeholder:text-text-disabled focus:border-accent-primary focus:outline-none"
          />
          <Button variant="ghost" size="sm" onClick={addCustomTag} disabled={!customTagInput.trim()}>
            Add
          </Button>
        </div>

        {/* Selected tags display */}
        {selectedTags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {selectedTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-accent-primary/15 px-2 py-0.5 text-[11px] text-accent-primary"
              >
                #{displayTag(tag)}
                <button
                  onClick={() => removeTag(tag)}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-accent-primary/20"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="mb-4 text-sm text-state-error">{error}</p>
      )}

      {/* Save button */}
      <Button
        variant="edit"
        size="lg"
        className="w-full"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="h-4 w-4" />
            Save Changes
          </>
        )}
      </Button>
    </Modal>
  );
}
