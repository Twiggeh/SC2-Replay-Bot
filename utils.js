/* eslint-disable indent */
/** @typedef { [Promise, Function, Function]} Lock */

/**@typedef DataFlowEntry
 * @type {object}
 * @prop {boolean} aborted - Defaults to false
 * @prop {string} id - ID of the DataFlowEntry
 * @prop {function() => DataFlowEntry} remove - Deletes the DataFlowEntry
 * @prop {function() => DataFlowEntry} abort - Aborts the request
 * @prop {[function() => DataFlowEntry]} rejects - Array that rejects all promises pending in taskrunner
 * @prop {function() => DataFlowEntry} rejectAll - Rejects all promises that are still pending in the taskrunner
 * @prop {Lock[]} locks - All Locks for the passed functions.
 * @prop {number} curAction - Current iteration of the action array.
 * @prop {function() => DataFlowEntry} resolve - Resolve the current action that the taskrunner is awaiting
 * @prop {function() => DataFlowEntry} resolveAll - Resolve all actions that the taskrunner is awaiting
 * @prop {function() => DataFlowEntry} resolveInd - Resolve the action with the index of the action.
 * @prop {[function() => DataFlowEntry]} resolves - All resolvables of the locks. */

/** @type {Object<string, DataFlowEntry>} */
export const DATA_FLOW = {};

/** @returns {Promise<void>} */
export const sleep = async time => new Promise(resolve => setTimeout(resolve, time));

/** @param {Message} msg @returns {boolean} */
export const shouldHandleMsg = msg => {
  if (msg.author.bot) return false;
  if (msg.attachments === undefined) return false;
  if (msg.channel.name !== 'replays-1' && msg.channel.name !== 'replays-2') return false;
  return true;
};
/**@typedef Pool
 * @type {Object<string, Ticket>}
 * @prop {string} name - Name of the Pool */
// TODO : Refactor into provider (Pools Provider)
/**  @type {Object<string, Pool> } */
const POOLS = {};

/** @param {string} name - Unique name of the pool @returns {Pool}*/
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
/** @type {Object.<string, IR_Ticket>} */
export const IS_REPLAY_POOL = createPool('IS_REPLAY_POOL');
/** @type {Object.<string, DV_Ticket>} */
export const DATA_VALIDATION_POOL = createPool('DATA_VALIDATION_POOL');
/** @type {Object.<string, Q_Ticket>} */
export const QUEUE_POOL = createPool('QUEUE_POOL');

export const isPartOfPool = id => {
  for (let poolName in POOLS) {
    const pool = POOLS[poolName];
    if (pool[id] !== undefined) return poolName;
  }
  return false;
};
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
 * @typedef {T_FactoryOptions & QT_Opts} QT_FactoryOptions */

/**@typedef {T_FactoryOptions & QT_FactoryOptions & DVT_FactoryOptions} AllTicket_FactoryOptions */

/**@typedef {Object} Ticket
 * @prop {string}  id        - Message ID
 * @prop {string}  url       - Url of the first detected replay
 * @prop {Pool}    pool      - Instance of POOL
 * @prop {string}  content   - Message Content
 * @prop {boolean} timedOut  - Whether the message has timed out
 * @prop {number}  timeOutId - The timeoutId
 * @prop {boolean} emergency - If this ticket has been neglected for too long.
 * @prop {string}  activatedAt      - The time at which the ticket got created
 * @prop {Message["attachments"]} attachArr - Array with all the Attachments of the orig msg */

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
 * @prop {DiscordUser} coach   - Coach that has taken on the role of coaching the user
 * @prop {DiscordUser} student - Student that has Requested the coaching
 * @prop {number} emojiIdentifier - EmojiNumber that is going to allow the coach to pull the user.
 * @typedef {Ticket & Q} Q_Ticket */

/**@typedef AllTickets
 * @type {Ticket | DV_Ticket | IR_Ticket | Q_Ticket} */

/**@param {Pool} pool Instance of POOL
 * @param {AllTicket_FactoryOptions} param1
 * @return {AllTickets}*/
