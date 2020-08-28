const allCoachIds = ['145856913014259712'];
// TODO : Put into provider
const MAX_TIMEOUT_QUEUE_POOL = 30 * 60 * 1000;

let date;

// CREATE POOLS
/** @type {Object.<string, import('./utils/ticket.js').IR_Ticket>} */
export const IS_REPLAY_POOL = createPool('IS_REPLAY_POOL');
/** @type {Object.<string, import('./utils/ticket.js').DV_Ticket>} */
export const DATA_VALIDATION_POOL = createPool('DATA_VALIDATION_POOL');
/** @type {Object.<string, import('./utils/ticket.js').Q_Ticket>} */
export const QUEUE_POOL = createPool('QUEUE_POOL');
/** @type {Object.<string, import('./utils/ticket.js').D_Ticket>} */
export const DASHBOARD_POOL = createPool('DASHBOARD_POOL');
/** @type {Object.<string, import('./utils/ticket.js').CL_Ticket>} */
export const COACHLOG_POOL = createPool('COACHLOG_POOL');

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

registerEmojiInteraction(DASHBOARD_POOL, {
  prevPage: {
    emojis: ['◀'],
    onAdd: goToPrevPage,
  },
  nextPage: {
    emojis: ['▶️'],
    onAdd: goToNextPage,
  },
  selectStudent: {
    emojis: ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'],
    onAdd: selectStudent,
    onDel: finishedCoachingStudent,
  },
});

registerEmojiInteraction(COACHLOG_POOL, {
  prevPage: {
    emojis: ['✅', '🛑'],
    /** @param {import('./utils/ticket.js').CL_Ticket} CLTicket */
    onAdd: (CLTicket, emoji, msgReaction) => {
      // TODO : finish this function
      console.log(CLTicket, emoji, msgReaction);
    },
  },
});

const init = async () => {
  // LOAD COACHES
  const initCache = [createCoaches(allCoachIds), Queue_PoolEntry.find({})];

  const [{ value: dashboards }, { value: allQueueEntries }] = await Promise.allSettled(
    initCache
  );

  /** @type {import('./Models/Queue_Pool.js').QPE_Opts[]} */
  const qPEntries = [...allQueueEntries];

  const ticketCache = [];
  dashboards.forEach(dashboard => {
    ticketCache.push(
      (async () => {
        let recreateDash = 0;

        const foundEmoji = [];
        recreateDash |= !dashboard.reactions.cache.every(react => {
          foundEmoji.push(
            DashEmojis.includes(react.emoji.name) | DashEmojis.includes(react.emoji.name)
          );
          return react.count === 1;
        });
        recreateDash |=
          foundEmoji.length !== 7 || !foundEmoji.reduce((acc, cur) => acc & cur);
        // TODO : derive 44 from the actual message with the message methods
        recreateDash |= qPEntries.length === 0 && dashboard.content.includes('|', 44);

        if (recreateDash) {
          await dashboard.delete();
          await getDashboard(dashboard.channel.recipient);
        }

        if (qPEntries.length === 0) return [undefined];

        qPEntries.forEach(qPEntry => {
          const dashOfCoach = dashboards.find(
            /** @param {Message} dash */
            dash => dash.channel.recipient.id === qPEntry.coachID
          );

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
            coach: dashOfCoach?.channel?.recipient,
            emergency: Date.now() - qPEntry.activatedAt > MAX_TIMEOUT_QUEUE_POOL,
            url: qPEntry.url,
            startedCoaching: qPEntry.startedCoaching,
          };

          if (dashOfCoach) {
            buildTicket(DASHBOARD_POOL, {
              coachID: qPEntry.coachID,
              id: dashOfCoach.id,
              studentQTicketID: qPEntry.id,
              startedCoaching: qPEntry.startedCoaching,
              lockedEmojiInteractionGroups: ['selectStudent'],
            });
          }

          buildTicket(
            QUEUE_POOL,
            options,
            false,
            Math.max(10, getTicketTimeout(QUEUE_POOL) - Date.now() + options.activatedAt)
          );
        });
      })()
    );
  });

  await Promise.allSettled(ticketCache);
  updateQueuePool();
  await updateAllDashboards();
};

import { rankEmojis, raceEmojis, vsRaceEmojis, DashEmojis } from './Emojis.js';
import { registerEmojiInteraction, onAddHelper } from './utils/emojiInteraction.js';
import { createPool, updateQueuePool } from './utils/pool.js';
import {
  finishedCoachingStudent,
  goToPrevPage,
  selectStudent,
  goToNextPage,
  getDashboard,
  updateAllDashboards,
} from './utils/dash.js';
import { createCoaches } from './utils/coach.js';
import { getTicketTimeout, buildTicket } from './utils/ticket.js';
import Queue_PoolEntry from './Models/Queue_Pool.js';
import { Message } from 'discord.js';

export default init;
