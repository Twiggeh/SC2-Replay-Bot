export const client = new Discord.Client();

const clearTTimeout = ticket => {
  clearTimeout(ticket.timeOutId);
  ticket.timedOut = 0;
};

(async () => {
  const allCoachIds = await getCoaches();
  const coaches = ['145856913014259712'];

  client.on('ready', () => console.log('Bot online'));

  client.on('messageReactionAdd', async (msgReact, user) => {
    if (user.bot) return;
    const badEmoji = () =>
      console.log('User tried to provide wrong emote : ' + msgReact._emoji.name);
    const msgInPool = isPartOfPool(msgReact.message.id);
    if (!msgInPool)
      return console.error('User reacted on a message that is not in the message Pool');
    switch (msgInPool) {
      case 'IS_REPLAY_POOL': {
        // TODO : Lock the interaction (reactions) down.
        const locked = isLockedwGroup(
          msgReact._emoji.name,
          IS_REPLAY_POOL,
          msgReact.message,
          'binaryAction'
        );
        if (locked) return;
        switch (msgReact._emoji.name) {
          case '✅': {
            const ticket = IS_REPLAY_POOL[msgReact.message.id];
            clearTTimeout(ticket);
            await ticket.origMsg.delete();
            ticket.res();
            delete IS_REPLAY_POOL[msgReact.message.id];
            return;
          }
          case '🛑': {
            const ticket = IS_REPLAY_POOL[msgReact.message.id];
            clearTTimeout(ticket);
            ticket.rej('Was not a replay.');
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
        let isCorrectEmoji = 1;
        for (let emoji of allEmojies) {
          isCorrectEmoji |= emoji.id === msgReact._emoji.name;
          isCorrectEmoji |= emoji.id === msgReact._emoji.id;
        }
        if (!isCorrectEmoji) return badEmoji();

        const locked = isLocked(
          msgReact._emoji.name,
          DATA_VALIDATION_POOL,
          msgReact.message
        );
        if (locked) return;

        const group = getActualGroup(msgReact._emoji.name, DATA_VALIDATION_POOL);
        lockEmojiInterWGroup(group, DATA_VALIDATION_POOL[msgReact.message.id]);
        // TODO : add the functionality to extend timeouts to handleTimeout
        // TODO : add onAdd and onDel handlers to EmojiGroups

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
    const msgInPool = isPartOfPool(msgReact.message.id);
    if (!msgInPool)
      return console.error(
        'User removed a reaction on a message that is not in the message Pool'
      );
    switch (msgInPool) {
      case 'DATA_VALIDATION_POOL': {
        freeEmojiInter(
          msgReact._emoji.name,
          DATA_VALIDATION_POOL,
          DATA_VALIDATION_POOL[msgReact.message.id]
        );
        return;
      }
      default:
        return console.log(
          `POOL ${msgInPool} not implemented, or it doesn't have a undo capability.`
        );
    }
  });

  client.on('message', async msg => {
    if (!shouldHandleMsg(msg)) return;
    await delAllMsgs({ DMIds: coaches });
    const [hasReplay, url, urlArr] = getMsgAttachments(msg);
    const { playingAgainst, playingAs, rank, replay } = whichDataPresent(msg);
    if (!hasReplay) return;
    try {
      const [replayL] = await handleConfIsReplay(replay, msg, url);
      await replayL;
      // prettier-ignore
      const [misDataL] = await handleMissingData(msg, playingAgainst, playingAs, rank, url);
      await misDataL;
      await handleConfirmation();
    } catch (e) {
      console.error(new Error(e));
    }
  });
})();

client.login(botKey);

import { botKey } from './config/keys.js';
import Discord from 'discord.js';
import {
  sleep,
  shouldHandleMsg,
  buildTicket,
  IS_REPLAY_POOL,
  getMsgAttachments,
  QUEUE_POOL,
  isPartOfPool,
  delAllMsgs,
  whichDataPresent,
} from './utils.js';
import { writeFileSync, readFileSync } from 'fs';
import { confirmIsReplayMsg, isNotSC2Replay, isSC2Replay } from './messages.js';
import { getCoaches } from './provider/provider.js';
import {
  handleMissingData,
  handleConfIsReplay,
  handleConfirmation,
  freeEmojiInter,
  isLockedwGroup,
  DATA_VALIDATION_POOL,
  isLocked,
  lockEmojiInter,
} from './utils.js';

import { raceEmojies, rankEmojies, allEmojies } from './Emojis.js';
import { getActualGroup } from './utils.js';
import { lockEmojiInterWGroup } from './utils.js';
