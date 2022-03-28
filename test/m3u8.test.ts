import { expect } from 'chai';
import { m3u8 } from '../src/index'

const m3u8_url = 'https://ksv-video-publish-m3u8.cdn.bcebos.com/c1896d96fbddb4e03faa4e70fc578f393c6a348c_568x320_211000.m3u8';

describe('m3u8 test', function () {
    it('爬取指定url的m3u8数据', async function () {
        await m3u8(m3u8_url, __dirname);
    });
});
