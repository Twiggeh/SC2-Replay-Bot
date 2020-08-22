const availableSchema = new mongoose.Schema({
  monday: {
    times: Array,
    ping: Boolean,
  },
  tuesday: {
    times: Array,
    ping: Boolean,
  },
  wednesday: {
    times: Array,
    ping: Boolean,
  },
  thursday: {
    times: Array,
    ping: Boolean,
  },
  friday: {
    times: Array,
    ping: Boolean,
  },
  saturday: {
    times: Array,
    ping: Boolean,
  },
  sunday: {
    times: Array,
    ping: Boolean,
  },
});
const coachSchema = new mongoose.Schema({
  id: String,
  races: [],
  available: availableSchema,
  timeZone: Number,
  dashboardId: String,
});
const Coach = mongoose.model('Coach', coachSchema);
export default Coach;
import mongoose from 'mongoose';
