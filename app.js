// TODO : maybe make traces of message ids that will then be removed
export const client = new Discord.Client();

client.login(botKey);

const loginLock = {};
const p = new Promise((res, rej) => {
  loginLock.res = res;
  loginLock.rej = rej;
});
loginLock.p = p;

client.on('ready', () => {
  loginLock.res();
  console.log('Bot online');
});

mongoose.connect(mongoDbKey, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

(async () => {
  await loginLock.p;
  // const allCoaches = await getCoaches();
  await init();

  client.on('messageReactionAdd', async (msgReact, user) => {
    if (!shouldHandleReact(msgReact, user)) return;
    // TODO : Implement filter, right now all messages that are reacted to get pushed through here

    const msgInPool = isPartOfPool(msgReact.message.id);
    if (!msgInPool) {
      return;
      // TODO : REMOVE THESE
      // await handleUserReactedTooFast(msgReact, user);
      // return console.error('User reacted on a message that is not in the message Pool');
    }
    if (isLocked(msgReact, POOLS[msgInPool])) return;

    switch (msgInPool) {
      case 'IS_REPLAY_POOL': {
        // TODO : Lock the interaction (reactions) down.

        switch (msgReact._emoji.name) {
          case '✅': {
            const ticket = IS_REPLAY_POOL[msgReact.message.id];
            clearTTimeout(ticket);
            // TODO : Put this (await ticket.origMsg.delete();) in after the message has been verified that all data is on it.
            // await ticket.origMsg.delete();
            DATA_FLOW[getRecipId(msgReact)].resolveInd(0);
            break;
          }
          case '🛑': {
            const ticket = IS_REPLAY_POOL[msgReact.message.id];
            clearTTimeout(ticket);
            DATA_FLOW[getRecipId(msgReact)].abort().rejectAll('Not a replay').remove();
            await msgReact.message.channel.send(isNotSC2Replay);
            await sleep(10 * 1000);
            await delAllMsgs({ DMChannels: msgReact.message.channel });
            break;
          }
          default:
            return badEmoji(msgReact);
        }
        delete IS_REPLAY_POOL[msgReact.message.id];
        return;
      }
      case 'DATA_VALIDATION_POOL': {
        // TODO : add the functionality to extend timeouts to handleTimeout
        let isCorrectEmoji = 0;
        for (let key in allEmojis) {
          const emoji = allEmojis[key];
          isCorrectEmoji |= emoji.id === msgReact._emoji.name;
          isCorrectEmoji |= emoji.id === msgReact._emoji.id;
        }
        if (!isCorrectEmoji) return badEmoji(msgReact);

        const ticket = DATA_VALIDATION_POOL[msgReact.message.id];
        const group = getActualGroup(msgReact, DATA_VALIDATION_POOL);
        await lockEmojiInterWGroup(group, ticket, msgReact);

        const hasAllEmojies = hasAllProperties(
          DATA_VALIDATION_POOL[msgReact.message.id],
          ['race', 'rank', 'vsRace']
        );
        if (hasAllEmojies) {
          clearTTimeout(ticket);
          ticket.timedOut = false;
          Object.freeze(ticket);
          await buildTicket(
            QUEUE_POOL,
            {
              id: ticket.id,
              activatedAt: ticket.activatedAt,
              content: ticket.content,
              attachArr: ticket.attachArr,
              race: ticket.race,
              rank: ticket.rank,
              vsRace: ticket.vsRace,
              student: ticket.origMsg.author,
              url: ticket.url,
            },
            true
          );
          DATA_FLOW[getRecipId(msgReact)].resolveAll();

          console.log('all emojies were received.');
        }
        // extend timeout.
        // TODO : Has to have max time that the timeout can be extended.

        return;
      }
      case 'DASHBOARD_POOL': {
        const allowedEmojis = DashEmojis;
        if (!allowedEmojis.includes(msgReact.emoji.name)) return badEmoji(msgReact);
        await lockEmojiInter(msgReact, DASHBOARD_POOL[msgReact.message.id]);
        return;
      }
      case 'COACHLOG_POOL': {
        const allowedEmojis = ['✅', '🛑'];
        if (!allowedEmojis.includes(emojiFromMsgReact(msgReact)))
          return badEmoji(msgReact);
        clearTTimeout(COACHLOG_POOL[msgReact.message.id]);
        await lockEmojiInter(msgReact, COACHLOG_POOL[msgReact.message.id]);
        return;
      }
      default:
        return console.log(`POOL ${msgInPool} not implemented`);
    }
  });

  client.on('messageReactionRemove', async (msgReact, user) => {
    if (!shouldHandleReact(msgReact, user)) return;
    const msgInPool = isPartOfPool(msgReact.message.id);
    if (!msgInPool) {
      return;
      // TODO : remove these
      //handleUserReactedTooFast(user);
      // return console.error(
      //   'User removed a reaction on a message that is not in the message Pool'
      // );
    }
    switch (msgInPool) {
      case 'DATA_VALIDATION_POOL': {
        await freeEmojiInter(msgReact, DATA_VALIDATION_POOL[msgReact.message.id]);
        return;
      }
      case 'DASHBOARD_POOL': {
        const allowedEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '◀', '▶️'];
        if (!allowedEmojis.includes(msgReact.emoji.name)) {
          return badEmoji(msgReact);
        }
        await freeEmojiInter(msgReact, DASHBOARD_POOL[msgReact.message.id]);
        return;
      }
      default:
        return console.log(
          `POOL ${msgInPool} not implemented, or it doesn't have a undo capability.`
        );
    }
  });

  client.on('message', async msg => {
    if (isCoachCmd(msg)) {
      await handleConfigCoach(msg);
      return;
    }
    if (!shouldHandleMsg(msg)) return;
    const [hasReplay, url] = getMsgAttachments(msg);
    const { playingAgainst, playingAs, rank, replay } = whichDataPresent(msg);
    if (!hasReplay) return;
    try {
      // TODO : aborted should be set to false after timing out any of these handlers but it isn't for handleMissingData
      const aborted = await newInterruptRunner({
        dataFlowId: msg.author.id,
        actions: [
          () => handleConfIsReplay(replay, msg, url),
          () => handleMissingData(msg, playingAgainst, playingAs, rank, url),
          () => handleConfirmation(msg),
        ],
      });
      if (aborted) return;
      await handlePushToCoaches();
    } catch (e) {
      console.error(new Error(e));
    }
  });
})();

