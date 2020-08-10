export const client = new Discord.Client();

const coaches = ['145856913014259712'];
const IS_REPLAY_POOL = createPool('IS_REPLAY_POOL');

client.on('ready', () => console.log('Bot online'));

client.on('messageReactionAdd', async (msgReact, user) => {
  if (user.bot) return;
  const msgInPool = isPartOfPool(msgReact.message.id);
  // TODO : Lock the interaction down. Here I don't have to acknowledge that a message might have a history since IS_REPLAY_POOL has immediate consequences to a reaction.
  // User has reacted
  switch (msgInPool) {
    case 'IS_REPLAY_POOL': {
      switch (msgReact._emoji.name) {
        case '✅': {
          return;
        }
        case '🛑': {
          await msgReact.message.channel.send(isNotSC2Replay);
          await sleep(10 * 1000);
          await delAllMsgs({ DMChannels: [msgReact.message.channel] });
          return;
        }
      }
    }
  }
});

client.on('message', async msg => {
  if (!shouldHandleMsg(msg)) return;
  await delAllMsgs({ DMIds: coaches });
  const attachments = Array.from(msg.attachments);
  for (let i = 0; i < attachments.length; i++) {
    const msgAttach = attachments[i][1];
    const url = msgAttach?.url;
    if (url?.includes?.('SC2Replay') !== true) continue;
    const content = msg.content;
    try {
      const answer = await msg.author.send(confirmIsReplayMsg);
      buildTicket(IS_REPLAY_POOL, { id: answer.id, content, url });
      await answer.react('✅');
      await answer.react('🛑');
    } catch (e) {
      console.error(new Error(e));
    }
  }
});

client.login(botKey);

import { botKey } from './config/keys.js';
import Discord, { DMChannel } from 'discord.js';
import { sleep, shouldHandleMsg, buildTicket, POOLS, createPool } from './utils.js';
import { writeFileSync, readFileSync } from 'fs';
import { confirmIsReplayMsg, isNotSC2Replay } from './messages.js';
import { isPartOfPool } from './utils.js';
import { delAllMsgs } from './utils.js';
