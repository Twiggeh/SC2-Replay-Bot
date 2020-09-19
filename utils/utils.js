/* eslint-disable indent */
/** @typedef { [Promise, Function, Function]} Lock */

/** @returns {Promise<void>} */
export const sleep = async time => new Promise(resolve => setTimeout(resolve, time));

/** @param {Message} msg @returns {boolean} */
export const shouldHandleMsg = msg => {
  let result = 1;
  result &= !msg.author.bot;
  result &= msg.attachments !== undefined;
  result &= msg.channel.name === 'replays-1' || msg.channel.name === 'replays-2';
  return result;
};

/**
 * @param {MessageReaction} msgReact
 * @param {User | import('discord.js').PartialUser} user
 */
export const shouldHandleReact = (msgReact, user) => {
  let result = 1;
  result &= !user.bot;
  result &= msgReact.message.channel.type === 'dm';
  return result;
};

/**
 * Delete all normal messages. If force is specified will also remove Dashboards
 * @param {{UserIDs: string[] | string, DMChannels: DMChannel[] | DMChannel}} arg0
 * @param {boolean} force - Delete EVERY message from the bot, even the Dashboards
 */
export const delAllMsgs = async ({ UserIDs, DMChannels }, force = false) => {
  if (UserIDs !== undefined && !Array.isArray(UserIDs)) UserIDs = [UserIDs];
  if (DMChannels !== undefined && !Array.isArray(DMChannels)) DMChannels = [DMChannels];
  const filterSettled = obj => {
    if (obj.status === 'fulfilled') return obj.value;
    console.error(obj.status);
    console.error(obj.reason);
  };
  const fetchedDms = [];
  if (UserIDs) {
    const dmBuffer = [];
    UserIDs.forEach(id => {
      const user = new User(client, { id });
      dmBuffer.push(user.createDM());
    });
    const result = (await Promise.allSettled(dmBuffer)).map(filterSettled);
    fetchedDms.push(...result);
  }
  if (DMChannels) fetchedDms.push(...DMChannels);
  const msgBuffer = [];
  fetchedDms.forEach(dm => msgBuffer.push(dm.messages.fetch()));
  const fetchedMsgs = (await Promise.allSettled(msgBuffer)).map(filterSettled);
  const deleteBuffer = [];
  fetchedMsgs.forEach(msgMap =>
    Array.from(msgMap).forEach(snowFlakeWithMsg => {
      /** @type {Message} */
      const msg = snowFlakeWithMsg[1];
      const id = snowFlakeWithMsg[0];
      delFromAllPools(id);
      msg.author.bot &&
        (force || !msg.content.startsWith('.\n**DASHBOARD**')) &&
        deleteBuffer.push(msg.delete());
    })
  );
  const deleteResult = await Promise.allSettled(deleteBuffer);
  console.log(
    `Deleted ${deleteResult.length} message${deleteResult.length > 1 ? 's' : ''}`
  );
};

export const includesAny = (str, arr) => {
  let result = 0;
  for (let el of arr) {
    result |= str.includes(el);
  }
  return Boolean(result);
};

/** @returns {Lock} Promise, resolve, reject*/
export const createLock = () => {
  const ptr = {};
  ptr.promise = new Promise((res, rej) => {
    ptr.resolver = res;
    ptr.rejecter = rej;
  }).catch(e => console.error(e));
  return [ptr.promise, ptr.resolver, ptr.rejecter];
};

/**@param {boolean} isReplay
 * @param {Message} msg
 * @param {string} url
 * @returns {Lock} */
export const handleConfIsReplay = async (isReplay, msg, url) => {
  if (isReplay) {
    DATA_FLOW[msg.author.id].resolveInd(0);
    return;
  }

  const answer = await msg.author.send(confirmIsReplayMsg);

  buildTicket(IS_REPLAY_POOL, {
    id: answer.id,
    content: msg.content,
    url,
    origMsg: msg,
    attachArr: msg.attachments,
  });

  await answer.react('✅');
  await answer.react('🛑');
};

// TODO : Add available coaches as a parameter to SC2Replay and handleConfirmation
/** @param {Message} msg*/
export const handleConfirmation = async msg => {
  await msg.author.send(isSC2Replay(getInaccurateCoaches().length));
  updateQueuePool();
  updateAllDashboards();
  await sleep(10 * 1000);
  await delAllMsgs({ UserIDs: msg.author.id });
};

/**
 * @param {Message} msg
 */
