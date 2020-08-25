/**@typedef DataFlowEntry
 * @type {object}
 * @prop {boolean} aborted - Defaults to false
 * @prop {string} id - ID of the DataFlowEntry
 * @prop {function() => DataFlowEntry} remove - Deletes the DataFlowEntry
 * @prop {function() => DataFlowEntry} abort - Aborts the request
 * @prop {[function() => DataFlowEntry]} rejects - Array that rejects all promises pending in taskrunner
 * @prop {function() => DataFlowEntry} rejectAll - Rejects all promises that are still pending in the taskrunner
 * @prop {Lock[]} locks - All Locks for the passed functions.
 * @prop {number} curAction - Current iteration of the action array.
 * @prop {function() => DataFlowEntry} resolve - Resolve the current action that the taskrunner is awaiting
 * @prop {function() => DataFlowEntry} resolveAll - Resolve all actions that the taskrunner is awaiting
 * @prop {function() => DataFlowEntry} resolveInd - Resolve the action with the index of the action.
 * @prop {[function() => DataFlowEntry]} resolves - All resolvables of the locks. */

/** @type {Object<string, DataFlowEntry>} */
export const DATA_FLOW = {};
