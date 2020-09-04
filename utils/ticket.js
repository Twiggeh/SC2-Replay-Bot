/* eslint-disable indent */
/**@typedef PlayerRank
 * @type {false | "bronze" | "silver"   | "gold"  | "platinum" | "diamond"} Players Rank
 * @typedef PlayerRace
 * @type {false | "zerg"   | "terran"   | "protoss"} Players Race
 * @typedef EnemyRace
 * @type {false | "vsZerg" | "vsTerran" | "vsProtoss"} VsPlayerRank */

/**@typedef T_FactoryOptions
 * @type {Object}
 * @prop {string} id        - Message ID
 * @prop {string} content   - Message Content
 * @prop {string} url       - Url of the first detected replay
 * @prop {Message["attachments"]} attachArr - Array with all the Attachments of the orig msg*/

/**@typedef DVT_Opts
 * @type {Object}
 * @prop {Message} origMsg - Discord Message
 * @prop {PlayerRank} rank    - Players Rank
 * @prop {PlayerRace} race    - Players Race
 * @prop {EnemyRace}  vsRace  - VsPlayerRank
 * @typedef {T_FactoryOptions & DVT_Opts} DVT_FactoryOptions */

/**@typedef QT_Opts
 * @type {Object}
 * @prop {PlayerRank} rank    - Players Rank
 * @prop {PlayerRace} race    - Players Race
 * @prop {EnemyRace}  vsRace  - VsPlayerRank
 * @prop {number} emojiIdentifier - The emojiIdentifier of the QT_Ticket (The Emoji to use to select a user)
 * @typedef {T_FactoryOptions & QT_Opts} QT_FactoryOptions */

/**@typedef {T_FactoryOptions & QT_FactoryOptions & DVT_FactoryOptions | D_Ticket} AllTicket_FactoryOptions */

/**@typedef {Object} Ticket
 * @prop {string}  id        - Message ID
 * @prop {string}  url       - Url of the first detected replay
 * @prop {boolean} emergency - If this ticket has been neglected for too long.
 * @prop {string}  activatedAt      - The time at which the ticket got created
 * @prop {Message["attachments"]} attachArr - Array with all the Attachments of the orig msg */

/** @typedef {Object} T_Out
 * @prop {Pool}    pool      - Instance of POOL
 * @prop {string}  content   - Message Content
 * @prop {boolean} timedOut  - Whether the message has timed out
 * @prop {number}  timeOutId - The timeoutId
 * @typedef {Ticket & T_Out} Ticket_Out
 */

/**@typedef {Object} IR_T
 * @prop {Message} origMsg   - Discord Message
 * @prop {sting[]} lockedEmojiInteractionGroups - All groups that have been locked from being interacted.
 * @typedef {Ticket & IR_T} IR_Ticket*/

/**@typedef {Object} DV
 * @prop {PlayerRank} rank   - Players Rank
 * @prop {PlayerRace} race   - Players Race
 * @prop {PlayerRace} vsRace - VsPlayerRank
 * @prop {Array}   reactionHistory  - The emoji reaction history
 * @prop {boolean} hasBeenReactedTo - If the Ticket has received a User's reaction
 * @typedef {IR_Ticket & DV} DV_Ticket */

/**@typedef {Object} Q
 * @prop {PlayerRank} rank     - Players Rank
 * @prop {PlayerRace} race     - Players Race
 * @prop {PlayerRace} vsRace   - VsPlayerRank
 * @prop {string} content - The content of the Student's Message
 * @prop {User} coach   - Coach that has taken on the role of coaching the user
 * @prop {User} student - Student that has Requested the coaching
 * @prop {number} emojiIdentifier - EmojiNumber that is going to allow the coach to pull the user.
 * @prop {number} startedCoaching - Date.now() of when the student started to be coached
 * @prop {boolean} beingCoached - If the ticket is being coached right now.
 * @typedef {Ticket & Q} Q_Ticket */

/**@typedef {Object} D_Ticket
 * @prop {string} id - ID of the coaches' Dashboard.
 * @prop {string} coachID - The Id of the coach
 * @prop {Array}  lockedEmojiInteractionGroups - Locked Interactions
 * @prop {string} studentQTicketID - ID of the QUEUE_POOL entry that is currently being coached.
 * @prop {number} startedCoaching - Date.now() of when the coach started to coach.
 * @prop {number} endedCoaching - Date.now() of the end of the coaching session.
 */

/**@typedef {Object} CL_Ticket
 * @prop {string} id - ID of the successCoaching Message.
 * @prop {string} coachID - The Id of the coach
 * @prop {Array}  lockedEmojiInteractionGroups - Locked Interactions of the CoachLogTicket
 * @prop {string} studentQTicketID - ID of the QUEUE_POOL entry that is has been coached.
 * @prop {D_Ticket} dTicket - The Dashboard Ticket of the Coach
 * @prop {Q_Ticket} qTicket - The QueuePool Ticket of the User
 * @prop {boolean} [timedOut=false] - If the ticket has timed out
 */

