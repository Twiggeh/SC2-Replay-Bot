/**@typedef Pool
 * @type {Object.<string, Tickets>}
 * @type {string} name Name of the pool (on proto) */
// TODO : Refactor into provider (Pools Provider)
/**  @type {Object<string, Pool> } */
const POOLS = {};

/** @param {string} name - Unique name of the pool @returns {Pool}*/
export const createPool = (name, methods) => {
  class Pool {}
  if (methods)
    for (let method in methods) {
      Pool.prototype[method] = methods[method];
    }
  const result = new Pool();
  POOLS[name] = result;
  Pool.prototype.name = name;
  return result;
};

export const isPartOfPool = id => {
  for (let poolName in POOLS) {
    const pool = POOLS[poolName];
    if (pool[id] !== undefined) return poolName;
  }
  return false;
};

export const delFromAllPools = id => {
  for (let poolName in POOLS) {
    if (poolName === 'QUEUE_POOL') return;
    delete POOLS[poolName][id];
  }
};

export const addToPool = (ticket, pool, timeOutAfter = 5 * 60 * 1000) => {
  ticket.pool = pool;
  pool[ticket.id] = ticket;
  const timeOutId = setTimeout(() => {
    try {
      timeOutHandler(ticket, pool.name);
    } catch (e) {
      console.log(e);
    }
  }, timeOutAfter);
  ticket.timeOutId = timeOutId;
};

import { timeOutHandler } from './ticket.js';
