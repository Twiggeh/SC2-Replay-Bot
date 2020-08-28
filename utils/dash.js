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

  buildTicket(DASHBOARD_POOL, { id: dashboard.id, coachID: discordCoach.id });

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
  const allCoaches = ['145856913014259712'];
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
  let anyCoachReacts = false;
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

  if (anyCoachReacts) {
    await dash.delete();
    dash = await getDashboard(dash.channel.recipient);
  }

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
    if (index === -1 && contentArr[i].includes('Page')) index = i;
  }

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
 * @param {import('./ticket.js').D_Ticket} dashTicket
 */
export const selectStudent = async (dashTicket, emoji, msgReact) => {
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
  const quTicket = QUEUE_POOL[QUEUE_KEYS[index]];

  if (!quTicket)
    return console.log("Coach tried to select a emoji that doesn't have a student on it");
  // don't allow other coaches to select this student
  if (quTicket.coach) return console.log('Already being coached');

  // Mark the student as being coached
  quTicket.coach = msgReact.message.channel.recipient;
  quTicket.startedCoaching = Date.now();

  // TODO : Send the Url, the userId and the original message to the coach.
  // TODO : After coaching remove these messages.

  // Update QUEUE_POOL's ids
  updateQueuePool();

  /** @type {import('../Models/Queue_Pool.js').QPE_Opts} */
  const queuePoolEntry = await Queue_PoolEntry.findOne({ id: quTicket.id });
  queuePoolEntry.coachID = msgReact.message.channel.recipient.id;
  queuePoolEntry.startedCoaching = Date.now();
  await queuePoolEntry.save();

  // Refresh all dashboards
  await updateAllDashboards();

  console.log('Selected student');
};

/**
 * @type {import('./emojiInteraction.js').EmojisAndMethods["onDel"]}
 * @param {import('./ticket.js').D_Ticket} dTicket
 */
export const finishedCoachingStudent = async (dTicket, msgReact) => {
  // Ask user whether coaching has succeeded.
  /** @type {import('./ticket.js').Q_Ticket} */
  const qTicket = QUEUE_POOL[dTicket.studentQTicketID]; // TODO : dTicket.studentQTicketID is still undefined
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

  // If yes, save to the database

  // if no, remove elements from queue_pool and reload queue_pool and the dashboards of the coaches

  // free the coaches dashboard
  // dTicket.studentQTicketID = undefined;
  // dTicket.startedCoaching = undefined;
  // dTicket.lockedEmojiInteractionGroups = [];
  // TODO : Free up the student's QUEUE_TICKET if he was satisfied, if not reset it.
  console.log('Finished Coaching');
};

import { dashboardMessage, successfulCoaching } from '../messages.js';
import { getDBCoach } from './coach.js';
import { client } from '../app.js';
import { numberIdent, emojiIdent, reqDashEmojis } from '../Emojis.js';
import Coach from '../Models/Coach.js';
import { getStrUTCDay, filterNum } from './utils.js';
import { Message, User as DiscordUser } from 'discord.js';
import { DASHBOARD_POOL, QUEUE_POOL, COACHLOG_POOL } from '../init.js';
import { buildTicket } from './ticket.js';
import Queue_PoolEntry from '../Models/Queue_Pool.js';
import { updateQueuePool } from './pool.js';
