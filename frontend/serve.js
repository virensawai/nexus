const http = require('http');
const fs = require('fs');
const path = require('path');

http.createServer((req, res) => {
  let file = '.' + (req.url === '/' ? '/index.html' : req.url.split('?')[0]);
  const ext = path.extname(file);
  const types = { 
    '.html': 'text/html', 
    '.js': 'text/javascript', 
    '.css': 'text/css',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml'
  };
  
  fs.readFile(file, (err, content) => {
    if (err) {
      if(err.code === 'ENOENT') {
         res.writeHead(404);
         res.end('404 Not Found');
      } else {
         res.writeHead(500);
         res.end('500 Server Error');
      }
    } else {
      res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
      res.end(content, 'utf-8');
    }
  });
}).listen(5500, () => console.log('Reliable Static server listening on port 5500'));
