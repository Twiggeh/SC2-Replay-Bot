const zergQuery = ['ZergCoach', '556487007535366174'];
const tossQuery = ['TossCoach', '556487013818302464'];
const terQuery = ['TerCoach', '556487011066707968'];
export const coachRoles = [
  '556487007535366174',
  '556487013818302464',
  '556487011066707968',
  '546799895840030736',
  '552128337766514690',
  '598891772499984394', // this is webdev role
  '641682841335496726', // this is the admin role
];
const coachQuery = ['Coach', '546799895840030736', 'AspiringCoach', '552128337766514690'];

let lastRetrieved = 0;
let memoizedIds = [];
let fetching = false;

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
