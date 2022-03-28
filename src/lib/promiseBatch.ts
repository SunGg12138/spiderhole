export default async function (list: Array<any>, limit: number = 50, exec: Function): Promise<any> {
    let start = 0;

    let parts = list.slice(start, limit);

    while (parts.length > 0) {
        console.log('正在爬取', start + ' ~ ' + (start + parts.length));
        const promise: Array<any> = [];
        parts.forEach((item, index) => promise.push(exec(item, start + index)));
        await Promise.all(promise);

        // 更换下一批数据
        start += limit;
        parts = list.slice(start, start + limit);
    }
};
