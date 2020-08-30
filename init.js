const allCoachIds = ['145856913014259712', '177517201023172609'];
// TODO : Put into provider
const MAX_TIMEOUT_QUEUE_POOL = 30 * 60 * 1000;

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
    /** @param {import('./utils/ticket.js').CL_Ticket} clTicket */
    onAdd: async (clTicket, emoji, msgReact) => {
      // TODO : Free up the student's QUEUE_TICKET if he was satisfied, if not reset it.
      const { dTicket, qTicket } = clTicket;

      /** @type {import('./Models/CoachLog.js').CL_Opts} */
      const clTOpts = {
        coachID: clTicket.coachID,
        coachName: qTicket.coach.tag,
        studentName: qTicket.student.tag,
        studentID: qTicket.student.id,
        activatedAt: qTicket.activatedAt,
        startedCoaching: dTicket.startedCoaching,
        endedCoaching: Date.now(),
        race: qTicket.race,
        rank: qTicket.rank,
        vsRace: qTicket.vsRace,
        url: qTicket.url,
        content: qTicket.content,
      };
      // TODO : ratings for coach and student
      // TODO : wrap this into an interrupt runner.
      switch (emoji) {
        case '✅': {
          clTOpts.success = true;
          delete QUEUE_POOL[qTicket.id];

          await Queue_PoolEntry.findOneAndDelete({ id: qTicket.id });
          await msgReact.message.channel.send(thankYou(msgReact));
          break;
        }
        case '🛑': {
          qTicket.startedCoaching = undefined;
          qTicket.coach = undefined;
          qTicket.activatedAt = Date.now();
          qTicket.emergency = false;

          /** @type {import('./Models/Queue_Pool.js').QPE_Opts} */
          const qPoolEntry = await Queue_PoolEntry.findOne({ id: qTicket.id });
          qPoolEntry.coachID = undefined;
          qPoolEntry.startedCoaching = undefined;
          qPoolEntry.activatedAt = Date.now();
          await qPoolEntry.save();

          clTOpts.success = false;

          await msgReact.message.channel.send(queueRecycle(clTOpts));
          break;
        }
        default:
          return badEmoji(msgReact);
      }

      const cLEntry = new CoachLogEntry(clTOpts);
      cLEntry.save();

      // free the coaches dashboard
      dTicket.studentQTicketID = undefined;
      dTicket.startedCoaching = undefined;
      dTicket.endedCoaching = undefined;
      dTicket.lockedEmojiInteractionGroups = [];

      delete COACHLOG_POOL[clTicket.id];

      updateQueuePool();
      await updateAllDashboards();
      await sleep(10000);

      delAllMsgs({ UserIDs: clTOpts.studentID });
    },
  },
});

