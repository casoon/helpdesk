<script lang="ts">
  import BulkActions from './BulkActions.svelte';

  interface ConversationItem {
    id: string;
    subject: string;
    status: string;
    preview: string | null;
    lastReplyAt: string | null;
    hasAttachments: boolean;
    customer: { email: string; firstName: string | null; lastName: string | null };
    assignee: { firstName: string; lastName: string } | null;
  }

  interface Props {
    conversations: ConversationItem[];
  }

  let { conversations }: Props = $props();

  let selectedIds = $state<string[]>([]);

  function toggleSelect(id: string, checked: boolean) {
    if (checked) {
      selectedIds = [...selectedIds, id];
    } else {
      selectedIds = selectedIds.filter((s) => s !== id);
    }
  }

  function statusColor(status: string): string {
    const map: Record<string, string> = {
      active: 'var(--color-status-active)',
      pending: 'var(--color-status-pending)',
      closed: 'var(--color-status-closed)',
      spam: 'var(--color-status-spam)',
    };
    return map[status] ?? 'var(--color-text-tertiary)';
  }

  function displayName(c: ConversationItem): string {
    const { firstName, lastName, email } = c.customer;
    if (firstName || lastName) return [firstName, lastName].filter(Boolean).join(' ');
    return email;
  }

  function relativeTime(iso: string | null): string {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60_000);
    if (min < 60) return `${min}m`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h`;
    const d = Math.floor(hr / 24);
    if (d < 30) return `${d}d`;
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
</script>

<ul>
  {#each conversations as conv}
    <li class="relative">
      <label
        class="group flex items-start gap-3 border-b px-4 py-3 transition-colors hover:bg-white cursor-pointer"
        style="border-color: var(--color-border);"
      >
        <!-- Checkbox -->
        <input
          type="checkbox"
          class="mt-1.5 h-3.5 w-3.5 shrink-0 rounded accent-[var(--color-accent)]"
          checked={selectedIds.includes(conv.id)}
          onchange={(e) => toggleSelect(conv.id, (e.target as HTMLInputElement).checked)}
          onclick={(e) => e.stopPropagation()}
        />

        <!-- Avatar -->
        <div
          class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
          style="background: var(--color-accent);"
        >
          {displayName(conv).slice(0, 1).toUpperCase()}
        </div>

        <!-- Content — link wraps the main area -->
        <a
          href={`/conversations/${conv.id}`}
          class="min-w-0 flex-1 flex items-start gap-0"
          onclick={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest('input[type="checkbox"]')) e.preventDefault();
          }}
        >
          <div class="min-w-0 flex-1">
            <div class="flex items-baseline gap-2">
              <span class="truncate text-sm font-medium" style="color: var(--color-text-primary);">
                {displayName(conv)}
              </span>
              <span class="shrink-0 text-xs tabular-nums" style="color: var(--color-text-tertiary);">
                {relativeTime(conv.lastReplyAt)}
              </span>
            </div>

            <p class="mt-0.5 truncate text-sm" style="color: var(--color-text-primary);">
              {conv.subject}
            </p>

            <p class="mt-0.5 truncate text-xs" style="color: var(--color-text-tertiary);">
              {conv.preview}
            </p>
          </div>

          <!-- Right meta -->
          <div class="flex shrink-0 flex-col items-end gap-1.5 ml-2">
            <span
              class="mt-1.5 h-1.5 w-1.5 rounded-full"
              style={`background: ${statusColor(conv.status)};`}
            ></span>

            {#if conv.hasAttachments}
              <svg class="h-3 w-3" style="color: var(--color-text-tertiary);" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
              </svg>
            {/if}

            {#if conv.assignee}
              <div
                class="flex h-4 w-4 items-center justify-center rounded-full text-xs font-semibold text-white"
                style="background: var(--color-text-tertiary); font-size: 9px;"
                title={`${conv.assignee.firstName} ${conv.assignee.lastName}`}
              >
                {conv.assignee.firstName?.[0]}
              </div>
            {/if}
          </div>
        </a>
      </label>
    </li>
  {/each}
</ul>

<BulkActions {selectedIds} onClear={() => { selectedIds = []; }} />
