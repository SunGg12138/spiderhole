# 爬虫集合

## m3u8

先下载ts文件到本地，组装并生成本地的m3u8文件，再使用ffmpeg生成mp4

```bash
-n --name 输出的文件名称
-u --url m3u8文件的远程路径，url和path必须二选一
-p --path m3u8文件的本地路径，url和path必须二选一
-tsp --tspath ts文件的公共路径
-d --del 生成完是否删除过程中的ts文件、m3u8文件

# 示例
m3u8 -d -n 我的mp4 --url http://****/test.m3u8 -tsp http://****/test/
```