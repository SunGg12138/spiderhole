#!/usr/bin/env node
// https://1252524126.vod2.myqcloud.com/9764a7a5vodtransgzp1252524126/d85e2c425285890815859396666/drm/
const program = require('commander');
program
  .requiredOption('-p, --path <path>', '你本地的m3u8路径')
  .option('-tsp, --ts-path <ts_path>', 'ts基础路径')
  .parse(process.argv);

const path = require('path');
const fs = require('fs-extra');
const m3u8Parser = require('m3u8-parser');
const { promiseBatch, writeRequest } = require('./helpers');
const m3u8_file_path = program.opts().path;
const ts_path = program.opts().ts_path || '';
const m3u8_path_parser = path.parse(m3u8_file_path);
const ts_out_dir = m3u8_path_parser.dir + '/' + m3u8_path_parser.name + '_ts';

main().catch(console.log);

async function  main () {
    // 获取m3u8内容
    const manifest = await fs.readFile(m3u8_file_path);
    // 解析m3u8内容
    const parser = new m3u8Parser.Parser();
    parser.push(manifest);
    parser.end();
    const parsedManifest = parser.manifest;
    
    await fs.ensureDir(ts_out_dir);

    const error_files = await saveFile(parsedManifest.segments);

    console.log('爬取完成', m3u8_file_path);
    if (error_files.length > 0) {
        console.log('出错文件', error_files);
    }
}

// save file
async function saveFile(segments, retry = 5) {
    const error_files = [];
    await promiseBatch(segments, async function (segment) {
        const uri = ts_path + segment.uri;
        const ts_name = path.parse(uri).name;
        try {
            await writeRequest({url: uri, timeout: 20000}, fs.createWriteStream(ts_out_dir + '/' + ts_name + '.ts'));
        } catch (error) {
            if (!retry) {
                console.log(error);
                console.log('出错文件', uri);
            }
            error_files.push(segment);
        }
    });

    if (retry && error_files.length > 0) {
        console.log('尝试重新爬取错误文件');
        return saveFile(error_files, --retry);
    }

    return Promise.resolve(error_files);
}
