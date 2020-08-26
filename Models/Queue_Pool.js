const Queue_PoolEntrySchema = new mongoose.Schema({
  id: String,
  activatedAt: Number,
  content: String,
  attachArr: [],
  url: String,
  race: String,
  rank: String,
  vsRace: String,
  coachID: String,
  studentID: String,
});

/**
 * @typedef QPE_Opts
 * @type {object}
 * @prop {string} id - Id of the student
 * @prop {number} activatedAt - UTC time in ms when the student has started the coaching request
 * @prop {string} [content] - The content of the message of the student
 * @prop {string} url - The Url detected to have a replay.
 * @prop {string[]} [attachArr] - The array with all the attachments that the student Provided on the coaching request
 * @prop {string} race - The race of the student
 * @prop {string} rank - The race of the student
 * @prop {string} vsRace     - The race of the opponent
 * @prop {User["id"]} [coachID] - The Discord.User.Id of the coach
 * @prop {User["id"]} studentID - The Discord.User.Id of the student
 */
/**
 ** @type {function(QPE_Opts) : mongoose.Model<mongoose.Document, {}> }}
 */
const Queue_PoolEntry = mongoose.model('Queue_PoolEntry', Queue_PoolEntrySchema);
export default Queue_PoolEntry;
import mongoose from 'mongoose';
import { User } from 'discord.js';
