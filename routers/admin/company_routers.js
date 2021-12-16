import async from 'async';
import bcrypt from "bcrypt-node";
import auth from '../../auth';
import Company from '../../models/Company';
import User from '../../models/User';
import Employee from '../../models/Employee';
import Media from '../../models/Media';
import CompanyTransaction from '../../models/Company_Transaction';
import SystemBundle from '../../models/System_bundle';
import moment from 'moment';
import { isId, actionsKeys, winsErr, string, bool, isPhoneNum } from '../../config';
import {body, check, validationResult} from 'express-validator/check';
const mongoose = require('mongoose');
let ObjectId = mongoose.Types.ObjectId;
const staticRoles = ['chairman', 'hrManager', 'employee', 'lord'];
import {locale} from "../../lang";
module.exports = function(router){
    router.post('/set/company/bundle', auth.admin, function(req, res){
        const { company, bundle } = req.body || {};
        if(!isId(company) || !isId(bundle)){
            return res.json({
                success: false, msg: locale("company_routers_admin_all.company_or_bundle_not_chosen")
            });
        } else {
            SystemBundle.findOne({_id: bundle}).lean().exec(function(err, sysB){
                if(err){winsErr(req, res, 'SystemBundle.findOne()')}
                if(sysB){
                    let compTrans = new CompanyTransaction();
                    compTrans.company = company;
                    compTrans.system_bundle = bundle;
                    compTrans.ending_date = moment(new Date()).add(sysB.days, 'days');
                    compTrans.transaction = {
                        result: {
                            fileSize: sysB.num_file_size || 0,
                            recSize: sysB.num_recruitment || 0,
                        },
                        fileSize: sysB.num_file_size || 0,
                        recSize: sysB.num_recruitment || 0,
                        cost: sysB.cost || sysB.sale || 0
                    };
                    compTrans.admin = req.admin._id;
                    compTrans.save((err, cp) => {
                        if(err){winsErr(req, res, 'compTrans.save()')}
                        if(cp){
                            compTrans.deepPopulate(['company', 'company.logo', 'system_bundle'], function(err, cp1){
                                return res.json({success: !(err), sucmod: !(err), msg: (err ? locale("company_routers_admin_all.bundle_addition_error") : locale("company_routers_admin_all.bundle_addition_success")), transaction: cp1});
                            });
                        } else {
                            return res.json({success: false, msg: locale("company_routers_admin_all.bundle_addition_error")});
                        }
                    })
                } else {
                    return res.json({success: false, msg: locale("company_routers_admin_all.check_bundle_correct")});
                }
            });
        }
    });
    router.get('/get/companies/', auth.admin, function(req, res){
        const { infoOnly = false } = req.query || {};
        Company.find({status: {$nin: ['delete', 'pending']}}).deepPopulate(['logo']).lean().exec(function(err, companies){
            if(!infoOnly){
                async.map(companies, function(company, callback){
                    async.parallel({
                        employees: function(cb){
                            // Employee.count({company: company._id, status: {$nin: ['delete', 'fired']}}, function(err, empC){
                            Employee.countDocuments({company: company._id, status: {$nin: ['delete', 'fired']}}, function(err, empC){
                                cb(err, empC)
                            })
                        }
                    }, function(err, data){
                        callback(err, {
                            ...company,
                            employees: data.employees
                        });
                    });
                }, function(err, data){
                    return res.json({success: !(err), companies: data});
                })
            } else {
                return res.json({success: !(err), companies: companies});
            }
        })
    });
    router.post('/create/company', auth.admin, function(req, res){
        const { address = '', domain = '', isCons = false, name = '', email = '', phone = '', website = ''} = req.body || {};
        let regexDomain = new RegExp("^"+domain+"$");
        // Company.count({domain: { "$regex": regexDomain, "$options": "i" }}, function(err, count){
        Company.countDocuments({domain: { "$regex": regexDomain, "$options": "i" }}, function(err, count){
            if(err){winsErr(req, err, 'Company.count()');}
            if(count){
                return res.json({success: false, msg: locale("company_routers_admin_all.domain_repetition")});
            } else {
                let company = new Company();
                    company.domain = string(domain);
                    company.address = string(address);
                    company.name = string(name);
                    company.email = string(email);
                    company.phone = string(phone);
                    company.website = string(website);
                    company.status = string('active');
                    company.isCons = bool(isCons);
                    company.actions = actionsKeys();
                    company.save(function(err, comp){
                        if(err){winsErr(req, err, 'company.save()');}
                        return res.json({company: (comp || {}), success: !(err), sucmod: !(err), msg: (err ? locale("company_routers_admin_all.company_creation_error") : locale("company_routers_admin_all.company_created"))});
                    });
            }
        });
    });
    router.post('/create/user', auth.admin, function(req, res){
        const { username = '', password = '', phone = '', gender = '', first_name = '', last_name = '', email = '', register_id = ''} = req.body || {};
            if(username === '')
        {
            return res.json({success: false, msg: locale("usernameError.insert")});
        }
            else if(password === '')
        {
            return res.json({success: false, msg: locale("passwordError.insert")});
        }
            else if(gender === '')
        {
            return res.json({success: false, msg: locale("genderError.insert")});
        }
            else if(phone === '')
        {
            return res.json({success: false, msg: locale("phoneError.insert")});
        }
            else if(email === '')
        {
            return res.json({success: false, msg: locale("emailError.insert")});
        }
            else if(last_name === '')
        {
            return res.json({success: false, msg: locale("lastNameError.insert")});
        }
            else if(first_name === '')
        {
            return res.json({success: false, msg: locale("firstNameError.insert")});
        }
            else if (register_id === '')
        {
            return res.json({success: false, msg: locale("registerIdError.insert")})
        }
            else
        {
            // User.count({$or: [
            User.countDocuments({$or: [
                    {username: username},
                    {phone: phone},
                    {email: email},
                    {register_id: {$regex: new RegExp("^"+register_id+"$", "i")}}
            ]}, function(err, count){
                if(err){winsErr(req, err, 'User.count()');}
                if(count){
                    return res.json({success: false, msg: locale("company_routers_admin_all.user_found")});
                } else {
                    let user = new User();
                        user.username = string(username);
                        user.password = bcrypt.hashSync(string(password));
                        user.phone = string(phone);
                        user.gender = string(gender);
                        user.first_name = string(first_name);
                        user.last_name = string(last_name);
                        user.email = string(email);
                        user.status = string('active');
                        user.register_id = string(register_id)
                        user.save((err, usr) => {
                            if(err){winsErr(req, err, 'user.save()');}
                            return res.json({success:!(err), user: usr, sucmod: !(err), msg: (!(err) ? locale("company_routers_admin_all.user_created") : locale("company_routers_admin_all.user_creation_error"))});
                        });
                }
            });
        }
    });
    router.post('/search/user', auth.admin, function(req, res){
        const {
            search
        } = req.body || {};
        User.find({
            $and: [
                {status: 'active'},
                {
                    $or: [
                        {email: { "$regex": string(search), "$options": "i" }},
                        {username: { "$regex": string(search), "$options": "i" }},
                        {last_name: { "$regex": string(search), "$options": "i" }},
                        {first_name: { "$regex": string(search), "$options": "i" }},
                        {phone: { "$regex": string(search), "$options": "i" }}
                    ]
                }
            ]
        }).deepPopulate('avatar').lean().exec(function(err, user){
            if(err){winsErr(req, err, 'User.find()');}
            return res.json({success: !(err), users: user});
        })
    });
    router.post('/insert/employees', auth.admin, function(req, res){
        const {emps} = req.body || {};
        async.map(emps, function(item, callback){
            const {user, company, staticRole} = item || {};
            if(!isId(user)){
                callback({success: false, msg: locale("company_routers_admin_all.check_user")}, null);
            } else if(!isId(company)){
                callback({success: false, msg: locale("company_routers_admin_all.check_company")}, null);
            } else if(staticRoles.indexOf(staticRole) === -1){
                callback({success: false, msg: locale("company_routers_admin_all.check_user_role")}, null);
            } else {
                let emp = new Employee();
                emp.user = user;
                emp.company = company;
                emp.staticRole = staticRole;
                emp.status = 'active';
                emp.workFrom = new Date();
                emp.save(function(err, employees){
                    callback(err, employees);
                });
            }
        }, function(err, data){
            if(err){
                winsErr(req, err, 'async.map');
                if(err.msg){
                    return res.json(err);
                } else {
                    return res.json({success: false, msg: locale("system_err")});
                }
            } else {
                return res.json({success: true, empls: data});
            }
        })
    });
    router.get('/get/editCompany/:id', auth.admin, function (req, res) {
        Company.findOne({_id: ObjectId(req.params.id)}).deepPopulate(['logo']).exec(function (err, company) {
            if(err) {
                winsErr(req, res, 'Company.findOne()')
            }
            if(company) {
                return res.json({success: true, company})
            } else {
                return res.json({success: false, msg: locale("company_routers_admin_all.company_not_found")})
            }
        })
    });
    router.post('/set/editedCompany', auth.admin, [
        check('domain')
            .not()
            .isEmpty()
            .withMessage(locale("company_routers_admin_all.domain_empty"))
            .trim(),
        check('name')
            .not()
            .isEmpty()
            .withMessage(locale("company_routers_admin_all.name_empty"))
            .trim(),
        check('email', locale("company_routers_admin_all.email_company_empty"))
            .not()
            .isEmpty()
            .isEmail()
            .trim(),
        check('phone', locale("company_routers_admin_all.phone_company_empty"))
            .not()
            .isEmpty()
            .matches(/^[0-9]{8}$/)
            .trim(),
        check('address')
            .not()
            .isEmpty()
            .withMessage(locale("company_routers_admin_all.address_empty"))
            .trim(),
        check('website')
            .trim()
    ], function (req, res) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(200).json({success: false, msg: errors.array()[0].msg});
        }
        const {address = '', domain = '', isCons = false, name = '', email = '', phone = '', website = ''} = req.body || {};
        if (req.body.id.match(/^[0-9a-fA-F]{24}$/)) {
            Company.findOne({_id: ObjectId(req.body.id)}).exec(function (err, editedCompany) {
                if (err) {
                    winsErr(req, res, 'editedCompany')
                }
                if (editedCompany) {
                    if (editedCompany.domain.toLowerCase() === req.body.domain.toLowerCase()) {
                        editedCompany.address = string(address);
                        editedCompany.name = string(name);
                        editedCompany.email = string(email);
                        editedCompany.phone = string(phone);
                        editedCompany.website = string(website);
                        editedCompany.isCons = bool(isCons);
                        editedCompany.save(function (err, comp) {
                            if (err) {
                                winsErr(req, err, 'company.save()');
                            }
                            return res.json({
                                company: (comp || {}),
                                success: !(err),
                                sucmod: !(err),
                                msg: (err ? locale("company_routers_admin_all.company_edit_error") : locale("company_routers_admin_all.company_edited"))
                            });
                        });
                    } else {
                        // Company.count({domain: domain.toLowerCase()}, function (err, count) {
                        Company.countDocuments({domain: domain.toLowerCase()}, function (err, count) {
                            if (err) {
                                winsErr(req, err, 'Company.count()');
                            }
                            if (count) {
                                let aa = Object.assign(editedCompany, req.body)
                                return res.json({success: false, msg: locale("company_routers_admin_all.domain_repetition"), data: aa});
                            } else {
                                editedCompany.domain = string(domain.toLowerCase());
                                editedCompany.address = string(address);
                                editedCompany.name = string(name);
                                editedCompany.email = string(email);
                                editedCompany.phone = string(phone);
                                editedCompany.website = string(website);
                                // editedCompany.status = string(status);
                                editedCompany.isCons = bool(isCons);
                                editedCompany.save(function (err, comp) {
                                    if (err) {
                                        winsErr(req, err, 'company.save()');
                                    }
                                    return res.json({
                                        company: (comp || {}),
                                        success: !(err),
                                        sucmod: !(err),
                                        msg: (err ? locale("company_routers_admin_all.company_edit_error") : locale("company_routers_admin_all.company_edited"))
                                    });
                                });
                            }
                        })
                    }
                } else {
                    return res.json({success: false, msg: locale("company_routers_admin_all.company_not_found")})
                }
            })
        } else {
            return res.json({success: false, msg: locale("system_err"), backurl: '/admin/companies'})
        }
    })
    router.post('/set/changeCompanyStatus', auth.admin, function (req, res) {
        if (req.body.id.match(/^[0-9a-fA-F]{24}$/)) {
            Company.findOneAndUpdate({_id: req.body._id}, {status: req.body.status}, {new: true}, function (err, company) {
                if (err) {
                    winsErr(req, res, 'set/changeCompanyStatus');
                }
                if (company) {
                    res.json({
                        success: true,
                        sucmod: !(err),
                        msg: (err ? locale("action_failed") : locale("action_success")),
                        company: company
                    });
                } else {
                    res.json({success: false, msg: locale("company_routers_admin_all.company_not_found")});
                }
            })
        }
    })
    router.get('/get/company/lord/:company', auth.admin, function(req, res){
        Employee.findOne({company: req.params.company, staticRole: 'lord', status: 'active'}).deepPopulate(['user', 'user.avatar']).exec(function(err, employee){
            if(err){
                winsErr(req, res, '/get/company/lord/:company')
            }
            return res.json({success: !(err), sucmod: !(err), lord: employee})
        })
    })
    router.post('/post/company/addAction', auth.admin, function(req,res){
        let data = actionsKeys()
        Company.updateMany({}, {
            '$set': {
                'actions': data
            }
        }).exec(function(err, result){
            if(err){
                winsErr(req, res, '/get/company/addAction');
                return res.json({success: false, msg: locale("action_failed")});
            }
            return res.json({success: true, sucmod: true, msg: locale("action_success")});
        })
    })

    router.post('/set/company/removeLord', auth.admin, function(req, res){
        const {
            company,
            employee
        } = req.body || {}
        Employee.findOneAndUpdate(
            {_id: employee, company: company, staticRole: 'lord', status: 'active'}, 
            {status: 'delete'},
            {new: true}
        ).exec(function(err, employee){
            if(err){
                winsErr(req, res, '/set/company/removeLord')
            }
            if(employee){
                return res.json({success: !(err), sucmod: !(err), employee: employee, msg: (err ? locale("error") : locale("success"))})
            } else {
                return res.json({success: false, msg: locale("user_not_found")})
            }
        })
    })
    router.post('/create/company/lord', auth.admin, function(req, res) {
        if(req.body.user.existing){
            let emp = new Employee();
            emp.user= req.body.user._id
            emp.company=req.body.company
            emp.staticRole= 'lord'
            emp.status= 'active'
            emp.save((err, emp)=> {
                return res.json({success:!(err), emp: emp, user: req.body.user, sucmod: !(err), msg: (!(err) ? locale("company_routers_admin_all.user_created") : locale("company_routers_admin_all.user_creation_error"))});
            })
        } else {
            const { username = '', password = '', phone = '', gender = '', first_name = '', last_name = '', email = '', register_id = ''} = req.body || {};
                if(username === '')
            {
                return res.json({success: false, msg: locale("usernameError.insert")});
            }
                else if(password === '')
            {
                return res.json({success: false, msg: locale("passwordError.insert")});
            }
                else if(gender === '')
            {
                return res.json({success: false, msg: locale("genderError.insert")});
            }
                else if(phone === '')
            {
                return res.json({success: false, msg: locale("phoneError.insert")});
            }
                else if(email === '')
            {
                return res.json({success: false, msg: locale("emailError.insert")});
            }
                else if(last_name === '')
            {
                return res.json({success: false, msg: locale("lastNameError.insert")});
            }
                else if(first_name === '')
            {
                return res.json({success: false, msg: locale("firstNameError.insert")});
            }
                else if (register_id === '')
            {
                return res.json({success: false, msg: locale("registerIdError.insert")})
            }
                else
            {
                // User.count({$or: [
                User.countDocuments({$or: [
                        {username: username},
                        {phone: phone},
                        {email: email},
                        {register_id: {$regex: new RegExp("^"+register_id+"$", "i")}}
                ]}, function(err, count){
                    if(err){winsErr(req, err, 'User.count()');}
                    if(count){
                        return res.json({success: false, msg: locale("company_routers_admin_all.user_found")});
                    } else {
                        let user = new User();
                            user.username = string(username);
                            user.password = bcrypt.hashSync(string(password));
                            user.phone = string(phone);
                            user.gender = string(gender);
                            user.first_name = string(first_name);
                            user.last_name = string(last_name);
                            user.email = string(email);
                            user.status = string('active');
                            user.register_id = string(register_id)
                            user.save((err, usr) => {
                                if(err){winsErr(req, err, 'user.save()');}
                                let emp = new Employee();
                                emp.user= usr._id
                                emp.company=req.body.company
                                emp.staticRole= 'lord'
                                emp.status= 'active'
                                emp.save((err, emp)=> {
                                    return res.json({success:!(err), emp: emp, user: usr, sucmod: !(err), msg: (!(err) ? locale("company_routers_admin_all.user_created") : locale("company_routers_admin_all.user_creation_error"))});
                                })
                            });
                    }
                });
            }
        }
    })
    router.post('/find/user', (req, res, next) =>  auth.admin(req, res, next), function(req, res){
        const { phone, email } = req.body || {};
        if(!isPhoneNum(phone)){
            return res.json({success: false, msg: locale("phoneError.insert")});
        } else if(!string(email)){
            return res.json({success: false, msg: locale("emailError.insert")});
        } else {
            User.find({phone: isPhoneNum(phone), email: string(email).toLowerCase(), status: 'active'}, {avatar: 1, first_name: 1, last_name: 1, username: 1}).deepPopulate('avatar').lean().exec(function (err, user) {
                if(err){winsErr(req, res, 'User.find');}
                if(user.length){
                    async.map(user, function(item, callback){
                        Employee.findOne({status: 'active', user: item._id}, {company: 1, status: 1}).deepPopulate(['company', 'company.logo']).lean().exec(function(err, emp){
                            if(err){winsErr(req, err, 'Employee.findOne');}
                            callback(err, {
                                ...item,
                                employee: emp
                            });
                        });
                    }, function(err, usr){
                        if(err){winsErr(req, res, 'async.map');}
                        return res.json({success: true, users: usr});
                    });
                } else {
                    return res.json({success: false, users: user, msg: locale("user_not_found")});
                }
            })
        }
    });
};