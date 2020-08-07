export const sleep = async time => new Promise(resolve => setTimeout(resolve, time));
export const shouldHandleMsg = msg => {
  if (msg.author.bot) return false;
  if (msg.attachments === undefined) return false;
  if (msg.channel.name !== 'replays-1' && msg.channel.name !== 'replays-2') return false;
  return true;
};
const ticketFactory = (pool, id, content, url) => {
  switch ([pool]) {
    case 'IS_REPLAY_POOL':
      return {
        id,
        hasBeenReactedTo: false,
        reactionHistory: [],
        activatedAt: Date.now(),
        timedOut: 0,
        timeOutId: undefined,
        content,
        url,
        pool,
      };
    default:
      console.error(new Error(`Wrong type (${[pool]}) provided.`));
  }
};
const timeOutHandler = (ticket, system) => {
  switch (system) {
    case 'IS_REPLAY_POOL':
      return;
    default:
      console.error(new Error(`Wrong system (${system}) provided.`));
  }
};
const addToPool = (ticket, pool, timeOutAfter = 5 * 60 * 1000) => {
  ticket.pool = pool;
  pool[ticket.id] = ticket;
  const timeOutId = setTimeout(() => {
    timeOutHandler(ticket, [pool]);
  }, timeOutAfter);
  ticket.timeOutId = timeOutId;
};

export const buildTicket = (pool, { id, content, url }) => {
  const ticket = ticketFactory(pool, id, content, url);
  addToPool(ticket, pool);
  return ticket;
};
