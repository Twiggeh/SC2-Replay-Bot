const availableSchema = new mongoose.Schema({
  monday: {
    times: Array,
    ping: { type: Boolean, default: false },
  },
  tuesday: {
    times: Array,
    ping: { type: Boolean, default: false },
  },
  wednesday: {
    times: Array,
    ping: { type: Boolean, default: false },
  },
  thursday: {
    times: Array,
    ping: { type: Boolean, default: false },
  },
  friday: {
    times: Array,
    ping: { type: Boolean, default: false },
  },
  saturday: {
    times: Array,
    ping: { type: Boolean, default: false },
  },
  sunday: {
    times: Array,
    ping: { type: Boolean, default: false },
  },
});
const coachSchema = new mongoose.Schema({
  id: String,
  races: [],
  available: availableSchema,
  timeZone: { type: Number, default: 0, max: 12, min: -12 },
  dashboardId: String,
});
const Coach = mongoose.model('Coach', coachSchema);
export default Coach;
import mongoose from 'mongoose';
