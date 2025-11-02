<script lang="ts">
  import { formatDate, remainingCount } from '$lib/utils/format';
  import type { ActionData, PageData } from './$types';

  const { data, form } = $props<{ data: PageData; form: ActionData | null }>();
  const event = data.event;
  type SlotSummary = PageData['event']['slots'][number];

  const errors = $derived<Record<string, string[]>>((form?.errors ?? {}) as Record<string, string[]>);
  const values = $derived<Record<string, string>>((form?.values ?? {}) as Record<string, string>);
  const message = $derived<string | null>(form?.message ?? null);
  const success = $derived(form?.success ? form.signup : null);

  const firstAvailable = $derived(() => {
    const available = event.slots.find((slot: SlotSummary) => remainingCount(slot.quantity, slot.taken) > 0);
    return available?.id ?? '';
  });

  const fullyBooked = $derived(
    event.slots.every((slot: SlotSummary) => remainingCount(slot.quantity, slot.taken) === 0)
  );
</script>

<article class="event-header">
  <h1>{event.title}</h1>
  <p class="meta">{formatDate(event.date)}</p>
  {#if event.location}
    <p class="meta">📍 {event.location}</p>
  {/if}
  {#if event.description}
    <p class="description">{event.description}</p>
  {/if}
</article>

<section class="layout">
  <div class="slots">
    <h2>Bring an item</h2>
    <div class="slot-grid">
      {#each event.slots as slot}
        {#key slot.id}
          <div class={`slot-card ${remainingCount(slot.quantity, slot.taken) === 0 ? 'full' : ''}`}>
            <div class="slot-heading">
              <h3>{slot.label}</h3>
              <span class="badge">
                {#if remainingCount(slot.quantity, slot.taken) === 0}
                  Full
                {:else}
                  {remainingCount(slot.quantity, slot.taken)} left
                {/if}
              </span>
            </div>
            {#if slot.description}
              <p>{slot.description}</p>
            {/if}
            <p class="quantity">{slot.taken} of {slot.quantity} claimed</p>
          </div>
        {/key}
      {/each}
    </div>
  </div>

  <form method="POST" action="?/signup" class="signup-form">
    <h2>Reserve a slot</h2>
    <p class="hint">
      Choose the item you'll bring, add your details, and lock it with a 4-6 digit PIN. We'll show a
      signup ID after you save.
    </p>

    {#if success}
      <div class="success">
        <h3>You're all set!</h3>
        <p>Signup ID: <strong>{success.id}</strong></p>
        <p>
          Save your PIN with this ID to edit or cancel later. We've reserved the
          <strong>{success.slotLabel}</strong> slot for you.
        </p>
      </div>
    {/if}

    {#if message}
      <p class="error-banner">{message}</p>
    {/if}

    {#if fullyBooked}
      <p class="full-note">Every slot is taken right now. Check back later or contact the host.</p>
    {/if}

    <label>
      <span>Item slot</span>
      <select name="slotId" required disabled={fullyBooked}>
        <option value="" disabled selected={!values.slotId && !success && !firstAvailable}>
          Select an item
        </option>
        {#each event.slots as slot}
          <option
            value={slot.id}
            disabled={remainingCount(slot.quantity, slot.taken) === 0}
            selected={values.slotId === slot.id || (!values.slotId && !success && slot.id === firstAvailable)}
          >
            {slot.label} ({remainingCount(slot.quantity, slot.taken)} left)
          </option>
        {/each}
      </select>
      {#if errors.slotId}
        <small>{errors.slotId[0]}</small>
      {/if}
    </label>

    <label>
      <span>Your name</span>
      <input name="name" required value={values.name ?? ''} />
      {#if errors.name}
        <small>{errors.name[0]}</small>
      {/if}
    </label>

    <label>
      <span>Email (optional)</span>
      <input type="email" name="email" placeholder="you@example.com" value={values.email ?? ''} />
      {#if errors.email}
        <small>{errors.email[0]}</small>
      {/if}
    </label>

    <label>
      <span>Choose a PIN</span>
      <input
        name="pin"
        inputmode="numeric"
        pattern={'[0-9]{4,6}'}
        minlength={4}
        maxlength={6}
        required
        value={values.pin ?? ''}
      />
      <small>Use 4-6 digits. You'll need this to edit or cancel.</small>
      {#if errors.pin}
        <small>{errors.pin[0]}</small>
      {/if}
    </label>

    <button type="submit" disabled={fullyBooked}>Confirm signup</button>
  </form>
</section>

<style>
  .event-header {
    background: white;
    border-radius: 20px;
    padding: clamp(1.5rem, 4vw, 2.5rem);
    box-shadow: 0 18px 36px rgba(59, 33, 110, 0.1);
    margin-bottom: 2.5rem;
  }

  .meta {
    color: rgba(42, 23, 72, 0.7);
    margin: 0.25rem 0;
  }

  .description {
    margin-top: 1rem;
    color: rgba(42, 23, 72, 0.8);
  }

  .layout {
    display: grid;
    gap: 2.5rem;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    align-items: start;
  }

  .slot-grid {
    display: grid;
    gap: 1.25rem;
  }

  .slot-card {
    background: white;
    border-radius: 18px;
    padding: 1.5rem;
    box-shadow: 0 16px 30px rgba(66, 32, 121, 0.08);
    border: 1px solid rgba(124, 93, 250, 0.12);
  }

  .slot-card.full {
    opacity: 0.55;
  }

  .slot-heading {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: baseline;
  }

  .badge {
    background: rgba(124, 93, 250, 0.14);
    color: #5533a5;
    border-radius: 999px;
    padding: 0.25rem 0.75rem;
    font-size: 0.85rem;
    font-weight: 600;
    white-space: nowrap;
  }

  .slot-card.full .badge {
    background: rgba(124, 93, 250, 0.1);
    color: rgba(60, 35, 110, 0.7);
  }

  .quantity {
    font-size: 0.9rem;
    color: rgba(42, 23, 72, 0.7);
  }

  .signup-form {
    background: white;
    border-radius: 18px;
    padding: clamp(1.5rem, 4vw, 2.25rem);
    box-shadow: 0 18px 36px rgba(59, 33, 110, 0.1);
    display: grid;
    gap: 1.25rem;
  }

  .hint {
    color: rgba(42, 23, 72, 0.7);
    margin-top: -0.5rem;
  }

  .full-note {
    background: rgba(124, 93, 250, 0.1);
    border-radius: 12px;
    padding: 0.75rem 1rem;
    color: #4a2a86;
    font-size: 0.95rem;
  }

  label {
    display: grid;
    gap: 0.5rem;
    font-weight: 500;
  }

  select,
  input {
    border-radius: 12px;
    border: 1px solid rgba(123, 95, 250, 0.25);
    padding: 0.75rem 1rem;
    font: inherit;
  }

  select:focus,
  input:focus {
    outline: none;
    border-color: #7c5dfa;
    box-shadow: 0 0 0 3px rgba(124, 93, 250, 0.18);
  }

  button {
    justify-self: start;
    padding: 0.85rem 1.75rem;
    border-radius: 999px;
    border: none;
    background: linear-gradient(135deg, #7c5dfa, #9b6bff);
    color: white;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 18px 30px rgba(95, 61, 170, 0.25);
  }

  button:hover {
    transform: translateY(-1px);
  }

  button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  select:disabled {
    opacity: 0.7;
  }

  small {
    color: #c23b4b;
  }

  .error-banner {
    background: rgba(194, 59, 75, 0.12);
    border-radius: 16px;
    padding: 0.75rem 1rem;
    color: #781728;
  }

  .success {
    background: rgba(120, 94, 245, 0.12);
    border-radius: 16px;
    padding: 1rem 1.25rem;
  }

  @media (max-width: 640px) {
    .slot-heading {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>
