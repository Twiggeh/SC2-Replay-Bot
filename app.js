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
  await init();

  client.on('messageReactionAdd', async (msgReact, user) => {
    if (!shouldHandleReact(msgReact, user)) return;
    // TODO : Implement filter, right now all messages that are reacted to get pushed through here

    const msgInPool = isPartOfPool(msgReact.message.id);
    if (!msgInPool) return;

    if (isLocked(msgReact, POOLS[msgInPool])) return;

    switch (msgInPool) {
      case 'IS_REPLAY_POOL': {
        switch (msgReact._emoji.name) {
          case '✅': {
            const ticket = IS_REPLAY_POOL[msgReact.message.id];
            delete IS_REPLAY_POOL[msgReact.message.id];
            clearTTimeout(ticket);
            // TODO : Put this (await ticket.origMsg.delete();) in after the message has been verified that all data is on it.
            // await ticket.origMsg.delete();
            DATA_FLOW[getRecipId(msgReact)].resolveInd(0);
            break;
          }
          case '🛑': {
            const ticket = IS_REPLAY_POOL[msgReact.message.id];
            delete IS_REPLAY_POOL[msgReact.message.id];
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
          // TODO : Add datavalidation pool deletion to everywhere a buildticket queuepool is called
          clearTTimeout(ticket);
          ticket.timedOut = false;
          Object.freeze(ticket);
          DATA_FLOW[getRecipId(msgReact)].resolveInd(1);
          console.log('all emojies were received.');
        }
        // TODO : Has to have max time that the timeout can be extended.
        return;
      }
      case 'DESCRIPTION_POOL': {
        const allowedEmojis = ['✅', '🛑'];
        if (!allowedEmojis.includes(emojiFromMsgReact(msgReact)))
          return badEmoji(msgReact);
        clearTTimeout(DESCRIPTION_POOL[msgReact.message.id]);
        await lockEmojiInter(msgReact, DESCRIPTION_POOL[msgReact.message.id]);
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
    if (!msgInPool) return;
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
    if (await isCoachCmd(msg)) {
      handleConfigCoach(msg);
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
          () => handleDescription(msg),
          () => handleConfirmation(msg),
        ],
      });
      if (aborted) return;
      // TODO : put push to database and queuepool in here
      await handlePushToCoaches();
    } catch (e) {
      console.error(new Error(e));
    }
  });
})();

import init, {
  DATA_VALIDATION_POOL,
  IS_REPLAY_POOL,
  DASHBOARD_POOL,
  COACHLOG_POOL,
  DESCRIPTION_POOL,
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
  handleDescription,
} from './utils/utils.js';
import { whichDataPresent, getMsgAttachments } from './utils/ticket.js';
import { newInterruptRunner } from './utils/interruptRunner.js';
import { handleConfigCoach, isCoachCmd } from './utils/coach.js';
import { isPartOfPool, POOLS } from './utils/pool.js';
import { DATA_FLOW } from './provider/dataFlow.js';
import { allEmojis, DashEmojis } from './Emojis.js';
import { isNotSC2Replay } from './messages.js';
