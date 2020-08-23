/* eslint-disable indent */
export const confirmIsReplayMsg = {
  content: `It seems you have submitted a SC2 Replay !

If that is true I would like you to react with the :white_check_mark:,
if not react with :octagonal_sign:

If you believe there has been a mistake and this message should not exist,
then please write a report and submit it to the upcoming bug-report channel :D`,
};

export const isNotSC2Replay = {
  content: `Ok, if this has been a false positive, please report it :D.
Other than that you don't have to do anything.

Have a nice day !`,
};

export const isSC2Replay = coachNum => {
  if (coachNum === undefined)
    return { content: 'Thank you for submitting, our coaches will take a look at it :D' };
  const singleCoach = coachNum === 1;
  const coachStr =
    // prettier-ignore
    coachNum === 0
      ? 'are no coaches online.\n They will be notified once they come online though :D'
      : `${singleCoach ? 'is' : 'are'} ${coachNum} coach${singleCoach ? '' : 'es'} available.
They have been notified :D`;
  return {
    content: `Thank you for submitting! Currently there ${coachStr}`,
  };
};

export const isSC2ReplayReminder = {
  content:
    "Hey!\n You haven't yet reacted to confirm wether or not your message contained a replay\n and was meant to be looked at by our coaches !",
};

export const isSC2Fail = {
  content:
    'You have still not reacted.\nIt will be assumed that you have not sent a SC2 Replay.',
};

export const missingDataError = errorMsg => {
  const msg = {
    content: `Your request to be coached will not be processed until you have specified all of the necessary data.
${errorMsg}You can put those classifiers anywhere in the message.`,
  };
  if (msg.length > 2000) console.error(`Will not be able to send message.`);
  return msg;
};

export const missingDataReminder = {
  content:
    'Hey!\nYou have not placed all reaction necessary!\nYou need to provide all the data for our coaches to take a look at your replay !',
};

export const missingDataFail = {
  content:
    "You have still not reacted.\nIt will be assumed that you don't want to be coached.",
};

export const reactedTooFast = {
  content: `Please refrain from reacting to the message while it is still being populated with reactions :D

  **Your coach request has been terminated.**
Please restart the process, and if possible, include all of the data tags that are required!`,
};

/**@param {DiscordUser} discordCoach
 * @param {Number} page
 */
export const dashboardMessage = (discordCoach, page = 1) => {
  const greeting = `Hello, ${discordCoach.username}!`;
  const getUnderline = (str, char = '=') => char.repeat(str.length);
  const getCoachAbleStudents = () => {
    const qLength = Object.keys(QUEUE_POOL).length;
    return `Currently there ${
      qLength === 0
        ? 'are no students'
        : qLength === 1
        ? 'is one student'
        : `are ${qLength} students`
    } to coach.`;
  };
  /**@typedef RenderData
   * @prop {string} ID - The emojiIdentifier that the coach will react with to get to coach the user
   * @prop {string} name - Name of the Student
   * @prop {string} race - Race of the Student
   * @prop {string} vsRace - Race of the Opponent
   * @prop {string} rank - Rank of the Student
   * @prop {string} waitingFor - How long the user has been waiting for to be coached
   * @prop {string} beingCoached - The coach actively coaching the user. */
  /** @param {Number} page */
  const getStudentTable = () => {
    // TODO : add max width container
    let result = '';

    /**@type {Object<string, number>} */
    const longestDataStr = {
      ID: undefined,
      name: undefined,
      race: undefined,
      rank: undefined,
      vsRace: undefined,
      waitingFor: undefined,
      beingCoached: undefined,
    };
    for (let key in longestDataStr) {
      longestDataStr[key] = key.length;
    }

    /** @type {[RenderData]} */
    const temp = [];

    for (let Q_ID in QUEUE_POOL) {
      /** @type {import('./utils').Q_Ticket} */
      const ticket = QUEUE_POOL[Q_ID];
      const name = ticket.student.username;
      const race = raceEmojis[ticket.race].id;
      const vsRace = vsRaceEmojis[ticket.race].id;
      const rank = rankEmojis[ticket.race].id;
      const beingCoached =
        ticket?.coach?.username === undefined ? ' - ' : ticket?.coach?.username;
      const minsElapsed = Math.floor((Date.now() - ticket.activatedAt) / 1000) / 60;
      const waitingFor = `${
        minsElapsed / 60 > 1
          ? `${(Math.floor(minsElapsed / 60) + '').padStart(2, '0')} hour${(
              (minsElapsed % 60) +
              ''
            ).padStart(2, '0')} min${minsElapsed % 60 === 1 ? '' : 's'}`
          : `${minsElapsed} mins`
      }`;
      const ID = emojiIdentifiers[ticket.emojiIdentifier];
      temp[ID] = { ID, name, race, vsRace, rank, waitingFor, beingCoached };
      let i = 5 * (page - 1);
      for (let key in longestDataStr) {
        if (i === 5 * page) break;
        longestDataStr[key] = Math.max(longestDataStr[key], temp[ID][key].length);
      }
    }

    /**@typedef {[{content: string, maxLength: number}]} FormatData
     * @param {FormatData} data*/
    const formatData = data => {
      let res = '|';
      data.forEach(({ content, maxLength }) => {
        const longestEl = maxLength + 2;
        const padStart = Math.max(1, Math.floor((longestEl - content.length - 1) / 2));
        const padEnd = longestEl - content.length - padStart;
        res += `${' '.repeat(padStart)}${content}${' '.repeat(padEnd)}|`;
      });
      return res;
    };

    /** @type {FormatData} */
    const data = [];
    for (let key in longestDataStr) {
      data.push({ content: key, maxLength: longestDataStr[key] });
    }

    const getTableLegend = () => {
      let result = '';
      const firstRow = formatData(data);
      result += firstRow + '\n';
      result += getUnderline(firstRow, '-') + '\n';
      return result;
    };
    result += getTableLegend();
    for (let i = 0; i < temp.length; i++) {
      const data = [];
      const row = temp[i];
      for (let key in row) {
        data.push({ content: row[key], maxLength: longestDataStr[key] });
      }
      result += formatData(data);
    }
    const paginationStr = `Page ${page} / ${Math.ceil(temp.length / 5)}`;
    result += formatData([
      {
        content: `Page ${page} / ${Math.ceil(temp.length / 5)}`,
        maxLength: Math.max(
          paginationStr.length,
          data.reduce((acc, cur) => acc.maxLength + cur.maxLength)
        ),
      },
    ]);
    return result;
  };
  return {
    content: `**DASHBOARD**
${greeting}
${getUnderline(greeting)}
${getCoachAbleStudents()}

${getStudentTable()}
`,
  };
};

import { User as DiscordUser } from 'discord.js';
import { raceEmojis, vsRaceEmojis, rankEmojis, emojiIdentifiers } from './Emojis.js';
import { QUEUE_POOL } from './utils.js';
