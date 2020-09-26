# JustTest server URL patterns

JustTest is built of server, running on NodeJS platform, and client.
Server application has several predefined URL spaces, which are mapped to a specific APIs or resources and resolved accordingly.

Each URL space is handled by a dedicated handler.

Following lines are describing those URL patterns and their behaviour.

### `/api`

API URLs serving an internal API request, like tests metadata or a list of a tests resources to be fetched and run by the client JustTest application.

//	TODO: spec for all API endpoints

### `/aut`

`aut` handler dedicated to serve an arbitrariy AUT (application under test) resources, most likely the tested ones.

As a rule of thumb, any code/resource that your tests need to fetch to be tested should be requested by this URL space.

Assume, that `/aut/` path is translated to point to the root of your repository.

### `/core`

Core URL space is reserved to serve JustTest own client application resources.

### `/libs`

Libs space signals the server to serve resources from the closest `node_modules`.
Beside the prefix `/libs` this URL space behaves like a bare modules resolver.

### `/tests`

This URL space is also used internally by the JustTest client application, it's purpose to fetch tests themselves.