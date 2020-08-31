const CCMDDISCR = '!';

/**
 * Retrieves a coach, if it cannot find one it will create one.
 * @param {string} id Discord User Id / Coach Id (Both are the same)
 * @return {Promise<mongoose.Document>}
 */
export const getDBCoach = async id => {
  const fillAvailable = () => {
    const result = {};
    for (let day in availSchema) {
      const temp = {};
      for (let prop in availSchema[day]) {
        temp[prop] = availSchema[day][prop].default;
      }
      result[day] = temp;
    }
    return result;
  };

  let coach = await Coach.findOne({ id });
  if (!coach) {
    coach = new Coach({ id, available: fillAvailable() });
    await coach.save();
  }
  return coach;
};

/**@param {Message} msg */
export const isCoachCmd = msg => {
  let result = 1;
  result &= !msg.author.bot;
  result &= !(msg.channel.type !== 'dm');

  const userRoles = msg.client.guilds.cache.array()[0].members.cache.get(msg.author.id)
    ._roles;
  // TODO : remove webdev
  const isCoach =
    includesAnyArr(userRoles, allCoachIds) |
    includesAnyArr('598891772499984394', userRoles);
  result &= isCoach;
  const hasRunner = msg.content.charAt(0) === CCMDDISCR;
  result &= hasRunner;

  return result;
};

/**@param {Message} msg */
export const handleConfigCoach = async msg => {
  /**@param {Array} rawMsg */
  const getDay = rawMsg => {
    if (includesAnyArr(rawMsg, ['mon', 'monday'])) return getStrUTCDay(1);
    if (includesAnyArr(rawMsg, ['tue', 'tuesday'])) return getStrUTCDay(2);
    if (includesAnyArr(rawMsg, ['wed', 'wednesday'])) return getStrUTCDay(3);
    if (includesAnyArr(rawMsg, ['thu', 'thursday'])) return getStrUTCDay(4);
    if (includesAnyArr(rawMsg, ['fri', 'friday'])) return getStrUTCDay(5);
    if (includesAnyArr(rawMsg, ['sat', 'saturday'])) return getStrUTCDay(6);
    if (includesAnyArr(rawMsg, ['sun', 'sunday'])) return getStrUTCDay(0);
  };

  /**@param {Array} rawMsg */
  const getTime = rawMsg => {
    const index = rawMsg.indexOf('times:', 1);
    /**@type {string}  */
    const times = rawMsg[index + 1];
    if (index === -1 && times !== undefined) {
      // TODO : Throw bad time to coach.
      return false;
    }
    const timeArr = times.substr(1, times.length - 2).split(',');
    if (timeArr.length % 2 !== 0) {
      // TODO : Throw bad timesArr
      return false;
    }
    for (let i = 0; i < timeArr.length; i += 2) {
      const startTime = timeArr[0].split(':');
      const endTime = timeArr[1].split(':');
      const actualStart = startTime[0] * 60 + startTime[1];
      const actualEnd = endTime[0] * 60 + endTime[1];
      if (isNaN(actualStart) || isNaN(actualEnd)) {
        // TODO : Throw bad numbers
        return false;
      }
      if (actualEnd < actualStart) {
        // TODO : Invalid time configuration.
        return false;
      }
    }
    return timeArr;
  };

  /**@param {Array} rawMsg */
  const getPing = rawMsg => {
    const index = rawMsg.indexOf('ping:');
    if (index === -1) return false;
    if (rawMsg[index + 1] === 'true') return true;
    return false;
  };

  // TODO : Buffer this maybe, maybe put into provider.

  const rawCommand = msg.content.toLowerCase().split(' ');
  switch (rawCommand[0]) {
    case `${CCMDDISCR}setonedaytime`: {
      const dbCoach = await getDBCoach(msg.channel.recipient.id);
      const day = getDay(rawCommand);
      const times = getTime(rawCommand);
      const ping = getPing(rawCommand);
      dbCoach.available[day].times = times;
      dbCoach.available[day].ping = ping;
      await dbCoach.save();
      break;
    }
    case `${CCMDDISCR}setglobalping`: {
      const ping = getPing(rawCommand);
      const dbCoach = await getDBCoach(msg.channel.recipient.id);
      for (let day of Object.keys(dbCoach.available.inspect())) {
        if (day === '_id') continue;
        dbCoach.available[day].ping = ping;
      }
      await dbCoach.save();
      break;
    }
    case `${CCMDDISCR}setglobaltimes`: {
      const dbCoach = await getDBCoach(msg.channel.recipient.id);
      const times = getTime(rawCommand);
      for (let day of Object.keys(dbCoach.available.inspect())) {
        if (day === '_id') continue;
        dbCoach.available[day].times = times;
      }
      await dbCoach.save();
      break;
    }
    case `${CCMDDISCR}deleteallmessages`: {
      await delAllMsgs({ DMChannels: msg.channel }, true);
      // TODO : Send confirm
      return;
    }
    case `${CCMDDISCR}getdashboard`: {
      getDashboard(msg.author);
      return;
    }
    case `${CCMDDISCR}stopcoaching`: {
      const dash = await getDashboard(msg.author);
      if (!dash) return console.log('User did not have the right permissions');
      const DASHBOARD_POOL_KEYS = Object.keys(DASHBOARD_POOL);

      let coachDashTicket;
      for (let i = 0; i < DASHBOARD_POOL_KEYS.length; i++) {
        /** @type {import('./ticket.js').D_Ticket} */
        const dTicket = DASHBOARD_POOL[DASHBOARD_POOL_KEYS[i]];
        if (dTicket.coachID === msg.author.id) coachDashTicket = dTicket;
      }

      await freeEmojiInterWGroup('selectStudent', coachDashTicket);
      return;
    }
    case `${CCMDDISCR}startCoaching`: {
      console.log(
        'TODO : Create a method that will start coaching the student behind the id of rawmsg[1] '
      );
      return;
    }
    default: {
      // TODO: throw bad command at coach
      console.log('bad command');
    }
  }
  // TODO : Send configuration dashboard and then delete it after 20s
};

export const createCoaches = async coachIds => {
  /*const dashes = */ return await getDashboards(coachIds);
  // await putAllReactsOnDashes(dashes);
};

import { delAllMsgs, includesAnyArr, getStrUTCDay } from './utils.js';
import Coach, { availSchema } from '../Models/Coach.js';
import { allCoachIds } from '../provider/provider.js';
import { getDashboards, getDashboard } from './dash.js';
import { Message } from 'discord.js';
import { DASHBOARD_POOL } from '../init.js';
import { freeEmojiInterWGroup } from './emojiInteraction.js';
