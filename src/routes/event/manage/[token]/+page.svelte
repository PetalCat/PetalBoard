<script lang="ts">
  import { formatDate, formatShortDate } from '$lib/utils/format';
  import type { ActionData, PageData } from './$types';

  let { data, form } = $props<{ data: PageData; form: ActionData | null }>();

  const eventErrors = $derived<Record<string, string[]>>(
    (form?.type === 'updateEvent' && form.errors ? form.errors : {}) as Record<string, string[]>
  );

  const addSlotErrors = $derived<Record<string, string[]>>(
    (form?.type === 'addSlot' && form.errors ? form.errors : {}) as Record<string, string[]>
  );

  const slotErrors = $derived<Record<string, Record<string, string[]>>>(
    (() => {
      if (form?.type === 'updateSlot' && form.errors && form.values?.slotId) {
        return { [form.values.slotId]: form.errors as Record<string, string[]> };
      }
      return {};
    })()
  );

  const eventValues = $derived<Record<string, string>>(
    (form?.type === 'updateEvent' && form.values ? form.values : {}) as Record<string, string>
  );

  const addSlotValues = $derived<Record<string, string>>(
    (form?.type === 'addSlot' && form.values ? form.values : {}) as Record<string, string>
  );

  const message = $derived<string | null>(form?.message ?? null);

  const successMessage = $derived<string | null>(
    (() => {
      if (!form?.success) return null;
      switch (form.type) {
        case 'updateEvent':
          return 'Event details updated';
        case 'addSlot':
          return 'Slot added';
        case 'updateSlot':
          return 'Slot updated';
        case 'deleteSlot':
          return 'Slot removed';
        case 'deleteSignup':
          return 'Signup removed';
        default:
          return null;
      }
    })()
  );

  const event = data.event;
  const signups = data.signups;

  const toLocalInput = (value: string | Date) => {
    const parsed = typeof value === 'string' ? new Date(value) : value;
    const offsetMinutes = parsed.getTimezoneOffset();
    const local = new Date(parsed.getTime() - offsetMinutes * 60 * 1000);
    return local.toISOString().slice(0, 16);
  };
</script>

