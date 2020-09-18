/** @param {import("./ticket").DES_Ticket} ticket
 * @param {MessageReaction} msgReact
 */
export const handleAddDesc = async (ticket, emoji, msgReact) => {
  let descContent;
  switch (emoji) {
    case '✅': {
      clearTTimeout(ticket);
      ticket.student.send(thankYouDesc);
      const messages = await ticket.student.dmChannel.awaitMessages(
        /** @param {Message} msg */ msg => msg.author.id === getRecipId(msgReact),
        {
          max: 1,
        }
      );
      const message = messages.first();
      descContent = message.content;
      break;
    }
    case '🛑': {
      clearTTimeout(ticket);
      ticket.student.send(okayNoDescription);
      break;
    }
    default:
      return badEmoji(msgReact);
  }

  const dvTicket = getDVTicket(getRecipId(msgReact));

  if (!dvTicket) {
    msgReact.message.channel.recipient.send('Could not find dvTicket in handleAddDesc');
    console.log('Could not find dvTicket in handleAddDesc');
    return;
  }

  await buildTicket(
    QUEUE_POOL,
    {
      id: dvTicket.id,
      activatedAt: dvTicket.activatedAt,
      content: descContent,
      attachArr: dvTicket.attachArr,
      race: dvTicket.race,
      rank: dvTicket.rank,
      vsRace: dvTicket.vsRace,
      student: dvTicket.origMsg.author,
      url: dvTicket.url,
    },
    true
  );

  delete DATA_VALIDATION_POOL[dvTicket.id];
  delete DESCRIPTION_POOL[ticket.id];
  DATA_FLOW[getRecipId(msgReact)].resolveAll();
};

import { badEmoji, getRecipId, clearTTimeout, getDVTicket } from './utils.js';
import { thankYouDesc, okayNoDescription } from '../messages.js';
import { DESCRIPTION_POOL, QUEUE_POOL, DATA_VALIDATION_POOL } from '../init.js';
import { DATA_FLOW } from '../provider/dataFlow.js';
import { MessageReaction, Message } from 'discord.js';
import { buildTicket } from './ticket.js';
