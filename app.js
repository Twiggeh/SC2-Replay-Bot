const client = new Discord.Client();

const coaches = ['145856913014259712'];
const IS_REPLAY_POOL = createPool('IS_REPLAY_POOL');
console.log(IS_REPLAY_POOL);
console.log(POOLS);

const delFromAllPools = id => {
  for (let poolName in POOLS) {
    delete POOLS[poolName][id];
  }
};

const delAllMsgs = async ({ DMIds, DMChannels }) => {
  const filterSettled = obj => {
    if (obj.status === 'fulfilled') return obj.value;
    console.error(obj.status);
    console.error(obj.reason);
  };
  const fetchedDms = [];
  if (DMIds) {
    const dmBuffer = [];
    DMIds.forEach(id => {
      const User = new Discord.User(client, { id });
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