const sendMissingData = async (msg, playingAgainst, playingAs, rank) => {
  const replyOnMissing = {
    playingAgainst: {
      reply: `**You have not specified what race you were playing against**
You can omit this error message by specifying your race with:

\`${zVsShortcuts.join(' or ')}\` to specify that your opponent was a Zerg player.
\`${tVsShortcuts.join(' or ')}\` to specify that your opponent was a Terran player.
\`${pVsShortcuts.join(' or ')}\` to specify that your opponent was a Protoss player.

`,
      action: async answer => {
        await answer.react(vsRaceEmojis.vsTerran.id);
        await answer.react(vsRaceEmojis.vsZerg.id);
        await answer.react(vsRaceEmojis.vsProtoss.id);
      },
    },
    playingAs: {
      reply: `**You have not specified what race you were playing**
You can omit this error message by specifying your race with:

\`${zShortcuts.join(' or ')}\` to specify that you played as Zerg.
\`${tShortcuts.join(' or ')}\` to specify that you played as Terran.
\`${pShortcuts.join(' or ')}\` to specify that you played as Protoss.

`,
      action: async answer => {
        await answer.react(raceEmojis.terran.id);
        await answer.react(raceEmojis.zerg.id);
        await answer.react(raceEmojis.protoss.id);
      },
    },
    rank: {
      reply: `**You have not specified what rank you are**
You can omit this error message by specifying your rank with:

\`${bRankCuts.join(' or ')}\` to specify that your rank is bronze.
\`${sRankCuts.join(' or ')}\` to specify that your rank is silver.
\`${gRankCuts.join(' or ')}\` to specify that your rank is gold.
\`${pRankCuts.join(' or ')}\` to specify that your rank is platinum.
\`${dRankCuts.join(' or ')}\` to specify that your rank is diamond.

`,
      action: async answer => {
        await answer.react(rankEmojis.bronze.id);
        await answer.react(rankEmojis.silver.id);
        await answer.react(rankEmojis.gold.id);
        await answer.react(rankEmojis.platinum.id);
        await answer.react(rankEmojis.diamond.id);
      },
    },
  };
  /** @returns {[string, [function(Message) => Promise<void>]]} */
  const buildResData = () => {
    let result = '';
    const actionArr = [];
    if (!playingAgainst) {
      result += replyOnMissing.playingAgainst.reply;
      actionArr.push(replyOnMissing.playingAgainst.action);
    }
    if (!playingAs) {
      result += replyOnMissing.playingAs.reply;
      actionArr.push(replyOnMissing.playingAs.action);
    }
    if (!rank) {
      result += replyOnMissing.rank.reply;
      actionArr.push(replyOnMissing.rank.action);
    }
    return [result, actionArr];
  };
  const [errStr, actionArr] = buildResData();
  if (!errStr) return;
  const answer = await msg.author.send(missingDataError(errStr));
  return [answer, actionArr];
};

/**@param {Message}    msg
 * @param {PlayerRace} playingAs
 * @param {PlayerRank} rank
 * @param {EnemyRace}  playingAgainst
 * @param {string}     url*/
export const handleMissingData = async (msg, playingAgainst, playingAs, rank, url) => {
  if (playingAgainst && playingAs && rank && url) {
    const [enoughDesc, actualContent] = getActualContent(msg);
    if (enoughDesc) {
      await buildTicket(
        QUEUE_POOL,
        {
          id: msg.id,
          activatedAt: Date.now(),
          content: actualContent,
          attachArr: msg.attachArr,
          race: playingAs,
          rank,
          vsRace: playingAgainst,
          student: msg.author,
          url,
        },
        true
      );
      DATA_FLOW[msg.author.id].resolveInd(1);
      return;
    }
    // create a "fake ticket" so that the description collector can access the data
    const ticket = await buildTicket(DATA_VALIDATION_POOL, {
      attachArr: msg.attachments,
      id: (Date.now() + '').substring(4) + Math.floor(Math.random() * 1000000000),
      content: msg.content,
      url,
      origMsg: msg,
      rank,
      race: playingAs,
      vsRace: playingAgainst,
    });
    clearTTimeout(ticket);
    DATA_FLOW[msg.author.id].resolveInd(1);
    console.log('all emojies were received.');
    return;
  }
  const [answer, actions] = await sendMissingData(msg, playingAgainst, playingAs, rank);
  buildTicket(DATA_VALIDATION_POOL, {
    attachArr: msg.attachments,
    id: answer.id,
    content: msg.content,
    url,
    origMsg: msg,
    rank,
    race: playingAs,
    vsRace: playingAgainst,
  });
  for (let action of actions) {
    await action(answer);
  }
};

/**@param {DV_Ticket} ticket
 * @return {Promise<void>} */
export const handlePushToCoaches = async () => {
  updateQueuePool();
  await updateAllDashboards();
};

/**
 * @param {Message} msg - The message to extract the actual content from
 * @returns {[boolean, string]} - If the content is sufficient, and the extracted actual content
 * */
export const getActualContent = msg => {
  const trimmedContent = msg.content.trim();
  const firstBracket = trimmedContent.indexOf('[');
  const lastBracket = trimmedContent.lastIndexOf(']');
  const actualContent =
    trimmedContent.slice(0, firstBracket) +
    trimmedContent.slice(lastBracket, trimmedContent.length - 1);
  return [actualContent.length > 10, actualContent];
};

