const allCoachIds = ['145856913014259712'];
// TODO : Put into provider
const MAX_TIMEOUT_QUEUE_POOL = 30 * 60 * 1000;

let date;

// CREATE POOLS
/** @type {Object.<string, IR_Ticket>} */
export const IS_REPLAY_POOL = createPool('IS_REPLAY_POOL');
/** @type {Object.<string, DV_Ticket>} */
export const DATA_VALIDATION_POOL = createPool('DATA_VALIDATION_POOL');
/** @type {Object.<string, Q_Ticket>} */
export const QUEUE_POOL = createPool('QUEUE_POOL');

// EMOJI INTERACTIONS

registerEmojiInteraction(IS_REPLAY_POOL, { binaryAction: { emojis: ['✅', '🛑'] } });
registerEmojiInteraction(DATA_VALIDATION_POOL, {
  race: {
    emojis: [raceEmojis.terran.id, raceEmojis.zerg.id, raceEmojis.protoss.id],
    onAdd: (ticket, emoji) => onAddHelper(ticket, emoji, 'race', raceEmojis),
    onDel: ticket => {
      ticket.race = false;
    },
  },
  rank: {
    emojis: [
      rankEmojis.bronze.id,
      rankEmojis.silver.id,
      rankEmojis.gold.id,
      rankEmojis.platinum.id,
      rankEmojis.diamond.id,
    ],
    onAdd: (ticket, emoji) => onAddHelper(ticket, emoji, 'rank', rankEmojis),
    onDel: ticket => {
      ticket.rank = false;
    },
  },
  vsrace: {
    emojis: [vsRaceEmojis.vsTerran.id, vsRaceEmojis.vsZerg.id, vsRaceEmojis.vsProtoss.id],
    onAdd: (ticket, emoji) => onAddHelper(ticket, emoji, 'vsRace', vsRaceEmojis),
    onDel: ticket => {
      ticket.vsRace = false;
    },
  },
});

registerEmojiInteraction(QUEUE_POOL, {
  prevPage: {
    emojis: ['▶'],
    onAdd: goToPrevPage,
  },
  nextPage: {
    emojis: ['◀'],
    onAdd: goToNextPage,
  },
  selectStudent: {
    emojis: ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'],
    onAdd: selectStudent,
    onDel: finishedCoachingStudent,
  },
});

const init = async () => {
  // LOAD COACHES
  if ((date === undefined) | (Date.now() - date > 30 * 60 * 1000)) {
    date = Date.now();
    const dashboards = await createCoaches(allCoachIds);
    const cache = [];
    dashboards.forEach(dashboard => {
      cache.push(
        (async () => {
          /** @type {import('./Models/Queue_Pool.js').QPE_Opts[]} */
          const qPEntries = [
            ...(await Queue_PoolEntry.find({
              studentID: dashboard.channel.recipient.id,
            })),
          ];
          console.log(qPEntries);
          if (qPEntries.length === 0) {
            // TODO : derive 44 from the actual message with the message methods
            if (dashboard.content.includes('|', 44)) {
              await dashboard.delete();
              await getDashboard(dashboard.channel.recipient);
            }
            return [undefined];
          }
          const result = qPEntries.map(qPEntry => {
            const coach = dashboards.find(dash => dash.author.id === qPEntry.coachID);

            /** @type {import('./utils/ticket.js').Q_Ticket} */
            const options = {
              student: dashboard.channel.recipient,
              id: qPEntry.id,
              activatedAt: qPEntry.activatedAt,
              content: qPEntry.content,
              attachArr: qPEntry.attachArr,
              race: qPEntry.race,
              rank: qPEntry.rank,
              vsRace: qPEntry.vsRace,
              coach,
              emergency: Date.now() - qPEntry.activatedAt > MAX_TIMEOUT_QUEUE_POOL,
              url: qPEntry.url,
            };

            return ticketFactory(QUEUE_POOL, options, false);
          });
          return result;
        })()
      );
    });

    /** @type {import('./utils/ticket.js').AllTicket_Out[]} */
    const tickets = (await Promise.allSettled(cache))
      .flatMap(el => el.value)
      .filter(el => !!el);

    tickets.forEach(ticket =>
      addToPool(
        ticket,
        QUEUE_POOL,
        Math.max(10, getTicketTimeout(QUEUE_POOL) - Date.now() + ticket.activatedAt)
      )
    );
  }
  await updateAllDashboards();
};

import { rankEmojis, raceEmojis, vsRaceEmojis } from './Emojis.js';
import { registerEmojiInteraction, onAddHelper } from './utils/emojiInteraction.js';
import { createPool, addToPool } from './utils/pool.js';
import {
  finishedCoachingStudent,
  goToPrevPage,
  selectStudent,
  goToNextPage,
  getDashboard,
  updateAllDashboards,
} from './utils/dash.js';
import { createCoaches } from './utils/coach.js';
import { ticketFactory, getTicketTimeout } from './utils/ticket.js';
import Queue_PoolEntry from './Models/Queue_Pool.js';

export default init;
