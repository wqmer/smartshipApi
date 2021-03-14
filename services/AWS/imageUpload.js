const moment = require("moment");
const imgConvert = require("image-convert");
const Jimp = require("jimp");
var cluster = require("cluster");
const numCPUs = 4;
require("dotenv").config();

const convertImageToJpg = (base64) => {
  return new Promise((resolve, reject) => {
    imgConvert.fromBuffer(
      {
        buffer: base64, //replace with buffer
        quality: 100, //quality
        output_format: "jpg", //jpg
        size: "original", //defualt
      },
      function (err, buffer, file) {
        if (!err) {
          resolve(buffer);
          // res.end(response);
        } else {
          reject(err.message);
          // res.json({
          //     "Error": err.message
          // })
        }
      }
    );
  });
};

const handleImage = async (ISConvert, ISRotate, BASE64DATA) => {
  let image;
  let result;
  switch (true) {
    case ISRotate:
      image = await Jimp.read(BASE64DATA);
      result = await image
        .rotate(270)
        .crop(0, 0, 800, 1200)
        .quality(60)
        .getBufferAsync(Jimp.MIME_JPEG);
      return result;
      break;
    case !ISRotate && ISConvert:
      image = await Jimp.read(BASE64DATA);
      result = await image.getBufferAsync(Jimp.MIME_JPEG);
      return result;
      break;
    default:
      result = BASE64DATA;
      return result;
  }
};

const imageUpload = async (
  base64,
  name,
  type = "png",
  isConvert = false,
  isRotate = false
) => {
  // You can either "yarn add aws-sdk" or "npm i aws-sdk"
  const AWS = require("aws-sdk");

  // Configure AWS with your access and secret key.
  const {
    ACCESS_KEY_ID,
    SECRET_ACCESS_KEY,
    AWS_REGION,
    S3_BUCKET,
  } = process.env;

  // Configure AWS to use promise
  AWS.config.setPromisesDependency(require("bluebird"));
  AWS.config.update({
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
    region: AWS_REGION,
  });

  // Create an s3 instance
  let base64Data;

  try {
    base64Data = new Buffer.from(
      base64.replace(/^data:image\/\w+;base64,/, ""),
      "base64"
    );

    base64Data = await handleImage(isConvert, isRotate, base64Data);

    // console.log(base64Data);
    // console.log(base64Data)
  } catch (error) {
    console.log("error happned in handle image");
    console.log(error);
  }

  const s3 = new AWS.S3();
  // Ensure that you POST a base64 data to your server.
  // Let's assume the variable "base64" is one.

  // Getting the file type, ie: jpeg, png or gif
  // const type = base64.split(';')[0].split('/')[1];
  // const type = 'png'

  // Generally we'd have an userId associated with the image
  // For this example, we'll simulate one
  const userId = 1;

  // With this setup, each time your user uploads an image, will be overwritten.
  // To prevent this, use a different Key each time.
  // This won't be needed if they're uploading their avatar, hence the filename, userAvatar.js.
  const params = {
    Bucket: S3_BUCKET,
    Key: `labels/${moment().format("YYYY-MM-DD")}/${name}.${type}`, // type is not required
    Body: base64Data,
    ACL: "public-read",
    ContentEncoding: "base64", // required
    ContentType: `image/${type}`, // required. Notice the back ticks
  };

  // The upload() is used instead of putObject() as we'd need the location url and assign that to our user profile/database
  // see: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#upload-property
  let location = "";
  let key = "";
  try {
    const { Location, Key } = await s3.upload(params).promise();
    location = Location;
    key = Key;
  } catch (error) {
    console.log(error);
    return error;
  }

  // Save the Location (url) to your database and Key if needs be.
  // As good developers, we should return the url and let other function do the saving to database etc
  // console.log(location, key);

  return location;

  // To delete, see: https://gist.github.com/SylarRuby/b3b1430ca633bc5ffec29bbcdac2bd52
};

module.exports = imageUpload;
