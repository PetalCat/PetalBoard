import { Prisma } from '@prisma/client';
import { customAlphabet } from 'nanoid';
import { fail } from '@sveltejs/kit';

import prisma from '$lib/server/prisma';
import { eventSchema } from '$lib/server/validation';

const publicId = customAlphabet('346789ABCDEFGHJKLMNPQRTUVWXY', 8);
const manageId = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 32);

export const actions = {
  default: async ({ request, url }) => {
    const formData = await request.formData();
    const raw = Object.fromEntries(formData) as Record<string, string>;
    const parsed = eventSchema.safeParse(raw);

    if (!parsed.success) {
      return fail(400, {
        success: false,
        errors: parsed.error.flatten().fieldErrors,
        values: raw
      });
    }

    const { title, date, location, description } = parsed.data;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const publicCode = publicId();
      const manageToken = manageId();

      try {
        const event = await prisma.event.create({
          data: {
            title,
            date: new Date(date),
            location: location ?? null,
            description: description ?? null,
            publicCode,
            manageToken
          }
        });

        return {
          success: true,
          event: {
            title: event.title,
            manageUrl: `${url.origin}/event/manage/${event.manageToken}`,
            publicUrl: `${url.origin}/event/${event.publicCode}`,
            manageToken: event.manageToken,
            publicCode: event.publicCode
          }
        } satisfies { success: true; event: Record<string, string> };
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          continue;
        }

        console.error('Failed to create event', error);
        return fail(500, {
          success: false,
          message: 'Unable to create event. Please try again.',
          values: raw
        });
      }
    }

    return fail(500, {
      success: false,
      message: 'Unable to create event. Please try again.',
      values: raw
    });
  }
};
