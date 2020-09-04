// TODO : refresh all dashboards after some time has passed (5min ?)

/** Does not auto create a DM, just sends a dashboard and returns the dashboard message
 *  @param {DiscordUser} discordCoach*/
const createDashboard = async discordCoach => {
  // TODO : hook up pages
  const dash = await discordCoach.send(dashboardMessage(discordCoach));
  putAllReactsOnDash(dash);
  return dash;
};

/**
 * Retrieves A Dashboard for the provided ID, if it cannot find a Dashboard
 * for a specified ID, it will create a Dashboard and return it.
 * @param {DiscordUser} discordCoach
 * @returns {Promise<Message>}
 */
export const getDashboard = async discordCoach => {
  // TODO : Disallow the creation of a dashboard if the user does not have the right permissions.
  // !!! IMPORTANT Disallow the creation of a dashboard if the user does not have the right permissions.
  const cache = await Promise.allSettled([
    getDBCoach(discordCoach.id),
    discordCoach.dmChannel.messages.fetch(),
  ]);
  const [{ value: coach }, { value: messages }] = cache;

  /**@type {Message} */
  let dashboard = messages?.get(coach?.dashboardId);

  if (dashboard === undefined) {
    dashboard = await createDashboard(discordCoach);
    coach.dashboardId = dashboard.id;
    await coach.save();
  }

  let existingDash;
  const DASHBOARD_POOL_KEYS = Object.keys(DASHBOARD_POOL);
  for (const key of DASHBOARD_POOL_KEYS) {
    const existingDashes = DASHBOARD_POOL[key];
    if (existingDashes.coachID === dashboard.channel.recipient.id) {
      existingDash = existingDashes;
      break;
    }
  }

  /** @type {import('./ticket.js').D_Ticket} */
  const opts = {
    id: dashboard.id,
    coachID: discordCoach.id,
    lockedEmojiInteractionGroups: existingDash?.lockedEmojiInteractionGroups,
    endedCoaching: existingDash?.endedCoaching,
    studentQTicketID: existingDash?.studentQTicketID,
    startedCoaching: existingDash?.startedCoaching,
  };

  if (existingDash && existingDash?.id !== dashboard.id) {
    delete DASHBOARD_POOL[existingDash.id];
  }
  await buildTicket(DASHBOARD_POOL, opts);
  console.log(QUEUE_POOL);
  return dashboard;
};

/**
 * Takes an Array of discordCoaches and automatically updates
 * their Dashboards with the data from QUEUE_POOL
 * @param {DiscordUser[]} discordCoaches
 * @returns {Promise<void>}
 */
const updateDashboards = async discordCoaches => {
  const cache = [];
  for (let i = 0; i < discordCoaches.length; i++) {
    cache.push(getDashboard(discordCoaches[i]));
  }
  /**@type {Message[]}*/
  const dashboards = (await Promise.allSettled(cache)).map(el => el.value);
  const cache2 = [];
  for (const dashboard of dashboards) {
    cache.push(dashboard.edit(dashboardMessage(dashboard.channel.recipient)));
  }
  await Promise.allSettled(cache2);
  // TODO : add error handlers on all "allSettled" Promise handlers
};

export const updateAllDashboards = async () => {
  // TODO PUT INTO A PROVIDER
  const allCoaches = ['145856913014259712', '177517201023172609'];
  const cache = [];

  allCoaches.forEach(id => cache.push(client.users.fetch(id)));
  const discordCoaches = (await Promise.allSettled(cache)).map(el => el.value);

  await updateDashboards(discordCoaches);
  console.log('done');
};

/**
 * Gets all DiscordUsers from the provided IDs, creates
 * a DMChannel to those Users and retrieves their Dashboards.
 * If no Dashboard is found it is created.
 * @param {string[]} coachIDs - Discord User ID / Database ID (They are the same)
 * @returns {Promise<[Message]>}
 */
