import { fail, error } from '@sveltejs/kit';

import prisma from '$lib/server/prisma';
import { hashPin } from '$lib/server/security';
import { signupSchema } from '$lib/server/validation';

export const load = async ({ params }) => {
  const event = await prisma.event.findUnique({
    where: { publicCode: params.code },
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
    }
  } as const;
};

export const actions = {
  signup: async ({ request, params }) => {
    const event = await prisma.event.findUnique({
      where: { publicCode: params.code },
      select: { id: true }
    });

    if (!event) {
      throw error(404, 'Event not found');
    }

    const formData = await request.formData();
    const raw = Object.fromEntries(formData) as Record<string, string>;
    const parsed = signupSchema.safeParse(raw);

    if (!parsed.success) {
      return fail(400, {
        success: false,
        errors: parsed.error.flatten().fieldErrors,
        values: raw
      });
    }

    const { name, email, pin, slotId } = parsed.data;

    const slot = await prisma.slot.findFirst({
      where: { id: slotId, eventId: event.id },
      include: { _count: { select: { signups: true } } }
    });

    if (!slot) {
      return fail(400, {
        success: false,
        message: 'That slot no longer exists. Try refreshing the page.',
        values: raw
      });
    }

    if (slot._count.signups >= slot.quantity) {
      return fail(400, {
        success: false,
        message: 'Sorry, that slot has just filled up. Pick another item.',
        values: raw
      });
    }

    const signup = await prisma.signup.create({
      data: {
        name,
        email: email ?? null,
        pinHash: hashPin(pin),
        slotId: slot.id,
        eventId: event.id
      },
      select: {
        id: true,
        slot: { select: { label: true } }
      }
    });

    return {
      success: true,
      signup: {
        id: signup.id,
        slotLabel: signup.slot.label
      }
    };
  }
};
