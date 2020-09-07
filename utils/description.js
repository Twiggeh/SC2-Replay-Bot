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

  let dvTicket;
  /** @type {import('./ticket').DV_Ticket} */
  const DATA_VALIDATION_POOL_KEYS = Object.keys(DATA_VALIDATION_POOL);
  for (let key of DATA_VALIDATION_POOL_KEYS) {
    if (DATA_VALIDATION_POOL[key].origMsg.author.id === getRecipId(msgReact))
      dvTicket = DATA_VALIDATION_POOL[key];
  }

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

  delete DATA_VALIDATION_POOL[msgReact.message.id];
  DATA_FLOW[getRecipId(msgReact)].resolveAll();
  delete DESCRIPTION_POOL[ticket.id];
};

import { badEmoji, getRecipId, clearTTimeout } from './utils.js';
import { thankYouDesc, okayNoDescription } from '../messages.js';
import { DESCRIPTION_POOL, QUEUE_POOL, DATA_VALIDATION_POOL } from '../init.js';
import { DATA_FLOW } from '../provider/dataFlow.js';
import { MessageReaction, Message } from 'discord.js';
import { buildTicket } from './ticket.js';
