/**@param {string} id - DiscordUser id
 * @param {Lock[]} locks - All locks associated with this dataFlow
 * @returns {DataFlowEntry} Returns a dataFlowEntry */
export const dataFlowFactory = (id, locks = []) => {
  class DataFlow {
    constructor() {
      this.id = id;
      this.curAction = 0;
      this.aborted = false;
      this.locks = locks;
    }
    get rejects() {
      return this.locks.map(el => el[2]);
    }
    get resolves() {
      return this.locks.map(el => el[1]);
    }
  }
  DataFlow.prototype.remove = () => {
    delete DATA_FLOW[id];
  };
  DataFlow.prototype.abort = () => {
    DATA_FLOW[id].aborted = true;
    /** @type {DataFlowEntry}  */
    return DATA_FLOW[id];
  };
  /** @param {string} reason - Reason to reject all pending Promises
   *  @returns {DataFlowEntry}
   */
  DataFlow.prototype.rejectAll = reason => {
    for (let rej of DATA_FLOW[id].rejects) {
      rej(reason);
    }
    return DATA_FLOW[id];
  };
  /** @param {number} index - Index of the action to resolve */
  DataFlow.prototype.resolveInd = index => {
    DATA_FLOW[id].locks[index][1]();
    return DATA_FLOW[id];
  };
  DataFlow.prototype.resolve = () => {
    DATA_FLOW[id].locks[DATA_FLOW[id].curAction][1]();
    return DATA_FLOW[id];
  };
  DataFlow.prototype.resolveAll = () => {
    DATA_FLOW[id].resolves.forEach(res => res());
    return DATA_FLOW[id];
  };
  const dataFlow = new DataFlow();
  DATA_FLOW[id] = dataFlow;
  return dataFlow;
};

import { DATA_FLOW } from '../provider/dataFlow.js';