/**@typedef AllTicket_Out
 * @type { CL_Ticket | D_Ticket | Ticket_Out | DV_Ticket & T_Out | IR_Ticket & T_Out | Q_Ticket & T_Out} */

export const timeOutHandler = async (ticket, system) => {
  console.log('timedout');
  ticket.timedOut = true;
  switch (system) {
    case 'IS_REPLAY_POOL': {
      const aborted = await newInterruptRunner({
        abortPtr: ticket,
        abortPath: 'timedOut',
        negatePtr: true,
        actions: [
          () => ticket.origMsg.author.send(isSC2ReplayReminder),
          () => sleep(30 * 1000),
          () => ticket.origMsg.author.send(isSC2Fail),
        ],
      });
      if (aborted) return;
      DATA_FLOW[ticket.origMsg.author.id].abort().rejectAll().remove();
      await sleep(15 * 1000);
      await delAllMsgs({ UserIDs: ticket.origMsg.author.id });
      return;
    }
    case 'DATA_VALIDATION_POOL': {
      const aborted = await newInterruptRunner({
        abortPtr: ticket,
        abortPath: 'timedOut',
        negatePtr: true,
        actions: [
          () => ticket.origMsg.author.send(missingDataReminder),
          () => sleep(60 * 1000),
          () => ticket.origMsg.author.send(missingDataFail),
        ],
      });
      if (aborted) return;
      DATA_FLOW[ticket.origMsg.author.id].abort().rejectAll().remove();
      await sleep(15 * 1000);
      await delAllMsgs({ UserIDs: ticket.origMsg.author.id });
      return;
    }
    case 'QUEUE_POOL': {
      const aborted = await newInterruptRunner({
        abortPtr: ticket,
        abortPath: 'timedOut',
        negatePtr: true,
        actions: [
          () => {
            //TODO: finish timeout actions
          },
        ],
      });
      // TODO : Finish aborted
      return aborted;
    }
    case 'COACHLOG_POOL': {
      /**@type {CL_Ticket}*/
      const clTicket = ticket;
      const cltOpts = createCLTOpts(clTicket);
      newInterruptRunner({
        abortPtr: ticket,
        abortPath: 'timedOut',
        negatePtr: true,
        actions: [
          async () => {
            successAfterCoachingInter(cltOpts);
            await clTicket.qTicket.student.send(timeoutThankYou(cltOpts.studentName));
            cleanUpAfterCoaching(clTicket, cltOpts);
          },
          () => sleep(5000),
          () => delAllMsgs({ UserIDs: cltOpts.studentID }),
        ],
      });
      return;
    }
    default:
      console.error(new Error(`Wrong system (${system}) provided.`));
  }
};

/**
 * @param {import('./pool.js').Pool} pool
 */
export const getTicketTimeout = pool => {
  switch (pool.name) {
    case 'IS_REPLAY_POOL':
      return 60 * 1000;
    case 'DATA_VALIDATION_POOL':
      return 60 * 1000;
    case 'QUEUE_POOL':
      return 0; // TODO : Add pings
    case 'DASHBOARD_POOL':
      return 0;
    case 'COACHLOG_POOL':
      return 60 * 1000;
    default:
      console.error(`Wrong name provided (${pool.name})`);
  }
};

/**@param {Pool} pool Instance of POOL
 * @param {AllTicket_FactoryOptions} param1
 * @param {boolean} saveToDB - Whether to save to the database
 * @return { AllTicket_Out | Promise<AllTicket_Out>}*/
export const ticketFactory = async (
  pool,
  {
    id,
    content,
    url,
    attachArr,
    origMsg,
    race,
    vsRace,
    rank,
    activatedAt,
    student,
    coach,
    startedCoaching,
    studentQTicketID,
    emojiIdentifier,
    lockedEmojiInteractionGroups = [],
    coachID,
    dTicket,
    qTicket,
  },
  saveToDB
) => {
  switch (pool.name) {
    case 'DATA_VALIDATION_POOL':
      return {
        id,
        hasBeenReactedTo: false,
        reactionHistory: [],
        activatedAt: Date.now(),
        timedOut: false,
        timeOutId: undefined,
        emergency: false,
        lockedEmojiInteractionGroups: [],
        race,
        attachArr,
        vsRace,
        rank,
        content,
        origMsg,
        url,
      };
    case 'IS_REPLAY_POOL':
      return {
        id,
        hasBeenReactedTo: false,
        reactionHistory: [],
        activatedAt: Date.now(),
        timedOut: false,
        timeOutId: undefined,
        emergency: false,
        lockedEmojiInteractionGroups: [],
        content,
        origMsg,
        url,
        attachArr,
      };
    case 'QUEUE_POOL': {
      /** @type {Q_Ticket} */
      const result = {
        id,
        url,
        activatedAt,
        timedOut: false,
        timeOutId: undefined,
        emergency: false,
        lockedEmojiInteractionGroups: [],
        content,
        attachArr,
        race,
        rank,
        vsRace,
        coach,
        student,
        emojiIdentifier,
        startedCoaching,
      };
      if (saveToDB) {
        const queuePoolEntry = new Queue_PoolEntry({
          id,
          activatedAt,
          content,
          race,
          rank,
          vsRace,
          coachID: coach?.id,
          studentID: student.id,
          url,
          attachArr,
          startedCoaching,
        });
        queuePoolEntry.save();
      }
      return result;
    }
    case 'DASHBOARD_POOL': {
      if (!startedCoaching || !studentQTicketID) console.log('break');
      if ((!startedCoaching || !studentQTicketID) && id && DASHBOARD_POOL[id])
        return DASHBOARD_POOL[id];

      return {
        id,
        studentQTicketID,
        startedCoaching,
        lockedEmojiInteractionGroups,
        coachID,
      };
    }
    case 'COACHLOG_POOL': {
      /** @type {CL_Ticket}*/
      return {
        id,
        coachID,
        lockedEmojiInteractionGroups,
        studentQTicketID,
        dTicket,
        qTicket,
      };
    }
    default:
      console.error(new Error(`Wrong type (${pool.name}) provided.`));
  }
};

