export const client = new Discord.Client();

mongoose.connect(mongoDbKey, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

(async () => {
  const allCoaches = await getCoaches();
  await init();
  //  const coaches = ['145856913014259712'];

  client.on('ready', () => console.log('Bot online'));

  client.on('messageReactionAdd', async (msgReact, user) => {
    if (user.bot) return;
    // TODO : Implement filter, right now all messages that are reacted to get pushed through here

    const badEmoji = () =>
      console.log('User tried to provide wrong emote : ' + msgReact._emoji.name);

    const msgInPool = isPartOfPool(msgReact.message.id);
    if (!msgInPool) {
      return;
      // TODO : REMOVE THESE
      // await handleUserReactedTooFast(msgReact, user);
      // return console.error('User reacted on a message that is not in the message Pool');
    }

    switch (msgInPool) {
      case 'IS_REPLAY_POOL': {
        // TODO : Lock the interaction (reactions) down.
        const locked = isLockedwGroup(msgReact, IS_REPLAY_POOL, 'binaryAction');
        if (locked) return;
        switch (msgReact._emoji.name) {
          case '✅': {
            const ticket = IS_REPLAY_POOL[msgReact.message.id];
            clearTTimeout(ticket);
            // TODO : Put this (await ticket.origMsg.delete();) in after the message has been verified that all data is on it.
            // await ticket.origMsg.delete();
            DATA_FLOW[getRecipId(msgReact)].resolveInd(0);
            delete IS_REPLAY_POOL[msgReact.message.id];
            return;
          }
          case '🛑': {
            const ticket = IS_REPLAY_POOL[msgReact.message.id];
            clearTTimeout(ticket);
            DATA_FLOW[getRecipId(msgReact)].abort().rejectAll('Not a replay').remove();
            await msgReact.message.channel.send(isNotSC2Replay);
            await sleep(10 * 1000);
            await delAllMsgs({ DMChannels: msgReact.message.channel });
            delete IS_REPLAY_POOL[msgReact.message.id];
            return;
          }
          default:
            return badEmoji();
        }
      }
      case 'DATA_VALIDATION_POOL': {
        // TODO : add the functionality to extend timeouts to handleTimeout
        let isCorrectEmoji = 0;
        for (let key in allEmojis) {
          const emoji = allEmojis[key];
          isCorrectEmoji |= emoji.id === msgReact._emoji.name;
          isCorrectEmoji |= emoji.id === msgReact._emoji.id;
        }
        if (!isCorrectEmoji) return badEmoji();

        const locked = isLocked(msgReact, DATA_VALIDATION_POOL);
        if (locked) return;

        const ticket = DATA_VALIDATION_POOL[msgReact.message.id];
        const group = getActualGroup(msgReact, DATA_VALIDATION_POOL);
        lockEmojiInterWGroup(group, ticket, msgReact);

        const hasAllEmojies = hasAllProperties(
          DATA_VALIDATION_POOL[msgReact.message.id],
          ['race', 'rank', 'vsRace']
        );
        if (hasAllEmojies) {
          clearTTimeout(ticket);
          ticket.timedOut = false;
          Object.freeze(ticket);
          await buildTicket(QUEUE_POOL, {
            id: ticket.id,
            activatedAt: ticket.activatedAt,
            content: ticket.content,
            attachArr: ticket.attachArr,
            race: ticket.race,
            rank: ticket.rank,
            vsRace: ticket.vsRace,
            student: ticket.origMsg.author,
          });
          DATA_FLOW[getRecipId(msgReact)].resolveInd(1);

          console.log('all emojies were received.');
        }
        // extend timeout.
        // TODO : Has to have max time that the timeout can be extended.

        return;
      }
      case 'QUEUE_POOL': {
        const ticketHasPlayerWaiting = () => true;
        const allowedEmojis = [
          ':one:',
          ':two:',
          ':three:',
          ':four:',
          ':five:',
          ':six:',
          ':seven:',
          ':eight:',
          ':nine:',
        ];
        if (!allowedEmojis.includes(msgReact._emoji.name) && !ticketHasPlayerWaiting())
          return badEmoji();
        return;
      }
      default:
        return console.log(`POOL ${msgInPool} not implemented`);
    }
  });

  client.on('messageReactionRemove', async (msgReact, user) => {
    // TODO : Filter messages.
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
        freeEmojiInter(msgReact, DATA_VALIDATION_POOL[msgReact.message.id]);
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
    // await delAllMsgs({ UserIDs: coaches });
    const [hasReplay, url, urlArr] = getMsgAttachments(msg);
    const { playingAgainst, playingAs, rank, replay } = whichDataPresent(msg);
    if (!hasReplay) return;
    try {
      const aborted = await newInterruptRunner({
        dataFlowId: msg.author.id,
        actions: [
          () => handleConfIsReplay(replay, msg, url),
          () => handleMissingData(msg, playingAgainst, playingAs, rank, url),
        ],
      });
      if (aborted) return;
      await handlePushToCoaches();
      await handleConfirmation(msg);
    } catch (e) {
      console.error(new Error(e));
    }
  });
})();

client.login(botKey);

import init, { DATA_VALIDATION_POOL, QUEUE_POOL, IS_REPLAY_POOL } from './init.js';
import mongoose from 'mongoose';
import Discord from 'discord.js';
import { botKey, mongoDbKey } from './config/keys.js';
import {
  freeEmojiInter,
  lockEmojiInterWGroup,
  getActualGroup,
  isLocked,
  isLockedwGroup,
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
} from './utils/utils.js';
import { whichDataPresent, getMsgAttachments, buildTicket } from './utils/ticket.js';
import { newInterruptRunner } from './utils/interruptRunner.js';
import { handleConfigCoach, isCoachCmd } from './utils/coach.js';
import { isPartOfPool } from './utils/pool.js';
import { DATA_FLOW } from './provider/dataFlow.js';
import { allEmojis } from './Emojis.js';
import { isNotSC2Replay } from './messages.js';
import { getCoaches } from './provider/provider.js';
