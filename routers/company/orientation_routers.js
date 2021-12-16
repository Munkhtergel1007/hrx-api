import Salary from '../../models/Salary'
import SalaryLog from '../../models/SalaryLog'
import Employee from '../../models/Employee'
import User from '../../models/User'
import Orientation from "../../models/Orientation";
import OrientationEmployee from "../../models/OrientationEmployee";
import Roles from "../../models/Roles";
import async from 'async'
import auth from '../../auth'
import { isId, isValidDate, winsErr, string, actionsKeys } from '../../config';
import winston from 'winston';
import moment from 'moment'
import {locale} from "../../lang";

module.exports = function(router){
    router.post('/get/orientation', auth.companyAdministrator, function(req, res){
        const {search, pageNum, pageSize} = req.body;
        let regex = new RegExp(`.*${search}.*`, "i");
        async.parallel({
            count: function(cb) {
                Orientation.countDocuments({company: req.company._id, status: 'active', title: regex}).exec(function(err, count){
                    cb(err, count);
                });
            },
            orientations: function(cb){
                Orientation.find({company: req.company._id, status: 'active', title: regex})
                    .lean().sort({created: -1}).skip(parseInt(pageNum)*parseInt(pageSize))
                    .limit(parseInt(pageSize)).exec(function(err, orien){
                        cb(err, orien);
                });
            }
        }, function(err, data){
            if(err){
                winsErr(req, err, 'Orientation.find() - get');
                return res.json({success: true, orientation: []});
            }
            let temp = (data.orientations || []).map(orientation => orientation._id);
            Roles.find({orientation: {$in: temp}, status: 'active', company: req.company._id}, {name: 1, orientation: 1})
                .exec(function(err, roles){
                if(err){
                    winsErr(req, err, 'Roles.find() - get');
                    return res.json({success: true, orientation: [], allOrientation: 0});
                }
                temp = (data.orientations || []).map(orientation => {
                    let tempSaved = [];
                    roles.map(role => {
                        if(((role || {}).orientation || '').toString() === (orientation._id || 'as').toString()){
                            tempSaved.push(role);
                        }
                    });
                    return { ...orientation, role: tempSaved};
                })
                return res.json({success: true, orientation: (temp || data.orientations), allOrientation: (data.count || 0)});
            });
        });
    });
    router.post('/get/orientation/employee', auth.companyAdministrator, function(req, res){
        const {search, pageNum, pageSize} = req.body;
        const [name1, name2] = (search || 'a a').split(' ');
        const regex1 = new RegExp(".*"+name1+'.*', "i");
        const regex2 = new RegExp(".*"+name2+'.*', "i");
        User.find({
            $or: [
                {$and: [{first_name: {$regex: regex1}}, {last_name: {$regex: regex2}}]},
                {$and: [{first_name: {$regex: regex2}}, {last_name: {$regex: regex1}}]},
                {$or: [{register_id: {$regex: regex1}}, {register_id: {$regex: regex2}}]},
                {first_name: {$regex: regex1}}, {last_name: {$regex: regex1}},
            ],
            status: 'active'
        }, {first_name: 1, last_name: 1, register_id: 1}).lean().exec(function(err, users){
            if(err){
                winsErr(req, err, 'OrientationEmployee.find() - get - users.find()');
                return res.json({success: true, employees: []});
            }
            Employee.find({
                user: {$in: (users || [])}, status: {$nin: ['delete', 'fired']},
                company: req.company._id
            }).lean().exec(function(err, emps){
                if(err){
                    winsErr(req, err, 'OrientationEmployee.find() - get - employees.find()');
                    return res.json({success: true, employees: []});
                }
                OrientationEmployee.find({status: 'doing', employee: {$in: emps}}).sort({created: -1}).lean()
                    .exec(function(err, employees){
                        if(err){
                            winsErr(req, err, 'OrientationEmployee.find() - get');
                            return res.json({success: true, employees: []});
                        }
                        let found = [];
                        for(let pageSizeIndex = 0; pageSizeIndex<parseInt(pageSize) && pageSizeIndex<(employees || []).length; pageSizeIndex++){
                            let temp = '';
                            let emp_id = '';
                            for(let indexEmp = 0; indexEmp < emps.length; indexEmp++){
                                if((((employees || [])[parseInt(pageNum)*parseInt(pageSize)+pageSizeIndex] || {}).employee || 'as').toString() ===
                                    (((emps || [])[indexEmp] || {})._id || '').toString()){
                                    temp = ((emps || [])[indexEmp] || {}).user;
                                    emp_id = ((emps || [])[indexEmp] || {})._id;
                                    break;
                                }
                            }
                            for(let indexUser = 0; indexUser < users.length; indexUser++){
                                if((temp || '').toString() === (((users || [])[indexUser] || {})._id || 'as').toString()){
                                    found.push({
                                        ...((employees || [])[parseInt(pageNum)*parseInt(pageSize)+pageSizeIndex] || {}),
                                        employee: {
                                            user: {
                                                first_name: ((users || [])[indexUser] || {}).first_name,
                                                last_name: ((users || [])[indexUser] || {}).last_name,
                                                register_id: ((users || [])[indexUser] || {}).register_id,
                                            },
                                            _id: emp_id,
                                        }
                                    });
                                    break;
                                }
                            }
                        }
                        return res.json({
                            success: true, allEmployees: (employees.length || 0),
                            employees: (found || []), pageSize
                        });
                });
            });
        });
    });
    router.post('/create/orientation', auth.companyAdministrator, function(req, res){
        const {_id, title, list_environment, list_extra} = req.body;
        if(!title || title === ''){
            return res.json({success: false, msg: ''})
        }
        if((!list_environment && !list_extra) || ((list_environment || []).length === 0 && (list_extra || []).length === 0)){
            return res.json({success: false, msg: locale("orientation_routers_all.nameError.insert")})
        }
        if(_id && _id !== ''){
            Orientation.findOne({_id: _id, status: 'active', company: req.company._id}).exec(function(err, orien){
                if(err){
                    winsErr(req, err, 'Orientation.findOne() - edit');
                    return res.json({success: false, msg: `${locale("system_err")} 2`});
                }
                if(orien){
                    orien.title = title;
                    orien.list_environment = list_environment || [];
                    orien.list_extra = list_extra || [];
                    orien.save((err, saved) => {
                        if(err){
                            winsErr(req, err, 'Orientation.save() - edit');
                            return res.json({success: false, msg: `${locale("system_err")} 3`});
                        }
                        return res.json({success: true, _id: _id || saved._id, orientation: saved});
                    });
                }else{
                    return res.json({success: false, msg: locale("orientation_routers_all.orientation_not_found")});
                }
            });
        }else{
            let orientation = new Orientation();
            orientation.title = title;
            orientation.list_environment = list_environment || [];
            orientation.list_extra = list_extra || [];
            orientation.company = req.company._id;
            orientation.save((err, saved) => {
                if(err){
                    winsErr(req, err, 'Orientation.save() - create');
                    return res.json({success: false, msg: `${locale("system_err")} 1`});
                }
                return res.json({success: true, orientation: saved});
            })
        }
    });
    router.post('/delete/orientation', auth.companyAdministrator, function(req, res){
        const {_id, pageSize, pageNum, index, search} = req.body;
        Orientation.findOne({_id: _id, status: 'active', company: req.company._id}).exec(function(err, orien){
            if(err){
                winsErr(req, err, 'Orientation.findOne() - delete');
                return res.json({success: false, msg: `${locale("system_err")} 1`});
            }
            if(orien){
                Roles.find({company: req.company._id, status: 'active', orientation: _id}).exec(function (err, roles) {
                    if(err){
                        winsErr(req, err, 'Roles.find - orientation delete');
                        return res.json({success: false, msg: `${locale("system_err")} 2`});
                    }
                    if(roles && roles.length > 0){
                        return res.json({success: false, msg: locale("orientation_routers_all.in_use")});
                    }else{
                        orien.status = 'deleted';
                        orien.save((err, saved) => {
                            if(err){
                                winsErr(req, err, 'Orientation.save() - delete');
                                return res.json({success: false, msg: `${locale("system_err")} 3`});
                            }
                            let skip = parseInt(pageNum)*parseInt(pageSize)+4;
                            let regex = new RegExp(`.*${search}.*`, "i");
                            Orientation.find({company: req.company._id, status: 'active', title: regex})
                                .sort({created: -1}).skip(skip).limit(1).lean()
                                .exec(function(err, orient){
                                if(err){
                                    winsErr(req, err, 'Orientation.save() - delete find');
                                    return res.json({success: false, msg: `${locale("system_err")} 4`});
                                }
                                let orienta = (orient || [])[0] || null;
                                let temp = (orienta || {})._id;
                                if(orienta && temp){
                                    Roles.find({orientation: temp, status: 'active', company: req.company._id}, {name: 1, orientation: 1})
                                        .lean().exec(function(err, roles){
                                        if(err){
                                            winsErr(req, err, 'Roles.find() - delete');
                                            return res.json({success: true, _id: _id || saved._id});
                                        }
                                        orienta.role = roles;
                                        return res.json({success: true, _id: _id || saved._id, orient: orienta});
                                    });
                                }else{
                                    return res.json({success: true, _id: _id || saved._id});
                                }
                            });
                        });
                    }
                });
            }else{
                return res.json({success: false, msg: locale("orientation_routers_all.orientation_not_found")});
            }
        });
    });
    router.post('/change/orientation/employee', auth.companyAdministrator, function(req, res){
        const { listEnv, listExtra, _id } = req.body;
        OrientationEmployee.findOne({_id: _id, status: 'doing'}).exec(function(err, ori){
            if(err){
                winsErr(req, err, 'OrientationEmployee.findOne() - change orientation');
                return res.json({success: false, msg: `${locale("system_err")} 1`});
            }
            if(ori){
                ori.list_environment = (ori.list_environment || []).map(env => {
                    if((listEnv || []).includes(env.title)){
                        return { ...env._doc, done: true}
                    }
                    return {...env._doc, done: false}
                });
                ori.list_extra = (ori.list_extra || []).map(env => {
                    if((listExtra || []).includes(env.title)){
                        return { ...env._doc, done: true}
                    }
                    return {...env._doc, done: false}
                });
                ori.save((err, saved) => {
                    if(err){
                        winsErr(req, err, 'OrientationEmployee.save() - change orientation');
                        return res.json({success: false, msg: `${locale("system_err")} 2`});
                    }
                    return res.json({success: true, _id: _id, list_environment: (saved || {}).list_environment, list_extra: (saved || {}).list_extra});
                });
            }else{
                return res.json({success: false, msg: locale("orientation_routers_all.orientation_not_found")});
            }
        });
    });
    router.post('/finish/orientation/employee', auth.companyAdministrator, function(req, res){
        const {_id} = req.body;
        OrientationEmployee.findOne({_id: _id, status: 'doing'}).exec(function(err, ori){
            if(err){
                winsErr(req, err, 'OrientationEmployee.findOne() - finish orientation');
                return res.json({success: false, msg: `${locale("system_err")} 1`});
            }
            if(ori){
                ori.status = 'done';
                ori.save((err, saved) => {
                    if(err){
                        winsErr(req, err, 'OrientationEmployee.save() - finish orientation');
                        return res.json({success: false, msg: `${locale("system_err")} 2`});
                    }
                    return res.json({success: true, _id: _id});
                })
            }else{
                return res.json({success: false, msg: locale("orientation_routers_all.orientation_not_found")});
            }
        });
    });
};