<script lang="ts">
  interface Tag {
    id: string;
    name: string;
    color: string;
  }

  interface Props {
    conversationId: string;
    currentTags: Tag[];
    allTags: Tag[];
  }

  let { conversationId, currentTags, allTags }: Props = $props();

  let tags = $state<Tag[]>(currentTags);
  let dropdownOpen = $state(false);
  let error = $state<string | null>(null);

  let availableTags = $derived(allTags.filter(t => !tags.some(ct => ct.id === t.id)));

  function getToken(): string | null {
    const match = document.cookie.match(/(?:^|;\s*)token=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  async function addTag(tag: Tag) {
    const prev = [...tags];
    tags = [...tags, tag];
    dropdownOpen = false;
    error = null;

    const token = getToken();
    try {
      const res = await fetch(`/api/conversations/${conversationId}/tags/${tag.id}`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Failed to add tag');
    } catch {
      tags = prev;
      error = 'Failed to add tag';
    }
  }

  async function removeTag(tagId: string) {
    const prev = [...tags];
    tags = tags.filter(t => t.id !== tagId);
    error = null;

    const token = getToken();
    try {
      const res = await fetch(`/api/conversations/${conversationId}/tags/${tagId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Failed to remove tag');
    } catch {
      tags = prev;
      error = 'Failed to remove tag';
    }
  }

  function closeDropdown(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (!target.closest('.tag-editor')) {
      dropdownOpen = false;
    }
  }
</script>

<svelte:window onclick={closeDropdown} />

<div class="tag-editor relative">
  <p class="text-xs font-semibold uppercase tracking-wide mb-2" style="color: var(--color-text-tertiary);">Tags</p>

  <div class="flex flex-wrap gap-1.5">
    {#each tags as tag (tag.id)}
      <span
        class="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
        style={`background: ${tag.color}22; color: ${tag.color};`}
      >
        {tag.name}
        <button
          type="button"
          onclick={() => removeTag(tag.id)}
          class="ml-0.5 rounded-full leading-none hover:opacity-70 transition-opacity"
          aria-label={`Remove tag ${tag.name}`}
          style={`color: ${tag.color};`}
        >
          ×
        </button>
      </span>
    {/each}

    <button
      type="button"
      onclick={(e) => { e.stopPropagation(); dropdownOpen = !dropdownOpen; }}
      class="flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-xs transition-colors hover:bg-gray-50"
      style="border-color: var(--color-border); color: var(--color-text-secondary);"
      aria-label="Add tag"
    >
      <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
      Add tag
    </button>
  </div>

  {#if dropdownOpen && availableTags.length > 0}
    <div
      class="absolute left-0 z-10 mt-1 rounded-md border shadow-md overflow-hidden"
      style="min-width: 160px; background: var(--color-surface); border-color: var(--color-border);"
    >
      {#each availableTags as tag (tag.id)}
        <button
          type="button"
          onclick={() => addTag(tag)}
          class="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-50 text-left transition-colors"
          style="color: var(--color-text-primary);"
        >
          <span
            class="h-2 w-2 rounded-full shrink-0"
            style={`background: ${tag.color};`}
          ></span>
          {tag.name}
        </button>
      {/each}
    </div>
  {/if}

  {#if dropdownOpen && availableTags.length === 0}
    <div
      class="absolute left-0 z-10 mt-1 rounded-md border shadow-md px-3 py-2"
      style="background: var(--color-surface); border-color: var(--color-border);"
    >
      <span class="text-xs" style="color: var(--color-text-tertiary);">All tags assigned</span>
    </div>
  {/if}

  {#if error}
    <p class="mt-1 text-xs" style="color: var(--color-danger);">{error}</p>
  {/if}
</div>