import init, {
  DATA_VALIDATION_POOL,
  QUEUE_POOL,
  IS_REPLAY_POOL,
  DASHBOARD_POOL,
  COACHLOG_POOL,
} from './init.js';
import mongoose from 'mongoose';
import Discord from 'discord.js';
import { botKey, mongoDbKey } from './config/keys.js';
import {
  freeEmojiInter,
  lockEmojiInterWGroup,
  getActualGroup,
  isLocked,
  lockEmojiInter,
  emojiFromMsgReact,
} from './utils/emojiInteraction.js';
import {
  handleConfirmation,
  handlePushToCoaches,
  handleMissingData,
  handleConfIsReplay,
  shouldHandleMsg,
  getRecipId,
  clearTTimeout,
  hasAllProperties,
  delAllMsgs,
  sleep,
  badEmoji,
  shouldHandleReact,
} from './utils/utils.js';
import { whichDataPresent, getMsgAttachments, buildTicket } from './utils/ticket.js';
import { newInterruptRunner } from './utils/interruptRunner.js';
import { handleConfigCoach, isCoachCmd } from './utils/coach.js';
import { isPartOfPool, POOLS } from './utils/pool.js';
import { DATA_FLOW } from './provider/dataFlow.js';
import { allEmojis, DashEmojis } from './Emojis.js';
import { isNotSC2Replay } from './messages.js';