export const getDashboards = async coachIDs => {
  const cache = [];
  for (let i = 0; i < coachIDs.length; i++) {
    cache.push(async () => {
      const user = await client.users.fetch(coachIDs[i]);
      await user.createDM();
      return await getDashboard(user);
    });
  }
  const cache2 = [];
  for (const job of cache) {
    cache2.push(job());
  }
  return (await Promise.allSettled(cache2)).map(el => el.value);
};

// TODO : put into provider;
export const date = new Date();

/** @param {string[]} coachIds
 * @returns {Message[]}
 */

/** @param {Message} dash */
export const putAllReactsOnDash = async dash => {
  dash = await dash.fetch(true);
  const actions = [];
  let missing = false;

  const check = emojiObj => {
    for (const emojiName in emojiObj) {
      // TODO : Needs to only exist for the Bot user, if the
      // TODO : normal user has a reaction added this whole thing needs
      // TODO : return false;
      const exists = dash.reactions.cache.get(emojiObj[emojiName].id);
      if (exists) continue;
      missing = true;
      actions.push(() => dash.react(emojiObj[emojiName].id));
    }
  };
  check(numberIdent);
  check(reqDashEmojis);
  if (!missing) return;

  for (let i = 0; i < actions.length; i++) {
    await actions[i]();
  }
};

/** @param {Message[]} dashes*/
export const putAllReactsOnDashes = async dashes => {
  const cache = [];
  dashes.forEach(dash => cache.push(putAllReactsOnDash(dash)));
  await Promise.allSettled(cache);
};

/** @param {Message} dash
 *  @returns {[Number, Number]} - [curPage, maxPage]
 */
export const getPages = dash => {
  const contentArr = dash.content.split('\n');
  let index = -1;
  for (let i = contentArr.length - 1; i > -1; i--) {
    index = Math.max(
      index,
      (index === -1) * contentArr[i].includes('Page') * (i + 1) - 1
    );
  }
  if (index === -1) return [1, 1];
  const [curPage, maxPage] = contentArr[index]
    .split('/')
    .map(el => parseInt(filterNum(el)));
  if (
    isNaN(curPage) ||
    isNaN(maxPage) ||
    curPage === undefined ||
    maxPage === undefined
  ) {
    return [1, 1];
  }
  return [curPage, maxPage];
};
/**
 * @type {import('./emojiInteraction.js').EmojisAndMethods["onAdd"]}
 * @param {import('./ticket.js').D_Ticket} dashTicket
 */
export const goToNextPage = (dashTicket, emoji, msgReact) => {
  const msg = msgReact.message;
  const [curPage, maxPage] = getPages(msg);
  if (curPage >= maxPage) {
    console.log('nowhere to go to ');
    // TODO: Throw error at user.
    return;
  }
  msg.edit(dashboardMessage(msg.channel.recipient, curPage + 1));
};

/**
 * @type {import('./emojiInteraction.js').EmojisAndMethods["onAdd"]}
 * @param {import('./ticket.js').D_Ticket} dashTicket
 */
export const goToPrevPage = (dashTicket, emoji, msgReact) => {
  const msg = msgReact.message;
  const [curPage, maxPage] = getPages(msg);
  if (curPage <= 1) {
    console.log('nowhere to go to ');
    // TODO: Throw error at user.
    return;
  }
  msg.edit(dashboardMessage(msg.channel.recipient, curPage - 1));
};

/**
 * @type {import('./emojiInteraction.js').EmojisAndMethods["onAdd"]}
 * @param {import('./ticket.js').D_Ticket} dashT
 */
