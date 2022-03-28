import path from 'path';
import fs from 'fs-extra';
import { Parser } from 'm3u8-parser';
import { M3u8SpiderOptions } from '../@types/spider';
import promiseBatch from './promiseBatch';
import request from 'request';
import * as stream from 'stream';
import url from 'url';

const TEMP_DIR = path.join(__dirname, '../../temp');

class M3u8Spider {
    readonly name: string;
    readonly text: string;
    readonly key: string;
    readonly baseURL: string = '';
    readonly outPath: string;
    // m3u8 解析后的内容
    readonly content: Record<string, any>;

    constructor (options: M3u8SpiderOptions) {
        if (!options.text) {
            throw new Error('[M3u8Spider] error: text 和 url 需要二选一');
        }
        
        this.name = options.name || Date.now().toString();
        this.text = options.text;
        this.outPath = options.outPath;
        this.key = options.key || '';
        this.baseURL = options.baseURL || '';

        this.content = new Parser();
        this.content.push(this.text);
        this.content.end();
    }

    public async download () {
        const segments: Array<any> = [];
        const tempDir = TEMP_DIR + '/' + this.name;

        await fs.ensureDir(tempDir);

        await promiseBatch(this.content.manifest.segments, 50, async (segment, index: number) => {
            // ts的路径是否包含了baseURL
            const hasBaseURL = /^http(s):/.test(segment.uri);
            if (!hasBaseURL && !this.baseURL) throw new Error('[ts] error: 文件${segment.uri}, 需要指定baseURL');

            const _segment = JSON.parse(JSON.stringify(segment));

            // 如果是路径需要拼接ts基础路径，否则直接使用
            const ts_uri = hasBaseURL? segment.uri : url.resolve(this.baseURL, segment.uri);
            const ts_name = 'ts_' + index + '.ts';
            const ts_fullpath = tempDir + '/' + ts_name;
            await pipelineUntil(
                request({url: ts_uri, timeout: 10000}),
                fs.createWriteStream(ts_fullpath),
            );
            _segment.uri = ts_fullpath;

            if (segment.key && segment.key.uri) {
                if (this.key) {
                    _segment.key.uri = this.key;
                } else {
                    const ts_key_uri = hasBaseURL? segment.key.uri : url.resolve(this.baseURL, segment.key.uri);
                    const ts_key_name = 'key_' + index;
                    const ts_key_fullpath = tempDir + '/' + ts_key_name;
                    await pipelineUntil(
                        request({url: ts_key_uri, timeout: 10000}),
                        fs.createWriteStream(ts_key_fullpath),
                    );
                }
            }

            segments[index] = _segment;
        });

        this.content.manifest.segments = segments;

        return { name: this.name, tempDir, manifest: this.content.manifest };
    }

    static async spider (options: M3u8SpiderOptions) {
       return (new M3u8Spider(options)).download();
    }

    // 合成m3u8
    static compose (manifest) {
        const m3u8 = [
            '#EXTM3U'
        ];
        const { allowCache, version, targetDuration, mediaSequence, endList, segments } = manifest;
    
        m3u8.push(`#EXT-X-VERSION:${version}`);
        m3u8.push(`#EXT-X-TARGETDURATION:${targetDuration}`);
        if (allowCache) m3u8.push(`#EXT-X-ALLOW-CACHE:YES`);
        m3u8.push(`#EXT-X-MEDIA-SEQUENCE:${mediaSequence}`);
    
        segments.forEach(segment => {
            if (segment.key) {
                m3u8.push(`#EXT-X-KEY:METHOD=${segment.key.method},URI="${segment.key.uri}",IV=${'0x00000000000000000000000000000000'}`);
            }
            if (segment.duration) {
                m3u8.push(`#EXTINF:${segment.duration},`);
            }
            m3u8.push(`${segment.uri}`);
        });
    
        if (endList) {
            m3u8.push(`#EXT-X-ENDLIST`);
        }
    
        return m3u8.join('\n');
    }
};

// 直到成功的pipeline
function pipelineUntil (s1, s2): Promise<{}> {
    return new Promise(re => {
        stream.pipeline(
            s1,
            s2,
            async (err) => {
                if (err) {
                    await pipelineUntil(s1, s2);
                    re({});
                } else {
                    re({});
                }
            }
        );
    });
}

export default M3u8Spider;