/**
 * @param {Message} msg - The message sent in the Discord Server (Original coach request)
 */
export const handleDescription = async msg => {
  const [isDesc, actualContent] = getActualContent(msg);
  if (isDesc) {
    const dvTicket = getDVTicket(msg.author.id);

    if (!dvTicket) {
      msg.author.dmChannel.send('Could not find dvTicket in `handleDescription`');
      console.log('Could not find dvTicket in handleDescription');
      return;
    }
    await buildTicket(
      QUEUE_POOL,
      {
        id: msg.id,
        activatedAt: Date.now(),
        content: actualContent,
        attachArr: msg.attachArr,
        race: dvTicket.race,
        rank: dvTicket.rank,
        vsRace: dvTicket.vsRace,
        student: msg.author,
        url: dvTicket.url,
      },
      true
    );
    DATA_FLOW[msg.author.id].resolveAll();
    return console.log('Message contained a description');
  }
  const answer = await msg.author.send(description);
  /** @type {import('./ticket.js').DES_Ticket} */
  await buildTicket(DESCRIPTION_POOL, {
    id: answer.id,
    student: msg.author,
  });

  await answer.react('✅');
  await answer.react('🛑');
};

/**
 * Returns the messages recipients id
 * @param {MessageReaction} msgReact @returns {string} ID of the recipient */
export const getRecipId = msgReact => msgReact.message.channel.recipient.id;

/**@param {object} obj Object to traverse
 * @param {string} path Path to the property
 * @return {*} Property */
export const deepGetObject = (obj, path) =>
  path.split('.').reduce((acc, cur) => acc[cur], obj);

/** @param {string[]} props @param {Object} obj @return {Boolean}*/
export const hasAllProperties = (obj, props) => {
  const result = [];
  for (let key of props) {
    result.push(!!deepGetObject(obj, key));
  }
  return result.reduce((acc, cur) => acc & cur);
};

export const clearTTimeout = ticket => {
  clearTimeout(ticket.timeOutId);
  ticket.timedOut = false;
};

export const getStrUTCDay = num => {
  const number = num === undefined ? date.getUTCDay() : num;
  switch (number) {
    case 0:
      return 'sunday';
    case 1:
      return 'monday';
    case 2:
      return 'tuesday';
    case 3:
      return 'wednesday';
    case 4:
      return 'thursday';
    case 5:
      return 'friday';
    case 6:
      return 'saturday';
  }
};

export const includesAnyArr = (arr1, arr2) => {
  let result = 0;
  for (let i = 0; i < arr2.length; i++) {
    result |= arr1.includes(arr2[i]);
  }
  return result;
};

/**
 * @param {string} str - Filters everything out that is not a number
 */
export const filterNum = str => {
  const numericalChar = new Set(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);
  return str
    .split('')
    .filter(char => numericalChar.has(char))
    .join('');
};

/** @param {MessageReaction} msgReact */
export const badEmoji = msgReact =>
  console.log('User tried to provide wrong emote : ' + emojiFromMsgReact(msgReact));

/**
 * @param {string} studentId
 */
export const getDVTicket = studentId => {
  let index = -1;
  /** @type {import('./ticket').DV_Ticket} */
  const DV_POOL_KEYS = Object.keys(DATA_VALIDATION_POOL);
  for (let i = 0; i < DV_POOL_KEYS.length; i++) {
    index += DATA_VALIDATION_POOL[DV_POOL_KEYS[i]].origMsg.author.id === studentId;
  }
  return DATA_VALIDATION_POOL[DV_POOL_KEYS[index]];
};

import { updateAllDashboards, date } from './dash.js';
import {
  confirmIsReplayMsg,
  missingDataError,
  isSC2Replay,
  description,
} from '../messages.js';
import { User, Message, DMChannel, MessageReaction } from 'discord.js';
import { client } from '../app.js';
import { DATA_FLOW } from '../provider/dataFlow.js';
import { buildTicket } from './ticket.js';
import {
  DATA_VALIDATION_POOL,
  QUEUE_POOL,
  IS_REPLAY_POOL,
  DESCRIPTION_POOL,
} from '../init.js';
import { vsRaceEmojis, raceEmojis, rankEmojis } from '../Emojis.js';
import {
  tShortcuts,
  zShortcuts,
  pShortcuts,
  tVsShortcuts,
  pVsShortcuts,
  zVsShortcuts,
  bRankCuts,
  sRankCuts,
  gRankCuts,
  pRankCuts,
  dRankCuts,
} from '../config/global.js';
import { delFromAllPools, updateQueuePool } from './pool.js';
import { emojiFromMsgReact } from './emojiInteraction.js';
import { getInaccurateCoaches } from '../provider/provider.js';