const init = async () => {
  // LOAD COACHES
  const initCache = [getDashboards(allCoachIds), Queue_PoolEntry.find({})];

  /** @type {[{value: Message[]}, {value: import('./Models/Queue_Pool.js').QPE_Opts[]}]} */
  const [resMessages, { value: allQueueEntries }] = await Promise.allSettled(initCache);
  const { value: dashboards } = resMessages;
  const qPEntries = [...allQueueEntries];

  const userFetchCache = [];

  dashboards.forEach(dash => {
    // find out if have to recreate dashboard
    const foundEmoji = [];
    dash.reactions.cache.every(react => {
      foundEmoji.push(
        DashEmojis.includes(react.emoji.name) | DashEmojis.includes(react.emoji.name)
      );
      return react.count === 1;
    });
    if (foundEmoji.length !== 7) {
      userFetchCache.push(putAllReactsOnDash(dash));
    }
    // find queuepool ticket that is connected to dashboard
    const studentTicket = qPEntries.find(
      entry => entry.coachID === dash.channel.recipient.id
    );

    // build a dashboardTicket with the queuepool if applicable
    buildTicket(DASHBOARD_POOL, {
      id: dash.id,
      coachID: studentTicket?.coachID,
      studentQTicketID: studentTicket?.id,
      startedCoaching: studentTicket?.startedCoaching,
      lockedEmojiInteractionGroups: studentTicket ? ['selectStudent'] : [],
    });

    // if there are no queuepool entries return => if looping is too slow the loop can happen after
    // if (qPEntries.length === 0) return;
  });

  // each queuepool
  qPEntries.forEach(qPEntry =>
    userFetchCache.push(
      (async () => {
        // find the dashboard? that is connected to a queuePoolEntry
        const dashOfCoach = dashboards.find(
          /** @param {Message} dash */
          dash => dash.channel.recipient.id === qPEntry.coachID
        );

        // build queuepool ticket with dashboards id if applicable
        /** @type {import('./utils/ticket.js').Q_Ticket} */
        const options = {
          student: await new Discord.User(client, { id: qPEntry.studentID }).fetch(),
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

        buildTicket(
          QUEUE_POOL,
          options,
          false,
          Math.max(10, getTicketTimeout(QUEUE_POOL) - Date.now() + options.activatedAt)
        );
      })()
    )
  );

  //  dashboards.forEach(dash => {
  //    ticketCache.push(
  //      (async () => {
  //        let recreateDash = 0;
  //        const foundEmoji = [];
  //
  //        recreateDash |= !dash.reactions.cache.every(react => {
  //          foundEmoji.push(
  //            DashEmojis.includes(react.emoji.name) | DashEmojis.includes(react.emoji.name)
  //          );
  //          return react.count === 1;
  //        });
  //        recreateDash |=
  //          foundEmoji.length !== 7 || !foundEmoji.reduce((acc, cur) => acc & cur);
  //        // TODO : derive 44 from the actual message with the message methods
  //        recreateDash |= qPEntries.length === 0 && dash.content.includes('|', 44);
  //
  //        // DEVELOPER MODE HELPERS
  //        //if (recreateDash) {
  //        // await dashboard.delete();
  //        // await getDashboard(dashboard.channel.recipient);
  //
  //        //}
  //        if (foundEmoji.length !== 7) {
  //          ticketCache.push(putAllReactsOnDash(dash));
  //        }
  //
  //        if (qPEntries.length === 0) return [undefined];
  //
  //        qPEntries.forEach(qPEntry => {
  //          const dashOfCoach = dashboards.find(
  //            /** @param {Message} dash */
  //            dash => dash.channel.recipient.id === qPEntry.coachID
  //          );
  //
  //          /** @type {import('./utils/ticket.js').Q_Ticket} */
  //          const options = {
  //            student: dash.channel.recipient,
  //            id: qPEntry.id,
  //            activatedAt: qPEntry.activatedAt,
  //            content: qPEntry.content,
  //            attachArr: qPEntry.attachArr,
  //            race: qPEntry.race,
  //            rank: qPEntry.rank,
  //            vsRace: qPEntry.vsRace,
  //            coach: dashOfCoach?.channel?.recipient,
  //            emergency: Date.now() - qPEntry.activatedAt > MAX_TIMEOUT_QUEUE_POOL,
  //            url: qPEntry.url,
  //            startedCoaching: qPEntry.startedCoaching,
  //          };
  //
  //          console.log(dashOfCoach);
  //
  //          buildTicket(DASHBOARD_POOL, {
  //            coachID: qPEntry.coachID,
  //            id: dashOfCoach.id,
  //            studentQTicketID: qPEntry.id,
  //            startedCoaching: qPEntry.startedCoaching,
  //            lockedEmojiInteractionGroups: ['selectStudent'],
  //          });
  //
  //          buildTicket(
  //            QUEUE_POOL,
  //            options,
  //            false,
  //            Math.max(10, getTicketTimeout(QUEUE_POOL) - Date.now() + options.activatedAt)
  //          );
  //        });
  //      })()
  //    );
  //  });
  //
  await Promise.allSettled(userFetchCache);
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
  putAllReactsOnDash,
  getDashboards,
} from './utils/dash.js';
import { createCoaches } from './utils/coach.js';
import { getTicketTimeout, buildTicket } from './utils/ticket.js';
import Queue_PoolEntry from './Models/Queue_Pool.js';
import Discord, { Message } from 'discord.js';
import { badEmoji, sleep, delAllMsgs } from './utils/utils.js';
import CoachLogEntry from './Models/CoachLog.js';
import { thankYou, queueRecycle } from './messages.js';
import { client } from './app.js';

export default init;
