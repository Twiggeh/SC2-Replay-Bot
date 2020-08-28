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

  buildTicket(DASHBOARD_POOL, { id: dashboard.id });

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

// const updateAvailCoaches = async () => {
//   const availDashes = await getAvailDashboards();
//   await updateDashboards(availDashes.map(el => el.channel.recipient));
//   console.log('done');
// };

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
  check(emojiIdentifiers);
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

export const selectStudent = () => {
  console.log('Selected student');
};

export const finishedCoachingStudent = () => {
  console.log('Finished Coaching');
};

import { dashboardMessage } from '../messages.js';
import { getDBCoach } from './coach.js';
import { client } from '../app.js';
import { emojiIdentifiers, reqDashEmojis } from '../Emojis.js';
import Coach from '../Models/Coach.js';
import { getStrUTCDay, filterNum } from './utils.js';
import { Message, User as DiscordUser } from 'discord.js';
import { DASHBOARD_POOL } from '../init.js';
import { buildTicket } from './ticket.js';