/**@param {import('./pool.js').Pool} pool
 * @param {AllTicket_FactoryOptions} options
 * @param {boolean} [saveToDB=false]
 */
export const buildTicket = async (
  pool,
  options,
  saveToDB = false,
  overrideTimeout = false
) => {
  const ticket = await ticketFactory(pool, options, saveToDB);

  const timeout = overrideTimeout === false ? getTicketTimeout(pool) : overrideTimeout;
  addToPool(ticket, pool, timeout);
  return ticket;
};

/**@returns {{playingAs      : false | "zerg" | "terran" | "protoss",
              playingAgainst : false | "zerg" | "terran" | "protoss",
              isReplay       : boolean,
              rank           : false | "bronze" | "silver" | "gold" | "platinum" | "diamond",
            }} */
export const whichDataPresent = msg => {
  const lowerMsg = msg.content.toLowerCase();
  return {
    playingAs: includesAny(lowerMsg, zShortcuts)
      ? 'zerg'
      : includesAny(lowerMsg, pShortcuts)
      ? 'protoss'
      : includesAny(lowerMsg, tShortcuts)
      ? 'terran'
      : false,
    playingAgainst: includesAny(lowerMsg, zVsShortcuts)
      ? 'vsZerg'
      : includesAny(lowerMsg, pVsShortcuts)
      ? 'vsProtoss'
      : includesAny(lowerMsg, tVsShortcuts)
      ? 'vsTerran'
      : false,
    replay: includesAny(lowerMsg, replayCuts),
    rank: includesAny(lowerMsg, bRankCuts)
      ? 'bronze'
      : includesAny(lowerMsg, sRankCuts)
      ? 'silver'
      : includesAny(lowerMsg, gRankCuts)
      ? 'gold'
      : includesAny(lowerMsg, pRankCuts)
      ? 'platinum'
      : includesAny(lowerMsg, dRankCuts)
      ? 'diamond'
      : false,
  };
};

/**@typedef {Boolean} msgHasReplay If the message contains a replay.
 * @typedef {string} url The Url that contains the replay message.
 * @typedef {string[]} UrlArray All urls found inside message.
 * @typedef {MessageAttachment[]} AttachArr All attachments found inside message.
 * @typedef {[msgHasReplay, UrlArray, AttachArr]} SpecialReturn */

/** @returns {SpecialReturn} */
export const getMsgAttachments = msg => {
  const urlArr = [];
  const attachMsgArr = [];
  let url = '';
  let msgHasReplay = false;
  for (let msgArr of msg.attachments) {
    const msgAttach = msgArr[1];
    urlArr.push(msgAttach.url);
    if (msgAttach.url.includes('.SC2Replay')) {
      msgHasReplay = true;
      url = msgAttach.url;
    }
    attachMsgArr.push(msgAttach);
  }

  return [msgHasReplay, url, urlArr, attachMsgArr];
};

import { addToPool } from './pool.js';
import { newInterruptRunner } from './interruptRunner.js';
import {
  missingDataFail,
  missingDataReminder,
  isSC2Fail,
  isSC2ReplayReminder,
  timeoutThankYou,
} from '../messages.js';
import { sleep, delAllMsgs, includesAny } from './utils.js';
import { DATA_FLOW } from '../provider/dataFlow.js';
import {
  pVsShortcuts,
  zVsShortcuts,
  tShortcuts,
  pShortcuts,
  zShortcuts,
  tVsShortcuts,
  replayCuts,
  bRankCuts,
  sRankCuts,
  gRankCuts,
  pRankCuts,
  dRankCuts,
} from '../config/global.js';
import Queue_PoolEntry from '../Models/Queue_Pool.js';
import { User } from 'discord.js';
import { DASHBOARD_POOL, QUEUE_POOL, COACHLOG_POOL } from '../init.js';
import {
  createCLTOpts,
  successAfterCoachingInter,
  cleanUpAfterCoaching,
} from './coachlog.js';
import { updateAllDashboards } from './dash.js';
import CoachLogEntry from '../Models/CoachLog.js';
