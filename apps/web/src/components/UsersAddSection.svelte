<script lang="ts">
  import AddUserForm from './AddUserForm.svelte';

  let visible = $state(false);

  function toggle() {
    visible = !visible;
  }
</script>

<div class="flex justify-end mb-4">
  <button
    onclick={toggle}
    class="rounded-md px-3 py-1.5 text-sm font-medium text-white transition-colors hover:opacity-90"
    style="background: var(--color-accent);"
  >
    {visible ? 'Cancel' : 'Add User'}
  </button>
</div>
<AddUserForm {visible} />
