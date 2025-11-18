export function processError(error) {
    if (!(error instanceof Error)) {
        return null;
    }

    const cause = error.cause ? processError(error.cause) : undefined;
    const stacktrace = error.stack.split(/\r\n|\r|\n/)
        .map(l => l.trim())
        .filter(Boolean);

    return {
        name: error.name,
        type: error.constructor.name,
        message: error.message,
        cause,
        stacktrace
    };
}