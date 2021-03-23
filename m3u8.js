const fs = require('fs-extra');
const m3u8Parser = require('m3u8-parser');
const { promiseBatch, writeRequest, spawn } = require('./helpers');
class M3u8Spider {
    constructor (m3u8_txt, ts_pash = '') {
        this.name = Date.now() + '_' + Math.floor(Math.random() * 10);
        this.ts_pash = ts_pash;
        this.temp_dir = __dirname + '/temp/' + this.name;
        this.spawn_m3u8_path = this.temp_dir + '/index.m3u8';
        this.m3u8Parser = this.parseM3u8(m3u8_txt);
        this.spawn_manifest = [];
    }

    parseM3u8 (m3u8_txt) {
        // 解析m3u8内容
        const parser = new m3u8Parser.Parser();
        parser.push(m3u8_txt);
        parser.end();
        return parser;
    }

    // 下载
    async download () {
        await fs.ensureDir(this.temp_dir);

        await promiseBatch(this.m3u8Parser.manifest.segments, async (segment, index) => {
            const spawn_segment = JSON.parse(JSON.stringify(segment));

            const ts_uri = this.ts_pash + segment.uri;
            const ts_name = 'ts_' + index + '.ts';
            const ts_fullpath = this.temp_dir + '/' + ts_name;
            while (true) {
                try {
                    await writeRequest({url: ts_uri, timeout: 10000}, fs.createWriteStream(ts_fullpath));
                    spawn_segment.uri = ts_fullpath;
                    break;
                } catch (error) {}
            }

            if (segment.key && segment.key.uri) {
                const ts_key_uri = segment.key.uri;
                const ts_key_name = 'key_' + index;
                const ts_key_fullpath = this.temp_dir + '/' + ts_key_name;
                while (true) {
                    try {
                        await writeRequest({url: ts_key_uri, timeout: 10000}, fs.createWriteStream(ts_key_fullpath));
                        spawn_segment.key.uri = ts_key_fullpath;
                        break;
                    } catch (error) {}
                }
            }

            this.spawn_manifest[index] = spawn_segment;
        });
    }

    spawnM3u8 () {
        const m3u8 = [
            '#EXTM3U'
        ];
        const { version, targetDuration, mediaSequence, endList } = this.m3u8Parser.manifest;

        m3u8.push(`#EXT-X-VERSION:${version}`);
        m3u8.push(`#EXT-X-TARGETDURATION:${targetDuration}`);
        m3u8.push(`#EXT-X-MEDIA-SEQUENCE:${mediaSequence}`);

        this.spawn_manifest.forEach(segment => {
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
}

exports.spider = async function (name, m3u8_txt, ts_pash) {
    const spider = new M3u8Spider(m3u8_txt, ts_pash);
    await spider.download();
    await fs.writeFile(spider.spawn_m3u8_path, spider.spawnM3u8());
    spawn('ffmpeg', [
        '-allowed_extensions', 'ALL',
        '-y',
        '-f',
        'hls',
        '-i', '/Users/sunjinguang/repository/spiderhole/temp/1616476073625_2/index.m3u8',
        '-bsf:v', 'h264_mp4toannexb,dump_extra',
        '-bsf:a', 'aac_adtstoasc',
        '-c', 'copy',
        name + '.mp4'
    ], { shell:true });
};