/**@typedef EmojisAndMethods
 * @type {Object}
 * @prop {string[]} emojis All emojis belonging to the group
 * @prop {function(import("./ticket").AllTicket_Out, Emoji, MessageReaction): void } onAdd Runs when the group is unlocked
 *                        (no other emoji in the group is active),
 *                        and the user reacts with an emoji from this group.
 * @prop {function(import("./ticket").AllTicket_Out, MessageReaction): void} onDel Runs when the user removes a reaction belonging to this group. */

/**@typedef EmojiGroupName
 * @type {string} Unique name of the group */

/**@typedef GroupWithEmojisAndMethods
 * @type {Object.<string, EmojisAndMethods>} */

/** @type {Object.<string, GroupWithEmojisAndMethods>} */
const emojiInteractions = {};

/**
 *
 * @param {{object}} obj Any Object
 * @param {{(Array|string)}} propPath The path to set of the object
 * @param {*} value Any value to set at path
 * @returns {void} */
export const deepSetObj = (obj, propPath, value) => {
  if (typeof propPath === 'string') propPath = propPath.split('.');
  const curProperty = propPath.shift();
  if (propPath.length > 0) {
    if (obj[curProperty] === undefined) obj[curProperty] = {};
    return deepSetObj(obj[curProperty], propPath, value);
  }
  obj[curProperty] = value;
};

/**@param {Pool} pool INSTANCE OF POOL
 * @param {GroupWithEmojisAndMethods} groups */
export const registerEmojiInteraction = (pool, groups) => {
  for (let key in groups) {
    deepSetObj(emojiInteractions, [pool.name, key], groups[key]);
  }
};

export const onAddHelper = (ticket, emoji, assignee, emojiGroup) => {
  for (let emojiName in emojiGroup) {
    if (emojiGroup[emojiName].id === emoji) {
      ticket[assignee] = emojiName;
      return;
    }
  }
  console.error(
    `Could not find emoji (${emoji}) in ticket (${ticket}). ${assignee}.onAdd()`
  );
};

/** @param {MessageReaction} msgReact @returns {string} Name or ID of the emoji */
const emojiFromMsgReact = msgReact =>
  msgReact._emoji.id === null ? msgReact._emoji.name : msgReact._emoji.id;

/**@param {Pool} pool
 * @param {MessageReaction} msgReact
 * @returns {string | false} */
export const getActualGroup = (msgReact, pool) => {
  const emoji = emojiFromMsgReact(msgReact);
  const groups = Object.keys(emojiInteractions[pool.name]);
  let result = false;
  for (let group of groups) {
    const emojis = emojiInteractions[pool.name][group].emojis;
    if (emojis.includes(emoji)) result = group;
  }
  return result;
};

/** @param {MessageReaction} msgReact
 *  @param {AllTickets}      ticket */
export const lockEmojiInter = (msgReact, ticket) => {
  const actualGroup = getActualGroup(msgReact, ticket.pool);
  lockEmojiInterWGroup(actualGroup, ticket, msgReact);
};

/**@param {string}          group
 * @param {AllTickets}      ticket
 * @param {MessageReaction} msgReact */
export const lockEmojiInterWGroup = (group, ticket, msgReact) => {
  const emoji = emojiFromMsgReact(msgReact);
  const groupIndex = ticket.lockedEmojiInteractionGroups.indexOf(group);
  if (groupIndex !== -1) return console.error(`Group (${group}) already locked down.`);
  ticket.lockedEmojiInteractionGroups.push(group);
  emojiInteractions[ticket.pool.name][group].onAdd?.(ticket, emoji, msgReact);
};

/**@param {AllTickets}      ticket
 * @param {MessageReaction} msgReact */
export const freeEmojiInter = (msgReact, ticket) => {
  const actualGroup = getActualGroup(msgReact, ticket.pool);
  freeEmojiInterWGroup(actualGroup, ticket, msgReact);
};

/**@param {string}          group
 * @param {AllTickets}      ticket */
export const freeEmojiInterWGroup = (group, ticket, msgReact) => {
  const groupIndex = ticket.lockedEmojiInteractionGroups.indexOf(group);
  if (groupIndex === -1) return console.error(`Group (${group}) is already unlocked.`);
  ticket.lockedEmojiInteractionGroups.splice(groupIndex, 1);
  emojiInteractions[ticket.pool.name][group].onDel?.(ticket, msgReact);
};

/**@param {MessageReaction} msgReact
 * @param {Pool} pool */
export const isLocked = (msgReact, pool) => {
  const actualGroup = getActualGroup(msgReact, pool);
  return isLockedwGroup(msgReact, pool, actualGroup);
};

/** @param {MessageReaction} msgReact
 * @param {Pool} pool
 * @param {string | false} group
 * @returns {boolean} */
export const isLockedwGroup = (msgReact, pool, group) => {
  const ticket = pool[msgReact.message.id];
  const emoji = emojiFromMsgReact(msgReact);
  if (ticket === undefined || !group) {
    console.error(
      `Did not find ticket (${ticket}) or group (${group}) with emoji (${emoji})`
    );
    return true;
  }
  const index = ticket.lockedEmojiInteractionGroups.indexOf(group);
  if (index === -1) return false;
  return true;
};
import { Emoji, MessageReaction } from 'discord.js';
