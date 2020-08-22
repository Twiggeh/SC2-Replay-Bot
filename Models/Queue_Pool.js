const Queue_PoolEntrySchema = new mongoose.Schema({
  id: String,
  activatedAt: Date,
  timedOut: Boolean,
  emergency: Boolean,
  content: String,
  attachArr: [],
  race: String,
  rank: String,
  vsRace: String,
  coach: String,
});
const Queue_PoolEntry = mongoose.model('Queue_PoolEntry', Queue_PoolEntrySchema);
export default Queue_PoolEntry;
import mongoose from 'mongoose';
