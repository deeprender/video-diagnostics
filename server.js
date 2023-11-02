const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3001;

const comparePath = '/compare';

app.use('/videos', express.static(comparePath));

app.get('/videos/list', (req, res) => {
  const listVideos = (dir) => {
    return fs.readdirSync(dir, { withFileTypes: true }).map(dirent => {
      const direntPath = path.join(dir, dirent.name);
      return dirent.isDirectory() ? { title: dirent.name, videos: listVideos(direntPath) } : { title: path.basename(dirent.name, '.mp4'), filename: dirent.name };
    });
  };

  const videos = listVideos(comparePath);
  res.json(videos);
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${port}`);
});
