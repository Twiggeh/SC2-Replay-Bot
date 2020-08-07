const client = new Discord.Client();

const coaches = ['145856913014259712'];
const dmPool = [];
const IS_REPLAY_POOL = {};
const POOLS = [IS_REPLAY_POOL];

const delFromAllPools = id => {
  POOLS.forEach(pool => {
    delete pool[id];
  });
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

client.on('messageReactionAdd', async msgReact => {
  // TODO: check wether message is a replayPool msg etc by looking through the reactionHistory.
  if (msgReact.count <= 1) return;
  // User has reacted
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
});

client.on('message', async msg => {
  if (!shouldHandleMsg(msg)) return;
  await delAllMsgs({ DMIds: coaches });
  const attachments = Array.from(msg.attachments);
  for (let i = 1; i < attachments.length; i += 2) {
    const msgAttach = attachments[i];
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
import { sleep, shouldHandleMsg, buildTicket } from './utils.js';
import { writeFileSync, readFileSync } from 'fs';
import { confirmIsReplayMsg, isNotSC2Replay } from './messages.js';
