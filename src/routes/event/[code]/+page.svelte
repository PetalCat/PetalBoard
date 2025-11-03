<script lang="ts">
  import { formatDate, formatShortDate } from '$lib/utils/format';
  import { enhance } from '$app/forms';
  import type { ActionData, PageData } from './$types';
  import { onMount } from 'svelte';
  import { loadGoogleMaps } from '$lib/utils/googleMaps';
  import { env } from '$env/dynamic/public';
  import SpotifySongSelector from '$lib/components/SpotifySongSelector.svelte';

  const { data, form } = $props<{ data: PageData; form: ActionData | null }>();
  const event = data.event;
  const isOwner = data.isOwner;
  
  // Make rsvps reactive so we can update without reload
  let rsvps = $state(data.rsvps);
  let rsvpCount = $state(data.event.rsvpCount);
  let questionResponseCounts = $state<Record<string, number>>(
    Object.fromEntries(event.questions.map(q => [q.id, q.responseCount]))
  );

  const errors = $derived<Record<string, string[]>>((form?.errors ?? {}) as Record<string, string[]>);
  const values = $derived<Record<string, string>>((form?.values ?? {}) as Record<string, string>);
  const message = $derived<string | null>(form?.message ?? null);
  const success = $derived(form?.success ?? false);
  const formType = $derived(form?.type ?? null);

  // Initialize responses with required question IDs
  const requiredQuestionIds = event.questions.filter((q) => q.required).map((q) => q.id);
  
  let responses = $state<Record<string, string>>({});
  let showRsvpModal = $state(false);
  let showEditModal = $state(false);
  let editingRsvp = $state<any>(null);
  let currentPin = $state<string>('');
  let lastFormType = $state<string | null>(null);
  let editingRsvpId = $state<string>('');
  let pinInput = $state<string>('');
  let pinError = $state<string>('');
  let editingStatus = $state<string>('attending');
  let newRsvpStatus = $state<string>('attending');
  
  // Collapsible sections state
  let showAttending = $state(true);
  let showMaybe = $state(true);
  let showNotAttending = $state(false);
  
  // Map state
  let mapElement = $state<HTMLDivElement>();
  let map: google.maps.Map | null = null;
  let marker: google.maps.marker.AdvancedMarkerElement | null = null;

  // Initialize map if location exists
  onMount(async () => {
    const apiKey = env.PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!event.location || !apiKey || apiKey === 'your-google-maps-api-key') {
      return;
    }

    try {
      await loadGoogleMaps(apiKey);
      await initializeMap();
    } catch (err) {
      console.error('Failed to load map:', err);
    }
  });

  async function initializeMap() {
    if (!event.location || !mapElement) return;

    try {
      // Geocode the address
      const geocoder = new google.maps.Geocoder();
      const result = await geocoder.geocode({ address: event.location });

      if (result.results[0]) {
        const location = result.results[0].geometry.location;

        const { Map } = await google.maps.importLibrary("maps") as google.maps.MapsLibrary;
        const { AdvancedMarkerElement } = await google.maps.importLibrary("marker") as google.maps.MarkerLibrary;

        map = new Map(mapElement, {
          center: location,
          zoom: 15,
          mapId: 'EVENT_MAP_ID',
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          zoomControl: true,
        });

        marker = new AdvancedMarkerElement({
          map: map,
          position: location,
        });
      }
    } catch (err) {
      console.error('Failed to geocode address:', err);
    }
  }

  interface ParsedSpotifyTrack {
    id: string;
    name: string;
    artists: string;
    album: string | null;
    image: string | null;
    spotifyUrl: string | null;
  }

  type RsvpStatus = 'attending' | 'maybe' | 'not_attending';

  interface PlaylistEntry {
    key: string;
    track: ParsedSpotifyTrack;
    contributor: string;
  }

  const statusStyleMap: Record<
    RsvpStatus,
    {
      border: string;
      bg: string;
      badge: string;
      index: string;
      icon: string;
    }
  > = {
    attending: {
      border: 'border-emerald-200',
      bg: 'bg-emerald-50/60',
      badge: 'bg-emerald-500/15 text-emerald-700',
      index: 'text-emerald-600',
      icon: 'text-emerald-500'
    },
    maybe: {
      border: 'border-amber-200',
      bg: 'bg-amber-50/60',
      badge: 'bg-amber-500/20 text-amber-700',
      index: 'text-amber-600',
      icon: 'text-amber-500'
    },
    not_attending: {
      border: 'border-red-200',
      bg: 'bg-red-50/60',
      badge: 'bg-red-500/15 text-red-700',
      index: 'text-red-600',
      icon: 'text-red-500'
    }
  };

  function getStatusStyles(status: RsvpStatus) {
    return statusStyleMap[status] ?? statusStyleMap.attending;
  }

  function buildPlaylistEntries(
    responses: Array<{ name: string; status: string; value: string }>,
    status: RsvpStatus
  ): PlaylistEntry[] {
    if (!responses || responses.length === 0) {
      return [];
    }

    return responses
      .filter((response) => response.status === status)
      .flatMap((response, responseIndex) => {
        const guestName = response.name ?? 'Guest';
        const tracks = parseSpotifyTracks(response.value);

        return tracks.map((track, trackIndex) => ({
          key: `${status}-${guestName}-${track.id}-${responseIndex}-${trackIndex}`,
          track,
          contributor: guestName
        }));
      });
  }

  function handleOverlayKeydown(event: KeyboardEvent, action: () => void) {
    if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
  }

  function parseSpotifyTracks(value: string | null | undefined): ParsedSpotifyTrack[] {
    if (!value) {
      return [];
    }

    try {
      const raw = JSON.parse(value);
      const list = Array.isArray(raw) ? raw : [raw];

      return list
        .map((track) => {
          if (!track || typeof track !== 'object') {
            return null;
          }

          const name = typeof track.name === 'string' ? track.name : 'Unknown track';
          const rawArtists = Array.isArray(track.artists)
            ? track.artists
                .map((artist) =>
                  artist && typeof artist === 'object' && typeof artist.name === 'string' ? artist.name : null
                )
                .filter((artist): artist is string => Boolean(artist))
            : [];
          const album =
            track.album && typeof track.album === 'object' && typeof track.album.name === 'string'
              ? track.album.name
              : null;
          const images =
            track.album && typeof track.album === 'object' && Array.isArray(track.album.images)
              ? track.album.images
              : [];
          const image =
            images?.[1]?.url ??
            images?.[0]?.url ??
            images?.[images.length - 1]?.url ??
            null;
          const spotifyUrl =
            track.external_urls && typeof track.external_urls === 'object' && typeof track.external_urls.spotify === 'string'
              ? track.external_urls.spotify
              : null;
          const id =
            (typeof track.id === 'string' && track.id) ||
            (typeof track.uri === 'string' && track.uri) ||
            `${name}:${rawArtists.join(',')}`;

          return {
            id,
            name,
            artists: rawArtists.join(', ') || 'Unknown artist',
            album,
            image,
            spotifyUrl
          } satisfies ParsedSpotifyTrack;
        })
        .filter((track): track is ParsedSpotifyTrack => Boolean(track));
    } catch (error) {
      console.warn('Failed to parse Spotify response value', error);
      return [];
    }
  }

  // Track form changes and update state accordingly
  $effect(() => {
    const currentFormType = form?.type ?? null;
    
    // Only process if form type changed
    if (currentFormType === lastFormType) return;
    lastFormType = currentFormType;

    // Handle lookup success
    if (form?.type === 'lookupRsvp' && form.success && form.rsvp) {
      editingRsvp = form.rsvp;
      responses = form.rsvp.responses || {};
      editingStatus = form.rsvp.status || 'attending';
      showEditModal = true;
      pinInput = '';
      pinError = '';
      editingRsvpId = '';
    }

    // Handle lookup failure
    if (form?.type === 'lookupRsvp' && !form.success && message) {
      pinError = message;
    }

    // Handle successful update/cancel
    if ((form?.type === 'updateRsvp' || form?.type === 'cancelRsvp') && form.success) {
      editingRsvp = null;
      showEditModal = false;
      currentPin = '';
      responses = {};
      editingStatus = 'attending';
      editingRsvpId = '';
      pinInput = '';
      pinError = '';
    }

    // Handle successful new RSVP
    if (form?.type === 'rsvp' && form.success) {
      showRsvpModal = false;
      newRsvpStatus = 'attending';
      responses = {};
    }
  });

  const rsvpAtLimit = $derived(event.rsvpLimit !== null && rsvpCount >= event.rsvpLimit);

  function openRsvpModal() {
    showRsvpModal = true;
    responses = {};
    newRsvpStatus = 'attending';
  }

  function closeRsvpModal() {
    showRsvpModal = false;
    responses = {};
    newRsvpStatus = 'attending';
  }

  function closeEditModal() {
    editingRsvp = null;
    showEditModal = false;
    currentPin = '';
    responses = {};
    editingStatus = 'attending';
    editingRsvpId = '';
    pinInput = '';
    pinError = '';
  }

  function promptForPin(rsvpId: string) {
    editingRsvpId = rsvpId;
    pinInput = '';
    pinError = '';
  }

  async function submitPinLookup(e: Event) {
    e.preventDefault();
    if (!pinInput || !editingRsvpId) return;

    const formData = new FormData();
    formData.append('rsvpId', editingRsvpId);
    formData.append('pin', pinInput);

    const response = await fetch('?/lookupRsvp', {
      method: 'POST',
      body: formData
    });

    // Let the form action handle the response
    if (response.ok) {
      // The page will reload with the form data
      window.location.reload();
    }
  }
