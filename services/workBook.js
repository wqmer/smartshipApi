const XLSX = require("xlsx");
const agentTemplate = require("../config/shppingAgent");

function Workbook() {
  if (!(this instanceof Workbook)) return new Workbook();
  this.SheetNames = [];
  this.Sheets = {};
}

const generateSheet = (AgentName = "飞碟", data = [{ name: undefined }]) => {
  // var workbook = XLSX.readFile('./file/example.xls');
  // workbook.Custprops = undefined ;
  // workbook.Props = undefined;
  // XLSX.utils.sheet_add_aoa(workbook.Sheets.sheet1 , agentTemplate(AgentName,data).dataFormat, {origin:-1});
  // return workbook
  // if(agentTemplate(AgentName,data).head)return ''
  var ws = XLSX.utils.aoa_to_sheet([agentTemplate(AgentName, data).head]);
  XLSX.utils.sheet_add_aoa(ws, agentTemplate(AgentName, data).dataFormat, {
    origin: -1,
  });
  const wb = XLSX.utils.book_new();
  wb.SheetNames.push("sheet1");
  wb.Sheets.sheet1 = ws;
  var array = new Array(agentTemplate(AgentName, data).head.length);
  var wscols = array.fill({ wch: 13 });
  ws["!cols"] = wscols;
  ws["!ref"] = "A1:T11";
  return wb;
};

const readFBAList = () => {
  try {
    const XLSX = require("xlsx");
    var workbook = XLSX.readFile("./file/FBA.xlsx");
    var first_sheet_name = workbook.SheetNames[0];
    var worksheet = workbook.Sheets[first_sheet_name];
    const data = XLSX.utils.sheet_to_json(worksheet);

    let myData = data.map((item) => {
      let addressArray = item.address.split(",");
      return {
        label: item.label,
        full_address: item.address,
        address: addressArray[0],
        city: addressArray[addressArray.length - 3].trim(),
        state: addressArray[addressArray.length - 2].trim(),
        zipcode: addressArray[addressArray.length - 1].trim(),
      };
    });

    return {
      FBAlocation: myData,
    };
  } catch (error) {
    console.log(error);
    return {
      FBAlocaiton: [],
    };
  }
};

const readSheet = () => {
  try {
    const XLSX = require("xlsx");
    var workbook = XLSX.readFile("./file/fedex41.xls");
    var first_sheet_name = workbook.SheetNames[0];
    var worksheet = workbook.Sheets[first_sheet_name];
    const data = XLSX.utils.sheet_to_json(worksheet);

    return data;
  } catch (error) {
    console.log(error);
    return {
      SheetData: [],
    };
  }
};

module.exports = { generateSheet, readFBAList, readSheet };
