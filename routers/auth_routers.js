import winston from 'winston';
import {check, validationResult} from "express-validator/check";
import {matchedData} from "express-validator/filter";
import User from "../models/User";
import bcrypt from "bcrypt-node";
import jwt from "jsonwebtoken";
import renderFront from "../views/front";
import config, {actionsKeys, isPhoneNum, string} from "../config";
import fs from "fs";
import path from "path";
import async from "async";
import Company from "../models/Company";
import Employee from "../models/Employee";
import {locale} from "../lang";
import auth from "../auth";
var FB = require('fb');
FB.extend({appId: '1025498560826970', appSecret: '5d35f87bf7565b6ce35f4f224b164864'});
let nodemailer = require('nodemailer');

module.exports = function (router, cache) {
    router.post('/login' , [
        check('username')
            .not()
            .isEmpty()
            .withMessage(locale("loginFrontToCompany.both_username_password_wrong"))
            .trim(),
        check('password')
            .not()
            .isEmpty()
            .withMessage(locale("loginFrontToCompany.both_username_password_wrong"))
            .trim(),
    ], function (req, res) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(200).json({success: false, msg: errors.array()[0].msg});
        }
        let data = matchedData(req);
        User.findOne({$or: [{username: data.username}, {email: data.username}]}, function (err, user) {
            if(err) {
                winston.error(err)
            }
            if (!user) {
                return res.json({success: false, msg: locale("user_not_found")});
            } else {
                let ps = user.password.replace("$2y$", "$2a$");
                if (bcrypt.compareSync(data.password, ps)) {
                    if(user.status === 'active') {
                        let token = jwt.sign({id: user._id}, config.jwt_secret, {
                            expiresIn: req.headers['isapp'] === 'yes' ? 86400000 : 60*60*24
                        });
                        let tokenConf = { hostOnly:false,domain:`.${req.domain}` };
                        tokenConf = {...tokenConf, maxAge: 86400000};
                        if(req.headers['isapp'] !== 'yes') {
                            res.cookie('token',token, tokenConf);
                        }
                        return res.status(200).json({success: true, token, user, data: req.body});
                    } else if(user.status === 'pending') {
                        let token = jwt.sign({id:user._id}, config.jwt_secret, {
                            expiresIn: req.headers['isapp'] === 'yes' ? 86400000 : 60*60*24
                        });
                        return res.status(200).json({success: true, email: user.email, pending: true, accessToken: token});
                    } else {
                        return res.status(200).json({success: false, msg: locale("loginFrontToCompany.inactive_user")});
                    }
                } else {
                    return res.status(200).json({success: false, msg: locale("submitInformation.wrong_password")});
                }
            }
        });
    });

    router.post('/loginFrontToCompany' , [
        check('username')
            .trim(),
        check('password')
            .trim(),
    ], function (req, res) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(200).json({success: false, msg: errors.array()[0].msg});
        }
        let data = matchedData(req);
        const {
            username,
            password,
        } = data;
        let errorData = [];

        if(string(username) === '' || !isNaN(username)){
            errorData.push({username: {text: username, error: locale("submitInformation.username.insert")}});
        }
        if(!password){
            errorData.push({password: {text: password, error: locale("submitInformation.passwordError.insert")}});
        }

        if(errorData && errorData.length>0){
            return res.status(200).json({success:false, errorData});
        } else {
            let regexUsername = new RegExp("^"+username+"$", "i");
            let emailUsername = new RegExp("^"+username+"$", "i");
            User.findOne({$and: [{$or: [{username: regexUsername}, {email: emailUsername}]}, {status: 'active'}]}).lean().exec( function (err, user){
                if(err){
                    winston.error('/loginFrontToCompany User.findOne()', err);
                    return res.status(200).json({success:false, msg: `${locale("system_err")} 1`});
                } else
                if (user) {
                    let ps = user.password.replace("$2y$", "$2a$");
                    if (bcrypt.compareSync(password, ps)) {
                        let token = jwt.sign({id: user._id}, config.jwt_secret, {
                            expiresIn: 60*60*24
                        });
                        let tokenConf = { hostOnly:false,domain:`.${req.domain}` };
                        tokenConf = {...tokenConf, maxAge: 86400000};
                        if(req.headers['isapp'] !== 'yes') {
                            res.cookie('token',token, tokenConf);
                        }

                        Employee.find({ user: user._id, status: 'active' }).lean().exec(function(err, emp){
                            if(err){
                                winston.error('/loginFrontToCompany Employee.findOne()', err);
                                return res.status(200).json({success:false, msg: `${locale("system_err")} 2`});
                            } else
                            if(emp && emp.length>0){
                                Company.find({ _id: {$in: emp.map(r => r.company)}, status: 'active' }).deepPopulate(['logo']).lean().exec(function(err, comp){
                                    if(err){
                                        winston.error('/loginFrontToCompany Company.findOne()', err);
                                        return res.status(200).json({success:false, msg: `${locale("system_err")} 3`});
                                    } else
                                    if(comp && comp.length>0){
                                        if(comp.length === 1){
                                            return res.status(200).json({success: true, redirectToCompany:true, user: {...user, password: null}, employee: emp, company:comp});
                                        } else {
                                            return res.status(200).json({success: true, user: {...user, password: null}, employee: emp, company:comp});
                                        }
                                    } else {
                                        return res.status(200).json({success: true, user: {...user, password: null}, employee:emp});
                                    }
                                });
                            } else {
                                return res.status(200).json({success: true, user: {...user, password: null}});
                            }
                        });
                    } else {
                        return res.status(200).json({success: false, msg: locale("loginFrontToCompany.both_username_password_wrong")});
                    }
                } else {
                    return res.json({success: false, msg: locale("loginFrontToCompany.both_username_password_wrong")});
                }
            });
        }
    });
    router.post('/registerCompanyAndUser' , [
        check('company_name').trim(),
        check('company_email').trim(),
        check('company_number').trim(),
        check('company_website').trim(),
        check('company_domain').trim(),
        check('last_name').trim(),
        check('first_name').trim(),
        check('register_id').trim(),
        check('username').trim(),
        check('email').trim(),
        check('phone').trim(),
        check('password').trim(),
        check('gender').trim(),
    ], function (req, res) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(200).json({success: false, msg: errors.array()[0].msg});
        }
        let data = matchedData(req);
        const {
            company_name,
            company_email,
            company_number,
            company_website,
            company_domain,
            last_name,
            first_name,
            register_id,
            username,
            email,
            phone,
            password,
            gender,
        } = data;
        let errorData = [];

        // ** checking start
        const emailRegex = config.config.get('email_regex');
        const usernameRegex = config.config.get('username_regex');
        const domainRegex = config.config.get('domain_regex');
        // const nameRegex = config.config.get('name_regex');
        const nameRegex = req.name_regex;
        // const registerRegex = config.config.get('register_id_regex');
        const registerRegex = req.register_id_regex;
        const phoneRegex = req.phone_regex;


        if(isNaN(company_email) && string(company_email) !== '' && !emailRegex.test(company_email)){
            errorData.push({company_email: {text: company_email, error: locale("registerCompanyAndUser.companyError.company_email_wrong")}});
        }

        if(isNaN(company_number) && string(company_number) !== '' && !isPhoneNum(company_number)){
            errorData.push({company_number: {text: company_number, error: locale("registerCompanyAndUser.companyError.company_phone_wrong")}});
        }

        if(isNaN(company_website) && string(company_website) !== '' && company_website.trim().length>50){
            errorData.push({company_website: {text: company_website, error: locale("registerCompanyAndUser.companyError.website_too_long")}});
        }

        if(string(company_domain) === '' || !isNaN(company_domain)){
            errorData.push({company_domain: {text: company_domain, error: locale("registerCompanyAndUser.domainError.insert")}});
        } else if(company_domain.trim().length<4){
            errorData.push({company_domain: {text: company_domain, error: locale("registerCompanyAndUser.domainError.too_short")}});
        } else if(company_domain.trim().length>20){
            errorData.push({company_domain: {text: company_domain, error: locale("registerCompanyAndUser.domainError.too_long")}});
        } else if(!domainRegex.test(company_domain)){
            errorData.push({company_domain: {text: company_domain, error: locale("registerCompanyAndUser.domainError.error")}});
        }

        if(string(last_name) === '' || !isNaN(last_name)){
            errorData.push({last_name: {text: last_name, error: locale("submitInformation.lastNameError.insert")}});
        } else if(last_name.trim().length>30){
            errorData.push({last_name: {text: last_name, error: locale("submitInformation.lastNameError.too_long")}});
        } else if(!nameRegex.test(last_name)){
            errorData.push({last_name: {text: last_name, error: locale("submitInformation.lastNameError.accepted_chars")}});
        }

        if(string(first_name) === '' || !isNaN(first_name)){
            errorData.push({first_name: {text: first_name, error: locale("submitInformation.firstNameError.insert")}});
        } else if(first_name.trim().length>30){
            errorData.push({first_name: {text: first_name, error: locale("submitInformation.firstNameError.too_long")}});
        } else if(!nameRegex.test(first_name)){
            errorData.push({first_name: {text: first_name, error: locale("submitInformation.firstNameError.accepted_chars")}});
        }

        if(!registerRegex.test(register_id)){
            errorData.push({register_id: {text: register_id, error: locale("submitInformation.registerIdError.error")}});
        }

        if(string(username) === '' || !isNaN(username)){
            errorData.push({username: {text: username, error: locale("submitInformation.usernameError.insert")}});
        } else if(username.trim().length<4){
            errorData.push({username: {text: username, error: locale("submitInformation.usernameError.too_short")}});
        } else  if(username.trim().length>30){
            errorData.push({username: {text: username, error: locale("submitInformation.usernameError.too_long")}});
        } else if(!usernameRegex.test(username)){
            errorData.push({username: {text: username, error: locale("submitInformation.usernameError.accepted_chars")}});
        }

        if(string(email) === '' || !isNaN(email)){
            errorData.push({email: {text: email, error: locale("submitInformation.emailError.insert")}});
        } else if(email.trim().length>60){
            errorData.push({email: {text: email, error: locale("submitInformation.emailError.too_long")}});
        } else if(!emailRegex.test(email)){
            errorData.push({email: {text: email, error: locale("submitInformation.emailError.error")}});
        }

        if(!phoneRegex.test(phone)){
            errorData.push({phone: {text: phone, error: locale("submitInformation.phoneError.error")}});
        }

        if(!password){
            errorData.push({password: {text: password, error: locale("submitInformation.passwordError.insert")}});
        } else if(password.trim().length<8){
            errorData.push({password: {text: password, error: locale("submitInformation.passwordError.min_length")}});
        } else  if(password.trim().length>30){
            errorData.push({password: {text: password, error: locale("submitInformation.passwordError.too_long")}});
        }

        if(string(gender) === '' || !isNaN(gender)){
            errorData.push({gender: {text: gender, error: locale("submitInformation.insert_gender")}});
        }

        // ** checking end
        let regexUsername = new RegExp("^"+username+"$", "i");
        let regexRegisterId = new RegExp("^"+register_id+"$", "i");
        let regexPhone = new RegExp("^"+phone+"$", "i");
        let regexEmail = new RegExp("^"+email+"$", "i");
        let regexDomain = new RegExp("^"+company_domain+"$", "i");
        if(errorData && errorData.length>0){
            return res.status(200).json({success:false, errorData});
        } else {
            async.parallel([
                function (callback) {
                    User.find({$or:[ {username:regexUsername} , {register_id: regexRegisterId}]})
                        .exec( function(err,result) {
                            callback(err, result)
                        });
                },
                function (callback) {
                    Company.find({$or:[ {domain:regexDomain} ]})
                        .exec( function(err,result) {
                            callback(err, result)
                        });
                },
            ],function (err, results) {
                let errObj = {};
                if(err){
                    winston.error('/registerCompanyAndUser', err);
                    return res.status(200).json({success:false, msg: locale("system_err"), err});
                }
                if(results[1] && results[1].length>0){
                    results[1].map(function (r) {
                        if( (r.domain || 'r.domain').toLowerCase() === (company_domain || 'data.company_domain').toLowerCase() ){
                            errObj = {...errObj, company_domain:true}
                        }
                    })
                }
                if(results[0] && results[0].length>0){
                    results[0].map(function (r) {
                        if( (r.username || 'r.username').toLowerCase() === (username || 'data.username').toLowerCase() ){
                            errObj = {...errObj, username:true}
                        }
                        if( (r.phone || 'r.phone').toLowerCase() === (phone || 'data.phone').toLowerCase() ){
                            errObj = {...errObj, phone:true}
                        }
                        if( (r.email || 'r.email').toLowerCase() === (email || 'data.email').toLowerCase() ){
                            errObj = {...errObj, email:true}
                        }
                        if( (r.register_id || 'r.register_id').toLowerCase() === (register_id || 'data.register_id').toLowerCase() ){
                            errObj = {...errObj, register_id:true}
                        }
                    })
                }
                if(errObj.username){
                    errorData.push({username: {text: username, error: locale("submitInformation.username_exists")}});
                }
                if(errObj.phone){
                    errorData.push({phone: {text: phone, error: locale("submitInformation.phone_exists")}});
                }
                if(errObj.email){
                    errorData.push({email: {text: email, error: locale("submitInformation.email_exists")}});
                }
                if(errObj.register_id){
                    errorData.push({register_id: {text: register_id, error: locale("submitInformation.register_id_exists")}});
                }
                if(errObj.company_domain){
                    errorData.push({company_domain: {text: company_domain, error: locale("registerCompanyAndUser.domain_exists")}});
                }
                if( errorData && errorData.length>0 ){
                    return res.status(200).json({success:false, errorData});
                } else {
                    let user = new User();
                    user.first_name = first_name;
                    user.last_name = last_name;
                    user.register_id = register_id;
                    user.username = username;
                    user.email = email;
                    user.phone = phone;
                    user.password = bcrypt.hashSync(password);
                    user.gender = gender;
                    user.status = 'active';
                    user.save(function (err, savedUser) {
                        if(err){
                            winston.error('/registerCompanyAndUser user.save()', err);
                            return res.status(200).json({success:false, msg: `${locale("system_err")} 1`, err});
                        }
                        if(savedUser && savedUser._id){
                            let company = new Company();
                            company.name = company_name;
                            company.email = company_email;
                            company.phone = company_number;
                            company.website = company_website;
                            company.registeredSite = req.domain || '';
                            company.domain = company_domain.toLowerCase();
                            // company.status = 'active';
                            company.actions = actionsKeys();
                            company.save(function (err, savedCompany) {
                                if(err){
                                    winston.error('/registerCompanyAndUser company.save()', err);
                                    return res.status(200).json({success:false, msg: `${locale("system_err")} 2`, err});
                                }
                                let employee = new Employee();
                                employee.user = savedUser._id;
                                employee.company = savedCompany._id;
                                employee.staticRole = 'lord';
                                employee.status = 'active';
                                employee.save(function (err, savedEmployee) {
                                    if(err){
                                        winston.error('/registerCompanyAndUser user.save()', err);
                                        return res.status(200).json({success:false, msg: `${locale("system_err")} 3`, err});
                                    }

                                    let token = jwt.sign({id: savedUser._id}, config.jwt_secret, {
                                        expiresIn: 60*60*24
                                    });
                                    let tokenConf = { hostOnly:false,domain:`.${req.domain}` };
                                    tokenConf = {...tokenConf, maxAge: 86400000};
                                    res.cookie('token',token, tokenConf);


                                    // const initialState = {
                                    //     main:{
                                    //         user: savedUser,
                                    //         companies:req.companies || [],
                                    //         employees:req.employees || [],
                                    //     }
                                    // };
                                    // var data = fs.readFileSync(`${path.join(__dirname, '../../../hrx_react', 'static')}/manifest.json`);
                                    // let manifest = JSON.parse(data);
                                    // res.header("Content-Type", "text/html; charset=utf-8");
                                    // res.status(200).end(renderFront(initialState, manifest));


                                    return res.status(200).json({success:true, employee:savedEmployee, company:savedCompany, user:{...savedUser, password:null}});

                                })
                            })
                        } else {
                            return res.status(200).json({success:false, msg: `${locale("system_err")} 287`, err});
                        }
                    })
                }
            })
        }
    });
    // router.post('/register', [
    //     check('username')
    //         .not()
    //         .isEmpty()
    //         .withMessage('Хэрэглэгчийн нэр оруулна уу')
    //         .trim(),
    //     check('email')
    //         .not()
    //         .isEmpty()
    //         .withMessage('Имэйл хаяг оруулна уу')
    //         .isEmail()
    //         .withMessage('Имэйл буруу байна')
    //         .trim(),
    //     check('phone')
    //         .optional({ checkFalsy: true })
    //         .isNumeric()
    //         .withMessage('Утасны дугаар буруу байна')
    //         .isLength({ min: 8, max: 8 })
    //         .withMessage('Утасны дугаар буруу байна')
    //         .trim(),
    //     check('password')
    //         .not()
    //         .isEmpty()
    //         .withMessage('Нууц үг оруулна уу')
    //         .trim(),
    //     check('passwordRepeat')
    //         .not()
    //         .isEmpty()
    //         .withMessage('Нууц үг давтах оруулна уу')
    //         .trim(),
    //     ], function (req, res) {
    //     const errors = validationResult(req);
    //     if (!errors.isEmpty()) {
    //         return res.json({success: false, msg: errors.array()[0].msg});
    //     }
    //     let data = matchedData(req);
    //     let or = [
    //         {email: data.email},
    //         {username: data.username}
    //     ];
    //     const emailRegex = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    //     const usernameRegex = /^[0-9a-zA-z_]*$/;
    //     if(usernameRegex.test(data.username)){
    //         if(emailRegex.test(data.email)){
    //             User.findOne({$or: or }, function (err, user){
    //                 if(err){
    //                     winston.error('/register findOne error',err);
    //                     return res.json({success:false, msg: 'Системд алдаа гарлаа'});
    //                 }
    //                 if(user){
    //                     if(user.username === data.username) {
    //                         res.json({success:false,msg: 'Хэрэглэгчийн нэр давхцаж байна.', usernameExist: true});
    //                     } else {
    //                         res.json({success:false,msg: 'Имэйл давхцаж байна.', emailExist: true});
    //                     }
    //                 } else {
    //                     user = new User();
    //                     user.username = data.username;
    //                     user.email = data.email;
    //                     user.password = bcrypt.hashSync(data.password);
    //                     user.status = 'pending';
    //                     if(data.phone){
    //                         user.phone = data.phone;
    //                     }
    //                     user.created_at = Date.now();
    //                     user.role = 'user';
    //                     user.save(function (err, data) {
    //                         if(err) {
    //                             winston.error('/register user save error',err);
    //                             return res.json({success:false, msg: 'Системд алдаа гарлаа'});
    //                         }
    //                         let transporter = nodemailer.createTransport({
    //                             service: 'Gmail',
    //                             auth: {
    //                                 user: 'info@amjilt.com',
    //                                 pass: 'lkhagva88'
    //                             }
    //                         });
    //                         let token = jwt.sign({id:user._id}, config.jwt_secret, {
    //                             expiresIn: req.headers['isapp'] === 'yes' ? 86400000 : 60*60*24
    //                         });
    //                         let mailOptions = {
    //                             to: req.body.email,
    //                             subject: 'bagsh.mn',
    //                             text: `<a href="https://bagsh.mn/verify/${token}">Идэвхжүүлэх</a>`,
    //                             html: `<table width="100%" style="margin: auto; background-color: #f0f0f0;"><tr style="background-color: #313356;"><td> <center><img src="https://bagsh.mn/frontAssets/img/logo.png" style="max-width: 122px; clear: both; margin: 20px 0px 15px 0px; padding: 0px;" /></center> </td> </tr> <tr style="width: 500px;margin: 10px auto;display: block; padding: 15px 0px;"> <td>bagsh.mn Сайтад бүртгүүлсэнд баярлалаа. Идэвхжүүлэх дээр дарж бүртгэлээ идэвхжүүлээрэй.</td></tr><tr style="width: 500px;margin: 10px auto;display: block;"> <td>Нэвтрэх холбоос.</td> </tr> <tr> <td> <center><a href="https://bagsh.mn/verify/${token}" style="    display: inline-block;border-radius: 6px;background-color: #313356 !important;border-collapse: collapse!important;max-width: 100%!important;font-weight: bold;font-size: 18px;color: #fff; text-decoration:none ;margin: 20px auto 60px;padding: 15px 20px;">Идэвхжүүлэх</a> </center></td> </tr> </table>`
    //                         };
    //                         transporter.sendMail(mailOptions,function(err,info){
    //                             if(err) {
    //                                 winston.error('/register email send error',err);
    //                                 return res.json({success:true, alemod: true, accessToken: token , msg: 'Имэйл илгээхэд алдаа гарлаа. Нэвтрэх үйлдэл хийнэ үү'});
    //                             } else {
    //                                 return res.json({success:true, mailSent: true, accessToken: token});
    //                             }
    //                         });
    //                     });
    //                 }
    //             });
    //         } else {
    //             return res.json({success:false, msg:'Имэйл бичиглэл буруу байна!'});
    //         }
    //     } else {
    //         return res.json({success:false, msg:'Хэрэглэгчийн нэр бичиглэл буруу байна! A-Z, тоо болон _ оруулж болно.'});
    //     }
    // });
    router.post('/verify/:token', function (req, res) {
        jwt.verify(req.params.token, config.jwt_secret,{ignoreExpiration:true}, function(err, decoded) {
            if (err) {
                winston.error('/verify/:token 1 error',err);
                return res.json({ success: false, msg: locale("passwordChange.token_verification_err")});
            } else {
                User.findOneAndUpdate({ _id: decoded.id },{status:'active'}, {new: true}, function (err, user){
                    if(err) {
                        winston.error('/verify/:token update error',err);
                        return res.json({success:false, msg: locale("passwordChange.token_verification_err")});
                    } else if(user) {
                        return res.json({ success: true, username: user.username});
                    } else {
                        return res.json({ success: false, msg: locale("passwordChange.token_user_err")});
                    }
                });
            }
        });
    });
    router.post('/fb/login', function (req, res) {
        FB.api('me', { fields: ['id', 'last_name','first_name','email'], access_token: req.body.token }, function (response) {
            if (response) {
                if (response.error) {
                    winston.error(response.error);
                    return res.status(500).json({success: false, msg: locale("system_err")});
                } else {
                    User.findOne({
                        $and: [{
                            $or: [{facebook_id: response.id}, {
                                email: response.email ? {
                                    '$regex': response.email,
                                    '$options': 'i'
                                } : `${response.id}@facebook.com`
                            }]
                        }, {status: 'active'}]
                    }, function (err, user) {
                        if (err) {
                            winston.error(err);
                            return res.json({success: false, msg: locale("system_err")});
                        }
                        if (user) {
                            if(user.facebook_id !== response.id) {
                                user.facebook_id = response.id;
                            }
                            let token = jwt.sign({id: user._id}, config.jwt_secret, {
                                expiresIn: req.headers['isapp'] === 'yes' ? 86400000 : 60*60*24
                            });
                            let tokenConf = { hostOnly:false,domain:`.${req.domain}` };
                            tokenConf = {...tokenConf, maxAge: 86400000};
                            if(req.headers['isapp'] !== 'yes') {
                                res.cookie('token',token, tokenConf);
                            }

                            user.save((userErr, newUser) => {
                                return res.status(200).json({success: true, token, user, data: req.body});
                            });
                        } else {
                            user = new User();
                            user.username = response.first_name || response.last_name || response.id;
                            user.facebook_id = response.id;
                            user.email = response.email || `${response.id}@facebook.com`;
                            user.password = response.id+Date.now();
                            user.status = 'active';
                            user.created_at = Date.now();
                            user.role = 'user';
                            user.save(function (err, data) {
                                if(err) {
                                    winston.error('/register user save error',err);
                                    return res.json({success:false, msg: locale("system_err")});
                                } else {
                                    let token = jwt.sign({id: data._id}, config.jwt_secret, {
                                        expiresIn: req.headers['isapp'] === 'yes' ? 86400000 : 60*60*24
                                    });
                                    let tokenConf = { hostOnly:false,domain:`.${req.domain}` };
                                    tokenConf = {...tokenConf, maxAge: 86400000};
                                    if(req.headers['isapp'] !== 'yes') {
                                        res.cookie('token',token, tokenConf);
                                    }
                                    return res.status(200).json({success: true, token, user: data, data: req.body});
                                }
                            });
                        }
                    });
                }
            }
        });
    });
    router.post('/password/reset', [
        check('email')
            .not()
            .isEmpty()
            .withMessage(locale("submitInformation.enter_email"))
            .isEmail()
            .withMessage(locale("submitInformation.email_wrong"))
            .trim(),
    ], function (req, res) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.json({success: false, msg: errors.array()[0].msg});
        }
        let data = matchedData(req);
        User.findOne({email: data.email}, function (err, user){
            if(err){
                winston.error('/register findOne error',err);
                return res.json({success:false, msg: locale("system_err")});
            }
            if(user){
                let transporter = nodemailer.createTransport({
                    service: 'Gmail',
                    auth: {
                        user: 'info@amjilt.com',
                        pass: 'lkhagva6060'
                    }
                });
                let token = jwt.sign({id:user._id}, config.jwt_secret, {
                    expiresIn: 60*60*24
                });
                let mailOptions = {
                    to: req.body.email,
                    subject: req.domain,
                    text: `<a href="https://${req.domain}/api/reset/password/${token}">${locale("passwordChange.password_change")}</a>`,
                    html: `<table width="100%" style="margin: auto; background-color: #f0f0f0;"><tr style="background-color: #17a2b8;"><td><center><img src="https://${req.domain}/images/hrx-logo.png" style="max-width: 122px; clear: both; margin: 20px 0px 15px 0px; padding: 0px;" /></center></td></tr><tr style="width: 500px;margin: 10px auto;display: block; padding: 15px 0px;"><td>${locale("submitInformation.message")}</td></tr><tr style="width: 500px;margin: 10px auto;display: block;"><td>${locale("passwordChange.to_reset_password")}</td></tr><tr><td><center><a href="https://${req.domain}/api/reset/password/${token}"style="display: inline-block;border-radius: 6px;background-color: #17a2b8 !important;border-collapse: collapse!important;max-width: 100%!important;font-weight: bold;font-size: 18px;color: #fff; text-decoration:none ;margin: 20px auto 60px;padding: 15px 20px;">${locale("passwordChange.reset_password")}</a> </center></td></tr></table>`
                };
                transporter.sendMail(mailOptions,function(err,info){
                    if(err) {
                        winston.error('/register email send error',err);
                        return res.json({success:false, msg: locale("passwordChange.send_email_error")});
                    } else {
                        return res.json({success:true,msg:locale("submitInformation.email_success"), sucmod: true});
                    }
                });
            } else {
                return res.json({success:false, msg: locale("user_not_found")});
            }
        });
    });
    router.get('/reset/password/:token', function (req, res) {
        jwt.verify(req.params.token, config.jwt_secret, function(err, decoded) {
            if (err) {
                winston.error('/reset/password/:id error: ',err);
                return res.json({ success: false, message: locale("passwordChange.token_expired") });
            } else {
                User.findOne({ _id: decoded.id }, function (err, user) {
                    if(err) {
                        winston.error('/register email send error',err);
                        return res.json({success:false, msg: locale("passwordChange.send_email_error")});
                    } else if(user) {
                        console.log('aaa');
                        var data = fs.readFileSync(`${path.join(__dirname, '../../hrx_react', 'static')}/manifest.json`);
                        let manifest = JSON.parse(data);
                        const initialState = {
                            main:{
                                user:req.user || null,
                                companies:req.companies || [],
                                userReset:user,
                                token:req.params.token,
                                domain:req.domain,
                            }
                        };
                        res.header("Content-Type", "text/html; charset=utf-8");
                        res.status(200).end(renderFront(initialState, manifest));
                    } else {
                        return res.json({success:false, msg: locale("user_not_found")});
                    }
                });
            }
        });
    });
    router.post('/reset/passwordSave/:id', function (req, res) {
        jwt.verify(req.body.token, config.jwt_secret, function(err, decoded) {
            if (err) {
                winston.error('/reset/password/:id error: ',err);
                return res.json({ success: false, message: locale("passwordChange.token_expired") });
            } else {
                User.findOne({ _id: decoded.id }, function (err, user) {
                    if(err) {
                        winston.error('/register email send error',err);
                        return res.json({success:false, msg: locale("passwordChange.send_email_error")});
                    } else if(user && (user._id.toString() === req.params.id.toString())) {
                        if(req.body.newPassword === req.body.newPasswordRepeat) {
                            user.password = bcrypt.hashSync(req.body.newPassword);
                            user.save(function (err, data) {
                                if(err) {
                                    winston.error(err);
                                    return res.status(200).json({success: false,msg: locale("system_err")});
                                } else {
                                    return res.status(200).json({success: true, sucmod: true, username: user.username || user.email, msg: locale("submitInformation.edit_success")});
                                }
                            });
                        } else {
                            return res.status(200).json({success: false, msg: locale("passwordChange.new_password_different")});
                        }
                    } else {
                        return res.json({success:false, msg: locale("user_not_found")});
                    }
                });
            }
        });
    });

    router.post(`/passwordChange`, auth.user, function (req, res) {
        const {
            user_id,
            password,
            passwordRepeat,
            oldPassword
        } = req.body.data;
        User.findOne({_id: req.user._id, status: 'active'}).exec(function (err, usr){
            if(err) {
                return res.json({success: false , msg: locale("system_err")});
            }
            if(usr) {
                let ps = usr.password.replace("$2y$", "$2a$");
                if (bcrypt.compareSync(oldPassword.text, ps)) {
                    if(password.text === passwordRepeat.text) {
                        usr.password = bcrypt.hashSync(password.text);
                        usr.save(function(err, data) {
                            if(err) {
                                winston.error('user save error garlaa!')
                                return res.json({success: false , msg: `${locale("system_err")} 1`});
                            }
                            if(!data) {
                                return res.json({success: false, msg: `${locale("system_err")} 2`})
                            }
                            else {
                                return res.json({success: true, sucmod: true, msg: locale("submitInformation.edit_success")})
                            }
                        })
                    }
                    else {
                        return res.json({success: false, msg: locale("passwordChange.password_repeat_wrong")})
                    }
                }
                else {
                    return res.status(200).json({success: false, msg: locale("passwordChange.old_password_wrong")});
                }
            }
            else {
                return res.status(200).json({success: false, msg: locale("user_not_found")});
            }
        })
    });
    router.post(`/submitInformation`, auth.user,  function (req, res) {

        let data = matchedData(req);
        const {
            user_id,
            last_name,
            first_name,
            register_id,
            birth_place,
            birthday,
            email,
            phone,
            gender,
            drivingLicense,
            bloodType,
            passwordVerify 
        } = req.body.data;
        let or = [
            {email: email},
            {phone: phone},
            {register_id: register_id}
        ];
        User.findOne({_id : req.user._id, status: 'active'}).exec(function (err, usr){
            if(err) {
                return res.json({success: false , msg: locale("system_err")});
            }
            if(usr) {
                let ps = usr.password.replace("$2y$", "$2a$");
                if (bcrypt.compareSync(passwordVerify, ps)) {
                    
                    User.findOne({$and: [{$or: or}, {_id: {$ne: usr._id}}]}, function (err, user) {
                        if(err){
                            winston.error('/register findOne error',err);
                            return res.json({success:false, msg: `${locale("system_err")} 1`});
                        }

                        if(user){ 
                            if(user.email === email) {
                                res.json({success:false,msg: locale("submitInformation.email_exists"), emailExist: true});
                            } else if(user.phone === phone) {
                                res.json({success:false,msg: locale("submitInformation.phone_exists"), phoneExist: true});
                            } else {
                                res.json({success:false,msg: locale("submitInformation.register_id_exists"), registerIdExist: true});
                            }
                        }
                        else {
                            usr.last_name = last_name;
                            usr.first_name = first_name;
                            usr.register_id = register_id;
                            usr.birth_place = birth_place;
                            usr.birthday = birthday;
                            usr.email = email;
                            usr.phone = phone;
                            usr.gender = gender;
                            usr.bloodType = bloodType;
                            usr.drivingLicense = drivingLicense;
                            usr.save(function(err, data) {
                                if(err) {
                                    winston.error('user save error garlaa!')
                                    return res.json({success: false , msg: `${locale("system_err")} 2`});
                                }
                                if(!data) {
                                    return res.json({success: false, msg: `${locale("system_err")} 3`})
                                }
                                else {
                                    return res.json({success: true, sucmod: true, msg: locale("submitInformation.edit_success"), user_id:req.user._id,
                                        last_name,
                                        first_name,
                                        register_id,
                                        birth_place,
                                        birthday,
                                        email,
                                        phone,
                                        gender,
                                        bloodType,
                                        drivingLicense})
                                }
                            })
                        }
                    })

                } else {
                    return res.json({success: false, msg: locale("submitInformation.wrong_password")});
                }
            }
            else return res.json({success: false, msg: locale("user_not_found")});
        })
    })
};