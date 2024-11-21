import { S3Client } from '@aws-sdk/client-s3';
import multer from 'multer';
import multerS3 from 'multer-s3';
import path from 'path';
import { v4 as uuidv4 } from "uuid";

// Ensure environment variables are defined
const R2_ENDPOINT_URL = process.env.R2_ENDPOINT_URL;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

if (!R2_ENDPOINT_URL || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
  throw new Error("Missing required R2 configuration in environment variables");
}

const s3 = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT_URL,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

export const uploadR2 = multer({
  storage: multerS3({
    s3: s3,
    bucket: R2_BUCKET_NAME,
    acl: 'public-read',
    metadata: function (req, file, cb) {
      cb(null, {
        fieldName: file.fieldname,
        contentType: 'image/png'
      });
    },
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: function (req, file, cb) {
      console.log('Original file object:', file);
      console.log('Original filename:', file.originalname);
      
      // Get the filepath from the request body
      // @ts-ignore
      const filepath = req.body.filepath || '';
      // Construct the full key
      const key = filepath.includes('packed_data_prep/') 
        ? `${filepath}.png`
        : `packed_data_prep/${filepath}.png`;
        
      console.log('Final key for R2:', key);
      cb(null, key);
    }
  })
});

export const getPublicUrl = (key: string) => {
  return `https://cdn.pureessence.tech/${key}`;
};



// export const uploadToS3 = async (file: Express.Multer.File): Promise<string> => {
//   const { path, originalname } = file;

//   const fileName = `${uuidv4()}-${originalname}`;
//   const params = {
//     Bucket: process.env.AWS_S3_DOUBTSOLVER_BUCKET_NAME,
//     Key: fileName,
//     Body: fs.createReadStream(path),
//     ACL: 'public-read',
//   };

//   return new Promise((resolve, reject) => {
//     s3.upload(params, (err: Error | null, data: AWS.S3.ManagedUpload.SendData) => {
//       if (err) return reject(err);
//       resolve(data.Location);
//     });
//   });
// };