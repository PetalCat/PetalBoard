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
    select: { id: true, pinHash: true, eventId: true }
  });

  if (!signup || !verifyPin(pin, signup.pinHash)) {
    return json({ error: 'The signup ID and PIN did not match.' }, { status: 403 });
  }

  await prisma.signup.delete({ where: { id: signupId } });

  const event = await prisma.event.findUnique({
    where: { id: signup.eventId },
    select: {
      title: true,
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

  return json({
    success: true,
    event: event && {
      title: event.title,
      publicCode: event.publicCode
    },
    slots: event?.slots.map((slot) => ({
      id: slot.id,
      label: slot.label,
      description: slot.description,
      quantity: slot.quantity,
      taken: slot.signups.length
    })) ?? []
  });
};
