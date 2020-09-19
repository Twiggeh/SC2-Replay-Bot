# The business requirement for this project:

> We have multiple people spamming coaches and not providing enough information on their replays. The replays and the coaching happen in the same channels, making it very difficult for coaches to find still uncoached replays. We don't want this mess anymore, we would like a discord bot to solve this issue.

> The bot should be elegant in its design, it shouldn't annoy its users with unnecessary notifications, and it should be dead simple to use.

# My proposed solution:

Coaches get a console that is being edited continuously instead of pinging the coaches with a new dashboard.

All replays will be ingested into the bot and will be forced through a data acquisition pipeline, similar to how a multipart form works.

That ensures that _no more replays get lost_ - all of the replays are now in one _central place_ plain for everyone to see.

# Technical implementation:

**_Written functionally, stateless operation, easily extendable and modifiable message flow, robust race condition handling and graceful failing._**

## Branching logic for the message / data aggregation

Supports N Branches of possible message outcomes, which can all be timed out, terminated, resumed, fullfilled and chained. Easy functionality upgrades would be a history and an undo / redo system.

> => To achieve n possible branches at each node, the bot uses mutex-like structures. This allows for easy extension and modification of the message flow.

## Keeping track of messages

Discord assumes that their bots will keep track of all messages that have been sent, if any reactions (data aggregation) should be collected. This creates a unique challenge, because not only do I have to keep track of all the open message trees, but I also don't have a reliable source of truth (networks are unreliable).

When comparing this with forms filled out in a browser, the underlying complexity emerges. With webforms the server doesn't need to handle or keep track of the state of the browser, the server is only interested in the post request on the user submitting their data. The discord bot on the other hand has to keep track of _everything_ and validate on each step of the way if something went astray. This validation can for example figure out if external messages are in a bad state and can recover them, by deleting and resending, editing, or updating the supplied reactions.

That state-keeping complicates matters for the stateless operation even further.

## Stateless

State-keeping was designed to be a module. This allows for the central state-keeping to be extracted into any database implementation or to be layered with additional logic easily. This implementation allows the bot to be stateless.

Being stateless allows the bot to reset itself to a good program state at every point in execution on any failure without loosing data or inconveniencing the end user. It can restore all state from minimal database entries.

This not only makes the development and debug cycle faster it also allows for trivial horizontal scaling.

## Scaling and Performance

The bot being stateless allows for easy scaling across n nodes. Functions that are called on each request are de-branched (effectively compiling them by hand), speeding up the execution time of those functions by a factor of 5 - 37.

## Statistically significant data aggregation

The bot also provides statistical insight for the staff, so that they can promote / demote accordingly. It also allows for staff to enforce server rules for messages that are sent through the bot.

## Ease of use

The bot renders a paginated table with data in text and image (emoji) form. This eliminates the problem of having messages that are too long for being a message.

Visually a table was the best way to lay out the data. It adjusts for data length and invisible 0 width characters to make the table visually as pleasing as possible.

Discord doesn't support emojis being sent in batches so to ensure that emojis appear in a reasonable order they have to await the previous emoji. That introduces significant latency for the end user, which in turn introduces race conditions between user and discord api, (in this case the user being faster).

# Bugs that were encountered

**The random number generator in node 14.0.9 ends up sending the same random number after ~ 5 hours of operation.**

> => Fixed by implementing own xorshift and adding the unix timestamp infront of the random number

**DiscordJS upstream bugs**

> => [ Github issue ](https://github.com/discordjs/discord.js/issues/4827)

**Systems behaving the same on receiving the same payload**

> => Fixed by introducing vector clocks

# What I did on this project

Working with a client, narrowing down on the requirements and functionality.

=> Suggestion on architecture and deployment

=> Deploying the required services (VPS over ssh, locally hosted mongodb instance)

=> Building the whole application in a functional style, with test driven development
Result : During closed alpha 1 bug was found. During closed beta 1 bug was found. During open beta 2 more bugs were found

=> Running closed alpha and closed beta tests, working with the client's customers to improve upon the functionality

=> Training Staff on how to use the developed software

=> Training Staff on Server Maintenance (VPS & Mongodb instance)
