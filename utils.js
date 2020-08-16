/* eslint-disable indent */
/**
 * @typedef {{[Promise, function, function]}} Lock
 */

export const sleep = async time => new Promise(resolve => setTimeout(resolve, time));

export const shouldHandleMsg = msg => {
  if (msg.author.bot) return false;
  if (msg.attachments === undefined) return false;
  if (msg.channel.name !== 'replays-1' && msg.channel.name !== 'replays-2') return false;
  return true;
};

// TODO : Refactor into provider (Pools Provider)
const POOLS = {};

const createPool = (name, methods) => {
  class Pool {}
  if (methods)
    for (let method in methods) {
      Pool.prototype[method] = methods[method];
    }
  const result = new Pool();
  POOLS[name] = result;
  Pool.prototype.name = name;
  return result;
};

export const QUEUE_POOL = createPool('QUEUE_POOL');

export const IS_REPLAY_POOL = createPool('IS_REPLAY_POOL');

export const isPartOfPool = id => {
  for (let poolName in POOLS) {
    const pool = POOLS[poolName];
    if (pool[id] !== undefined) return poolName;
  }
  return false;
};

const ticketFactory = (pool, { id, content, url, origMsg, lock, res, rej }) => {
  switch (pool.name) {
    case 'DATA_VALIDATION':
    case 'IS_REPLAY_POOL':
      return {
        id,
        hasBeenReactedTo: false,
        reactionHistory: [],
        activatedAt: Date.now(),
        timedOut: 0,
        timeOutId: undefined,
        emergency: false,
        content,
        origMsg,
        url,
        pool,
        lock,
        res,
        rej,
      };
    default:
      console.error(new Error(`Wrong type (${pool.name}) provided.`));
  }
};

const delFromAllPools = id => {
  for (let poolName in POOLS) {
    delete POOLS[poolName][id];
  }
};

/**
 * @param {{DmIds: string[] | string, DMChannels: DMChannel[] | DMChannel}} input
 */
export const delAllMsgs = async ({ DMIds, DMChannels }) => {
  if (DMIds !== undefined && !Array.isArray(DMIds)) DMIds = [DMIds];
  if (DMChannels !== undefined && !Array.isArray(DMChannels)) DMChannels = [DMChannels];
  const filterSettled = obj => {
    if (obj.status === 'fulfilled') return obj.value;
    console.error(obj.status);
    console.error(obj.reason);
  };
  const fetchedDms = [];
  if (DMIds) {
    const dmBuffer = [];
    DMIds.forEach(id => {
      const User = new DiscordUser(client, { id });
      dmBuffer.push(User.createDM());
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
      const msg = snowFlakeWithMsg[1];
      const id = snowFlakeWithMsg[0];
      delFromAllPools(id);
      msg.author.bot && deleteBuffer.push(msg.delete());
    })
  );
  const deleteResult = await Promise.allSettled(deleteBuffer);
  console.log(
    `Deleted ${deleteResult.length} message${deleteResult.length > 1 ? 's' : ''}`
  );
};

// TODO : Need to add interrupt signal into timeoutHandler.
// TODO : Right now if someone completes the queries the timeout
// TODO : handler will still send the failure message
const timeOutHandler = async (ticket, system) => {
  const interruptRunner = async actions => {
    for (let action of actions) {
      if (!ticket.timedOut) return;
      await action();
    }
  };

  ticket.timedOut += 1;
  switch (system) {
    case 'IS_REPLAY_POOL': {
      await interruptRunner([
        async () => {
          await ticket.origMsg.author.send(isSC2ReplayReminder);
        },
        async () => {
          await sleep(10 * 1000);
        },
        async () => {
          await ticket.origMsg.author.send(isSC2Fail);
        },
        async () => {
          await sleep(10 * 1000);
        },
        async () => {
          await delAllMsgs({ DMIds: ticket.origMsg.author.id });
        },
      ]);
      return;
    }
    case 'DATA_VALIDATION':
      return await interruptRunner([
        ticket.origMsg.author.send(missingDataReminder),
        sleep(60 * 1000),
        ticket.origMsg.author.send(missingDataFail),
        delAllMsgs({ DMIds: ticket.origMsg.author.id }),
      ]);

    default:
      console.error(new Error(`Wrong system (${system}) provided.`));
  }
};

const addToPool = (ticket, pool, timeOutAfter = 5 * 60 * 1000) => {
  ticket.pool = pool;
  pool[ticket.id] = ticket;
  const timeOutId = setTimeout(() => {
    try {
      timeOutHandler(ticket, pool.name);
    } catch (e) {
      console.log(e);
    }
  }, timeOutAfter);
  ticket.timeOutId = timeOutId;
};

