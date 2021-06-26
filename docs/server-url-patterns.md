# JustTest server URL patterns

JustTest is built of a server, session/suite/test runner components, UI and few helper modules (see [architecture](architecture.md) for more details).

Server application has several predefined URL spaces, which are mapped to a specific APIs or resources and resolved accordingly.

Each URL space is handled by a dedicated handler.

Following lines are describing those URL patterns and their behaviour.

## `/api`

`api` namespace is dedicated to API calls: session API, metadata API etc.

//	TODO: spec for all API endpoints

## `/core`

`core` namespace is used to serve `just-test` own core resources, runner components, common modules etc.

## `/ui`

Core URL space is reserved to serve JustTest own client application resources.

## `/aut`

`aut` handler is dedicated to serve an arbitrariy AUT (application under test) resources.

As a rule of thumb, any code/resource that your tests need to fetch to be tested should be requested by this URL space.

Assume, that `/aut/` path is translated to point to the root of your repository.

## `/libs`

`libs` space tells the server to resolve resource from the closest `node_modules`.

## `/tests`

This URL space is also used internally by the JustTest client application, it's purpose to fetch tests themselves.