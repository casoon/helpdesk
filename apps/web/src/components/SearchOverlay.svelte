<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  export let open = $state(false);

  type ConversationResult = {
    id: string;
    subject: string;
    status: string;
    customerEmail: string;
    preview: string | null;
    lastReplyAt: string | null;
    createdAt: string;
    rank: number;
  };

  type MessageResult = {
    id: string;
    conversationId: string;
    type: string;
    body: string | null;
    createdAt: string;
    rank: number;
    headline: string;
  };

  type CustomerResult = {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    company: string | null;
    createdAt: string;
  };

  let query = $state('');
  let loading = $state(false);
  let convResults = $state<ConversationResult[]>([]);
  let msgResults = $state<MessageResult[]>([]);
  let custResults = $state<CustomerResult[]>([]);
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let inputEl: HTMLInputElement | undefined = $state();
  let searched = $state(false);

  $effect(() => {
    if (open && inputEl) {
      inputEl.focus();
    }
    if (!open) {
      query = '';
      convResults = [];
      msgResults = [];
      custResults = [];
      searched = false;
    }
  });

  function close() {
    open = false;
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) close();
  }

  function handleInput() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(doSearch, 300);
  }

  async function doSearch() {
    const q = query.trim();
    if (q.length < 2) {
      convResults = [];
      msgResults = [];
      custResults = [];
      searched = false;
      return;
    }
    loading = true;
    searched = true;
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        convResults = data.conversations ?? [];
        msgResults = data.messages ?? [];
        custResults = data.customers ?? [];
      }
    } finally {
      loading = false;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') close();
  }

  function handleGlobalKeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      open = !open;
    }
    if (e.key === 'Escape' && open) close();
  }

  onMount(() => {
    document.addEventListener('keydown', handleGlobalKeydown);
  });

  onDestroy(() => {
    document.removeEventListener('keydown', handleGlobalKeydown);
    if (debounceTimer) clearTimeout(debounceTimer);
  });

  const hasResults = $derived(convResults.length > 0 || msgResults.length > 0 || custResults.length > 0);
</script>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="search-backdrop"
    onclick={handleBackdropClick}
  >
    <div class="search-modal" role="dialog" aria-modal="true" aria-label="Search">
      <div class="search-input-row">
        <svg class="search-icon" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
        <input
          bind:this={inputEl}
          bind:value={query}
          oninput={handleInput}
          onkeydown={handleKeydown}
          type="search"
          placeholder="Search conversations, messages, customers…"
          class="search-input"
          autocomplete="off"
        />
        {#if loading}
          <span class="search-spinner" aria-label="Loading"></span>
        {:else}
          <kbd class="search-esc">esc</kbd>
        {/if}
      </div>

      <div class="search-results">
        {#if searched && !loading && !hasResults}
          <p class="search-empty">No results for "{query}"</p>
        {/if}

        {#if convResults.length > 0}
          <section>
            <h3 class="search-section-title">Conversations</h3>
            <ul class="search-list">
              {#each convResults as conv (conv.id)}
                <li>
                  <a href="/conversations/{conv.id}" onclick={close} class="search-item">
                    <span class="search-item-main">{conv.subject}</span>
                    <span class="search-item-meta">
                      <span class="search-badge search-badge--{conv.status}">{conv.status}</span>
                      <span>{conv.customerEmail}</span>
                    </span>
                  </a>
                </li>
              {/each}
            </ul>
          </section>
        {/if}

        {#if msgResults.length > 0}
          <section>
            <h3 class="search-section-title">Messages</h3>
            <ul class="search-list">
              {#each msgResults as msg (msg.id)}
                <li>
                  <a href="/conversations/{msg.conversationId}" onclick={close} class="search-item">
                    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                    <span class="search-item-headline">{@html msg.headline}</span>
                  </a>
                </li>
              {/each}
            </ul>
          </section>
        {/if}

        {#if custResults.length > 0}
          <section>
            <h3 class="search-section-title">Customers</h3>
            <ul class="search-list">
              {#each custResults as cust (cust.id)}
                <li>
                  <a href="/customers/{cust.id}" onclick={close} class="search-item">
                    <span class="search-item-main">
                      {[cust.firstName, cust.lastName].filter(Boolean).join(' ') || cust.email}
                    </span>
                    <span class="search-item-meta">{cust.email}</span>
                  </a>
                </li>
              {/each}
            </ul>
          </section>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .search-backdrop {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 10vh;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(4px);
  }

  .search-modal {
    width: 100%;
    max-width: 600px;
    border-radius: 12px;
    overflow: hidden;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  }

  .search-input-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 16px;
    border-bottom: 1px solid var(--color-border);
  }

  .search-icon {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    color: var(--color-text-tertiary);
  }

  .search-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    font-size: 15px;
    color: var(--color-text);
    appearance: none;
  }

  .search-input::placeholder {
    color: var(--color-text-tertiary);
  }

  .search-esc {
    font-size: 11px;
    padding: 2px 6px;
    border-radius: 4px;
    background: var(--color-border);
    color: var(--color-text-tertiary);
    border: 1px solid var(--color-border);
  }

  .search-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid var(--color-border);
    border-top-color: var(--color-accent);
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
    flex-shrink: 0;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .search-results {
    max-height: 60vh;
    overflow-y: auto;
    padding: 8px 0;
  }

  .search-empty {
    padding: 24px 16px;
    text-align: center;
    color: var(--color-text-tertiary);
    font-size: 14px;
  }

  .search-section-title {
    padding: 6px 16px 2px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-tertiary);
  }

  .search-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .search-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 16px;
    text-decoration: none;
    color: var(--color-text);
    transition: background 0.1s;
  }

  .search-item:hover {
    background: var(--color-bg);
  }

  .search-item-main {
    font-size: 14px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .search-item-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: var(--color-text-secondary);
  }

  .search-item-headline {
    font-size: 13px;
    line-height: 1.5;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  :global(.search-item-headline mark) {
    background: rgba(var(--color-accent-rgb, 99, 102, 241), 0.2);
    color: inherit;
    border-radius: 2px;
    padding: 0 2px;
  }

  .search-badge {
    display: inline-flex;
    align-items: center;
    padding: 1px 6px;
    border-radius: 9999px;
    font-size: 11px;
    font-weight: 500;
  }

  .search-badge--active {
    background: #dcfce7;
    color: #166534;
  }

  .search-badge--pending {
    background: #fef9c3;
    color: #713f12;
  }

  .search-badge--closed {
    background: #f3f4f6;
    color: #374151;
  }

  .search-badge--spam {
    background: #fee2e2;
    color: #991b1b;
  }
</style>
