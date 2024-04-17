import aws from 'aws-sdk';
import { S3Client } from '@aws-sdk/client-s3';
import multer from 'multer';
import multerS3 from 'multer-s3';
import fs from 'fs';
import { v4 as uuidv4 } from "uuid";


aws.config.update({
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  region: process.env.AWS_REGION,
});

const s3 = new S3Client();

export const uploadS3 = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_S3_DOUBTSOLVER_DATAPREP_BUCKET_NAME,
    acl: 'public-read',
    metadata: function (req, file, cb) {
      cb(null, {fieldName: file.fieldname});
    },
    key: function (req, file, cb) {
      cb(null, `${uuidv4()}`);
    }
  })
})


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