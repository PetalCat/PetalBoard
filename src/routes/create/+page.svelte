<script lang="ts">
  import type { ActionData } from './$types';
  import AddressInput from '$lib/components/AddressInput.svelte';

  const { form } = $props<{ form: ActionData | null }>();
  const errors = $derived<Record<string, string[]>>((form?.errors ?? {}) as Record<string, string[]>);
  const values = $derived<Record<string, string>>((form?.values ?? {}) as Record<string, string>);
  const message = $derived<string | null>(form?.message ?? null);

  let locationValue = $state('');
  
  // Update location value when form values change
  $effect(() => {
    if (values.location) {
      locationValue = values.location;
    }
  });
</script>

<h1 class="mb-2">Create an event</h1>
<p class="text-dark-900/75 max-w-[60ch] mb-8">
  Set up your event, then share the public link with your guests. You can always
  come back to update slots or details from the manage link.
</p>

{#if message}
  <p class="bg-red-500/12 rounded-2xl px-4 py-3 text-red-900 max-w-[620px] mb-6">{message}</p>
{/if}

<form method="POST" class="grid gap-6 bg-white p-6 lg:p-10 rounded-[20px] shadow-card max-w-[620px]">
  <label class="grid gap-2 font-medium text-dark-800">
    <span>Event title</span>
    <input name="title" required value={values.title ?? ''} class="rounded-xl border border-primary-700/25 px-4 py-3 font-inherit bg-white/90 focus:outline-none focus:border-primary-700 focus:ring-4 focus:ring-primary-700/18" />
    {#if errors.title}
      <small class="text-red-600">{errors.title[0]}</small>
    {/if}
  </label>

  <label class="grid gap-2 font-medium text-dark-800">
    <span>Date &amp; time</span>
    <input type="datetime-local" name="date" required value={values.date ?? ''} class="rounded-xl border border-primary-700/25 px-4 py-3 font-inherit bg-white/90 focus:outline-none focus:border-primary-700 focus:ring-4 focus:ring-primary-700/18" />
    {#if errors.date}
      <small class="text-red-600">{errors.date[0]}</small>
    {/if}
  </label>

  <label class="grid gap-2 font-medium text-dark-800">
    <span>End time (optional)</span>
    <input type="datetime-local" name="endDate" value={values.endDate ?? ''} class="rounded-xl border border-primary-700/25 px-4 py-3 font-inherit bg-white/90 focus:outline-none focus:border-primary-700 focus:ring-4 focus:ring-primary-700/18" />
    {#if errors.endDate}
      <small class="text-red-600">{errors.endDate[0]}</small>
    {/if}
  </label>

  <label class="grid gap-2 font-medium text-dark-800">
    <span>RSVP Limit (optional)</span>
    <input type="number" name="rsvpLimit" min="1" placeholder="No limit" value={values.rsvpLimit ?? ''} class="rounded-xl border border-primary-700/25 px-4 py-3 font-inherit bg-white/90 focus:outline-none focus:border-primary-700 focus:ring-4 focus:ring-primary-700/18" />
    {#if errors.rsvpLimit}
      <small class="text-red-600">{errors.rsvpLimit[0]}</small>
    {/if}
  </label>

  <label class="grid gap-2 font-medium text-dark-800">
    <span>Location</span>
    <AddressInput bind:value={locationValue} error={errors.location?.[0]} />
  </label>

  <label class="grid gap-2 font-medium text-dark-800">
    <span>Description</span>
    <textarea name="description" rows="4" class="rounded-xl border border-primary-700/25 px-4 py-3 font-inherit bg-white/90 resize-y focus:outline-none focus:border-primary-700 focus:ring-4 focus:ring-primary-700/18">{values.description ?? ''}</textarea>
    {#if errors.description}
      <small class="text-red-600">{errors.description[0]}</small>
    {/if}
  </label>

  <button type="submit" class="justify-self-start px-7 py-3.5 rounded-full border-none bg-primary-gradient text-white font-semibold cursor-pointer shadow-button hover:-translate-y-px">Create event</button>
</form>
