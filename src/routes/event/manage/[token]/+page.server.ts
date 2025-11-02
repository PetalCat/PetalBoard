import { fail, error } from '@sveltejs/kit';
import { z } from 'zod';

import prisma from '$lib/server/prisma';
import { eventSchema, slotSchema } from '$lib/server/validation';

const slotUpdateSchema = slotSchema.extend({ slotId: z.string().cuid() });
const slotTargetSchema = z.object({ slotId: z.string().cuid() });
const signupTargetSchema = z.object({ signupId: z.string().cuid() });

async function getEventId(token: string) {
  const event = await prisma.event.findUnique({
    where: { manageToken: token },
    select: { id: true }
  });

  if (!event) {
    throw error(404, 'Event not found');
  }

  return event.id;
}

export const load = async ({ params }) => {
  const event = await prisma.event.findUnique({
    where: { manageToken: params.token },
    select: {
      id: true,
      title: true,
      description: true,
      date: true,
      location: true,
      publicCode: true,
      slots: {
        orderBy: { label: 'asc' },
        select: {
          id: true,
          label: true,
          description: true,
          quantity: true,
          signups: { select: { id: true } }
        }
      },
      signups: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          slot: { select: { label: true } }
        }
      }
    }
  });

  if (!event) {
    throw error(404, 'Event not found');
  }

  return {
    event: {
      id: event.id,
      title: event.title,
      description: event.description,
      date: event.date,
      location: event.location,
      publicCode: event.publicCode,
      slots: event.slots.map((slot) => ({
        id: slot.id,
        label: slot.label,
        description: slot.description,
        quantity: slot.quantity,
        taken: slot.signups.length
      }))
    },
    signups: event.signups.map((signup) => ({
      id: signup.id,
      name: signup.name,
      email: signup.email,
      createdAt: signup.createdAt,
      slotLabel: signup.slot.label
    }))
  } as const;
};

export const actions = {
  updateEvent: async ({ params, request }) => {
    const eventId = await getEventId(params.token);
    const formData = await request.formData();
    const raw = Object.fromEntries(formData) as Record<string, string>;
    const parsed = eventSchema.safeParse(raw);

    if (!parsed.success) {
      return fail(400, {
        success: false,
        errors: parsed.error.flatten().fieldErrors,
        values: raw,
        type: 'updateEvent'
      });
    }

    const { title, date, location, description } = parsed.data;

    await prisma.event.update({
      where: { id: eventId },
      data: {
        title,
        date: new Date(date),
        location: location ?? null,
        description: description ?? null
      }
    });

    return {
      success: true,
      type: 'updateEvent'
    } as const;
  },
  addSlot: async ({ params, request }) => {
    const eventId = await getEventId(params.token);
    const formData = await request.formData();
    const raw = Object.fromEntries(formData) as Record<string, string>;
    const parsed = slotSchema.safeParse(raw);

    if (!parsed.success) {
      return fail(400, {
        success: false,
        errors: parsed.error.flatten().fieldErrors,
        values: raw,
        type: 'addSlot'
      });
    }

    const { label, description, quantity } = parsed.data;

    await prisma.slot.create({
      data: {
        label,
        description: description ?? null,
        quantity,
        eventId
      }
    });

    return {
      success: true,
      type: 'addSlot'
    } as const;
  },
  updateSlot: async ({ params, request }) => {
    const eventId = await getEventId(params.token);
    const formData = await request.formData();
    const raw = Object.fromEntries(formData) as Record<string, string>;
    const parsed = slotUpdateSchema.safeParse(raw);

    if (!parsed.success) {
      return fail(400, {
        success: false,
        errors: parsed.error.flatten().fieldErrors,
        values: raw,
        type: 'updateSlot'
      });
    }

    const { slotId, label, description, quantity } = parsed.data;

    const slot = await prisma.slot.findFirst({ where: { id: slotId, eventId } });
    if (!slot) {
      return fail(404, { success: false, message: 'Slot not found.', type: 'updateSlot' });
    }

    await prisma.slot.update({
      where: { id: slotId },
      data: {
        label,
        description: description ?? null,
        quantity
      }
    });

    return { success: true, type: 'updateSlot' } as const;
  },
  deleteSlot: async ({ params, request }) => {
    const eventId = await getEventId(params.token);
    const formData = await request.formData();
    const raw = Object.fromEntries(formData) as Record<string, string>;
    const parsed = slotTargetSchema.safeParse(raw);

    if (!parsed.success) {
      return fail(400, { success: false, message: 'Invalid request.', type: 'deleteSlot' });
    }

    const { slotId } = parsed.data;

    const slot = await prisma.slot.findFirst({ where: { id: slotId, eventId } });
    if (!slot) {
      return fail(404, { success: false, message: 'Slot not found.', type: 'deleteSlot' });
    }

    await prisma.slot.delete({ where: { id: slotId } });

    return { success: true, type: 'deleteSlot' } as const;
  },
  deleteSignup: async ({ params, request }) => {
    const eventId = await getEventId(params.token);
    const formData = await request.formData();
    const raw = Object.fromEntries(formData) as Record<string, string>;
    const parsed = signupTargetSchema.safeParse(raw);

    if (!parsed.success) {
      return fail(400, { success: false, message: 'Invalid request.', type: 'deleteSignup' });
    }

    const { signupId } = parsed.data;

    const signup = await prisma.signup.findFirst({ where: { id: signupId, eventId } });
    if (!signup) {
      return fail(404, { success: false, message: 'Signup not found.', type: 'deleteSignup' });
    }

    await prisma.signup.delete({ where: { id: signupId } });

    return { success: true, type: 'deleteSignup' } as const;
  }
};
