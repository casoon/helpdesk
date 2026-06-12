<script lang="ts">
  interface Agent {
    id: string;
    firstName: string;
    lastName: string;
  }

  interface Props {
    conversationId: string;
    status: string;
    assignee: Agent | null;
    agents: Agent[];
    compact?: boolean;
  }

  let { conversationId, status, assignee, agents, compact = false }: Props = $props();

  let currentStatus = $state(status);
  let saving = $state(false);
  let error = $state<string | null>(null);

  function getToken(): string | null {
    const match = document.cookie.match(/(?:^|;\s*)token=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  async function patch(payload: Record<string, unknown>) {
    if (saving) return;
    saving = true;
    error = null;

    const token = getToken();
    try {
      const res = await fetch(`/api/conversations/${conversationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Request failed');
      window.location.reload();
    } catch {
      error = 'Failed to update conversation';
      saving = false;
    }
  }

  const isClosed = $derived(currentStatus === 'closed' || currentStatus === 'spam');

  const statusBadgeStyle = $derived(() => {
    const map: Record<string, string> = {
      active:  'var(--color-success)',
      pending: 'var(--color-warning)',
      closed:  'var(--color-text-tertiary)',
      spam:    'var(--color-danger)',
    };
    return map[currentStatus] ?? 'var(--color-text-tertiary)';
  });
</script>

<div class="flex flex-col gap-3">
  <!-- Status badge + action buttons -->
  <div class="flex flex-wrap items-center gap-1.5">
    <!-- Current status badge -->
    <span
      class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border"
      style={`color: ${statusBadgeStyle()}; border-color: ${statusBadgeStyle()}33; background: ${statusBadgeStyle()}11;`}
    >
      <span class="h-1.5 w-1.5 rounded-full" style={`background: ${statusBadgeStyle()};`}></span>
      {currentStatus}
    </span>

    {#if !isClosed}
      <!-- Close button -->
      <button
        type="button"
        onclick={() => patch({ status: 'closed' })}
        disabled={saving}
        class="flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors hover:bg-green-50 disabled:opacity-50"
        style="border-color: var(--color-success); color: var(--color-success);"
        title="Close conversation"
      >
        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
        Close
      </button>

      <!-- Spam button -->
      <button
        type="button"
        onclick={() => patch({ status: 'spam' })}
        disabled={saving}
        class="flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors hover:bg-red-50 disabled:opacity-50"
        style="border-color: var(--color-danger); color: var(--color-danger);"
        title="Mark as spam"
      >
        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
          <circle cx="12" cy="12" r="9" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M18.364 5.636 5.636 18.364" />
        </svg>
        Spam
      </button>
    {:else}
      <!-- Reopen button -->
      <button
        type="button"
        onclick={() => patch({ status: 'active' })}
        disabled={saving}
        class="flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors hover:bg-blue-50 disabled:opacity-50"
        style="border-color: var(--color-accent); color: var(--color-accent);"
        title="Reopen conversation"
      >
        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
        </svg>
        Reopen
      </button>
    {/if}
  </div>

  <!-- Assignee select — hidden in compact mode -->
  {#if !compact}
    <div>
      <p class="text-xs font-semibold uppercase tracking-wide mb-1.5" style="color: var(--color-text-tertiary);">Assignee</p>
      <select
        onchange={(e) => {
          const val = (e.currentTarget as HTMLSelectElement).value;
          patch({ assigneeId: val || null });
        }}
        disabled={saving}
        class="w-full rounded-md border px-2 py-1.5 text-sm outline-none transition-colors focus:ring-2 disabled:opacity-50"
        style="border-color: var(--color-border); background: var(--color-bg); color: var(--color-text-primary); --tw-ring-color: var(--color-accent);"
      >
        <option value="" selected={!assignee}>Unassigned</option>
        {#each agents as agent (agent.id)}
          <option value={agent.id} selected={assignee?.id === agent.id}>
            {agent.firstName} {agent.lastName}
          </option>
        {/each}
      </select>
    </div>
  {/if}

  {#if error}
    <p class="text-xs" style="color: var(--color-danger);">{error}</p>
  {/if}
</div>
