const path = require('path');

async function promiseAllWithConcurrency(items, fn, concurrency) {
    const results = [];
    const queue = items.slice();
    const workers = new Array(concurrency).fill(Promise.resolve());

    function getNextItem() {
        if (queue.length) {
            const item = queue.shift();
            return fn(item).then(result => {
                results.push(result);
                return getNextItem();
            });
        }
    }

    await Promise.all(workers.map(getNextItem));
    return results;
}

function generateUniqueFilename(prefix, extension) {
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').split('.')[0];
    return `${prefix}_${timestamp}.${extension}`;
}

module.exports = {
    promiseAllWithConcurrency,
    generateUniqueFilename
};