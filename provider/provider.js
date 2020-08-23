export const ingestDataFromFile = async fileName =>
  new Promise((res, rej) =>
    readFile(fileName, (err, data) => {
      if (err) rej(err);
      res(data.toString().split('\n'));
    })
  );

const zergQuery = ['ZergCoach', '556487007535366174'];
const tossQuery = ['TossCoach', '556487013818302464'];
const terQuery = ['TerCoach', '556487011066707968'];
const coachQuery = ['Coach', '546799895840030736', 'AspiringCoach', '552128337766514690'];
export const allCoachIds = [
  '556487007535366174',
  '556487013818302464',
  '556487011066707968',
  '546799895840030736',
  '552128337766514690',
];

export const getCoaches = async (
  { zer = false, tos = false, ter = false, allCoach = false } = { allCoach: true }
) => {
  const finalQuery = [];
  (() => {
    if (allCoach) return finalQuery.push(...coachQuery);
    if (zer) finalQuery.push(...terQuery);
    if (tos) finalQuery.push(...tossQuery);
    if (ter) finalQuery.push(...zergQuery);
  })();

  // prettier-ignore
  const args = [ 'app', 'tUser', 'tAmount', 'tTitle', 'tPrettyPrint', 'tPrintUserId', 'sRole', JSON.stringify(finalQuery)];
  const offlineMembers = spawn('node', args, {
    cwd:
      '/run/media/twiggeh/Storage/projects/Webdev/Work/SC2 Replay Bot/OfflineMembersBot',
  });
  return new Promise((res, rej) => {
    const result = [];
    offlineMembers.stdout.on('data', data => {
      result.push(...data.toString().split('\n'));
    });
    offlineMembers.on('close', code => {
      if (code !== 0) rej(code);
      res(result.filter(i => !!i));
    });
  });
};

import { readFile } from 'fs';
import { spawn } from 'child_process';
