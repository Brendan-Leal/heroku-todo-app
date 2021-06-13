// Wrapper for async middleware. Eliminates need to catch errors.
function catchError(handler) {
    return (req, res, next) => {
        Promise.resolve(handler(req, res, next)).catch(next);
    };
}

// The function takes a handler (an async middleware) as an argument.

// The function returns a new middleware.

// When called, the returned middleware:
    // Invokes the original handler.

    // Creates a "resolved Promise" that has the value returned by the original handler function.

    // If the handler function raises an exception, that exception gets caught by the Promise.prototype.catch call, which, in turn, dispatches the error via next(error).

module.exports = catchError;