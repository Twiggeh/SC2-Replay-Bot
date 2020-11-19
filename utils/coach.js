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
export const isCoachCmd = async msg => {
  let result = 1;
  result &= !msg.author.bot;
  result &= msg.channel.type === 'dm';

  const userRoles = msg.client.guilds.cache.array()[0].members.cache.get(msg.author.id)
    ._roles;
  // TODO : remove webdev
  const isCoach =
    includesAnyArr(userRoles, coachRoles) ||
    includesAny(msg.author.id, await getCoaches());
  result &= isCoach;
  const hasRunner = msg.content.charAt(0) === CCMDDISCR;
  result &= hasRunner;
  result |= msg.content === '!deleteallmessages';

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
      const [dTicket] = await getDashTicket(msg.author);
      if (!dTicket) return;
      await freeEmojiInterWGroup('selectStudent', dTicket);
      return;
    }
    case `${CCMDDISCR}startcoaching`: {
      const studentIndex = rawCommand[1];
      if (studentIndex === undefined || studentIndex * 1 < 6 || studentIndex * 1 < 1)
        return console.log(`bad number ${rawCommand[1]}`);
      const [dTicket, dashMessage] = await getDashTicket(msg.author);
      if (!dTicket) return;
      const msgReact = new MessageReaction(
        client,
        {
          emoji: {
            deleted: false,
            id: null,
            identifier: '%F0%9F%8C%B6%EF%B8%8F',
            name: '🌶️',
          },
        },
        dashMessage
      );
      msgReact._emoji.name = studentIndex;
      lockEmojiInterWGroup('selectStudent', dTicket, msgReact);
      return;
    }
    case `${CCMDDISCR}deletereplay`: {
      const emojiId = rawCommand[1] * 1;
      if (isNaN(emojiId)) return console.log('User did not provide a number');
      if (emojiId === undefined) return console.log('no id to kill specified');
      const dash = await getDashboard(msg.author);
      const QUEUE_POOL_KEYS = Object.keys(QUEUE_POOL);
      let qTicket;
      for (const key of QUEUE_POOL_KEYS) {
        if (QUEUE_POOL[key].emojiIdentifier == emojiId) {
          qTicket = QUEUE_POOL[key];
          break;
        }
      }
      if (qTicket === undefined)
        return console.log(`could not find qTicket with ID ${emojiId}`);
      if (qTicket.coach)
        return console.log('Cannot remove a replay if it is already being coached.');
      const clEntry = new CoachLogEntry({
        activatedAt: qTicket.activatedAt,
        deletedBy: msg.author.username,
        endedCoaching: 0,
        race: qTicket.race,
        vsRace: qTicket.vsRace,
        rank: qTicket.rank,
        startedCoaching: 0,
        studentID: qTicket.student.id,
        studentName: qTicket.student.username,
        success: false,
        url: qTicket.url,
        attachArr: qTicket.attachArr,
        content: qTicket.content,
      });
      clEntry.save();
      await cleanUpAfterCoaching({
        id: 123,
        dTicket: { id: dash.id },
        qTicket: { id: qTicket.id },
      });
      return;
    }
    case `${CCMDDISCR}printpools`: {
      if (msg.author.id !== '145856913014259712') return;
      const safeStringify = (obj, indent = 2) => {
        let cache = [];
        const retVal = JSON.stringify(
          obj,
          (key, value) =>
            typeof value === 'object' && value !== null
              ? cache.includes(value)
                ? undefined // Duplicate reference found, discard key
                : cache.push(value) && value // Store value in our collection
              : value,
          indent
        );
        cache = null;
        return retVal;
      };
      await fs.writeFile('./POOLS', safeStringify(POOLS));
      const answer = await msg.author.send('Wrote data');
      await sleep(2 * 1000);
      answer.delete();
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

import { delAllMsgs, includesAnyArr, getStrUTCDay, includesAny, sleep } from './utils.js';
import Coach, { availSchema } from '../Models/Coach.js';
import { getCoaches } from '../provider/provider.js';
import { getDashboards, getDashboard, getDashTicket } from './dash.js';
import { Message, MessageReaction } from 'discord.js';
import { QUEUE_POOL } from '../init.js';
import { freeEmojiInterWGroup, lockEmojiInterWGroup } from './emojiInteraction.js';
import { cleanUpAfterCoaching } from './coachlog.js';
import { client } from '../app.js';
import { promises as fs } from 'fs';
import { POOLS } from './pool.js';
import CoachLogEntry from '../Models/CoachLog.js';
import { coachRoles } from '../config/global.js';