</script>

<svelte:head>
  <title>{event.title} - PetalBoard</title>
</svelte:head>

<div class="max-w-4xl mx-auto px-4 py-8">
  <!-- Event Header with RSVP Button -->
  <article class="card mb-8">
    <div class="flex flex-col md:flex-row md:justify-between md:items-start gap-6">
      <div class="flex-1">
        <h1 class="text-4xl font-bold text-dark-900 mb-4">{event.title}</h1>
        <div class="flex flex-col gap-2 mb-4">
          <p class="text-dark-700 m-0">📅 {formatDate(event.date)}</p>
          {#if event.endDate}
            <p class="text-dark-700 m-0">⏰ Until {formatShortDate(event.endDate)}</p>
          {/if}
          {#if event.location}
            <div class="flex flex-col gap-3">
              <p class="text-dark-700 m-0">📍 {event.location}</p>
              {#if env.PUBLIC_GOOGLE_MAPS_API_KEY && env.PUBLIC_GOOGLE_MAPS_API_KEY !== 'your-google-maps-api-key'}
                <div class="w-full h-[200px] rounded-xl overflow-hidden border-2 border-primary-700 shadow-card" style="border-color: rgba(124, 93, 250, 0.15);" bind:this={mapElement}></div>
              {/if}
            </div>
          {/if}
        </div>
        {#if event.description}
          <p class="my-4 text-dark-800 leading-relaxed">{event.description}</p>
        {/if}
        <div class="flex gap-2 mt-4">
          {#if event.rsvpLimit}
            <span class="badge-status" class:bg-red-100={rsvpAtLimit} class:text-red-800={rsvpAtLimit}>
              {rsvpCount} / {event.rsvpLimit} RSVPs
            </span>
          {:else}
            <span class="badge-status">{rsvpCount} {rsvpCount === 1 ? 'RSVP' : 'RSVPs'}</span>
          {/if}
        </div>
      </div>
      
      {#if !rsvpAtLimit}
        <div class="w-full md:w-auto">
          <button class="btn-primary w-full md:w-auto px-8 py-4 text-lg shadow-button" onclick={openRsvpModal}>RSVP Now</button>
        </div>
      {/if}
    </div>
  </article>

  <!-- Success Messages -->
  {#if success && formType === 'rsvp'}
    <div class="success-banner">
      <h2 class="text-xl font-bold mb-2">✅ You're all set!</h2>
      <p class="mb-0">Your RSVP has been confirmed.</p>
      <div class="rounded-xl p-4 mt-4" style="background-color: rgba(124, 93, 250, 0.08);">
        <strong>Your RSVP ID:</strong> <code class="bg-white px-2 py-1 rounded font-semibold text-primary-700">{form?.rsvpId}</code><br />
        <small>Save this ID and your PIN to manage your RSVP later.</small>
      </div>
    </div>
  {/if}

  {#if success && formType === 'updateRsvp'}
    <div class="success-banner">
      <h2 class="text-xl font-bold mb-2">✅ Updated!</h2>
      <p class="mb-0">{message}</p>
    </div>
  {/if}

  {#if success && formType === 'cancelRsvp'}
    <div class="card mb-8 border-l-4 border-primary-700">
      <h2 class="text-xl font-bold mb-2">RSVP Cancelled</h2>
      <p class="mb-0">{message}</p>
    </div>
  {/if}

  <!-- WHO'S COMING - Public View -->
  {#if rsvps && rsvps.length > 0}
    {@const attendingList = rsvps.filter(r => r.status === 'attending')}
    {@const maybeList = rsvps.filter(r => r.status === 'maybe')}
    {@const notAttendingList = rsvps.filter(r => r.status === 'not_attending')}
    
    <section class="card mb-8">
      <h2 class="text-2xl font-bold text-dark-900 mb-6">Who's Coming ({attendingList.length} attending, {maybeList.length} maybe)</h2>
      
      <!-- RSVPs List -->
      <div class="flex flex-col gap-4">
        <!-- Attending Section -->
        {#if attendingList.length > 0}
          <details class="border-2 rounded-2xl overflow-hidden" style="border-color: rgba(124, 93, 250, 0.15);" open={showAttending} ontoggle={(e) => showAttending = e.target.open}>
            <summary class="flex justify-between items-center px-6 py-4 cursor-pointer select-none font-semibold text-lg transition-colors list-none bg-green-50 hover:bg-green-100 text-green-800">
              <span class="flex items-center gap-2">
                <span class="inline-flex items-center justify-center w-6 h-6 rounded-full text-sm" style="background-color: rgba(34, 197, 94, 0.15);">✓</span>
                Attending ({attendingList.length})
              </span>
              <span class="chevron-icon text-sm opacity-60">▼</span>
            </summary>
            <div class="grid gap-3 p-6 pt-4" style="background-color: rgba(124, 93, 250, 0.02);">
              {#each attendingList as rsvp}
                <div class="bg-white border rounded-xl p-4 flex justify-between items-center" style="border-color: rgba(124, 93, 250, 0.15);">
                  <div class="flex flex-col gap-1">
                    <strong class="text-dark-900 text-base">{rsvp.name}</strong>
                    {#if rsvp.email && isOwner}
                      <span class="text-dark-700 text-sm">{rsvp.email}</span>
                    {/if}
                    <span class="text-dark-600 text-xs">{formatShortDate(rsvp.createdAt)}</span>
                  </div>
                  <button 
                    class="bg-none border-none cursor-pointer p-2 text-xl opacity-60 hover:opacity-100 transition-opacity" 
                    title="Edit {rsvp.name}'s RSVP"
                    onclick={() => promptForPin(rsvp.id)}
                  >
                    ✏️
                  </button>
                </div>
              {/each}
            </div>
          </details>
        {/if}

        <!-- Maybe Section -->
        {#if maybeList.length > 0}
          <details class="border-2 rounded-2xl overflow-hidden" style="border-color: rgba(124, 93, 250, 0.15);" open={showMaybe} ontoggle={(e) => showMaybe = e.target.open}>
            <summary class="flex justify-between items-center px-6 py-4 cursor-pointer select-none font-semibold text-lg transition-colors list-none bg-amber-50 hover:bg-amber-100 text-amber-700">
              <span class="flex items-center gap-2">
                <span class="inline-flex items-center justify-center w-6 h-6 rounded-full text-sm" style="background-color: rgba(251, 191, 36, 0.15);">?</span>
                Maybe ({maybeList.length})
              </span>
              <span class="chevron-icon text-sm opacity-60">▼</span>
            </summary>
            <div class="grid gap-3 p-6 pt-4" style="background-color: rgba(124, 93, 250, 0.02);">
              {#each maybeList as rsvp}
                <div class="bg-white border rounded-xl p-4 flex justify-between items-center" style="border-color: rgba(124, 93, 250, 0.15);">
                  <div class="flex flex-col gap-1">
                    <strong class="text-dark-900 text-base">{rsvp.name}</strong>
                    {#if rsvp.email && isOwner}
                      <span class="text-dark-700 text-sm">{rsvp.email}</span>
                    {/if}
                    <span class="text-dark-600 text-xs">{formatShortDate(rsvp.createdAt)}</span>
                  </div>
                  <button 
                    class="bg-none border-none cursor-pointer p-2 text-xl opacity-60 hover:opacity-100 transition-opacity" 
                    title="Edit {rsvp.name}'s RSVP"
                    onclick={() => promptForPin(rsvp.id)}
                  >
                    ✏️
                  </button>
                </div>
              {/each}
            </div>
          </details>
        {/if}

        <!-- Not Attending Section -->
        {#if notAttendingList.length > 0}
          <details class="border-2 rounded-2xl overflow-hidden" style="border-color: rgba(124, 93, 250, 0.15);" open={showNotAttending} ontoggle={(e) => showNotAttending = e.target.open}>
            <summary class="flex justify-between items-center px-6 py-4 cursor-pointer select-none font-semibold text-lg transition-colors list-none bg-red-50 hover:bg-red-100 text-red-700">
              <span class="flex items-center gap-2">
                <span class="inline-flex items-center justify-center w-6 h-6 rounded-full text-sm" style="background-color: rgba(239, 68, 68, 0.15);">✗</span>
                Not Attending ({notAttendingList.length})
              </span>
              <span class="chevron-icon text-sm opacity-60">▼</span>
            </summary>
            <div class="grid gap-3 p-6 pt-4" style="background-color: rgba(124, 93, 250, 0.02);">
              {#each notAttendingList as rsvp}
                <div class="bg-white border rounded-xl p-4 flex justify-between items-center" style="border-color: rgba(124, 93, 250, 0.15);">
                  <div class="flex flex-col gap-1">
                    <strong class="text-dark-900 text-base">{rsvp.name}</strong>
                    {#if rsvp.email && isOwner}
                      <span class="text-dark-700 text-sm">{rsvp.email}</span>
                    {/if}
                    <span class="text-dark-600 text-xs">{formatShortDate(rsvp.createdAt)}</span>
                  </div>
                  <button 
                    class="bg-none border-none cursor-pointer p-2 text-xl opacity-60 hover:opacity-100 transition-opacity" 
                    title="Edit {rsvp.name}'s RSVP"
                    onclick={() => promptForPin(rsvp.id)}
                  >
                    ✏️
                  </button>
                </div>
              {/each}
            </div>
          </details>
        {/if}
      </div>
    </section>
  {/if}

  <!-- Public Question Responses -->
  {#if event.questions.some(q => q.isPublic && q.publicResponses && q.publicResponses.length > 0)}
    {@const publicQuestions = event.questions.filter(q => q.isPublic && q.publicResponses && q.publicResponses.length > 0)}
    {#each publicQuestions as question}
      <section class="card mb-8">
        <div class="flex justify-between items-center mb-6 flex-wrap gap-4 pb-4 border-b-2" style="border-color: rgba(124, 93, 250, 0.1);">
          <h2 class="text-2xl font-bold text-dark-900 m-0">{question.label}</h2>
          {#if question.quantity}
            <span class="badge-status">
              {question.responseCount} of {question.quantity} slots filled
            </span>
          {:else}
            <span class="badge-status">
              {question.responseCount} {question.responseCount === 1 ? 'response' : 'responses'}
            </span>
          {/if}
        </div>
        {#if question.description}
          <p class="m-0 mb-6 text-dark-700 text-sm leading-relaxed">{question.description}</p>
        {/if}
        
        <div class="flex flex-col gap-4">
          {#if question.publicResponses.some(r => r.status === 'attending')}
            {@const attendingTrackEntries = buildPlaylistEntries(question.publicResponses ?? [], 'attending')}
            {@const attendingStyles = getStatusStyles('attending')}
            <div class="rounded-xl overflow-hidden border" style="border-color: rgba(124, 93, 250, 0.1);">
              <h3 class="m-0 px-5 py-3.5 text-sm font-semibold flex items-center gap-2.5 bg-gradient-to-r from-green-50 to-green-100 text-green-800 border-b" style="border-color: rgba(34, 197, 94, 0.15);">
                <span class="inline-flex items-center justify-center w-6 h-6 rounded-full text-sm font-bold" style="background-color: rgba(34, 197, 94, 0.25); color: #15803d;">✓</span>
                Attending ({attendingTrackEntries.length})
              </h3>
              <div class="bg-white px-5 py-4">
                {#if attendingTrackEntries.length > 0}
                  <ul class="space-y-3">
                    {#each attendingTrackEntries as entry, index (entry.key)}
                      <li class={`flex items-center gap-4 p-4 rounded-xl border ${attendingStyles.border} ${attendingStyles.bg}`}>
                        <span class={`w-8 text-center text-sm font-bold ${attendingStyles.index}`}>{index + 1}</span>
                        {#if entry.track.image}
                          <img
                            src={entry.track.image}
                            alt={entry.track.album ? `${entry.track.album} artwork` : `${entry.track.name} artwork`}
                            class="w-14 h-14 rounded-lg shadow-sm object-cover"
                            loading="lazy"
                          />
                        {/if}
                        <div class="flex-1 min-w-0 space-y-0.5">
                          <p class="text-sm font-semibold text-dark-900 truncate">
                            {#if entry.track.spotifyUrl}
                              <a href={entry.track.spotifyUrl} target="_blank" rel="noreferrer" class="hover:underline">
                                {entry.track.name}
                              </a>
                            {:else}
                              {entry.track.name}
                            {/if}
                          </p>
                          <p class="text-xs text-dark-600 truncate">{entry.track.artists}</p>
                          {#if entry.track.album}
                            <p class="text-xs text-dark-500 truncate">{entry.track.album}</p>
                          {/if}
                        </div>
                        <span class={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${attendingStyles.badge}`}>
                          <span aria-hidden="true">👤</span>
                          {entry.contributor}
                        </span>
                        <span class={`text-xl ${attendingStyles.icon}`} aria-hidden="true">♪</span>
                      </li>
                    {/each}
                  </ul>
                {:else}
                  <p class="text-sm text-gray-500 italic">No songs yet from attendees.</p>
                {/if}
              </div>
            </div>
          {/if}
          
          {#if question.publicResponses.some(r => r.status === 'maybe')}
            {@const maybeTrackEntries = buildPlaylistEntries(question.publicResponses ?? [], 'maybe')}
            {@const maybeStyles = getStatusStyles('maybe')}
            <div class="rounded-xl overflow-hidden border" style="border-color: rgba(124, 93, 250, 0.1);">
              <h3 class="m-0 px-5 py-3.5 text-sm font-semibold flex items-center gap-2.5 bg-gradient-to-r from-amber-50 to-amber-100 text-amber-700 border-b" style="border-color: rgba(251, 191, 36, 0.15);">
                <span class="inline-flex items-center justify-center w-6 h-6 rounded-full text-sm font-bold" style="background-color: rgba(251, 191, 36, 0.25); color: #d97706;">?</span>
                Maybe ({maybeTrackEntries.length})
              </h3>
              <div class="bg-white px-5 py-4">
                {#if maybeTrackEntries.length > 0}
                  <ul class="space-y-3">
                    {#each maybeTrackEntries as entry, index (entry.key)}
                      <li class={`flex items-center gap-4 p-4 rounded-xl border ${maybeStyles.border} ${maybeStyles.bg}`}>
                        <span class={`w-8 text-center text-sm font-bold ${maybeStyles.index}`}>{index + 1}</span>
                        {#if entry.track.image}
                          <img
                            src={entry.track.image}
                            alt={entry.track.album ? `${entry.track.album} artwork` : `${entry.track.name} artwork`}
                            class="w-14 h-14 rounded-lg shadow-sm object-cover"
                            loading="lazy"
                          />
                        {/if}
                        <div class="flex-1 min-w-0 space-y-0.5">
                          <p class="text-sm font-semibold text-dark-900 truncate">
                            {#if entry.track.spotifyUrl}
                              <a href={entry.track.spotifyUrl} target="_blank" rel="noreferrer" class="hover:underline">
                                {entry.track.name}
                              </a>
                            {:else}
                              {entry.track.name}
                            {/if}
                          </p>
                          <p class="text-xs text-dark-600 truncate">{entry.track.artists}</p>
                          {#if entry.track.album}
                            <p class="text-xs text-dark-500 truncate">{entry.track.album}</p>
                          {/if}
                        </div>
                        <span class={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${maybeStyles.badge}`}>
                          <span aria-hidden="true">👤</span>
                          {entry.contributor}
                        </span>
                        <span class={`text-xl ${maybeStyles.icon}`} aria-hidden="true">♪</span>
                      </li>
                    {/each}
                  </ul>
                {:else}
                  <p class="text-sm text-gray-500 italic">No songs yet from “Maybe” guests.</p>
                {/if}
              </div>
            </div>
          {/if}
          
          {#if question.publicResponses.some(r => r.status === 'not_attending')}
            {@const notTrackEntries = buildPlaylistEntries(question.publicResponses ?? [], 'not_attending')}
            {@const notStyles = getStatusStyles('not_attending')}
            <div class="rounded-xl overflow-hidden border" style="border-color: rgba(124, 93, 250, 0.1);">
              <h3 class="m-0 px-5 py-3.5 text-sm font-semibold flex items-center gap-2.5 bg-gradient-to-r from-red-50 to-red-100 text-red-700 border-b" style="border-color: rgba(239, 68, 68, 0.15);">
                <span class="inline-flex items-center justify-center w-6 h-6 rounded-full text-sm font-bold" style="background-color: rgba(239, 68, 68, 0.25); color: #dc2626;">✗</span>
                Not Attending ({notTrackEntries.length})
              </h3>
              <div class="bg-white px-5 py-4">
                {#if notTrackEntries.length > 0}
                  <ul class="space-y-3">
                    {#each notTrackEntries as entry, index (entry.key)}
                      <li class={`flex items-center gap-4 p-4 rounded-xl border ${notStyles.border} ${notStyles.bg}`}>
                        <span class={`w-8 text-center text-sm font-bold ${notStyles.index}`}>{index + 1}</span>
                        {#if entry.track.image}
                          <img
                            src={entry.track.image}
                            alt={entry.track.album ? `${entry.track.album} artwork` : `${entry.track.name} artwork`}
                            class="w-14 h-14 rounded-lg shadow-sm object-cover"
                            loading="lazy"
                          />
                        {/if}
                        <div class="flex-1 min-w-0 space-y-0.5">
                          <p class="text-sm font-semibold text-dark-900 truncate">
                            {#if entry.track.spotifyUrl}
                              <a href={entry.track.spotifyUrl} target="_blank" rel="noreferrer" class="hover:underline">
                                {entry.track.name}
                              </a>
                            {:else}
                              {entry.track.name}
                            {/if}
                          </p>
                          <p class="text-xs text-dark-600 truncate">{entry.track.artists}</p>
                          {#if entry.track.album}
                            <p class="text-xs text-dark-500 truncate">{entry.track.album}</p>
                          {/if}
                        </div>
                        <span class={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${notStyles.badge}`}>
                          <span aria-hidden="true">👤</span>
                          {entry.contributor}
                        </span>
                        <span class={`text-xl ${notStyles.icon}`} aria-hidden="true">♪</span>
                      </li>
                    {/each}
                  </ul>
                {:else}
                  <p class="text-sm text-gray-500 italic">No songs yet from guests marked “Not Attending”.</p>
                {/if}
              </div>
            </div>
          {/if}
        </div>
      </section>
    {/each}
  {/if}
</div>

<!-- PIN Prompt Modal -->
{#if editingRsvpId && !editingRsvp}
  <div
    class="modal-backdrop"
    role="button"
    tabindex="0"
    aria-label="Close PIN prompt"
    onclick={() => { editingRsvpId = ''; pinInput = ''; pinError = ''; }}
    onkeydown={(event) => handleOverlayKeydown(event, () => { editingRsvpId = ''; pinInput = ''; pinError = ''; })}
  >
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="pin-prompt-title" tabindex="-1" onclick|stopPropagation>
      <div class="modal-header">
        <h3 id="pin-prompt-title">Enter PIN</h3>
        <button class="close-btn" onclick={() => { editingRsvpId = ''; pinInput = ''; pinError = ''; }}>×</button>
      </div>
      <form method="POST" action="?/lookupRsvp" use:enhance={() => {
        // Store the PIN before submission
        const submittedPin = pinInput;
        return async ({ result, update }) => {
          if (result.type === 'success' && result.data?.success) {
            currentPin = submittedPin;
          }
          await update();
        };
      }}>
        <input type="hidden" name="rsvpId" value={editingRsvpId} />
        {#if pinError}
          <div class="error-banner mb-4">{pinError}</div>
        {/if}
        <label class="form-label">
          <span>Enter your PIN to edit this RSVP</span>
          <input
            class="input-field"
            name="pin"
            type="text"
            inputmode="numeric"
            required
            placeholder="Enter PIN"
            maxlength="6"
            bind:value={pinInput}
          />
        </label>
        <div class="modal-actions">
          <button type="submit" class="btn-primary">Unlock</button>
          <button type="button" class="btn-secondary" onclick={() => { editingRsvpId = ''; pinInput = ''; pinError = ''; }}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Edit RSVP Modal -->
{#if showEditModal && editingRsvp}
  <div
    class="modal-backdrop"
    role="button"
    tabindex="0"
    aria-label="Close edit RSVP dialog"
    onclick={closeEditModal}
    onkeydown={(event) => handleOverlayKeydown(event, closeEditModal)}
  >
    <div class="modal large" role="dialog" aria-modal="true" aria-labelledby="edit-rsvp-title" tabindex="-1" onclick|stopPropagation>
      <div class="modal-header">
        <h3 id="edit-rsvp-title">Edit Your RSVP</h3>
        <button class="close-btn" onclick={closeEditModal}>×</button>
      </div>
      
      {#if formType === 'updateRsvp' && message && !success}
        <div class="error-banner mb-4">{message}</div>
      {/if}

      <form method="POST" action="?/updateRsvp" class="grid gap-5" use:enhance={() => {
        return async ({ result, update }) => {
          if (result.type === 'success' && result.data?.success) {
            // Update reactive state
            if (result.data.rsvps) {
              rsvps = result.data.rsvps;
            }
            if (result.data.questionResponseCounts) {
              questionResponseCounts = result.data.questionResponseCounts as Record<string, number>;
            }
            // Close modal
            closeEditModal();
          }
          await update();
        };
      }}>
        <input type="hidden" name="rsvpId" value={editingRsvp.id} />
        <input type="hidden" name="pin" value={currentPin} />

        <label class="form-label">
          <span>Your name *</span>
          <input class="input-field" name="name" required value={editingRsvp.name} autocomplete="name" />
        </label>

        <label class="form-label">
          <span>Email (optional)</span>
          <input
            class="input-field"
            type="email"
            name="email"
            placeholder="you@example.com"
            value={editingRsvp.email ?? ''}
            autocomplete="email"
          />
        </label>

        <div class="status-section">
          <span class="status-label">Response status *</span>
          <div class="status-options">
            <label class="status-option">
              <input
                type="radio"
                name="status"
                value="attending"
                checked={editingStatus === 'attending'}
                onchange={() => editingStatus = 'attending'}
                required
              />
              <span>Attending</span>
            </label>
            <label class="status-option">
              <input
                type="radio"
                name="status"
                value="maybe"
                checked={editingStatus === 'maybe'}
                onchange={() => editingStatus = 'maybe'}
              />
              <span>Maybe</span>
            </label>
            <label class="status-option">
              <input
                type="radio"
                name="status"
                value="not_attending"
                checked={editingStatus === 'not_attending'}
                onchange={() => { editingStatus = 'not_attending'; responses = {}; }}
              />
              <span>Not Attending</span>
            </label>
          </div>
        </div>

        {#if event.questions.length > 0 && (editingStatus === 'attending' || editingStatus === 'maybe')}
          <div class="questions-section">
            <h3>Questions</h3>
            <div class="question-list">
              {#each event.questions as question}
                {#if question.type === 'text'}
                  <label class="form-label">
                    <span>{question.label}{question.required ? ' *' : ''}</span>
                    {#if question.description}
                      <small>{question.description}</small>
                    {/if}
                    <input
                      class="input-field"
                      name="response_{question.id}"
                      type="text"
                      value={responses[question.id] ?? ''}
                      required={question.required}
                      onchange={(e) => responses[question.id] = e.currentTarget.value}
                    />
                  </label>
                {:else if question.type === 'multiple_choice'}
                  <fieldset>
                    <legend>{question.label}{question.required ? ' *' : ''}</legend>
                    {#if question.description}
                      <small>{question.description}</small>
                    {/if}
                    {#each (question.options ?? []) as option}
                      <label class="radio-option">
                        <input
                          type="radio"
                          name="response_{question.id}"
                          value={option}
                          checked={responses[question.id] === option}
                          required={question.required}
                          onchange={(e) => responses[question.id] = e.currentTarget.value}
                        />
                        <span>{option}</span>
                      </label>
                    {/each}
                  </fieldset>
                {:else if question.type === 'checkbox'}
                  <fieldset>
                    <legend>{question.label}{question.required ? ' *' : ''}</legend>
                    {#if question.description}
                      <small>{question.description}</small>
                    {/if}
                    {#each (question.options ?? []) as option}
                      <label class="checkbox-option">
                        <input
                          type="checkbox"
                          name="response_{question.id}"
                          value={option}
                          checked={responses[question.id]?.includes(option)}
                          onchange={(e) => {
                            const currentVals = responses[question.id]?.split(',').filter(Boolean) ?? [];
                            if (e.currentTarget.checked) {
                              responses[question.id] = [...currentVals, option].join(',');
                            } else {
                              responses[question.id] = currentVals.filter(v => v !== option).join(',');
                            }
                          }}
                        />
                        <span>{option}</span>
                      </label>
                    {/each}
                  </fieldset>
                {:else if question.type === 'slots'}
                  <label class="form-label">
                    <span>{question.label}{question.required ? ' *' : ''}</span>
                    {#if question.description}
                      <small class="text-sm text-gray-600">{question.description}</small>
                    {/if}
                    <input
                      class="input-field"
                      name="response_{question.id}"
                      type="text"
                      value={responses[question.id] ?? ''}
                      required={question.required}
                      placeholder="What are you bringing?"
                      onchange={(e) => responses[question.id] = e.currentTarget.value}
                    />
                    {#if question.quantity}
                      <small class="text-sm text-gray-600">{question.responseCount} of {question.quantity} slots filled</small>
                    {/if}
                  </label>
                {:else if question.type === 'spotify_playlist'}
                  <div class="form-label">
                    <span>{question.label}{question.required ? ' *' : ''}</span>
                    {#if question.description}
                      <small class="text-sm text-gray-600">{question.description}</small>
                    {/if}
                    {#if question.songsPerUser}
                      <small class="text-sm text-gray-600 block mb-2">
                        You can add up to {question.songsPerUser} song{question.songsPerUser === 1 ? '' : 's'}.
                      </small>
                    {:else}
                      <small class="text-sm text-gray-600 block mb-2">Add as many songs as you'd like.</small>
                    {/if}
                    <SpotifySongSelector
                      name="response_{question.id}"
                      required={question.required}
                      value={responses[question.id] ?? ''}
                      eventCode={event.publicCode}
                      limit={question.songsPerUser ?? null}
                    />
                  </div>
                {/if}
              {/each}
            </div>
          </div>
        {/if}

        <div class="modal-actions">
          <button type="submit" class="btn-primary">Update RSVP</button>
          <button type="button" class="btn-secondary" onclick={closeEditModal}>Cancel</button>
        </div>
      </form>

      <form method="POST" action="?/cancelRsvp" class="cancel-form" use:enhance={() => {
        return async ({ result, update }) => {
          if (result.type === 'success' && result.data?.success) {
            // Update reactive state
            rsvpCount = result.data.rsvpCount ?? rsvpCount - 1;
            if (result.data.rsvps) {
              rsvps = result.data.rsvps;
            }
            if (result.data.questionResponseCounts) {
              questionResponseCounts = result.data.questionResponseCounts as Record<string, number>;
            }
            // Close modal
            closeEditModal();
          }
          await update();
        };
      }}>
        <input type="hidden" name="rsvpId" value={editingRsvp.id} />
        <input type="hidden" name="pin" value={currentPin} />
        <button
          type="submit"
          class="btn-danger"
          onclick={(e) => {
            if (!confirm('Are you sure you want to cancel your RSVP?')) {
              e.preventDefault();
            }
          }}
        >
          Cancel RSVP
        </button>
      </form>
    </div>
  </div>
{/if}

<!-- RSVP Form Modal -->
{#if showRsvpModal && !rsvpAtLimit}
  <div
    class="modal-backdrop"
    role="button"
    tabindex="0"
    aria-label="Close RSVP dialog"
    onclick={closeRsvpModal}
    onkeydown={(event) => handleOverlayKeydown(event, closeRsvpModal)}
  >
    <div class="modal large" role="dialog" aria-modal="true" aria-labelledby="create-rsvp-title" tabindex="-1" onclick|stopPropagation>
      <div class="modal-header">
        <h3 id="create-rsvp-title">RSVP to {event.title}</h3>
        <button class="close-btn" onclick={closeRsvpModal}>×</button>
      </div>
      
      {#if formType === 'rsvp' && message}
        <div class="error-banner">{message}</div>
      {/if}

      <form method="POST" action="?/rsvp" class="rsvp-form" use:enhance={() => {
        return async ({ result, update }) => {
          if (result.type === 'success' && result.data?.success) {
            // Update reactive state
            rsvpCount = result.data.rsvpCount ?? rsvpCount + 1;
            if (result.data.rsvps) {
              rsvps = result.data.rsvps;
            }
            if (result.data.questionResponseCounts) {
              questionResponseCounts = result.data.questionResponseCounts as Record<string, number>;
            }
            // Close modal
            showRsvpModal = false;
            responses = {};
          }
          await update();
        };
      }}>
        <label class="form-label">
          <span>Your name *</span>
          <input
            class="input-field"
            name="name"
            required
            value={values.name ?? ''}
            autocomplete="name"
            placeholder="Your full name"
          />
          {#if errors.name}
            <small class="text-red-600 text-sm">{errors.name[0]}</small>
          {/if}
        </label>

        <label class="form-label">
          <span>Email (optional but recommended)</span>
          <input
            class="input-field"
            type="email"
            name="email"
            value={values.email ?? ''}
            autocomplete="email"
            placeholder="you@example.com"
          />
          {#if errors.email}
            <small class="text-red-600 text-sm">{errors.email[0]}</small>
          {/if}
        </label>

        <label class="form-label">
          <span>Choose a PIN (4-6 digits) *</span>
          <input
            class="input-field"
            name="pin"
            type="text"
            inputmode="numeric"
            minlength="4"
            maxlength="6"
            required
            value={values.pin ?? ''}
            autocomplete="off"
          />
          <small class="text-sm text-gray-600">You'll need this PIN to manage your RSVP later.</small>
          {#if errors.pin}
            <small class="text-red-600 text-sm">{errors.pin[0]}</small>
          {/if}
        </label>

        <div class="status-section">
          <span class="status-label">Response status *</span>
          <div class="status-options">
            <label class="status-option">
              <input
                type="radio"
                name="status"
                value="attending"
                checked={newRsvpStatus === 'attending'}
                onchange={() => newRsvpStatus = 'attending'}
                required
              />
              <span>Attending</span>
            </label>
            <label class="status-option">
              <input
                type="radio"
                name="status"
                value="maybe"
                checked={newRsvpStatus === 'maybe'}
                onchange={() => newRsvpStatus = 'maybe'}
              />
              <span>Maybe</span>
            </label>
            <label class="status-option">
              <input
                type="radio"
                name="status"
                value="not_attending"
                checked={newRsvpStatus === 'not_attending'}
                onchange={() => { newRsvpStatus = 'not_attending'; responses = {}; }}
              />
              <span>Not Attending</span>
            </label>
          </div>
        </div>

        {#if event.questions.length > 0 && (newRsvpStatus === 'attending' || newRsvpStatus === 'maybe')}
          <div class="questions-section">
            <h3>Questions</h3>

            <div class="question-list">
              {#each event.questions as question}
                {@const isFull = question.quantity && question.responseCount >= question.quantity}
                {@const isRequired = question.required && !isFull}
                
                {#if question.type === 'text'}
                  <label class="form-label" class:disabled={isFull}>
                    <span>
                      {question.label}{isRequired ? ' *' : ''}
                      {#if isFull}
                        <span class="badge-danger ml-2">Full</span>
                      {/if}
                    </span>
                    {#if question.description}
                      <small class="text-sm text-gray-600">{question.description}</small>
                    {/if}
                    <input
                      class="input-field"
                      name="response_{question.id}"
                      type="text"
                      value={responses[question.id] ?? ''}
                      required={isRequired}
                      disabled={isFull}
                      placeholder={isFull ? 'This question is at capacity' : ''}
                      onchange={(e) => responses[question.id] = e.currentTarget.value}
                    />
                  </label>
                {:else if question.type === 'multiple_choice'}
                  <fieldset class:disabled={isFull}>
                    <legend class="form-label">
                      {question.label}{isRequired ? ' *' : ''}
                      {#if isFull}
                        <span class="badge-danger ml-2">Full</span>
                      {/if}
                    </legend>
                    {#if question.description}
                      <small class="text-sm text-gray-600">{question.description}</small>
                    {/if}
                    {#each (question.options ?? []) as option}
                      <label class="radio-option">
                        <input
                          type="radio"
                          name="response_{question.id}"
                          value={option}
                          checked={responses[question.id] === option}
                          required={isRequired}
                          disabled={isFull}
                          onchange={(e) => responses[question.id] = e.currentTarget.value}
                        />
                        <span>{option}</span>
                      </label>
                    {/each}
                  </fieldset>
                {:else if question.type === 'checkbox'}
                  <fieldset class:disabled={isFull}>
                    <legend class="form-label">
                      {question.label}{isRequired ? ' *' : ''}
                      {#if isFull}
                        <span class="badge-danger ml-2">Full</span>
                      {/if}
                    </legend>
                    {#if question.description}
                      <small class="text-sm text-gray-600">{question.description}</small>
                    {/if}
                    {#each (question.options ?? []) as option}
                      <label class="checkbox-option">
                        <input
                          type="checkbox"
                          name="response_{question.id}"
                          value={option}
                          checked={responses[question.id]?.includes(option)}
                          disabled={isFull}
                          onchange={(e) => {
                            const currentVals = responses[question.id]?.split(',').filter(Boolean) ?? [];
                            if (e.currentTarget.checked) {
                              responses[question.id] = [...currentVals, option].join(',');
                            } else {
                              responses[question.id] = currentVals.filter(v => v !== option).join(',');
                            }
                          }}
                        />
                        <span>{option}</span>
                      </label>
                    {/each}
                  </fieldset>
                {:else if question.type === 'slots'}
                  <label class="form-label" class:disabled={isFull}>
                    <span>
                      {question.label}{isRequired ? ' *' : ''}
                      {#if isFull}
                        <span class="badge-danger ml-2">Full</span>
                      {/if}
                    </span>
                    {#if question.description}
                      <small class="text-sm text-gray-600">{question.description}</small>
                    {/if}
                    <input
                      class="input-field"
                      name="response_{question.id}"
                      type="text"
                      value={responses[question.id] ?? ''}
                      required={isRequired}
                      disabled={isFull}
                      placeholder={isFull ? 'All slots are taken' : 'What are you bringing?'}
                      onchange={(e) => responses[question.id] = e.currentTarget.value}
                    />
                    {#if question.quantity}
                      <small class="text-sm" class:text-red-600={isFull} class:text-gray-600={!isFull}>{question.responseCount} of {question.quantity} slots filled</small>
                    {/if}
                  </label>
                {:else if question.type === 'spotify_playlist'}
                  <div class="form-label">
                    <span>
                      {question.label}{isRequired ? ' *' : ''}
                      {#if isFull}
                        <span class="badge-danger ml-2">Full</span>
                      {/if}
                    </span>
                    {#if question.description}
                      <small class="text-sm text-gray-600">{question.description}</small>
                    {/if}
                    {#if question.songsPerUser}
                      <small class="text-sm text-gray-600 block mb-2">
                        You can add up to {question.songsPerUser} song{question.songsPerUser === 1 ? '' : 's'}.
                      </small>
                    {:else}
                      <small class="text-sm text-gray-600 block mb-2">Add as many songs as you'd like.</small>
                    {/if}
                    <SpotifySongSelector
                      name="response_{question.id}"
                      required={isRequired}
                      value={responses[question.id] ?? ''}
                      eventCode={event.publicCode}
                      limit={question.songsPerUser ?? null}
                    />
                  </div>
                {/if}
              {/each}
            </div>
          </div>
        {/if}

        <div class="modal-actions">
          <button type="submit" class="btn-primary w-full">Confirm RSVP</button>
          <button type="button" class="btn-secondary w-full" onclick={closeRsvpModal}>Cancel</button>
        </div>
      </form>
    </div>
  </div>
{/if}
