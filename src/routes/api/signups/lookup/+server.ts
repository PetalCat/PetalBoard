import { json } from '@sveltejs/kit';

import prisma from '$lib/server/prisma';
import { verifyPin } from '$lib/server/security';
import { lookupSchema } from '$lib/server/validation';

export const POST = async ({ request }) => {
  const payload = await request.json().catch(() => ({}));
  const parsed = lookupSchema.safeParse(payload);

  if (!parsed.success) {
    return json({ error: 'Provide a valid signup ID and PIN.' }, { status: 400 });
  }

  const { signupId, pin } = parsed.data;

  const signup = await prisma.signup.findUnique({
    where: { id: signupId },
    select: {
      id: true,
      name: true,
      email: true,
      pinHash: true,
      slotId: true,
      slot: {
        select: {
          id: true,
          label: true,
          quantity: true,
          description: true,
          event: {
            select: {
              id: true,
              title: true,
              description: true,
              location: true,
              date: true,
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
          }
        }
      }
    }
  });

  if (!signup || !verifyPin(pin, signup.pinHash)) {
    return json({ error: 'We could not find a signup with that ID and PIN.' }, { status: 403 });
  }

  const event = signup.slot.event;

  return json({
    signup: {
      id: signup.id,
      name: signup.name,
      email: signup.email,
      slotId: signup.slotId
    },
    event: {
      title: event.title,
      description: event.description,
      date: event.date,
      location: event.location,
      publicCode: event.publicCode
    },
    slots: event.slots.map((slot) => ({
      id: slot.id,
      label: slot.label,
      description: slot.description,
      quantity: slot.quantity,
      taken: slot.signups.length
    }))
  });
};
