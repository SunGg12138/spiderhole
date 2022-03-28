import fs from 'fs-extra';
import rp from 'request-promise';
import M3u8Spider from './lib/m3u8Spider';
import { spawn } from 'child_process';
import { URL } from 'url';

export async function m3u8 (url: string, outPath: string, key?: string) {
    const urlInfo = new URL(url);
    const { name, tempDir, manifest } = await M3u8Spider.spider({
        text: await rp(url),
        baseURL: `${urlInfo.protocol}//${urlInfo.host}`,
        outPath, key
    });
    const m3u8Text = M3u8Spider.compose(manifest);
    const m3u8Path = tempDir + '/index.m3u8';

    await fs.writeFile(m3u8Path, m3u8Text);

    const ffmpegArgs = [
        '-allowed_extensions', 'ALL',
        '-y',
        '-f',
        'hls',
        '-i', m3u8Path,
        '-bsf:v', 'h264_mp4toannexb,dump_extra',
        '-bsf:a', 'aac_adtstoasc',
        '-c', 'copy',
        name + '.mp4'
    ];
    await spawn('ffmpeg', ffmpegArgs, { shell: true });

    console.log('[ffmpeg] info:', 'ffmpeg', ffmpegArgs.join(' '));
}
