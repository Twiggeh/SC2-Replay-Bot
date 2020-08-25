No more replays get lost. Before Replays would go under.

Fast forward through the data flow of a message.

Coaches have a console that updates instead of being pinged.

Tech :
Uses mutex like promises (to make code easier to extend / maintain)
It allows for the dataflow to be blocked until certain conditions are full filled without needing to branch from the main handler.
;

Dealing with race conditions between user and discord api, user being faster.
