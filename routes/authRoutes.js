// const passport = require('../services/passport');
// const User = require ('../mongoDB/User')
// const Express = require('express')
// const mongoose = require('mongoose');

// const app = Express.Router();

// app.use(passport.initialize());
// app.use(passport.session());

//    app.get(
//     '/auth/google',
//     passport.authenticate('google', {
//       scope: ['profile', 'email']
//     })
//   );

//   app.get(
//     '/auth/google/callback',
//     passport.authenticate('google'),
//     (req, res) => {
//       res.redirect('/');
//     }
//   );

//   app.get('/auth/logout', (req, res) => {
//     req.logout();
//     res.redirect('/');
//   });

//   app.get('/api/current_user', (req, res) => {
//     res.send(req.user);
//   });

//   app.get('/', (req, res) => {
//     res.send( "welcome ! " );
//   });


//   module.exports = app 



// -------------------just keep pervious vision--------------------------------
// router.post('/login', (req, res) => {
//   let {username, password} = req.body;
//   if (!username) {
//       responseClient(res, 400, 2, '用户名不可为空');
//       return;
//   }
//   if (!password) {
//       responseClient(res, 400, 2, '密码不可为空');
//       return;
//   }
//   User.findOne({
//       username,
//       password: md5(password + MD5_SUFFIX)
//   }).then(userInfo => {
//       if (userInfo) {
//           //登录成功
//           let data = {};
//           data.username = userInfo.username;
//           data.userType = userInfo.type;
//           data.userId = userInfo._id;
//           //登录成功后设置session
//           req.session.userInfo = data;

//           responseClient(res, 200, 0, '登录成功', data);
//           return;
//       }
//       responseClient(res, 400, 1, '用户名密码错误');

//   }).catch(err => {
//       responseClient(res);
//   })
// });
// router.post('/register', (req, res) => {
//   let {userName, password, passwordRe} = req.body;
//   if (!userName) {
//       responseClient(res, 400, 2, '用户名不可为空');
//       return;
//   }
//   if (!password) {
//       responseClient(res, 400, 2, '密码不可为空');
//       return;
//   }
//   if (password !== passwordRe) {
//       responseClient(res, 400, 2, '两次密码不一致');
//       return;
//   }
//   //验证用户是否已经在数据库中
//   User.findOne({username: userName})
//       .then(data => {
//           if (data) {
//               responseClient(res, 200, 1, '用户名已存在');
//               return;
//           }
//           //保存到数据库
//           let user = new User({
//               username: userName,
//               password: md5(password + MD5_SUFFIX),
//               type: 'user'
//           });
//           user.save()
//               .then(function () {
//                   User.findOne({username: userName})
//                       .then(userInfo=>{
//                           let data = {};
//                           data.username = userInfo.username;
//                           data.userType = userInfo.type;
//                           data.userId = userInfo._id;
//                           responseClient(res, 200, 0, '注册成功', data);
//                           return;
//                       });
//               })
//       }).catch(err => {
//       responseClient(res);
//       return;
//   });
// });

// //用户验证
// router.get('/userInfo',function (req,res) {
//   if(req.session.userInfo){
//       responseClient(res,200,0,'',req.session.userInfo)
//   }else{
//       responseClient(res,200,1,'请重新登录',req.session.userInfo)
//   }
// });

// router.get('/logout',function (req,res) {
//   req.session.destroy();
//   res.redirect('/');
// });

// module.exports = router;