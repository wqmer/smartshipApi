class Service {
  constructor(account, type, apiEndPoint, dicount) {
    this.account = account;
    this.apiEndPoint = apiEndPoint;
    this.type = type;
    this.dicount = dicount;
  }

  getConvertFactor = (CURRENT_UNIT, TARGET_UNIT) => {
    let factor;
    switch (true) {
      case CURRENT_UNIT == "cm" && TARGET_UNIT == "in":
        factor = 0.3937;
        break;
      case CURRENT_UNIT == "in" && TARGET_UNIT == "cm":
        factor = 2.54;
        break;

      case CURRENT_UNIT == "oz" && TARGET_UNIT == "lb":
        factor = 0.0625;
        break;
      case CURRENT_UNIT == "lb" && TARGET_UNIT == "oz":
        factor = 16;
        break;

      case CURRENT_UNIT == "oz" && TARGET_UNIT == "kg":
        factor = 0.02834;
        break;
      case CURRENT_UNIT == "kg" && TARGET_UNIT == "oz":
        factor = 35.274;
        break;

      case CURRENT_UNIT == "lb" && TARGET_UNIT == "kg":
        factor = 0.45359;
        break;
      case CURRENT_UNIT == "kg" && TARGET_UNIT == "lb":
        factor = 2.205;
        break;
      default:
        factor = 1;
    }
    return factor;
  };

// 拿去label 返回的base64数组，转换成图片 上传到 aws S3 
  ImageProcessAndUpload = (Payload, Imagetype , isRotate , isConvert , isclusterMode) => {




  }
  // rate = () => {
  //     console.log("this is rate function")
  // }

  // ship = () => {
  //     console.log("this is ship function")
  // }

  // void = () => {
  //     console.log("this is void function")
  // }

  // track = () => {
  //     console.log("this is track function")
  // }

  // verify = () => {
  //     console.log("this is verify function")
  // }
}

module.exports = Service;
