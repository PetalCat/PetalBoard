import { json } from '@sveltejs/kit';

import prisma from '$lib/server/prisma';
import { verifyPin } from '$lib/server/security';
import { signupUpdateSchema } from '$lib/server/validation';

export const POST = async ({ request }) => {
  const payload = await request.json().catch(() => ({}));
  const parsed = signupUpdateSchema.safeParse(payload);

  if (!parsed.success) {
    return json({ error: 'Please provide valid updates and your PIN.', details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { signupId, pin, name, email, slotId } = parsed.data;

  const signup = await prisma.signup.findUnique({
    where: { id: signupId },
    select: {
      id: true,
      name: true,
      email: true,
      pinHash: true,
      slotId: true,
      eventId: true,
      slot: {
        select: {
          id: true,
          label: true,
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
    return json({ error: 'The signup ID and PIN did not match.' }, { status: 403 });
  }

  let newSlotId = signup.slotId;

  if (slotId && slotId !== signup.slotId) {
    const targetSlot = await prisma.slot.findFirst({
      where: { id: slotId, eventId: signup.eventId },
      include: { _count: { select: { signups: true } } }
    });

    if (!targetSlot) {
      return json({ error: 'That slot is no longer available.' }, { status: 404 });
    }

    if (targetSlot._count.signups >= targetSlot.quantity) {
      return json({ error: 'That slot just filled up. Pick another option.' }, { status: 409 });
    }

    newSlotId = targetSlot.id;
  }

  const updated = await prisma.signup.update({
    where: { id: signup.id },
    data: {
      name: name ?? signup.name,
      email: email !== undefined ? email : signup.email,
      slotId: newSlotId
    },
    select: {
      id: true,
      name: true,
      email: true,
      slotId: true,
      slot: { select: { label: true } }
    }
  });

  const eventData = await prisma.event.findUnique({
    where: { id: signup.eventId },
    select: {
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
  });

  return json({
    success: true,
    signup: {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      slotId: updated.slotId,
      slotLabel: updated.slot.label
    },
    event: eventData && {
      title: eventData.title,
      description: eventData.description,
      location: eventData.location,
      date: eventData.date,
      publicCode: eventData.publicCode
    },
    slots: eventData?.slots.map((slot) => ({
      id: slot.id,
      label: slot.label,
      description: slot.description,
      quantity: slot.quantity,
      taken: slot.signups.length
    })) ?? []
  });
};