export const buildTicket = (pool, options) => {
  const ticket = ticketFactory(pool, options);
  const timeout = (() => {
    switch (pool.name) {
      case 'IS_REPLAY_POOL':
        return 1 * 1000;
      case 'DATA_VALIDATION':
        return 1 * 60;
      case 'QUEUE_POOL':
        return 60 * 60 * 1000;
      default:
        console.error(`Wrong name provided (${pool.name})`);
    }
  })();
  addToPool(ticket, pool, timeout);
  return ticket;
};

const includesAny = (str, arr) => {
  let result = 0;
  for (let el of arr) {
    result |= str.includes(el);
  }
  return Boolean(result);
};

/**
 * @returns {{playingAs      : false | "zerg" | "terran" | "protoss",
              playingAgainst : false | "zerg" | "terran" | "protoss",
              isReplay       : boolean,
              rank           : false | "bronze" | "silver" | "gold" | "platinum" | "diamond",
            }}
 */
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
      ? 'zerg'
      : includesAny(lowerMsg, pVsShortcuts)
      ? 'protoss'
      : includesAny(lowerMsg, tVsShortcuts)
      ? 'terran'
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

/**
 * @typedef {Boolean} msgHasReplay If the message contains a replay.
 * @typedef {string} url The Url that contains the replay message.
 * @typedef {string[]} UrlArray All urls found inside message.
 * @typedef {MessageAttachment[]} AttachArr All attachments found inside message.
 * @typedef {[msgHasReplay, UrlArray, AttachArr]} SpecialReturn
 */
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

const sendConfirmIsReplay = async msg => {
  const answer = await msg.author.send(confirmIsReplayMsg);
  await answer.react('✅');
  await answer.react('🛑');
  return answer;
};

/** @returns {Lock} */
const createLock = () => {
  const ptr = {};
  ptr.promise = new Promise((res, rej) => {
    ptr.resolver = res;
    ptr.rejecter = rej;
  });
  return [ptr.promise, ptr.resolver, ptr.rejecter];
};

/**
 *
 * @param {boolean} isReplay
 * @param {Discord.Message} msg
 * @param {string} url
 * @returns {Lock}
 */
export const handleConfIsReplay = async (isReplay, msg, url) => {
  const lock = createLock();
  let answer;
  if (!isReplay) answer = await sendConfirmIsReplay(msg);
  buildTicket(IS_REPLAY_POOL, {
    id: answer.id,
    content: msg.content,
    url,
    origMsg: msg,
    lock: lock[0],
    res: lock[1],
    rej: lock[2],
  });
  return lock;
};

export const handleConfirmation = async msg => {
  await msg.author.send(isSC2Replay(1));
  await sleep(10 * 1000);
  await delAllMsgs({ DMIds: msg.channel.id });
};

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
        await answer.react('😈');
        await answer.react('🤠');
        await answer.react('💠');
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
        await answer.react('🎃');
        await answer.react('🏀');
        await answer.react('🥎');
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
        await answer.react('🥉');
        await answer.react('🥈');
        await answer.react('🥇');
        await answer.react('🧱');
        await answer.react('💎');
      },
    },
  };
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
  actionArr.forEach(async action => void (await action(answer)));
  return answer;
};

export const handleMissingData = async (msg, playingAgainst, playingAs, rank, url) => {
  const lock = createLock();
  const answer = sendMissingData(msg, playingAgainst, playingAs, rank);
  // TODO : ADD DATA_VALIDATION POOL
  buildTicket(DATA_VALIDATION, {
    id: answer.id,
    content: msg.content,
    url,
    origMsg: msg,
    lock: lock[0],
    res: lock[1],
    rej: lock[2],
  });
  return lock;
};

import { client } from './app.js';
import { User as DiscordUser, DMChannel } from 'discord.js';
import {
  isSC2ReplayReminder,
  isSC2Fail,
  confirmIsReplayMsg,
  missingDataError,
  isSC2Replay,
  missingDataReminder,
  missingDataFail,
} from './messages.js';
import {
  zShortcuts,
  pShortcuts,
  tShortcuts,
  zVsShortcuts,
  pVsShortcuts,
  tVsShortcuts,
  replayCuts,
  bRankCuts,
  sRankCuts,
  gRankCuts,
  pRankCuts,
  dRankCuts,
} from './config/global.js';
