# Architecture, data model, data flow

`just test` is a fully features application, having it's own structure, specific data model and several data flows.
It is important to understand those principals in order to understand `just-test` capabilities and limitations.

## Architecture

`just-test` has a server-client architectural structure. Any tests execution, even a 'local' one, starts server that manages the execution life-cycle. There are several runners that are being launched/loaded as per session configuration and are actually executing tests - those are test environment instances.

### Server

Server is implemented is running as NodeJS process and it's responsibilities, roughly, are:
* manage test sessions state
* launch and manage non-interactive environments
* serve static resources

### Runner

First, there are initiating runners, which, via server API, create, execute and track test sessions.
Those runners are **not** `just-test` specific, but might be any REST-able application.

`just-test` own runners are those, that the library provides in order to actually execute tests. 
Those runners responsibilities, roughtly, are:
* maintain test-executing environment/s (in-browser, managed browsers, NodeJS processes)
* deploy and manage tests execution
* collect results and tier down

There are 3 kinds of runners in `just-test`.

**Interactive** runner - a simple set of static resources, that are serverd to a browser and provide interactive session UI.

**Browser** runner - NodeJS-based runner, that launches a browser instance/s and executes test session there.

**NodeJS** runner - NodeJS-based runner, that launches NodeJS process/es and executes test session there.

## Data Model

This section will define the data structures and names.
In order to really understand purpose and lifecycle of those, **Data flow** section below should be read.
But there we will already be using the terminology set in this section, hence it comes first in order.

### Session configuration

TODO: explain a structure of session configuration (environments concept, multifolded configuration etc).

### Test results

TODO: explain a structure of test results DTO.

## Data Flow

### Session lifecycle

TODO: explain here the creation of session, environment/s handling, tests execution, finalization and tier down.