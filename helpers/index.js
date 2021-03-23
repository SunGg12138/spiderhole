const request = require('request');

exports.promiseBatch = async function (list, func) {
    let start = 0;
    let limit = 50;

    let parts = list.slice(start, limit);

    while (parts.length > 0) {
        console.log('正在爬取', start + ' ~ ' + (start + parts.length));
        const promise = [];
        parts.forEach(item => promise.push(func(item)));
        await Promise.all(promise);

        // 更换下一批数据
        start += limit;
        parts = list.slice(start, start + limit);
    }
};

exports.writeRequest = async function (options, writeStream) {
    return new Promise((re, rj) => {
        request(options)
        .on('error', function (error) {
            rj(error);
        })
        .pipe(writeStream);
        writeStream.on('finish', function () {
            re();
        });
        writeStream.on('error', function (error) {
            rj(error);
        });
    });
};
