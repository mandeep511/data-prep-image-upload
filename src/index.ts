import express from 'express';
import "dotenv/config";
import { uploadR2, getPublicUrl } from './helper';

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.static('public'));
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.sendFile('index.html');
});

app.post('/upload', uploadR2.single('image'), (req, res) => {
  console.log("File upload hit");
  if (req.file) {
    console.log("File available");
    const url = getPublicUrl(req.file.key);
    res.send({ url });
  } else {
    res.status(400).send('No file uploaded.');
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});