import axios from 'axios';

// 下载远程文件
export async function download (url: string) {
    const response = await axios.get(url);
    return response.data;
}
