export interface M3u8SpiderOptions {
    // 名字
    name?: string;
    // m3u8文件的文本内容
    text: string;
    // 导出的文件路径
    outPath: string;
    // key的uri或本地路径
    key?: string;
    // 基础用的url理解
    baseURL?: string
}
