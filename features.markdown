No more replays get lost. Before Replays would go under.

Coaches have a console that updates instead of being pinged.

Uses mutex like promises (to make code easier to extend / maintain)
It allows for the dataflow to be blocked until certain conditions are fullfilled without needing to branch from the main handler.

Supports N Branches of possible message outcomes, which can all be timed out, paused, resumed, restarted, reset, forwarded, and undone.

Dealing with race conditions between user and discord api, (in this case the user being faster).

Rendering a paginated table with arbitrary data in text form

Handling of invisible "glue" characters in the renderer of the table representation

Can reset itself to a good program state at every point in execution if something fails. Restores state from minimal database entries.
=> this allows the program to restart at any given point in time without any drawbacks except for the downtime that it takes to restart

Can figure out if external messages (CoachDashboard) is in a bad state and can recover it.

Frequent functions are written in a branchless style, speeding up their execution as if they were compiled

## What I did on this project

Working with a client, narrowing down on the requirements and functionality.
=> Suggestion on architecture and deployment
=> Deploying the required services (VPS over ssh, locally hosted mongodb instance)
=> Building the whole application in a functional style, with test driven development
Result : During closed alpha 1 bug was found. During closed beta 1 bug was found. During open beta \_\_ bugs were found
=> Running closed alpha and closed beta tests, working with the client's customers to improve upon the functionality

=> Training Staff on how to use the developed software
=> Training Staff on Server Maintenance (VPS & Mongodb instance)
