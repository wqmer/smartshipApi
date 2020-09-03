
const mapToShippingAgent = (agent , data) => {
    switch(agent) {
        case '飞碟':
          // code block[
             return  { head : [
                               "口岸", "参考号",'寄件人姓名', '寄件人邮寄地址','品牌','品名','规格','数量','重量','申报价值', '收件姓名', '收件人电话1',
                               '收件人电话2','省','市','区','地址','收件人邮编','收件人身份证号'
               ] ,
                       dataFormat :  data.map( item => 
                        [item['口岸']?item['口岸']:'',
                         item['参考号']?item['参考号']:'',
                         item['寄件人姓名']?item['寄件人姓名']:'',
                         item['寄件人邮寄地址']? item['寄件人邮寄地址']:'',
                         item.Brand?item.Brand:'',
                         item.Product?item.Product:'',
                         item.Standard?item.Standard:'',
                         item.Quantity?item.Quantity:'',
                         item['重量']?item['重量']:'',
                         item['申报价值']?item['申报价值']:'',
                         item.Name?item.Name:'',
                         item.PhoneNumber?item.PhoneNumber:'',
                         item.PhoneNumber2?item.PhoneNumber2:'',
                         item.Province?item.Province:'',
                         item.City?item.City:'',
                         item.District?item.District:'',
                         item.Address?item.Address:'',
                         item.Zip?item.Zip:'',
                         item.Id?item.Id:'',
                        ]
                    )                
                }
        
          break;
        default:
          return{ head:[] , dataFormat : []}
      }
}


// Name: String,
// Province:{type:String , default:'上海'},
// City:{type:String , default:'上海'},
// District:{type:String , default:'闵行'},
// Address: {type:String , default:'xxxx路 xxx号'},
// Id:{type:String , default:'310xxxxxxxxx'},
// Product: String,
// Standard:{type:String , default:'不适用'},
// Brand: {type:String , default:'ExampleBrand'},
// Quantity: {type:String , default:'5'},
// PhoneNumber:{type:String , default:'136xxxxxxxxx'},
// Status: { type: String, default: "未处理" } ,


module.exports = mapToShippingAgent