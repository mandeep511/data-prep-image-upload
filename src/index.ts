import express from 'express';
import "dotenv/config";
import { uploadMiddleware } from './multer-config';
import { uploadS3 } from './helper';


const app = express();
const port = process.env.PORT || 3000;


// Middleware
app.use(express.static('public'));
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.sendFile('index.html');
});

app.post('/upload', uploadS3.single('image'), (req, res) => {
  console.log("File upload hit")
  if (req.file) {
    console.log("File available")
    const url = `https://${process.env.AWS_S3_DOUBTSOLVER_DATAPREP_BUCKET_NAME}.s3.amazonaws.com/${req.file.key}`;
    res.send({ url });
  } else {
    res.status(400).send('No file uploaded.');
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});