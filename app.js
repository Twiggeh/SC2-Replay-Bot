const client = new Discord.Client();

const coaches = ['145856913014259712'];
const dmPool = [];
const prcdMsgs = {};

const clearAllMessages = async DmIds => {
  const filterSettled = obj => {
    if (obj.status === 'fulfilled') return obj.value;
    console.error(obj.status);
    console.error(obj.reason);
  };
  const dmBuffer = [];
  DmIds.forEach(id => {
    const User = new Discord.User(client, { id });
    dmBuffer.push(User.createDM());
  });
  const fetchedDms = (await Promise.allSettled(dmBuffer)).map(filterSettled);
  const msgBuffer = [];
  fetchedDms.forEach(dm => msgBuffer.push(dm.messages.fetch()));
  const fetchedMsgs = (await Promise.allSettled(msgBuffer)).map(filterSettled);
  const deleteBuffer = [];
  fetchedMsgs.forEach(msgMap =>
    Array.from(msgMap).forEach(snowFlakeWithMsg => {
      const msg = snowFlakeWithMsg[1];
      const id = snowFlakeWithMsg[0];
      delete prcdMsgs[id];
      msg.author.bot && deleteBuffer.push(msg.delete());
    })
  );
  const deleteResult = await Promise.allSettled(deleteBuffer);
  console.log(
    `Deleted ${deleteResult.length} message${deleteResult.length > 1 ? 's' : ''}`
  );
};

client.on('ready', async () => {
  console.log('Bot online');
});

client.on('messageReactionAdd', msgReact => {
  if (msgReact.count <= 1) return;
  // User has reacted
  switch (msgReact._emoji.name) {
    case '✅': {
      return;
    }
    case '🛑': {
      return;
    }
  }
});

const confirmIsReplayMsg = {
  content: `It seems you have submitted a SC2 Replay !

If that is true I would like you to react with the :white_check_mark:,
if not react with :octagonal_sign:

If you believe there has been a mistake and this message should not exist,
then please write a report and submit it to the upcoming bug-report channel :D`,
};

const isNotSC2Replay = {
  content: `Ok, if this has been a false positive please report it :D. Other than
that you don't have to do anything.

Have a nice day !`,
};

client.on('message', async msg => {
  if (msg.author.bot) return;
  if (msg.channel.name !== 'replays-1' && msg.channel.name !== 'replays-2') return;
  await clearAllMessages(coaches);
  for (let el of msg.attachments.entries()) {
    if (!Array.isArray(el)) continue;
    for (let i = 1; i < el.length; i += 2) {
      const msgAttach = el[i];
      const url = msgAttach?.url;
      const content = msg.content;
      if (!url) continue;
      try {
        const answer = await msg.author.send(confirmIsReplayMsg);
        prcdMsgs.push();
        await answer.react('✅');
        await answer.react('🛑');
      } catch (e) {
        console.error(new Error(e));
      }
    }
  }
});

client.login(botKey);

import { botKey } from './config/keys.js';
import Discord from 'discord.js';
import { writeFileSync, readFileSync } from 'fs';

// channels that it sees : welcome
