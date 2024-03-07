const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const dotenv = require('dotenv');

const app = express();
const port = 3001;

dotenv.config();

const comparePath = '/compare';
const cloudfront_base_uri = process.env.VITE_CLOUDFRONT_URI ? process.env.VITE_CLOUDFRONT_URI : '';


app.use('/videos', express.static(comparePath));
app.use(cors());

app.get('/videos/list', (req, res) => {
  const listVideos = (dir, parentPath = '') => {
    return fs.readdirSync(dir, { withFileTypes: true }).map(dirent => {
      const direntPath = path.join(dir, dirent.name);
      const relativePath = path.join(parentPath, dirent.name);
      return dirent.isDirectory() 
        ? { title: dirent.name, videos: listVideos(direntPath, relativePath) }
        : { title: path.basename(dirent.name, '.mp4'), filename: dirent.name, path: `videos/${relativePath}`, cloudfront: `${cloudfront_base_uri}/${relativePath}` }
        ;
    });
  };

  const videos = listVideos(comparePath);
  // console.log(videos[0].videos[1].videos[0].videos)
  res.json(videos);
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${port}`);
});
