<script lang="ts">
  import type { Message } from '@casoon/helpdesk-types';

  interface Props {
    conversationId: string;
  }

  let { conversationId }: Props = $props();

  type Tab = 'reply' | 'note';

  let activeTab = $state<Tab>('reply');
  let body = $state('');
  let sending = $state(false);
  let error = $state<string | null>(null);

  function getToken(): string | null {
    const match = document.cookie.match(/(?:^|;\s*)token=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  async function send() {
    if (!body.trim() || sending) return;
    sending = true;
    error = null;

    const token = getToken();
    const type = activeTab === 'note' ? 'note' : 'agent';

    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ body: body.trim(), type }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(data.error ?? 'Failed to send message');
      }

      const message: Message = await res.json();
      body = '';

      const event = new CustomEvent('messageSent', {
        detail: message,
        bubbles: true,
        composed: true,
      });
      document.dispatchEvent(event);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to send message';
    } finally {
      sending = false;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      send();
    }
  }

  let showSavedReplies = $state(false);
  let savedRepliesList = $state<{ id: string; name: string; body: string }[]>([]);

  async function loadSavedReplies() {
    const token = getToken();
    try {
      const res = await fetch('/api/saved-replies', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      savedRepliesList = data.data ?? [];
    } catch {
      savedRepliesList = [];
    }
  }
</script>

<div class="flex flex-col">
  <!-- Tab bar -->
  <div class="flex items-center gap-0 border-b px-4" style="border-color: var(--color-border);">
    {#each (['reply', 'note'] as Tab[]) as tab}
      <button
        type="button"
        onclick={() => { activeTab = tab; }}
        class="px-3 py-2.5 text-sm font-medium border-b-2 transition-colors"
        style={activeTab === tab
          ? 'border-color: var(--color-accent); color: var(--color-accent);'
          : 'border-color: transparent; color: var(--color-text-secondary);'}
      >
        {tab === 'reply' ? 'Reply' : 'Note'}
      </button>
    {/each}

    <!-- Saved replies picker -->
    <div class="relative ml-auto mr-2 flex items-center">
      <button
        type="button"
        onclick={() => { showSavedReplies = !showSavedReplies; if (showSavedReplies) loadSavedReplies(); }}
        class="flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors hover:bg-gray-100"
        style="color: var(--color-text-secondary);"
      >
        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" />
        </svg>
        Saved
      </button>

      {#if showSavedReplies}
        <div
          class="absolute bottom-full right-0 mb-1 z-50 rounded-lg border shadow-md overflow-auto"
          style="background: var(--color-surface); border-color: var(--color-border); width: 280px; max-height: 200px;"
        >
          {#if savedRepliesList.length === 0}
            <p class="px-3 py-2 text-xs" style="color: var(--color-text-tertiary);">No saved replies</p>
          {:else}
            {#each savedRepliesList as reply}
              <button
                type="button"
                onclick={() => { body = reply.body; showSavedReplies = false; }}
                class="flex flex-col w-full px-3 py-2 text-left hover:bg-gray-50 border-b text-xs"
                style="border-color: var(--color-border);"
              >
                <span class="font-medium" style="color: var(--color-text-primary);">{reply.name}</span>
                <span class="truncate mt-0.5" style="color: var(--color-text-tertiary);">{reply.body.slice(0, 60)}…</span>
              </button>
            {/each}
          {/if}
        </div>
      {/if}
    </div>
  </div>

  <!-- Textarea -->
  <div class="px-4 pt-3 pb-2">
    <textarea
      bind:value={body}
      onkeydown={handleKeydown}
      placeholder={activeTab === 'reply' ? 'Write a reply…' : 'Add an internal note…'}
      rows={4}
      disabled={sending}
      class="w-full resize-none rounded-md border px-3 py-2 text-sm outline-none transition-colors focus:border-transparent focus:ring-2"
      style={`
        border-color: var(--color-border);
        background: ${activeTab === 'note' ? '#fffbeb' : 'var(--color-bg)'};
        color: var(--color-text-primary);
        --tw-ring-color: var(--color-accent);
      `}
    ></textarea>
  </div>

  <!-- Footer -->
  <div class="flex items-center justify-between px-4 pb-3">
    <span class="text-xs" style="color: var(--color-text-tertiary);">
      {#if error}
        <span style="color: var(--color-status-spam);">{error}</span>
      {:else}
        ⌘↵ to send
      {/if}
    </span>
    <button
      type="button"
      onclick={send}
      disabled={sending || !body.trim()}
      class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      style={`background: ${activeTab === 'note' ? '#d97706' : 'var(--color-accent)'}; ${!sending && body.trim() ? 'cursor: pointer;' : ''}`}
    >
      {#if sending}
        <svg class="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
        Sending…
      {:else}
        {activeTab === 'reply' ? 'Send Reply' : 'Add Note'}
      {/if}
    </button>
  </div>
</div>
