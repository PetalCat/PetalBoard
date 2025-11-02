<script lang="ts">
  import { formatDate, remainingCount } from '$lib/utils/format';

  type Slot = {
    id: string;
    label: string;
    description: string | null;
    quantity: number;
    taken: number;
  };

  type Signup = {
    id: string;
    name: string;
    email: string | null;
    slotId: string;
    slotLabel?: string;
  };

  type EventDetails = {
    title: string;
    description: string | null;
    date: string;
    location: string | null;
    publicCode: string;
  };

  let lookupId = '';
  let lookupPin = '';
  let currentPin = '';

  let loading = false;
  let signup: Signup | null = null;
  let eventData: EventDetails | null = null;
  let slots: Slot[] = [];
  let message: string | null = null;
  let error: string | null = null;
  let editName = '';
  let editEmail = '';
  let editSlot = '';

  async function request<T>(url: string, body: Record<string, unknown>) {
    loading = true;
    message = null;
    error = null;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? 'Something went wrong.');
      }

      return data as T;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unable to complete that action right now.';
      return null;
    } finally {
      loading = false;
    }
  }

  async function handleLookup(event: SubmitEvent) {
    event.preventDefault();
    const result = await request<{ signup: Signup; event: EventDetails; slots: Slot[] }>(
      '/api/signups/lookup',
      { signupId: lookupId.trim(), pin: lookupPin.trim() }
    );

    if (result) {
      signup = result.signup;
      eventData = result.event;
      slots = result.slots;
      editName = result.signup.name;
      editEmail = result.signup.email ?? '';
      editSlot = result.signup.slotId;
      currentPin = lookupPin.trim();
      message = 'Signup found! You can make changes below.';
    }
  }

  async function handleUpdate(event: SubmitEvent) {
    event.preventDefault();
    if (!signup) return;

    const result = await request<{
      success: boolean;
      signup: Signup;
      event: EventDetails;
      slots: Slot[];
    }>('/api/signups/update', {
      signupId: signup.id,
      pin: currentPin,
      name: editName,
      email: editEmail,
      slotId: editSlot
    });

    if (result) {
      signup = result.signup;
      eventData = result.event;
      slots = result.slots;
      editName = result.signup.name;
      editEmail = result.signup.email ?? '';
      editSlot = result.signup.slotId;
      message = 'Signup updated.';
    }
  }

  async function handleCancel() {
    if (!signup) return;
    if (!confirm('Remove this signup? This cannot be undone.')) return;

    const result = await request<{ success: boolean; slots: Slot[]; event: EventDetails }>(
      '/api/signups/cancel',
      { signupId: signup.id, pin: currentPin }
    );

    if (result?.success) {
      message = 'Signup removed. Feel free to reserve another slot anytime!';
      signup = null;
      slots = result.slots;
      eventData = result.event ?? eventData;
      editName = '';
      editEmail = '';
      editSlot = '';
    }
  }
</script>

<section class="lookup-card">
  <h1>Manage your signup</h1>
  <p class="lead">Enter the signup ID and PIN you chose when you reserved a slot.</p>

  <form class="lookup-form" on:submit={handleLookup}>
    <label>
      <span>Signup ID</span>
      <input bind:value={lookupId} required placeholder="cuid123..." />
    </label>

    <label>
      <span>PIN</span>
      <input bind:value={lookupPin} inputmode="numeric" minlength="4" maxlength="6" required />
    </label>

    <button type="submit" disabled={loading}>Find my signup</button>
  </form>

  {#if error}
    <p class="error-banner">{error}</p>
  {/if}

  {#if message}
    <p class="toast">{message}</p>
  {/if}
</section>

{#if signup && eventData}
  <section class="manage-card">
    <header>
      <div>
        <h2>{eventData.title}</h2>
        <p class="meta">{formatDate(eventData.date)}</p>
        {#if eventData.location}
          <p class="meta">📍 {eventData.location}</p>
        {/if}
      </div>
      <a class="link" href={`/event/${eventData.publicCode}`}>View event</a>
    </header>

    <form class="update-form" on:submit={handleUpdate}>
      <div class="field">
        <label for="name">Your name</label>
        <input id="name" name="name" required bind:value={editName} />
      </div>

      <div class="field">
        <label for="email">Email (optional)</label>
        <input id="email" name="email" type="email" bind:value={editEmail} />
      </div>

      <div class="field">
        <label for="slot">Slot</label>
        <select id="slot" name="slotId" bind:value={editSlot}>
          {#each slots as slot}
            <option value={slot.id} disabled={remainingCount(slot.quantity, slot.taken) === 0 && slot.id !== editSlot}>
              {slot.label} ({remainingCount(slot.quantity, slot.taken)} left)
            </option>
          {/each}
        </select>
      </div>

      <button type="submit" disabled={loading}>Save changes</button>
    </form>

    <button type="button" class="ghost" on:click={handleCancel} disabled={loading}>
      Cancel signup
    </button>
  </section>
{/if}

<style>
  .lookup-card,
  .manage-card {
    background: white;
    border-radius: 20px;
    padding: clamp(1.5rem, 4vw, 2.5rem);
    box-shadow: 0 18px 36px rgba(59, 33, 110, 0.1);
    display: grid;
    gap: 1.25rem;
    max-width: 640px;
    margin-top: 2rem;
  }

  h1 {
    margin-bottom: 0.25rem;
  }

  .lead {
    color: rgba(42, 23, 72, 0.75);
    margin-top: 0;
  }

  label span {
    display: block;
    font-weight: 500;
    margin-bottom: 0.3rem;
  }

  input,
  select {
    border-radius: 12px;
    border: 1px solid rgba(123, 95, 250, 0.25);
    padding: 0.75rem 1rem;
    font: inherit;
    width: 100%;
  }

  input:focus,
  select:focus {
    outline: none;
    border-color: #7c5dfa;
    box-shadow: 0 0 0 3px rgba(124, 93, 250, 0.18);
  }

  button {
    align-self: start;
    padding: 0.8rem 1.75rem;
    border-radius: 999px;
    border: none;
    background: linear-gradient(135deg, #7c5dfa, #9b6bff);
    color: white;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 18px 30px rgba(95, 61, 170, 0.25);
  }

  button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    box-shadow: none;
    transform: none;
  }

  button.ghost {
    background: transparent;
    color: #7a64c9;
    box-shadow: none;
    padding: 0.5rem 0;
  }

  button.ghost:hover {
    text-decoration: underline;
  }

  .lookup-form {
    display: grid;
    gap: 1rem;
  }

  .update-form {
    display: grid;
    gap: 1rem;
  }

  .field label {
    font-weight: 500;
    margin-bottom: 0.3rem;
  }

  .field {
    display: grid;
  }

  .error-banner {
    background: rgba(194, 59, 75, 0.12);
    color: #781728;
    padding: 0.75rem 1rem;
    border-radius: 12px;
  }

  .toast {
    background: rgba(120, 94, 245, 0.12);
    color: #4a2a86;
    padding: 0.75rem 1rem;
    border-radius: 12px;
  }

  .manage-card header {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: flex-start;
  }

  .meta {
    margin: 0.25rem 0;
    color: rgba(42, 23, 72, 0.7);
  }

  .link {
    color: #5533a5;
    text-decoration: none;
    font-weight: 600;
  }

  .link:hover {
    text-decoration: underline;
  }
</style>
