export const client = new Discord.Client();

(async () => {
  const allCoachIds = await getCoaches();
  const coaches = ['145856913014259712'];

  client.on('ready', () => console.log('Bot online'));

  client.on('messageReactionAdd', async (msgReact, user) => {
    const badEmoji = () =>
      console.log('User tried to provide wrong emote : ' + msgReact._emoji.name);
    if (user.bot) return;
    const msgInPool = isPartOfPool(msgReact.message.id);
    // User has reacted
    switch (msgInPool) {
      case 'IS_REPLAY_POOL': {
        // TODO : Lock the interaction down.
        switch (msgReact._emoji.name) {
          case '✅': {
            clearTimeout(IS_REPLAY_POOL[msgReact.message.id].timeOutId);
            await IS_REPLAY_POOL[msgReact.message.id].origMsg.delete();
            await msgReact.message.channel.send(isSC2Replay(1));
            console.log(IS_REPLAY_POOL[msgReact.message.id]);
            await sleep(10 * 1000);
            await delAllMsgs({ DMChannels: msgReact.message.channel });
            // push to QUEUE
            return;
          }
          case '🛑': {
            clearTimeout(IS_REPLAY_POOL[msgReact.message.id].timeOutId);
            await msgReact.message.channel.send(isNotSC2Replay);
            await sleep(10 * 1000);
            await delAllMsgs({ DMChannels: msgReact.message.channel });
            return;
          }
          default:
            return badEmoji();
        }
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

  client.on('message', async msg => {
    if (!shouldHandleMsg(msg)) return;
    await delAllMsgs({ DMIds: coaches });
    const [hasReplay, url, urlArr] = getMsgAttachments(msg);
    const { playingAgainst, playingAs, rank, isReplay } = whichDataPresent(msg);
    if (!hasReplay) return;
    try {
      if (!isReplay) await sendConfirmIsReplay();
      // if (!rank)
    } catch (e) {
      console.error(new Error(e));
    }
  });
})();

client.login(botKey);

import { botKey } from './config/keys.js';
import Discord, { DMChannel } from 'discord.js';
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
import { sendConfirmIsReplay } from './utils.js';
