let lastRetrieved = 0;
let memoizedIds = [];
let fetching = false;

export const getInaccurateCoaches = () => memoizedIds;

export const getCoaches = async (
  { zer = false, tos = false, ter = false, allCoach = false } = { allCoach: true }
) => {
  const lock = {};
  if (15 * 60 * 1000 < Date.now() - lastRetrieved && !fetching) {
    // need to fetch
    const finalQuery = [];
    (() => {
      if (allCoach) return finalQuery.push(...coachQuery);
      if (zer) finalQuery.push(...terQuery);
      if (tos) finalQuery.push(...tossQuery);
      if (ter) finalQuery.push(...zergQuery);
    })();

    // prettier-ignore
    const args = ['app', 'tUser', 'tAmount', 'tTitle', 'tPrettyPrint', 'tPrintUserId', 'sRole', JSON.stringify(finalQuery)];
    const offlineMembers = spawn('node', args, {
      cwd: process.cwd() + '/OfflineMembersBot',
    });

    // promisify childProcess
    const fetchIds = () =>
      new Promise((res, rej) => {
        lock.res = res;
        lock.rej = rej;
        const result = [];
        offlineMembers.stdout.on('data', data => {
          result.push(...data.toString().split('\n'));
        });
        offlineMembers.stderr.on('data', data => {
          console.error(data.toString());
        });
        offlineMembers.on('close', code => {
          if (code !== 0) rej(code);
          memoizedIds = result.filter(i => !!i);
          res(memoizedIds);
        });
      });
    lock.p = fetchIds();
    const ids = await lock.p;
    if (ids === undefined) {
      console.error(
        'fetchIds in getCoaches did not retrieve any coaches, sending outdated data'
      );
      return memoizedIds;
    }
    lastRetrieved = Date.now();
    memoizedIds = ids;
  }
  if (fetching) {
    console.log('Waiting for previous fetch.');
    await lock.p;
  }

  // don't need to fetch, data is fresh enough
  console.log(
    `Have to wait for ${
      15 * 60 * 1000 - Date.now() + lastRetrieved
    } before I will fetch new coaches`
  );
  return memoizedIds;
};

import { spawn } from 'child_process';
import { coachQuery, terQuery, tossQuery, zergQuery } from '../config/global';
