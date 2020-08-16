export const confirmIsReplayMsg = {
  content: `It seems you have submitted a SC2 Replay !

If that is true I would like you to react with the :white_check_mark:,
if not react with :octagonal_sign:

If you believe there has been a mistake and this message should not exist,
then please write a report and submit it to the upcoming bug-report channel :D`,
};

export const isNotSC2Replay = {
  content: `Ok, if this has been a false positive, please report it :D.
Other than that you don't have to do anything.

Have a nice day !`,
};

export const isSC2Replay = coachNum => {
  if (coachNum === undefined)
    return { content: 'Thank you for submitting, our coaches will take a look at it :D' };
  const singleCoach = coachNum === 1;
  const coachStr =
    // prettier-ignore
    coachNum === 0
      ? 'are no coaches online.\n They will be notified once they come online though :D'
      : `${singleCoach ? 'is' : 'are'} ${coachNum} coach${singleCoach ? '' : 'es'} available.
They have been notified :D`;
  return {
    content: `Thank you for submitting! Currently there ${coachStr}`,
  };
};

export const isSC2ReplayReminder = {
  content:
    "Hey!\n You haven't yet reacted to confirm wether or not your message contained a replay\n and was meant to be looked at by our coaches !",
};

export const isSC2Fail = {
  content:
    'You have still not reacted.\nIt will be assumed that you have not sent a SC2 Replay.',
};

export const missingDataError = errorMsg => {
  const msg = {
    content: `Your request to be coached will not be processed until you have specified all of the necessary data.
${errorMsg}You can put those classifiers anywhere in the message.`,
  };
  if (msg.length > 2000) console.error(`Will not be able to send message.`);
  return msg;
};

export const missingDataReminder = {
  content:
    'Hey!\nYou have not placed all reaction necessary!\nYou need to provide all the data for our coaches to take a look at your replay !',
};

export const missingDataFail = {
  content:
    "You have still not reacted.\nIt will be assumed that you don't want to be coached.",
};
