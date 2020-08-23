const allCoachIds = ['145856913014259712'];

let date;

const init = async () => {
  if ((date === undefined) | (Date.now() - date > 30 * 60 * 1000)) {
    date = Date.now();
    createCoaches(allCoachIds);
  }
};
export default init;
import { createCoaches } from './utils.js';
