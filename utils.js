/* eslint-disable indent */
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
const onQueueAdd = () => {
  // update all coaches
  // timeout 6h then mark as emergency
  // when reacted to move into
};
const addToQUEUE = ticket => {
  ticket.pool = QUEUE_POOL;
  QUEUE_POOL[ticket.id] = ticket;
  onQueueAdd();
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
const ticketFactory = (pool, { id, content, url, origMsg }) => {
  switch (pool.name) {
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
const timeOutHandler = async (ticket, system) => {
  ticket.timedOut += 1;
  switch (system) {
    case 'IS_REPLAY_POOL': {
      await ticket.origMsg.author.send(isSC2ReplayReminder);
      await sleep(10 * 1000);
      await ticket.origMsg.author.send(isSC2Warning);
      await sleep(10 * 1000);
      await delAllMsgs({ DMIds: ticket.origMsg.author.id });
      return;
    }
    default:
      console.error(new Error(`Wrong system (${system}) provided.`));
  }
};
const addToPool = (ticket, pool, timeOutAfter = 5 * 60 * 1000) => {
  ticket.pool = pool;
  pool[ticket.id] = ticket;
  const timeOutId = setTimeout(() => {
    timeOutHandler(ticket, pool.name);
  }, timeOutAfter);
  ticket.timeOutId = timeOutId;
};
export const buildTicket = (pool, options) => {
  const ticket = ticketFactory(pool, options);
  const timeout = (() => {
    switch (pool.name) {
      case 'IS_REPLAY_POOL':
        return 60 * 1000;
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
    playingAs: includesAny(lowerMsg, ['[zerg]', '[z]'])
      ? 'zerg'
      : includesAny(lowerMsg, ['[protoss]', '[p]', '[toss]'])
      ? 'protoss'
      : includesAny(lowerMsg, ['[terran]', '[t]'])
      ? 'terran'
      : false,
    playingAgainst: includesAny(lowerMsg, ['[vszerg]', '[vsz]'])
      ? 'zerg'
      : includesAny(lowerMsg, ['[vsprotoss]', '[vsp]', '[vstoss]'])
      ? 'protoss'
      : includesAny(lowerMsg, ['[vsterran]', '[vst]'])
      ? 'terran'
      : false,
    isReplay: includesAny(lowerMsg, ['[isreplay]']),
    rank: includesAny(lowerMsg, ['[bronze]'])
      ? 'bronze'
      : includesAny(lowerMsg, ['[silver]'])
      ? 'silver'
      : includesAny(lowerMsg, ['[gold]'])
      ? 'gold'
      : includesAny(lowerMsg, ['[plat]', '[platinum]'])
      ? 'platinum'
      : includesAny(lowerMsg, ['[diamond]', '[dia]'])
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

export const sendConfirmIsReplay = async (msg, url) => {
  const answer = await msg.author.send(confirmIsReplayMsg);
  buildTicket(IS_REPLAY_POOL, {
    id: answer.id,
    content: msg.content,
    url,
    origMsg: msg,
  });
  await answer.react('✅');
  await answer.react('🛑');
};

export const sendMissingData = async (msg, playingAgainst, playingAs, rank) => {
  const reactWithRaces = async answer => {
    await answer.react('😈');
    await answer.react('🤠');
    await answer.react('💠');
  };
  const replyOnMissing = {
    playingAgainst: {
      reply: 'You have not specified what race you were playing against.\n',
      action: reactWithRaces,
    },
    playingAs: {
      reply: 'You have not specified what race you were playing as.\n',
      action: reactWithRaces,
    },
    rank: {
      reply: 'You have not specified what rank you are.\n',
      action: async answer => {
        await answer.react('🥉');
        await answer.react('🥈');
        await answer.react('🥇');
        await answer.react('🧱');
        await answer.react('💎');
      },
    },
  };
  const buildResponse = () => {
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
};

import { client } from './app.js';
import { User as DiscordUser } from 'discord.js';
import { isSC2ReplayReminder, isSC2Warning, confirmIsReplayMsg } from './messages.js';
