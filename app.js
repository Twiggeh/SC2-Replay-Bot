const client = new Discord.Client();

client.on('ready', () => console.log('Bot online'));

client.on('message', msg => {
  console.log(msg);
});

client.login(botKey);

import { botKey } from './config/keys.js';
import Discord from 'discord.js';
