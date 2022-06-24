# REST API handling

`just-test` employs the client / server designed system.
In order to enable that in a generic way and yet not to bring a bunch of mostly unrelated libraries,
there is a built in REST API handling engine.

## Requirements

The system should allow API **handlers** registration.
Any number of handlers may be registered.
Each handler may register any number of API **endpoints**.
Endpoints should be validated for duplication and rejected in such a cases.

### Endpoint definition

API endpoint is keyed by `method`:`url-pattern` pair.
API registration should be validated for duplication and throw in such a cases.

### Responsibilities

The engine as a whole should pre-process the HTTP request, find an applicable handler or respond with NOT_FOUND.
If the relevant handler is found - the engine should foward the handling to it.
Engine should perform some basic routine tasks like URL parsing, extraction of path parameters and alike.