/**
 * Cleans up all pools after coaching the student.
 * Uploads the log to the database
 * @param {import('./ticket.js').CL_Ticket} clTicket
 * @param {import('../Models/CoachLog.js').CL_Opts} [ cltOpts=false ]
 * @param {boolean} [ delQueuePoolEntry=false ]
 */
export const cleanUpAfterCoaching = async (
  clTicket,
  cltOpts,
  delQueuePoolEntry = true
) => {
  const { dTicket, qTicket } = clTicket;
  DASHBOARD_POOL[dTicket.id].startedCoaching = undefined;
  DASHBOARD_POOL[dTicket.id].studentQTicketID = undefined;
  DASHBOARD_POOL[dTicket.id].endedCoaching = undefined;
  DASHBOARD_POOL[dTicket.id].lockedEmojiInteractionGroups = [];

  delete COACHLOG_POOL[clTicket.id];
  if (delQueuePoolEntry) delete QUEUE_POOL[qTicket.id];

  updateQueuePool();

  const asyncOps = [
    (() => {
      if (delQueuePoolEntry) return Queue_PoolEntry.findOneAndDelete({ id: qTicket.id });
    })(),
    updateAllDashboards(),
    (() => {
      if (cltOpts) return new CoachLogEntry(cltOpts).save();
    })(),
  ];
  await Promise.allSettled(asyncOps);
};

/**
 * The branch that handles the ✅ case of the successful coaching message
 * @param {import('../Models/CoachLog.js').CL_Opts} clTOpts
 */
export const successAfterCoachingInter = clTOpts => {
  clTOpts.success = true;
};

/**
 * @param {import('./ticket.js').CL_Ticket} clTicket
 * @returns {import('../Models/CoachLog.js').CL_Opts}
 */
export const createCLTOpts = clTicket => {
  const { qTicket, dTicket } = clTicket;
  return {
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
};

/**
 * @param {import('./ticket.js').Q_Ticket} qTicket
 * @param {boolean} resetTime - If the activatedAt should be reset
 */
export const delCoachFromQTicket = async (qTicket, resetTime) => {
  qTicket.startedCoaching = undefined;
  qTicket.coach = undefined;
  if (resetTime) qTicket.activatedAt = Date.now();
  qTicket.emergency = false;
  qTicket.pendingDeletion = false;

  updateQueuePool();
  /** @type {import('./Models/Queue_Pool.js').QPE_Opts} */
  const qPoolEntry = await Queue_PoolEntry.findOne({ id: qTicket.id });
  qPoolEntry.coachID = undefined;
  qPoolEntry.startedCoaching = undefined;
  qPoolEntry.activatedAt = Date.now();
  await qPoolEntry.save();
};

/** @param {import('./ticket.js').CL_Ticket} clTicket
 * @param {MessageReaction} msgReact
 */
export const handleAfterCoachingInter = async (clTicket, emoji, msgReact) => {
  const { qTicket } = clTicket;
  const cltOpts = createCLTOpts(clTicket);
  // TODO : ratings for coach and student
  switch (emoji) {
    case '✅': {
      successAfterCoachingInter(cltOpts);
      await msgReact.message.channel.send(thankYou(msgReact));
      break;
    }
    case '🛑': {
      await delCoachFromQTicket(qTicket, true);
      cltOpts.success = false;
      await msgReact.message.channel.send(queueRecycle(cltOpts));
      break;
    }
    default:
      return badEmoji(msgReact);
  }

  await cleanUpAfterCoaching(clTicket, cltOpts, emoji !== '🛑');
  await sleep(10 * 1000);

  delAllMsgs({ UserIDs: cltOpts.studentID });
};

import { QUEUE_POOL, COACHLOG_POOL, DASHBOARD_POOL } from '../init.js';
import Queue_PoolEntry from '../Models/Queue_Pool.js';
import { thankYou, queueRecycle } from '../messages.js';
import { badEmoji, sleep, delAllMsgs } from './utils.js';
import CoachLogEntry from '../Models/CoachLog.js';
import { updateQueuePool } from './pool.js';
import { updateAllDashboards } from './dash.js';
import { MessageReaction } from 'discord.js';
