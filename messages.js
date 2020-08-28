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

/**
 * Builds the entire Dashboard Text
 * @param {DiscordUser} discordCoach
 * @param {Number} page
 * @return {String}
 */
export const dashboardMessage = (discordCoach, page = 1, maxEl = 5) => {
  const QUEUE_POOL_KEYS = Object.keys(QUEUE_POOL);
  // local copy of QUEUE_POOL, so that it is easier to paginate.
  const _QUEUE_POOL = {};
  for (
    let i = (page - 1) * maxEl;
    i < Math.min(maxEl * page, QUEUE_POOL_KEYS.length);
    i++
  ) {
    _QUEUE_POOL[QUEUE_POOL_KEYS[i]] = QUEUE_POOL[QUEUE_POOL_KEYS[i]];
  }

  const greeting = `Hello, ${discordCoach.username}!`;

  const getUnderline = (str, char = '=') => char.repeat(str.length);

  const getCoachAbleStudents = () => {
    // TODO : differentiate between students and replays.
    const qLength = QUEUE_POOL_KEYS.length;
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
   * @prop {string} beingCoached - The coach actively coaching the user.
   */

  /** Builds the table representation of the students that are waiting to be coached.
   * @param {Number} page */
  const getStudentTable = () => {
    if (QUEUE_POOL_KEYS.length === 0) return '';
    // TODO : add max width container
    let result = '';

    // Holds the longest elements that are going to be displayed in the table
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
    const renderData = [];
    const _QUEUE_POOL_KEYS = Object.keys(_QUEUE_POOL);

    for (let Q_ID of _QUEUE_POOL_KEYS) {
      /** @type {import('./utils/utils').Q_Ticket} */
      const ticket = _QUEUE_POOL[Q_ID];
      const name = ticket.student.username;
      const race = ticket.race;
      const rank = ticket.rank;
      const vsRace = vsRaceEmojis[ticket.vsRace].id;
      const beingCoached =
        ticket?.coach?.username === undefined ? ' - ' : ticket?.coach?.username;
      const minsElapsed = Math.floor((Date.now() - ticket.activatedAt) / 1000) / 60;
      const waitingFor = `${
        minsElapsed / 60 > 1
          ? `${(Math.floor(minsElapsed / 60) + '').padStart(2, '0')} hour${
              Math.floor(minsElapsed / 60) > 1 ? 's' : ''
            }  ${(minsElapsed % 60).toFixed(2).padStart(4, '0')} min${
              minsElapsed % 60 > 1 ? 's' : ''
            }`
          : `${minsElapsed.toFixed(2).padStart(4, '0')} mins`
      }`;
      const ID = numberIdent[ticket.emojiIdentifier]?.id
        ? numberIdent[ticket.emojiIdentifier].id
        : ticket.emojiIdentifier;
      renderData[ticket.emojiIdentifier] = {
        ID: String(ID),
        name: String(name),
        race: String(race),
        rank: String(rank),
        vsRace: String(vsRace),
        waitingFor: String(waitingFor),
        beingCoached: String(beingCoached),
      };
      // TODO : maybe implement without using _QUEUE_POOL
      // let i = maxEl * (page - 1);
      for (let key in longestDataStr) {
        // if (i === maxEl * page) break;
        longestDataStr[key] = Math.max(
          longestDataStr[key],
          renderData[ticket.emojiIdentifier][key].length // TODO cannot read property ID of undefined
        );
        //i++;
      }
    }

    /**@typedef {[{content: string, maxLength: number}]} FormatData
     * @param {FormatData} data*/
    const formatData = data => {
      if (data.length === 0) return '';
      let res = '|';
      data.forEach(({ content, maxLength }) => {
        const longestEl = maxLength + 2;
        const padStart = Math.max(1, Math.floor((longestEl - content.length - 1) / 2));
        const padEnd = longestEl - content.length - padStart;
        res += `${' '.repeat(padStart)}${content}${' '.repeat(padEnd)}|`;
      });
      return res;
    };

    /**@type {string} */
    let firstRow = '';

    const getTableLegend = () => {
      let result = '';
      /** @type {FormatData} */
      const data = [];
      for (let key in longestDataStr) {
        data.push({ content: key, maxLength: longestDataStr[key] });
      }
      firstRow = formatData(data);
      result += firstRow + '\n';
      result += getUnderline(firstRow, '-') + '\n';
      return result;
    };
    result += getTableLegend();

    for (let i = 1; i < renderData.length; i++) {
      const data = [];
      const row = renderData[i];
      if (row === undefined) continue;
      for (let key in row) {
        data.push({ content: row[key], maxLength: longestDataStr[key] });
      }
      result += formatData(data) + '\n';
    }
    const paginationStr = `Page ${page} / ${Math.max(
      1,
      Math.ceil(QUEUE_POOL_KEYS.length / maxEl)
    )}`; // TODO : change to normal indexies
    result += formatData([
      {
        content: paginationStr,
        maxLength: Math.max(paginationStr.length, firstRow.length - 4),
      },
    ]);
    const block = '```';
    return `${block}${result}${block}`;
  };
  return {
    content: `.
**DASHBOARD**

${greeting}
${getUnderline(greeting, '^')}

${getStudentTable()}

${getCoachAbleStudents()}
`,
  };
};

export const successfulCoaching = {
  content: `Were you satisfied with the coach?
If the answer is no and you would like to go again, please react with 🛑.
If everything was to your liking then you can react with ✅.

If there was a lot of useful information, that you think could help other people you could make a small writeup and submit it to our replay channel!`,
};

import { User as DiscordUser } from 'discord.js';
import { raceEmojis, vsRaceEmojis, rankEmojis, numberIdent } from './Emojis.js';
import { QUEUE_POOL } from './init.js';
