/* eslint-disable indent */
/** @typedef AbortPtrPath - String that points to the location of the boolean abort flag
 *  @type {string} */

/**@typedef InterruptRunnerConfig
 * @type {object}
 * @prop {Array.<function(): promise>} actions - Array of async functions
 * @prop { {[AbortPtrPath]: boolean} | string } [abortPtr] - Boolean inside Pointer to abort execution of
 *                                      a next function block
 *                                    - If supplied string, the pointer will be assigned
 *                                      to the entry in dataFlow with the key being the
 *                                      string
 *                                    - If undefined will just use the internal abort of dataFlow
 * @prop {AbortPtrPath} [abortPath] - String that points to the location of the boolean abort flag
 * @prop {string} [dataFlowId] - Discord.User.id
 * @prop {boolean} [negatePtr] - If the pointer is to be negated */

const freshPointer = (abortPtr, abortPath, negatePtr) => {
  if (abortPtr && abortPath) return deepGetObject(abortPtr, abortPath) ^ negatePtr;
  return true;
};

/** @param {InterruptRunnerConfig} */
export const newInterruptRunner = async ({
  abortPtr = false,
  abortPath = false,
  dataFlowId = false,
  actions,
  negatePtr,
}) => {
  const dataFlow = dataFlowId
    ? dataFlowFactory(
        dataFlowId,
        Array.from(Array(actions.length), () => createLock())
      )
    : { locks: [], aborted: true };

  for (let i = 0; i < actions.length; i++) {
    dataFlow.curAction = i;
    if (freshPointer(abortPtr, abortPath, negatePtr) && dataFlow.aborted) {
      // DATA_FLOW[dataFlowId]?.rejectAll()?.remove();
      // delete DATA_FLOW[dataFlowId];
      return true;
    }
    try {
      await actions[i]();
      await dataFlow.locks[i]?.[0];
    } catch (e) {
      console.log(e);
    }
  }
  //DATA_FLOW[dataFlowId]?.resolveAll()?.remove();
  //delete DATA_FLOW[dataFlowId];
  return false;
};

import { deepGetObject, createLock } from './utils.js';
import { dataFlowFactory } from './dataFlow.js';
import { DATA_FLOW } from '../provider/dataFlow.js';
