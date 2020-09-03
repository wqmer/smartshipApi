const Express = require('express')
const shortid = require('shortid');
const router = Express.Router();
const Order = require("../../mongoDB/model/Order")

const router = Express.Router();

router.post('/get_orders', function (req, res) {

    // const {
    //     email,
    //     ...userWithoutEmail
    // } = user;
    // const {
    //     limit,
    //     start,
    //     ...searchCondition
    // } = req.body;

    // let responseData = {
    // total: 10,
    //     list: []
    // };
	
    // Post.count(searchCondition)
    //     .then(count => {
    //         // responseData.total = count;
    //         Post.find(searchCondition, '_id title author dateAdded viewCount category description _category_id', {
    //             skip: parseInt(req.body.start) ,
    //             limit: parseInt(req.body.limit)
    //         }) .then(result => {
    //                 responseData.list = result;
    //                 responseClient(res, 200, 0, 'success', responseData);
    //             }).catch(err => {
    //             throw err
    //         })
    //     }).catch(err => {
    //         console.log(err.message)
    //     responseClient(res);
    // });
});

router.get('/get_order', (req, res) => {
    // let _id = req.query.id;	
	// Post.findOne({_id}).then(data=>{
	// 	responseClient(res,200,0,'success',data);
	// }); 
});

router.post('/create_order', function (req, res) {
    // const {
    //     title,
    //     author,
	// 	dateAdded,
    //     viewCount,
    //     category,
    //     description,
    //     _category_id
    // } = req.body;
	
    // let tempPost = new Post({
    //     title,
    //     author,
	// 	dateAdded,
    //     viewCount,
    //     category,
    //     description,
    //     _category_id
    // });
	
    // tempPost.save().then(data=>{
    //     responseClient(res,200,0,'保存成功',data)
    // }).cancel(err=>{
    //     console.log(err);
    //     responseClient(res);
    // });
});

router.post('/update_order',(req,res)=>{
    // const {
	// 	id,
    //     title,
    //     author,
    //     dateAdded,
    //     viewCount,
    //     category,
    //     description,
    //     _category_id
    // } = req.body;
    // console.log(req.body)
	
    // Post.update({_id:id},{title, author, dateAdded, viewCount,category,description,_category_id})
    //     .then(result=>{
    //         responseClient(res,200,0,'更新成功',result)
    //     }).cancel(err=>{
    //     console.log(err);
    //     responseClient(res);
    // });
});

router.get('/delete_order',(req, res)=>{
    // let id = req.query.id;
    // Post.remove({_id: id})
    //     .then(result=>{
    //         // console.log(result.result)
    //         if(result.result.n === 1){
    //             responseClient(res,200,0,'删除成功!')
    //         }else{
    //             responseClient(res,200,1,'发布不存在');
    //         }
    //     }).cancel(err=>{
    //         responseClient(res);
    // })
});


module.exports = router;