const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const port = 3001;
const comparePath = '/compare';

app.use('/videos', express.static(comparePath));
app.use(cors());

app.get('/videos/list', (req, res) => {
  const bitrateOrder = ['VERY LOW', 'LOW', 'MID', 'HIGH'];
  const dataTypeOrder = ['TH', 'TH-OB', 'TH-BB', 'TH-M'];

  const getBitrateIndex = name => {
    for (let i = 0; i < bitrateOrder.length; i++) {
      if (name.includes(bitrateOrder[i])) {
        return i;
      }
    }
    return Number.MAX_VALUE;
  };

  const getDataTypeIndex = name => {
    for (let i = 0; i < dataTypeOrder.length; i++) {
      if (name.includes(dataTypeOrder[i])) {
        return i;
      }
    }
    return Number.MAX_VALUE;
  };

  const sortDirectories = (a, b) => {
    const bitrateIndexA = getBitrateIndex(a.name);
    const bitrateIndexB = getBitrateIndex(b.name);

    if (bitrateIndexA !== bitrateIndexB) {
      return bitrateIndexA - bitrateIndexB;
    }

    const dataTypeIndexA = getDataTypeIndex(a.name);
    const dataTypeIndexB = getDataTypeIndex(b.name);

    return dataTypeIndexA - dataTypeIndexB;
  };

  const sortFiles = (a, b) => {
    if (a.name.includes('AVC') && !b.name.includes('AVC')) return -1;
    if (!a.name.includes('AVC') && b.name.includes('AVC')) return 1;
    return 0;
  };

  const listVideos = (dir, parentPath = '') => {
    let items = fs.readdirSync(dir, { withFileTypes: true });

    let directories = items.filter(dirent => dirent.isDirectory()).sort(sortDirectories);
    let files = items.filter(dirent => !dirent.isDirectory()).sort(sortFiles);

    return directories.map(dirent => {
      const direntPath = path.join(dir, dirent.name);
      const relativePath = path.join(parentPath, dirent.name);
      return { 
        title: dirent.name, 
        videos: listVideos(direntPath, relativePath) 
      };
    }).concat(files.map(dirent => {
      const relativePath = path.join(parentPath, dirent.name);
      return { 
        title: path.basename(dirent.name, '.mp4'), 
        filename: dirent.name, 
        path: `videos/${relativePath}` 
      };
    }));
  };

  const videos = listVideos(comparePath);
  res.json(videos);
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${port}`);
});

