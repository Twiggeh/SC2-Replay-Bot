export const dayData = {
  times: { type: Array, default: ['00:00', '24:00'] },
  ping: { type: Boolean, default: false },
};
export const availSchema = {
  monday: dayData,
  tuesday: dayData,
  wednesday: dayData,
  thursday: dayData,
  friday: dayData,
  saturday: dayData,
  sunday: dayData,
};
const availableSchema = new mongoose.Schema(availSchema);
const coachSchema = new mongoose.Schema(
  {
    id: String,
    races: [],
    available: availableSchema,
    timeZone: { type: Number, default: 0, max: 12, min: -12 },
    dashboardId: String,
  },
  { id: false }
);
const Coach = mongoose.model('Coach', coachSchema);
export default Coach;
import mongoose from 'mongoose';