export const selectStudent = async (dashT, emoji, msgReact) => {
  if (dashT.studentQTicketID)
    return console.log('Cannot coach more than one student at once');
  // TODO:
  // Wait for at least 2 mins => if aborted, ask if was an actual coaching attempt.
  // |=> If yes fast forward to asking the coach and student about the experience. Collect data
  //

  const QUEUE_KEYS = Object.keys(QUEUE_POOL);
  const numIdent = emojiIdent[emoji].id;

  let index = -1;
  for (let i = 0; i < QUEUE_KEYS.length; i++) {
    index += (QUEUE_POOL[QUEUE_KEYS[i]].emojiIdentifier === numIdent) * (i + 1);
  }
  /** @type {import('./ticket.js').Q_Ticket} */
  const qTicket = QUEUE_POOL[QUEUE_KEYS[index]];
  if (!qTicket)
    return console.log("Coach tried to select a emoji that doesn't have a student on it");

  qTicket.beingCoached = true;

  // don't allow other coaches to select this student
  if (qTicket.coach) return console.log('Already being coached');

  // Mark the student as being coached
  qTicket.coach = msgReact.message.channel.recipient;
  qTicket.startedCoaching = Date.now();

  updateQueuePool();

  // Mark the dashboard as coaching
  dashT.startedCoaching = Date.now();
  dashT.lockedEmojiInteractionGroups = ['selectStudent'];
  dashT.studentQTicketID = qTicket.id;

  /** @type {[{value: import('../Models/Queue_Pool.js').QPE_Opts}, {value: Message}]} */
  const result = await Promise.allSettled([
    Queue_PoolEntry.findOne({ id: qTicket.id }),
    qTicket.coach.send(studentMessage(qTicket)),
    updateAllDashboards(),
  ]);

  const [{ value: queuePoolEntry }] = result;

  queuePoolEntry.coachID = msgReact.message.channel.recipient.id;
  queuePoolEntry.startedCoaching = Date.now();
  await queuePoolEntry.save();

  // TODO : Check whether updateAllDashboards calls the database
  console.log('Selected student');
};

/**
 * @type {import('./emojiInteraction.js').EmojisAndMethods["onDel"]}
 * @param {import('./ticket.js').D_Ticket} dTicket
 */
export const finishedCoachingStudent = async (dTicket, msgReact) => {
  /** @type {import('./ticket.js').Q_Ticket} */
  const qTicket = QUEUE_POOL[dTicket.studentQTicketID];
  if (!qTicket?.student) return console.log('No student to uncoach');

  delete QUEUE_POOL[qTicket.id];
  const coachDm = qTicket.coach.dmChannel;

  // Ask user whether coaching has succeeded.

  const answer = await qTicket.student.send(successfulCoaching);
  /** @type {import('./ticket.js').CL_Ticket} */
  const options = {
    id: answer.id,
    coachID: dTicket.coachID,
    dTicket,
    qTicket,
    studentQTicketID: dTicket.studentQTicketID,
  };
  await buildTicket(COACHLOG_POOL, options);

  await answer.react('✅');
  await answer.react('🛑');

  // Unset the coach in dbQueue, the coach in QUEUE_POOL will be unset after the logging is complete
  // AKA when the student clicks on the check / the octagonal sign to finish the session.
  /** @type {import('../Models/Queue_Pool.js').QPE_Opts} */
  const qPoolEntry = await Queue_PoolEntry.findOne({ id: qTicket.id });
  qPoolEntry.coachID = undefined;
  await qPoolEntry.save();
  await sleep(5000);

  delAllMsgs({ DMChannels: coachDm });

  console.log('Finished Coaching');
};

import { dashboardMessage, successfulCoaching, studentMessage } from '../messages.js';
import { getDBCoach } from './coach.js';
import { client } from '../app.js';
import { numberIdent, emojiIdent, reqDashEmojis } from '../Emojis.js';
import { delAllMsgs, filterNum, sleep } from './utils.js';
import { Message, User as DiscordUser } from 'discord.js';
import { DASHBOARD_POOL, QUEUE_POOL, COACHLOG_POOL } from '../init.js';
import { buildTicket } from './ticket.js';
import Queue_PoolEntry from '../Models/Queue_Pool.js';
import { updateQueuePool } from './pool.js';
