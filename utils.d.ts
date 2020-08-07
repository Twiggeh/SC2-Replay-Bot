export function buildTicket(
  pool: object,
  options: { id: string; content: string | undefined; url: string }
): {
  id: string;
  hasBeenReactedTo: false;
  reactionHistory: array;
  activatedAt: number;
  timeOut: number;
  timeOutId: number;
  content: string | undefined;
  url: string;
  pool: object;
};
