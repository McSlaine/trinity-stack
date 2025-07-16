// lib/throttle.js

/**
 * Creates a throttled function that only invokes `func` at most once per `wait` milliseconds.
 * Subsequent calls to the throttled function return the result of the last `func` invocation.
 *
 * @param {Function} func The function to throttle.
 * @param {number} wait The number of milliseconds to throttle invocations to.
 * @returns {Function} Returns the new throttled function.
 */
function throttle(func, wait) {
    let context, args, result;
    let timeout = null;
    let previous = 0;

    const later = function() {
        previous = Date.now();
        timeout = null;
        result = func.apply(context, args);
        if (!timeout) context = args = null;
    };

    return function() {
        const now = Date.now();
        if (!previous) previous = now;
        const remaining = wait - (now - previous);
        context = this;
        args = arguments;
        if (remaining <= 0 || remaining > wait) {
            if (timeout) {
                clearTimeout(timeout);
                timeout = null;
            }
            previous = now;
            result = func.apply(context, args);
            if (!timeout) context = args = null;
        } else if (!timeout) {
            timeout = setTimeout(later, remaining);
        }
        return result;
    };
}

// Throttle requests to 1 per 2 seconds (1800 per hour)
const throttledFetch = throttle((url, options) => {
    const axios = require('axios'); // Require axios inside to avoid circular dependencies
    return axios.get(url, options);
}, 2000);

module.exports = { throttledFetch };
