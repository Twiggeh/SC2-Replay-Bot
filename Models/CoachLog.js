const CoachLogEntrySchema = new mongoose.Schema({
  activatedAt: Number,
  content: String,
  url: String,
  attachArr: Array,
  race: String,
  rank: String,
  vsRace: String,
  StudentName: String,
  studentID: String,
  CoachName: String,
  CoachID: String,
  startedCoaching: Number,
  endedCoaching: Number,
  coachRating: { type: Number, max: 10, min: 0, default: 5 },
  studentRating: { type: Number, max: 10, min: 0, default: 5 },
});

/**
 * @typedef CL_Opts
 * @type {object}
 * @prop {number} activatedAt - Date.now() when the student has started the coaching request
 * @prop {string} [content] - The content of the message of the student
 * @prop {string} url - The Url detected to have a replay.
 * @prop {Array} [attachArr] - The array with all the attachments that the student Provided on the coaching request
 * @prop {string} race - The race of the student
 * @prop {string} rank - The rank of the student
 * @prop {string} vsRace - The race of the opponent
 * @prop {User["username"]} StudentName - The Discord.User.username of the coach
 * @prop {User["id"]} studentID - Id of the student
 * @prop {User["username"]} CoachName - The Discord.User.username of the coach
 * @prop {User["id"]} CoachID - The Discord.User.Id of the coach
 * @prop {number} startedCoaching - Date.now() of when the student has started to be coached.
 * @prop {number} endedCoaching - Date.now() of when the coaching session has ended.
 * @prop {number} coachRating - Number from 0 - 10, that rates the coach.
 * @prop {number} studentRating - Number from 0 - 10, that rates the student.
 */

/**
 * @type {function(new:mongoose.Model<mongoose.Document, {}>, CL_Opts ) }}
 */
const CoachLogEntry = mongoose.model('CoachLogEntry', CoachLogEntrySchema);
export default CoachLogEntry;
import mongoose from 'mongoose';
import { User } from 'discord.js';
