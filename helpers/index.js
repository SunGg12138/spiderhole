const request = require('request');
const { spawn } = require('child_process');

exports.promiseBatch = async function (list, limit = 50, func) {
    let start = 0;

    let parts = list.slice(start, limit);

    while (parts.length > 0) {
        console.log('正在爬取', start + ' ~ ' + (start + parts.length));
        const promise = [];
        parts.forEach((item, index) => promise.push(func(item, start + index)));
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

exports.spawn = async function (command, args) {
    const app = spawn(command, args);

    app.stdout.on('data', (data) => {
        console.log(data.toString());
    });

    app.stderr.on('data', (data) => {
        console.log(data.toString());
    });

    return new Promise((re) => {
        app.on('close', (code) => {
            console.log(`${command}进程退出，退出码 ${code}`);
            re();
        });
    });
};