<header class="manage-header">
  <div>
    <h1>{event.title}</h1>
    <p class="meta">{formatDate(event.date)}</p>
    {#if event.location}
      <p class="meta">📍 {event.location}</p>
    {/if}
  </div>
  <div class="share">
    <p class="label">Public link</p>
    <a href={`/event/${event.publicCode}`}>/event/{event.publicCode}</a>
  </div>
</header>

{#if successMessage}
  <p class="toast">{successMessage}</p>
{/if}

{#if message}
  <p class="error-banner">{message}</p>
{/if}

<section class="grid">
  <form method="POST" action="?/updateEvent" class="panel">
    <h2>Edit event</h2>
    <label>
      <span>Title</span>
      <input name="title" required value={eventValues.title ?? event.title} />
      {#if eventErrors.title}
        <small>{eventErrors.title[0]}</small>
      {/if}
    </label>

    <label>
      <span>Date &amp; time</span>
      <input
        type="datetime-local"
        name="date"
        required
        value={eventValues.date ?? toLocalInput(event.date)}
      />
      {#if eventErrors.date}
        <small>{eventErrors.date[0]}</small>
      {/if}
    </label>

    <label>
      <span>Location</span>
      <input name="location" value={eventValues.location ?? event.location ?? ''} />
      {#if eventErrors.location}
        <small>{eventErrors.location[0]}</small>
      {/if}
    </label>

    <label>
      <span>Description</span>
      <textarea name="description" rows="4">{eventValues.description ?? event.description ?? ''}</textarea>
      {#if eventErrors.description}
        <small>{eventErrors.description[0]}</small>
      {/if}
    </label>

    <button type="submit">Save changes</button>
  </form>

  <div class="panel">
    <h2>Add a slot</h2>
    <form method="POST" action="?/addSlot" class="slot-form">
      <label>
        <span>Label</span>
        <input name="label" required value={addSlotValues.label ?? ''} />
        {#if addSlotErrors.label}
          <small>{addSlotErrors.label[0]}</small>
        {/if}
      </label>

      <label>
        <span>Quantity needed</span>
        <input name="quantity" inputmode="numeric" required value={addSlotValues.quantity ?? '1'} />
        {#if addSlotErrors.quantity}
          <small>{addSlotErrors.quantity[0]}</small>
        {/if}
      </label>

      <label>
        <span>Description</span>
        <textarea name="description" rows="3">{addSlotValues.description ?? ''}</textarea>
        {#if addSlotErrors.description}
          <small>{addSlotErrors.description[0]}</small>
        {/if}
      </label>

      <button type="submit">Add slot</button>
    </form>
  </div>
</section>

<section class="slots">
  <h2>Slots</h2>
  {#if event.slots.length === 0}
    <p class="empty">No slots yet. Add your first item above.</p>
  {:else}
    <div class="slot-list">
      {#each event.slots as slot}
        {#key slot.id}
          <article class="slot-card">
            <header>
              <div>
                <h3>{slot.label}</h3>
                <p>{slot.taken} of {slot.quantity} claimed</p>
              </div>
              <form method="POST" action="?/deleteSlot">
                <input type="hidden" name="slotId" value={slot.id} />
                <button type="submit" class="ghost">Delete</button>
              </form>
            </header>

            <form method="POST" action="?/updateSlot" class="slot-edit">
              <input type="hidden" name="slotId" value={slot.id} />

              <label>
                <span>Label</span>
                <input name="label" required value={slot.label} />
                {#if slotErrors[slot.id]?.label}
                  <small>{slotErrors[slot.id].label[0]}</small>
                {/if}
              </label>

              <label>
                <span>Quantity</span>
                <input name="quantity" inputmode="numeric" required value={slot.quantity} />
                {#if slotErrors[slot.id]?.quantity}
                  <small>{slotErrors[slot.id].quantity[0]}</small>
                {/if}
              </label>

              <label>
                <span>Description</span>
                <textarea name="description" rows="3">{slot.description ?? ''}</textarea>
                {#if slotErrors[slot.id]?.description}
                  <small>{slotErrors[slot.id].description[0]}</small>
                {/if}
              </label>

              <button type="submit">Update slot</button>
            </form>
          </article>
        {/key}
      {/each}
    </div>
  {/if}
</section>

<section class="signups">
  <h2>Signups</h2>
  {#if signups.length === 0}
    <p class="empty">No one has signed up yet. Share your public link!</p>
  {:else}
    <div class="signup-table">
      <div class="signup-header">
        <span>Name</span>
        <span>Slot</span>
        <span>Email</span>
        <span>When</span>
        <span></span>
      </div>
      {#each signups as signup}
        <div class="signup-row">
          <span>{signup.name}</span>
          <span>{signup.slotLabel}</span>
          <span>{signup.email ?? '—'}</span>
          <span>{formatShortDate(signup.createdAt)}</span>
          <form method="POST" action="?/deleteSignup">
            <input type="hidden" name="signupId" value={signup.id} />
            <button type="submit" class="ghost">Remove</button>
          </form>
        </div>
      {/each}
    </div>
  {/if}
</section>

<style>
  .manage-header {
    display: flex;
    justify-content: space-between;
    gap: 2rem;
    align-items: flex-start;
    margin-bottom: 2.5rem;
  }

  .meta {
    margin: 0.25rem 0;
    color: rgba(42, 23, 72, 0.7);
  }

  .share {
    background: white;
    border-radius: 16px;
    padding: 1rem 1.25rem;
    box-shadow: 0 16px 32px rgba(59, 33, 110, 0.08);
  }

  .share .label {
    font-weight: 600;
    margin-bottom: 0.35rem;
  }

  .share a {
    color: #5533a5;
    text-decoration: none;
    word-break: break-all;
  }

  .toast {
    background: rgba(120, 94, 245, 0.12);
    color: #4a2a86;
    padding: 0.75rem 1rem;
    border-radius: 12px;
  }

  .error-banner {
    background: rgba(194, 59, 75, 0.12);
    color: #781728;
    padding: 0.75rem 1rem;
    border-radius: 12px;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 2rem;
    margin-top: 2rem;
  }

  .panel {
    background: white;
    border-radius: 20px;
    padding: clamp(1.5rem, 4vw, 2.5rem);
    box-shadow: 0 18px 36px rgba(59, 33, 110, 0.1);
    display: grid;
    gap: 1.25rem;
  }

  label {
    display: grid;
    gap: 0.5rem;
    font-weight: 500;
  }

  input,
  textarea {
    border-radius: 12px;
    border: 1px solid rgba(123, 95, 250, 0.25);
    padding: 0.75rem 1rem;
    font: inherit;
  }

  input:focus,
  textarea:focus {
    outline: none;
    border-color: #7c5dfa;
    box-shadow: 0 0 0 3px rgba(124, 93, 250, 0.18);
  }

  textarea {
    resize: vertical;
  }

  button {
    align-self: start;
    padding: 0.7rem 1.5rem;
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

  button.ghost {
    background: transparent;
    box-shadow: none;
    color: #7a64c9;
    padding: 0.25rem 0.75rem;
  }

  button.ghost:hover {
    transform: none;
    text-decoration: underline;
  }

  small {
    color: #c23b4b;
  }

  .slot-form {
    display: grid;
    gap: 1rem;
  }

  .slots {
    margin-top: 3rem;
    display: grid;
    gap: 1.5rem;
  }

  .empty {
    color: rgba(42, 23, 72, 0.7);
  }

  .slot-list {
    display: grid;
    gap: 1.5rem;
  }

  .slot-card {
    background: white;
    border-radius: 18px;
    padding: clamp(1.25rem, 3vw, 1.75rem);
    box-shadow: 0 18px 36px rgba(59, 33, 110, 0.08);
    display: grid;
    gap: 1rem;
  }

  .slot-card header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
  }

  .slot-edit {
    display: grid;
    gap: 1rem;
  }

  .signups {
    margin-top: 3rem;
    display: grid;
    gap: 1rem;
  }

  .signup-table {
    background: white;
    border-radius: 18px;
    padding: 1rem 1.25rem;
    box-shadow: 0 18px 36px rgba(59, 33, 110, 0.08);
    display: grid;
    gap: 0.75rem;
  }

  .signup-header,
  .signup-row {
    display: grid;
    grid-template-columns: 1.2fr 1fr 1.2fr 0.8fr auto;
    gap: 1rem;
    align-items: center;
  }

  .signup-header {
    font-weight: 600;
    color: rgba(42, 23, 72, 0.7);
  }

  @media (max-width: 840px) {
    .manage-header {
      flex-direction: column;
      align-items: stretch;
    }

    .signup-header,
    .signup-row {
      grid-template-columns: 1fr;
    }

    .signup-row form {
      justify-self: start;
    }
  }
</style>
