import { Prisma } from "@prisma/client";

export type EventType = Prisma.EventGetPayload<{
  include: {
    creator: {
      select: {
        id: true;
        discordUsername: true;
        discordAvatar: true;
      };
    };
  };
}>;