const ticketFactory = (
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
    emojiIdentifier,
  }
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
      return {
        id,
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
      };
    }
    default:
      console.error(new Error(`Wrong type (${pool.name}) provided.`));
  }
};

const delFromAllPools = id => {
  for (let poolName in POOLS) {
    if (poolName === 'QUEUE_POOL') return;
    delete POOLS[poolName][id];
  }
};

/**@param {{UserIDs: string[] | string, DMChannels: DMChannel[] | DMChannel}} input */
export const delAllMsgs = async ({ UserIDs, DMChannels }) => {
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
      /** @type {Message} */
      const msg = snowFlakeWithMsg[1];
      const id = snowFlakeWithMsg[0];
      delFromAllPools(id);
      msg.author.bot &&
        !msg.content.startsWith('.\n**DASHBOARD**') &&
        deleteBuffer.push(msg.delete());
    })
  );
  const deleteResult = await Promise.allSettled(deleteBuffer);
  console.log(
    `Deleted ${deleteResult.length} message${deleteResult.length > 1 ? 's' : ''}`
  );
};

const timeOutHandler = async (ticket, system) => {
  console.log('hello');
  ticket.timedOut = true;
  switch (system) {
    case 'IS_REPLAY_POOL': {
      const aborted = await newInterruptRunner({
        abortPtr: ticket,
        abortPath: 'timedOut',
        negatePtr: true,
        actions: [
          () => ticket.origMsg.author.send(isSC2ReplayReminder),
          () => sleep(10 * 1000),
          () => ticket.origMsg.author.send(isSC2Fail),
        ],
      });
      if (aborted) return;
      DATA_FLOW[ticket.origMsg.author.id].abort().rejectAll().remove();
      await sleep(10 * 1000);
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
      await sleep(10 * 1000);
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

const getTicketTimeout = pool => {
  switch (pool.name) {
    case 'IS_REPLAY_POOL':
      return 10 * 1000;
    case 'DATA_VALIDATION_POOL':
      return 40 * 1000;
    case 'QUEUE_POOL':
      return 10 * 1000; // TODO : Make longer
    default:
      console.error(`Wrong name provided (${pool.name})`);
  }
};

/**@param   {Pool} pool
 * @param   {AllTicket_FactoryOptions} options
 * @returns {AllTickets}*/
export const buildTicket = (pool, options) => {
  const ticket = ticketFactory(pool, options);
  const timeout = getTicketTimeout(pool);
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

const sendConfirmIsReplay = async msg => {
  const answer = await msg.author.send(confirmIsReplayMsg);
  await answer.react('✅');
  await answer.react('🛑');
  return answer;
};

/** @returns {Lock} Promise, resolve, reject*/
const createLock = () => {
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
  let answer;
  answer = await sendConfirmIsReplay(msg);
  buildTicket(IS_REPLAY_POOL, {
    id: answer.id,
    content: msg.content,
    url,
    origMsg: msg,
    attachArr: msg.attachments,
  });
};

// TODO : Add available coaches as a parameter to SC2Replay and handleConfirmation
/** @param {Message} msg*/
export const handleConfirmation = async msg => {
  await msg.author.send(isSC2Replay(1));
  await sleep(10 * 1000);
  await delAllMsgs({ UserIDs: msg.author.id });
};

/**
 * @param {Message} msg
 * @returns {[Promise<Message>, [function(Message) => Promise<void>]]} */
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
    buildTicket(QUEUE_POOL, {
      id: msg.id,
      activatedAt: Date.now(),
      content: msg.content,
      attachArr: msg.attachArr,
      race: playingAs,
      rank,
      vsRace: playingAgainst,
      student: msg.author,
      emojiIdentifier: Object.keys(QUEUE_POOL).length + 1,
    });
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

// TODO : Replace with real Coach provider

const coachIds = ['145856913014259712'];

/**@param {DV_Ticket} ticket
 * @return {Promise<void>} */
export const handlePushToCoaches = async () => {
  await updateAllCoaches();
};

/**
 * @param {{object}} obj Any Object
 * @param {{(Array|string)}} propPath The path to set of the object
 * @param {*} value Any value to set at path
 * @returns {void} */
const deepSetObj = (obj, propPath, value) => {
  if (typeof propPath === 'string') propPath = propPath.split('.');
  const curProperty = propPath.shift();
  if (propPath.length > 0) {
    if (obj[curProperty] === undefined) obj[curProperty] = {};
    return deepSetObj(obj[curProperty], propPath, value);
  }
  obj[curProperty] = value;
};

/**@typedef Pool
 * @type {Object.<string, Tickets>}
 * @type {string} name Name of the pool (on proto) */

/**@typedef EmojisAndMethods
 * @type {Object}
 * @prop {string[]} emojis All emojis belonging to the group
 * @prop {function} onAdd Runs when the group is unlocked
 *                        (no other emoji in the group is active),
 *                        and the user reacts with an emoji from this group.
 * @prop {function} onDel Runs when the user removes a reaction belonging to this group. */

/**@typedef EmojiGroupName
 * @type {string} Unique name of the group */

/**@typedef GroupWithEmojisAndMethods
 * @type {Object.<string, EmojisAndMethods>} */

/** @type {Object.<string, GroupWithEmojisAndMethods>} */
const emojiInteractions = {};

/**@param {Pool} pool INSTANCE OF POOL
 * @param {GroupWithEmojisAndMethods} groups */
export const registerEmojiInteraction = (pool, groups) => {
  for (let key in groups) {
    deepSetObj(emojiInteractions, [pool.name, key], groups[key]);
  }
};

// TODO : Refactor register EmojiInteraction to init
const onAddHelper = (ticket, emoji, assignee, emojiGroup) => {
  for (let emojiName in emojiGroup) {
    if (emojiGroup[emojiName].id === emoji) {
      ticket[assignee] = emojiName;
      return;
    }
  }
  console.error(
    `Could not find emoji (${emoji}) in ticket (${ticket}). ${assignee}.onAdd()`
  );
};
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

/** @param {MessageReaction} msgReact @returns {string} ID of the recipient */
export const getRecipId = msgReact => msgReact.message.channel.recipient.id;

/** @param {MessageReaction} msgReact @returns {string} Name or ID of the emoji */
const emojiFromMsgReact = msgReact =>
  msgReact._emoji.id === null ? msgReact._emoji.name : msgReact._emoji.id;

/**@param {Pool} pool
 * @param {MessageReaction} msgReact
 * @returns {string | false} */
export const getActualGroup = (msgReact, pool) => {
  const emoji = emojiFromMsgReact(msgReact);
  const groups = Object.keys(emojiInteractions[pool.name]);
  let result = false;
  for (let group of groups) {
    const emojis = emojiInteractions[pool.name][group].emojis;
    if (emojis.includes(emoji)) result = group;
  }
  return result;
};

/** @param {MessageReaction} msgReact
 *  @param {AllTickets}      ticket */
export const lockEmojiInter = (msgReact, ticket) => {
  const actualGroup = getActualGroup(msgReact, ticket.pool);
  lockEmojiInterWGroup(actualGroup, ticket, msgReact);
};

/**@param {string}          group
 * @param {AllTickets}      ticket
 * @param {MessageReaction} msgReact */
export const lockEmojiInterWGroup = (group, ticket, msgReact) => {
  const emoji = emojiFromMsgReact(msgReact);
  const groupIndex = ticket.lockedEmojiInteractionGroups.indexOf(group);
  if (groupIndex !== -1) return console.error(`Group (${group}) already locked down.`);
  ticket.lockedEmojiInteractionGroups.push(group);
  emojiInteractions[ticket.pool.name][group].onAdd?.(ticket, emoji);
};

/**@param {AllTickets}      ticket
 * @param {MessageReaction} msgReact */
export const freeEmojiInter = (msgReact, ticket) => {
  const actualGroup = getActualGroup(msgReact, ticket.pool);
  freeEmojiInterWGroup(actualGroup, ticket);
};

/**@param {string}          group
 * @param {AllTickets}      ticket */
export const freeEmojiInterWGroup = (group, ticket) => {
  const groupIndex = ticket.lockedEmojiInteractionGroups.indexOf(group);
  if (groupIndex === -1) return console.error(`Group (${group}) is already unlocked.`);
  ticket.lockedEmojiInteractionGroups.splice(groupIndex, 1);
  emojiInteractions[ticket.pool.name][group].onDel?.(ticket);
};

/**@param {MessageReaction} msgReact
 * @param {Pool} pool */
export const isLocked = (msgReact, pool) => {
  const actualGroup = getActualGroup(msgReact, pool);
  return isLockedwGroup(msgReact, pool, actualGroup);
};

/** @param {string[]} props @param {Object} obj @return {Boolean}*/
export const hasAllProperties = (obj, props) => {
  const result = [];
  for (let key of props) {
    result.push(!!deepGetObject(obj, key));
  }
  return result.reduce((acc, cur) => acc & cur);
};

/** @param {MessageReaction} msgReact
 * @param {Pool} pool
 * @param {string | false} group
 * @returns {boolean} */
export const isLockedwGroup = (msgReact, pool, group) => {
  const ticket = pool[msgReact.message.id];
  const emoji = emojiFromMsgReact(msgReact);
  if (ticket === undefined || !group) {
    console.error(
      `Did not find ticket (${ticket}) or group (${group}) with emoji (${emoji})`
    );
    return true;
  }
  const index = ticket.lockedEmojiInteractionGroups.indexOf(group);
  if (index === -1) return false;
  return true;
};

export const clearTTimeout = ticket => {
  clearTimeout(ticket.timeOutId);
  ticket.timedOut = false;
};

/**@param {MessageReaction} msgReact
 * @param {DiscordUser} user */
export const handleUserReactedTooFast = async (msgReact, user, ticket) => {
  // TODO : Sometimes the filter gets bypassed and people can react to stuff that is not in the normal channels
  // TODO : The bypass is a problem in app.js
  // clearTTimeout(ticket);

  await user.send(reactedTooFast);
  const id = msgReact.message.channel.recipient.id;
  DATA_FLOW[id].abort();
  try {
    DATA_FLOW[id]?.rejectAll?.('aborted');
  } catch (e) {
    console.error(e);
  }
};

/**@param {string} id - DiscordUser id
 * @param {Lock[]} locks - All locks associated with this dataFlow
 * @returns {DataFlowEntry} Returns a dataFlowEntry */
export const dataFlowFactory = (id, locks = []) => {
  class DataFlow {
    constructor() {
      this.id = id;
      this.curAction = 0;
      this.aborted = false;
      this.locks = locks;
    }
    get rejects() {
      return this.locks.map(el => el[2]);
    }
    get resolves() {
      return this.locks.map(el => el[1]);
    }
  }
  DataFlow.prototype.remove = () => {
    delete DATA_FLOW[id];
  };
  DataFlow.prototype.abort = () => {
    DATA_FLOW[id].aborted = true;
    /** @type {DataFlowEntry}  */
    return DATA_FLOW[id];
  };
  /** @param {string} reason - Reason to reject all pending Promises
   *  @returns {DataFlowEntry}
   */
  DataFlow.prototype.rejectAll = reason => {
    for (let rej of DATA_FLOW[id].rejects) {
      rej(reason);
    }
    return DATA_FLOW[id];
  };
  /** @param {number} index - Index of the action to resolve */
  DataFlow.prototype.resolveInd = index => {
    DATA_FLOW[id].locks[index][1]();
    return DATA_FLOW[id];
  };
  DataFlow.prototype.resolve = () => {
    DATA_FLOW[id].locks[DATA_FLOW[id].curAction][1]();
    return DATA_FLOW[id];
  };
  DataFlow.prototype.resolveAll = () => {
    DATA_FLOW[id].resolves.forEach(res => res());
    return DATA_FLOW[id];
  };
  const dataFlow = new DataFlow();
  DATA_FLOW[id] = dataFlow;
  return dataFlow;
};

/**@param {object} obj Object to traverse
 * @param {string} path Path to the property
 * @return {*} Property */
const deepGetObject = (obj, path) => path.split('.').reduce((acc, cur) => acc[cur], obj);

/** @typedef AbortPtrPath - String that points to the location of the boolean abort flag
 *  @type {string} */

/**@typedef InterruptRunnerConfig
 * @type {object}
 * @prop {Array.<function(): promise>} actions - Array of async functions
 * @prop { {[AbortPtrPath]: boolean} | string } [abortPtr] - Boolean inside Pointer to abort execution of
 *                                      a next function block
 *                                    - If supplied string, the pointer will be assigned
 *                                      to the entry in dataFlow with the key being the
 *                                      string
 *                                    - If undefined will just use the internal abort of dataFlow
 * @prop {AbortPtrPath} [abortPath] - String that points to the location of the boolean abort flag
 * @prop {string} [dataFlowId] - Discord.User.id
 * @prop {boolean} [negatePtr] - If the pointer is to be negated */

const freshPointer = (abortPtr, abortPath, negatePtr) => {
  if (abortPtr && abortPath) return deepGetObject(abortPtr, abortPath) ^ negatePtr;
  return true;
};

/** @param {InterruptRunnerConfig} */
export const newInterruptRunner = async ({
  abortPtr = false,
  abortPath = false,
  dataFlowId = false,
  actions,
  negatePtr,
}) => {
  const dataFlow = dataFlowId
    ? dataFlowFactory(
        dataFlowId,
        Array.from(Array(actions.length), () => createLock())
      )
    : { locks: [], aborted: true };

  for (let i = 0; i < actions.length; i++) {
    dataFlow.curAction = i;
    if (freshPointer(abortPtr, abortPath, negatePtr) && dataFlow.aborted) return true;
    try {
      await actions[i]();
      await dataFlow.locks[i]?.[0];
    } catch (e) {
      console.log(e);
    }
  }
  return false;
};

import Coach, { availSchema } from './Models/Coach.js';

const date = new Date();
const getStrUTCDay = num => {
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

/**
 * Gets all DiscordUsers from the provided IDs, creates
 * a DMChannel to those Users and retrieves their Dashboards.
 * If no Dashboard is found it is created.
 * @param {string[]} coachIDs - Discord User ID / Database ID (They are the same)
 * @returns {Promise<[Message]>}
 */
const getDashboards = async coachIDs => {
  const cache = [];
  for (let i = 0; i < coachIDs.length; i++) {
    cache.push(async () => {
      const user = await client.users.fetch(coachIDs[i]);
      await user.createDM();
      return await getDashboard(user);
    });
  }
  const cache2 = [];
  for (const job of cache) {
    cache2.push(job());
  }
  return (await Promise.allSettled(cache2)).map(el => el.value);
};

// TODO : put into a provider
let lastSearched;
/**@type {mongoose.Document[] | mongoose.Document | {}} */
let allCoaches;

/**
 * Retrieves all DataBaseCoaches that are available based on their
 * timezone configuration, and retrieves their Dashboards. Creates
 * the Dashboard if it cannot find one.
 */
const getAvailDashboards = async () => {
  // TODO : this needs to return DiscordUser[], right now it returns mongoose.model
  // TODO : put into a provider
  // TODO : Maybe only search for new Coaches every 30 mins

  const curHours = date.getUTCHours();
  const curMinutes = date.getUTCMinutes();

  if (lastSearched === undefined || Date.now() - 30 * 60 * 1000 > lastSearched) {
    lastSearched = Date.now();
    allCoaches = await Coach.find({});
    if (!Array.isArray(allCoaches)) allCoaches = [allCoaches];
  }

  const curDay = getStrUTCDay();

  /**@type {mongoose.Document[] | mongoose.Document | {}} */
  const availableCoaches = allCoaches.filter(coach => {
    const { times } = coach.available[curDay];
    for (let i = 0; i < times.length; i += 2) {
      const [startH, startMin = 0] = times[i].split(':');
      const [endH, endMin = 0] = times[i + 1].split(':');

      const rawUTCStartTime = Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        startH + coach.timeZone,
        startMin
      );
      const rawUTCEndTime = Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        endH + coach.timeZone,
        endMin
      );

      if (rawUTCStartTime < Date.now() && rawUTCEndTime > Date.now()) return true;
      return false;
    }
  });
  console.log(availableCoaches);
  return await getDashboards(availableCoaches.map(coach => coach.id));
};

const includesAnyArr = (arr1, arr2) => {
  let result = 0;
  for (let i = 0; i < arr1.length; i++) {
    result |= arr1.includes(arr2[i]);
  }
  return result;
};

const cCmdDiscr = '!';

/**@param {Message} msg */
export const isCoachCmd = msg => {
  if (msg.author.bot) return false;
  if (msg.channel.type !== 'dm') return false;
  const userRoles = msg.client.guilds.cache.array()[0].members.cache.get(msg.author.id)
    ._roles;
  // TODO : remove webdev
  const isCoach =
    includesAnyArr(userRoles, allCoachIds) | includesAny('598891772499984394', userRoles);
  const hasRunner = msg.content.charAt(0) === cCmdDiscr;

  if (isCoach && hasRunner) return true;

  return false;
};

/**
 * Retrieves a coach, if it cannot find one it will create one.
 * @param {string} id Discord User Id / Coach Id (Both are the same)
 * @return {Promise<mongoose.Document>}
 */
const getDBCoach = async id => {
  const fillAvailable = () => {
    const result = {};
    for (let day in availSchema) {
      const temp = {};
      for (let prop in availSchema[day]) {
        temp[prop] = availSchema[day][prop].default;
      }
      result[day] = temp;
    }
    return result;
  };

  let coach = await Coach.findOne({ id });
  if (!coach) {
    coach = new Coach({ id, available: fillAvailable() });
    await coach.save();
  }
  return coach;
};

/**@param {Message} msg */
export const handleConfigCoach = async msg => {
  /**@param {Array} rawMsg */
  const getDay = rawMsg => {
    if (includesAnyArr(rawMsg, ['mon', 'monday'])) return getStrUTCDay(1);
    if (includesAnyArr(rawMsg, ['tue', 'tuesday'])) return getStrUTCDay(2);
    if (includesAnyArr(rawMsg, ['wed', 'wednesday'])) return getStrUTCDay(3);
    if (includesAnyArr(rawMsg, ['thu', 'thursday'])) return getStrUTCDay(4);
    if (includesAnyArr(rawMsg, ['fri', 'friday'])) return getStrUTCDay(5);
    if (includesAnyArr(rawMsg, ['sat', 'saturday'])) return getStrUTCDay(6);
    if (includesAnyArr(rawMsg, ['sun', 'sunday'])) return getStrUTCDay(0);
  };

  /**@param {Array} rawMsg */
  const getTime = rawMsg => {
    const index = rawMsg.indexOf('times:', 1);
    /**@type {string}  */
    const times = rawMsg[index + 1];
    if (index === -1 && times !== undefined) {
      // TODO : Throw bad time to coach.
      return false;
    }
    const timeArr = times.substr(1, times.length - 2).split(',');
    if (timeArr.length % 2 !== 0) {
      // TODO : Throw bad timesArr
      return false;
    }
    for (let i = 0; i < timeArr.length; i += 2) {
      const startTime = timeArr[0].split(':');
      const endTime = timeArr[1].split(':');
      const actualStart = startTime[0] * 60 + startTime[1];
      const actualEnd = endTime[0] * 60 + endTime[1];
      if (isNaN(actualStart) || isNaN(actualEnd)) {
        // TODO : Throw bad numbers
        return false;
      }
      if (actualEnd < actualStart) {
        // TODO : Invalid time configuration.
        return false;
      }
    }
    return timeArr;
  };

  /**@param {Array} rawMsg */
  const getPing = rawMsg => {
    const index = rawMsg.indexOf('ping:');
    if (index === -1) return false;
    if (rawMsg[index + 1] === 'true') return true;
    return false;
  };

  const dbCoach = await getDBCoach(msg.author.id);

  const rawCommand = msg.content.toLowerCase().split(' ');
  switch (rawCommand[0]) {
    case `${cCmdDiscr}setonedaytime`: {
      const day = getDay(rawCommand);
      const times = getTime(rawCommand);
      const ping = getPing(rawCommand);
      console.log(day, times);
      dbCoach.available[day].times = times;
      dbCoach.available[day].ping = ping;
      break;
    }
    case `${cCmdDiscr}setglobalping`: {
      const ping = getPing(rawCommand);
      for (let day in dbCoach.available) {
        dbCoach.available[day].ping = ping;
      }
      break;
    }
    case `${cCmdDiscr}setglobaltimes`: {
      const times = getTime(rawCommand);
      for (let day in dbCoach.available) {
        dbCoach.available[day].times = times;
      }
      break;
    }
    default: {
      // TODO: throw bad command at coach
      console.log('bad command');
    }
  }
  await dbCoach.save();
  // TODO : Send configuration dashboard and then delete it after 20s
};

/** @param {DiscordUser} discordCoach*/
const createDashboard = async discordCoach => {
  // TODO : hook up pages
  const dashboard = await discordCoach.send(dashboardMessage(discordCoach));
  return dashboard;
};

/**
 * Retrieves Dashboards for the provided IDs, if it cannot find a Dashboard
 * for a specified ID, it will create a Dashboard and return it.
 * @param {DiscordUser} discordCoach
 * @returns {Promise<Message>}
 */
const getDashboard = async discordCoach => {
  //TODO : cannot read messages of undefined
  // TODO : Somehow ingests the dashboard message
  const cache = await Promise.allSettled([
    getDBCoach(discordCoach.id),
    discordCoach.dmChannel.messages.fetch(),
  ]);
  const [{ value: coach }, { value: messages }] = cache;

  /**@type {Message} */
  let dashboard = messages.get(coach?.dashboardId);

  if (dashboard === undefined) {
    dashboard = await createDashboard(discordCoach);
    coach.dashboardId = dashboard.id;
    await coach.save();
  }
  return dashboard;
};

/**
 * Takes an Array of discordCoaches and automatically updates
 * their Dashboards with the data from QUEUE_POOL
 * @param {DiscordUser[]} discordCoaches
 * @returns {Promise<void>}
 */
const updateAllDashboards = async discordCoaches => {
  const cache = [];
  for (let i = 0; i < discordCoaches.length; i++) {
    cache.push(getDashboard(discordCoaches[i]));
  }
  /**@type {Message[]}*/
  const dashboards = (await Promise.allSettled(cache)).map(el => el.value);
  const cache2 = [];
  for (const dashboard of dashboards) {
    cache.push(dashboard.edit(dashboardMessage(dashboard.channel.recipient)));
  }
  await Promise.allSettled(cache2);
  // TODO : add error handlers on all "allSettled" Promise handlers
};

export const updateAllCoaches = async () => {
  const availDashes = await getAvailDashboards();
  // TODO : Cannot read messages of undefined
  await updateAllDashboards(availDashes.map(el => el.channel.recipient)); // TODO : these are mongoose models
  console.log('done');
};

/** @param {string[]} coachIds
 * @returns {Message[]}
 */
export const createCoaches = async coachIds => {
  return await getDashboards(coachIds);
};

import { client } from './app.js';
import {
  User as DiscordUser,
  DMChannel,
  Message,
  MessageReaction,
  MessageAttachment,
} from 'discord.js';
import {
  isSC2ReplayReminder,
  isSC2Fail,
  confirmIsReplayMsg,
  missingDataError,
  isSC2Replay,
  missingDataReminder,
  missingDataFail,
  reactedTooFast,
  dashboardMessage,
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
import { raceEmojis, rankEmojis, vsRaceEmojis } from './Emojis.js';
import mongoose from 'mongoose';
import { allCoachIds } from './provider/provider.js';
