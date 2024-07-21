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

module.exports = {
    promiseAllWithConcurrency
};