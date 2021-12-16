import winston from 'winston';
import async from 'async';
import bcrypt from "bcrypt-node";
import auth from '../../auth';
import Company from '../../models/Company';
import Admin from '../../models/Admin';
import SystemBundle from '../../models/System_bundle';
import Media from '../../models/Media';
import {isId, isValidDate, winsErr, string, actionsKeys, isPhoneNum} from '../../config';
import Employee from "../../models/Employee";
import ChargeRequest from "../../models/charge_request";
import Roles from "../../models/Roles";
import Vacation from '../../models/Vacation'
import Orientation from "../../models/Orientation";
import JobDescription from "../../models/JobDescription";
import Tags from '../../models/Workplan_tag'
import SubTag from '../../models/SubTag'
import Timetable from '../../models/Timetable'
import psl from "psl";
import User from "../../models/User";
import {locale} from "../../lang";


module.exports = function(router){
    router.get('/get/charges', (req, res, next) => auth.company(req, res, next, ['request_charge']), function(req, res){
        let reqComp = req.company || {};
        ChargeRequest.find({company: reqComp._id}).deepPopulate(['employee', 'employee.user', 'type', 'responsed_admin']).lean().exec(function(err, chargeRequest){
            if(err){winsErr(req, err, 'ChargeRequest.findOne');}
            return res.json({sda: req.body, chargeRequests: chargeRequest});
        })
    });
    router.post('/create/charge', (req, res, next) => auth.company(req, res, next, ['request_charge']), function(req, res){
        const { bundle } = req.body || {};
        let reqComp = req.company || {};
        if(isId(bundle)){
            ChargeRequest.findOne({status: 'pending', type: bundle, company: reqComp._id}).sort({created: -1}).deepPopulate('type').lean().exec(function(err, chr){
                if(err){winsErr(req, err, 'ChargeRequest.findOne');}
                if(chr){
                    return res.json({success: false, msg: locale("settings_routers_all.bundle_request_exists")});
                } else {
                    let chargeReq = new ChargeRequest();
                        chargeReq.type = bundle;
                        chargeReq.company = reqComp._id;
                        chargeReq.employee = (req.employee || {})._id;
                        chargeReq.save((err, cc) => {
                            if(err){winsErr(req, err, 'chargeReq.save');}
                            chargeReq.deepPopulate(['employee', 'employee.user', 'type'], function(err, chargeRequest){
                                if(err){winsErr(req, err, 'chargeReq.deepPopulate');}
                                return res.json({success: !(err), sucmod: !(err), msg: (err ? locale("settings_routers_all.bundle_request_error") : locale("settings_routers_all.bundle_request_success")), chargeRequest: chargeRequest});
                            })
                        });
                }
            });
        } else {
            return res.json({success: false, msg: locale("settings_routers_all.select_bundle")});
        }
    });
    router.get('/get/bundles/', auth.company, function(req, res){
        SystemBundle.find({
            status: 'active',
            $or: [
                {'between.end_date': {$gte: new Date()}},
                {'between.end_date': {$eq: null}},
                {'between.end_date': {$exists: false}},
            ]
        }).sort({created: -1}).lean().exec(function(err, bundles){
            if(err){winsErr(req, err, 'SystemBundle.find()')}
            return res.json({success: !(err), bundles: bundles});
        })
    });
    router.get('/get/roles', (req, res, next) => auth.employee(req, res, next), function(req, res){
        let reqComp = req.company || {};
        Roles.find({company: reqComp, status: {$ne: 'delete'}}).deepPopulate(['jobDescription', 'orientation']).sort({created: -1}).lean().exec(function(err, roles){
            if(err){winsErr(req, err, 'Roles.find()')}
            return res.json({success: !(err), roles: roles});
        });
    });
    router.post('/change/main', (req, res, next) => auth.company(req, res, next, ['edit_company_informations']), function(req, res){
        const { name, domain, value, description, mission, vision, slogan, email, phone, address, website } = req.body || {};
        let reqComp  = req.company || {};
        const domainRegex = /^[a-zA-Z]*$/;
        if(string(domain) !== '' && string(domain) !== 'null' && string(domain) !== 'undefined'){
            let domainTrim = domain.trim();
            if(domainRegex.test(domainTrim)){
                let regexDomain = new RegExp("^"+domainTrim+"$", "i");
                // Company.count({$and: [
                Company.countDocuments({$and: [
                        {domain: regexDomain},
                        {_id: {$ne: reqComp._id}}
                    ]}, function(err, count){
                    if(err){winsErr(req, err, '/change/main Company.count()')}
                    if(count){
                        return res.json({success: false, msg: locale("settings_routers_all.domain_repetition")});
                    } else {
                        let protocol = process.env.NODE_ENV === 'development' ? 'http://' : 'https://';
                        let hostname = req.hostname;
                        let parsed = psl.parse(hostname);
                        Company.findOneAndUpdate(
                            {_id: reqComp._id},
                            {$set:
                                    {
                                        name: (name || reqComp.name),
                                        domain: domainTrim
                                    }},
                            {new: true})
                            .exec(function(err, company){
                                if(err){winsErr(req, err, '/change/main Company.findOneAndUpdate()')}
                                if(company){
                                    req.subdomain = String(domainTrim || null);
                                    return res.json({success: true, redirectUrl: protocol + domainTrim + '.' + parsed.domain + '/settings'});
                                } else {
                                    return res.json({success: false, msg: locale("settings_routers_all.setting_edit_error")});
                                }
                            });
                    }
                })
            } else {
                return res.json({success: false, msg: locale("settings_routers_all.domain_requirements")});
            }
        } else {
            // let keys = Object.keys(req.body || {});
            // console.log(keys);
            Company.findOneAndUpdate(
                {_id: reqComp._id},
                {$set: (req.body || {name: reqComp.name})},
                {new: true}
            ).exec(function(err, company){
                if(err){winsErr(req, err, '/change/main Company.findOneAndUpdate()')}
                return res.json({
                    success: !(err),
                    sucmod: !(err),
                    msg: (err ? locale("settings_routers_all.setting_edit_error") : locale("settings_routers_all.setting_edit_success")),
                    name: name,
                    description: description,
                    mission: mission,
                    vision: vision,
                    slogan: slogan,
                    email: email,
                    phone: phone,
                    address: address,
                    website: website,
                    value: value,
                });
            });
        }
    });
    router.post('/changeCompanyUploads', (req, res, next) => auth.company(req, res, next, ['edit_company_informations']), function(req, res){
        const {image, forWhat} = req.body;
        if(image){
            let path = null;
            if(image.path && image.path !== ''){
                path = image._id;
            }
            Company.findOne( {_id:req.company._id}, function (err, comp) {
                if (err) {
                    winston.error('/changeCompanyUploads 1');
                    return res.status(200).json({success:false,msg: `${locale("system_err")} 1`});
                } else
                if(path){
                    // if(forWhat === 'logo'){
                    //     comp[forWhat]= path;
                    // } else if(forWhat === 'cover'){
                        comp[forWhat] = path;
                    // }
                }
                comp.save(function (err, ko) {
                    if (err) {
                        winston.error('/changeCompanyUploads 2');
                        return res.status(200).json({success:false,msg: `${locale("system_err")} 2`, err});
                    } else {
                        return res.status(200).json({success:true, image:image, forWhat:forWhat });
                    }
                });
            });
        } else {
            return res.status(200).json({success:false });
        }
    });
    router.post('/create/role', (req, res, next) => auth.company(req, res, next, ['create_roles']), function(req, res){
        const { name, desc, actions, _id, orientation, jobDescription } = req.body || {};
        let acts = (actions || []).filter((c) => actionsKeys().indexOf(c) > -1);
        let reqComp  = req.company || {};
        // if(!acts.length){
        //     return res.json({success: false, msg: 'Үйлдэл сонгоно уу!'});
        // } else
        if(string(name).trim() === ''){
            return res.json({success: false, msg: locale("settings_routers_all.roleError.name_insert")});
        } else if(string(desc).trim() === ''){
            return res.json({success: false, msg: locale("settings_routers_all.roleError.description_insert")});
        } else if(_id && !isId(_id)){
            return res.json({success: false, msg: locale("settings_routers_all.roleError.choose_again")});
        } else if(!orientation || !isId(orientation)){
            return res.json({success: false, msg: locale("settings_routers_all.roleError.choose_orientation")});
        } else if(!jobDescription || !isId(jobDescription)){
            return res.json({success: false, msg: locale("settings_routers_all.roleError.choose_job_description")});
        } else {
            Orientation.findOne({_id: orientation, status: 'active', company: req.company._id}, {title: 1}).exec(function(err, orientationFound){
                if(err){
                    winsErr(req, err, 'Orientation.findOne() - create find role');
                    return res.json({success: false, msg: `${locale("system_err")} 1`});
                }
                if(orientation){
                    JobDescription.findOne({_id: jobDescription, status: 'active', company: req.company._id}, {title: 1}).exec(function(err, jobDesc){
                        if(err){
                            winsErr(req, err, 'JobDescription.findOne() - create find role');
                            return res.json({success: false, msg: `${locale("system_err")} 3`});
                        }
                        if(jobDesc){
                            if(_id && isId(_id)){
                                Roles.findOneAndUpdate({_id: _id}, {$set: {name: string(name), desc: string(desc), actions: acts, orientation: orientation, jobDescription: jobDescription}}, {new: true}).lean().exec(function(err, role){
                                    if(err){winsErr(req, err, 'Roles.findOneAndUpdate()')}
                                    return res.json({
                                        success: !(err),
                                        sucmod: !(err),
                                        msg: (err ? locale("settings_routers_all.role_edit_error") : locale("settings_routers_all.role_edit_success")),
                                        role: {
                                            ...role,
                                            jobDescription: jobDesc,
                                            orientation: orientationFound
                                        },
                                        _id: _id
                                    });
                                });
                            } else {
                                let roles = new Roles();
                                roles.name = string(name);
                                roles.desc = string(desc);
                                roles.actions = acts;
                                roles.company = reqComp._id;
                                roles.orientation = orientation;
                                roles.jobDescription = jobDescription;
                                roles.save((err, role) => {
                                    if(err){winsErr(req, err, 'roles.save()')}
                                    return res.json({
                                        success: !(err),
                                        sucmod: !(err),
                                        msg: (err ? locale("settings_routers_all.role_edit_error") : locale("settings_routers_all.role_edit_success")),
                                        role: {
                                            ...role._doc,
                                            jobDescription: jobDesc,
                                            orientation: orientationFound
                                        },
                                    });
                                });
                            }
                        }else{
                            return res.json({success: false, msg: locale("settings_routers_all.roleError.job_description_not_found")});
                        }
                    });
                }else{
                    return res.json({success: false, msg: locale("settings_routers_all.roleError.orientation_not_found")});
                }
            });
        }
    });
    router.post('/delete/role', (req, res, next) => auth.company(req, res, next, ['delete_roles']), function(req, res){
        const {_id, comId} = req.body || {};
        Roles.findOneAndUpdate({_id: _id, status: {$ne: 'delete'}, company: comId}, {$set: {status: 'delete' }}).exec(function(err, roles){
            if(err){
                return res.json({success: false, msg: `${locale("system_err")} 1`});
            }
            if(roles){
                Employee.updateMany({role: _id}, {$set: {role: null}}, {strict: true}).exec(function(err, employees) {
                    if(err){
                        return res.json({success: false, msg: `${locale("system_err")} 3`});
                    }
                    if(employees){
                        return res.json({success: true, deletedRole: _id, sucmod: true, msg: locale("settings_routers_all.role_delete_success")});
                    }else{
                        return res.json({success: false, msg: locale("employee_not_found")});
                    }
                });
            }else{
                return res.json({success: false, msg: locale("settings_routers_all.role_not_found")});
            }
        });
    });
    router.get('/get/tags', (req, res, next) => auth.company(req, res, next, ['read_tags']), function(req, res) {
        let reqComp = req.company || {}
        // Tags.find(
        //     {company: isId(reqComp._id), status: {$ne: 'deleted'}})
        //     .deepPopulate(['created_by.emp', 'created_by.user', 'sub_tags'])
        //     .exec(function(err, tags){
        //         if(err) {winsErr(req, res, 'tags.find()')}
        //         if(tags) {
        //             let withSub = tags.map(parent => {
        //                 SubTag.find({parent_tag: parent._id, status: {$ne: 'deleted'}}).exec(function (err, sub){
        //
        //                 })
        //             })
        //         }
        //             return res.json({success: !(err), tags: tags})
        //         } else {
        //             return res.json({success: !(err)})
        //         }
        //     })
        async.parallel({
            allTags: function(callback) {
                Tags.aggregate([
                    {$match: {company: reqComp._id, status: 'active'}},
                    {$lookup: {
                        from: "subtags",
                        let: {
                            parent_tag: "$_id",
                            status: "$status"
                        },
                        pipeline: [{
                            $match: {
                                $expr: {
                                    $and: [
                                        {$eq: ["$parent_tag", "$$parent_tag"]},
                                        {$eq: ["$status", "$$status"]},
                                    ]
                                }
                            }
                        },
                        {
                            $sort: {created: -1}
                        }],
                        as: 'subTags'
                    }},
                    {$project: {
                        _id: 1,
                        title: 1,
                        desc: 1,
                        created: 1,
                        status: 1,
                        created_by: 1,
                        updated_by: 1,
                        color: 1,
                        sub_tags: "$subTags"
                    }},
                    {
                        $sort: {created: -1}
                    }
                ], (err, data) => {
                    callback(err, data)
                })
            }
        }, function (err, data){
            if(err){winsErr(req, res, 'Tags aggregation')}
            if(data){
                return res.json({success: !(err), tags: data.allTags})
            } else {
                return res.json({success: false, tags: []})
            }
        })
    });
    router.post('/create/tag', (req, res, next) => auth.company(req, res, next, ['edit_tags']), function(req, res) {
        const {
            id,
            title,
            desc,
            color
        } = req.body || {}
        let reqComp = req.company || {}
        if(id && isId(id)){ //edit
            Tags.findOneAndUpdate(
                {_id: id, status: {$ne: 'deleted'}},
                {$set: {title: string(title), desc: string(desc), color: string(color), updated_by: {action: 'updated', emp: ((req.employee || {})._id || emp), user: (req.user || {})._id}}},
                {new: true})
                .deepPopulate(['created_by.emp', 'created_by.user'])
                .exec(function (err, tag){
                    if(err) {winsErr(req, res, 'Tags.findOneAndUpdate() edit')}
                    if(tag) {
                        return res.json({success: !(err), tag: tag, id: id, msg: (err ? locale("settings_routers_all.tag_edit_error") : locale("settings_routers_all.tag_edit_success"))})
                    } else {
                        return res.json({success: false, msg: locale("settings_routers_all.tag_not_found")})
                    }
                })
        } else { //new
            let tag = new Tags()
            tag.title = string(title);
            tag.desc = string(desc);
            tag.color = string(color)
            tag.company = isId(reqComp._id)
            tag.status = 'active'
            tag.created_by = {emp: ((req.employee || {})._id || emp), user: (req.user || {})._id};
            tag.save((err, tag) => {
                if(err) {winsErr(req, res, 'new tag save()')}
                if(tag){
                    return res.json({success: !(err), tag: tag, msg: (err ? locale("settings_routers_all.tag_edit_error") : locale("settings_routers_all.tag_edit_success"))})
                } else {
                    return res.json({success: false, msg: locale("settings_routers_all.tag_edit_error")})
                }
            })
        }
    });
    router.post('/delete/tag', (req, res, next) => auth.company(req, res, next, ['delete_tags']), function(req, res){
        const {
            id
        } = req.body || {}
        Tags.findOneAndUpdate(
            {_id: isId(id), status: {$ne: 'deleted'}},
            {$set: {status: 'deleted', updated_by: {action: 'deleted', emp: ((req.employee || {})._id || emp), user: (req.user || {})._id}}},
            {new: true})
            .exec(function (err, tag){
            if(err) {winsErr(req, res, 'delete tag findOneAndUpdate()')}
            if(tag) {
                return res.json({success: !(err), id: id, msg: (err ? locale("settings_routers_all.tag_delete_error") : locale("settings_routers_all.tag_delete_success"))})
            } else {
                return res.json({success: false, msg: locale("settings_routers_all.tag_not_found")})
            }
        })
    });
    router.post('/create/subtag', (req, res, next) => auth.company(req, res, next, ['edit_tags']), function(req, res) {
        const {
            id,
            title,
            desc,
            parent
        } = req.body || {}
        let reqComp = req.company || {}
        if(id && isId(id)){ //edit
            SubTag.findOneAndUpdate(
                {_id: id, status: {$ne: 'deleted'}},
                {$set: {title: string(title), desc: string(desc), updated_by: {action: 'updated', emp: ((req.employee || {})._id || emp), user: (req.user || {})._id}}},
                {new: true})
                .deepPopulate(['created_by.emp', 'created_by.user'])
                .exec(function (err, subtag){
                    if(err) {winsErr(req, res, 'SubTag.findOneAndUpdate() edit')}
                    if(subtag) {
                        return res.json({success: !(err), tag: subtag, id: parent, edit: true, msg: (err ? locale("settings_routers_all.tag_edit_error") : locale("settings_routers_all.tag_edit_success"))})
                    } else {
                        return res.json({success: false, msg: locale("settings_routers_all.tag_not_found")})
                    }
                })
        } else { //new
            let tag = new SubTag()
            tag.title = string(title);
            tag.desc = string(desc);
            // tag.color = string(color)
            tag.company = isId(reqComp._id)
            tag.status = 'active'
            tag.created_by = {emp: ((req.employee || {})._id || emp), user: (req.user || {})._id};
            tag.parent_tag = isId(parent)
            tag.save((err, subtag) => {
                if(err) {
                    winsErr(req, res, 'new tag save()')
                }
                if(subtag) {
                    return res.json({success: !(err), id: parent, tag: subtag, msg: (err ? locale("settings_routers_all.tag_edit_error") : locale("settings_routers_all.tag_edit_success"))})
                } else {
                    return res.json({success: false, msg: locale("settings_routers_all.tag_edit_error")})
                }
                // if(subtag){
                //     Tags.findOne({_id: isId(parent), status: {$ne: 'deleted'}}).exec(function (err, tag){
                //         if(err) {winsErr(req, res, 'Tags.findOne() subtag')}
                //         if(tag) {
                //             tag.sub_tags.push(subtag._id)
                //             tag.save((err, newTag) => {
                //                 if(err){winsErr(req, res, 'Tags.push()')}
                //                 if(newTag) {
                //                     Tags.findOne({_id: isId(parent), status: {$ne: 'deleted'}}).deepPopulate(['created_by.emp', 'created_by.user', 'sub_tags']).exec(function (err, aa){
                //                         if(err) {winsErr(req, res, 'Tags.findOne() subtag')}
                //                         if(aa) {
                //                             return res.json({success: !(err), id: parent, tag: aa, msg: (err ? 'Тэмдэглэгээ үүсгэхэд алдаа гарлаа' : 'Тэмдэглэгээ амжилттай үүслээ')})
                //                         } else {
                //                             return res.json({success: false, msg: 'Тэмдэглэгээ үүсгэхэд алдаа гарлаа'})
                //                         }
                //                     })
                //                 } else {
                //                     return res.json({success: false, msg: 'Тэмдэглэгээ үүсгэхэд алдаа гарлаа'})
                //                 }
                //             })
                //         } else {
                //             return res.json({success: false, msg: 'Тэмдэглэгээ үүсгэхэд алдаа гарлаа'})
                //         }
                //     })
                // }

            })
        }
    });
    router.post('/delete/subtag', (req, res, next) => auth.company(req, res, next, ['delete_tags']), function(req, res){
        const {
            parent,
            id
        } = req.body || {}
        SubTag.findOneAndUpdate({_id: isId(id), status: {$ne: 'deleted'}}, {$set: {status: 'deleted'}}, {new: true}).exec(function (err, subtag){
            if(err) {winsErr(req, res, 'delete tag findOneAndUpdate()')}
            if(subtag) {
                return res.json({success: !(err), id: parent, tag: subtag, msg: (err ? locale("settings_routers_all.tag_delete_error") : locale("settings_routers_all.tag_delete_success"))})
            } else {
                return res.json({success: false, msg: locale("settings_routers_all.tag_not_found")})
            }
        })
    });
    router.get('/get/timetable', (req, res, next) => auth.company(req, res, next, ['deal_with_timetable']), function(req, res){
        const { pageSize = 10, pageNum = 0, search = '' } = (req.query || {});
        if(search && search !== ''){
            Timetable.find({status: 'active', company: req.company._id, title: {$regex: `.*${search}.*`, $options:'i'}}).sort({created: -1}).exec(function(err, timetables){
                if(err) {
                    winsErr(req, res, 'timetable.find()')
                    return res.json({success: false, msg: locale("system_err")});
                }
                if(timetables){
                    return res.json({success: true, timetables: timetables });
                }else{
                    return res.json({success: false, timetables: []});
                }
            })
        }else{
            async.parallel({
                count: function(cb){
                    // Timetable.count({status: 'active', company: req.company._id}).exec(function (err, count){
                    Timetable.countDocuments({status: 'active', company: req.company._id}).exec(function (err, count){
                        cb(err, count)
                    })
                },
                timetables: function(cb){
                    Timetable.find({status: 'active', company: req.company._id}).sort({created: -1}).skip(parseInt(pageSize)*parseInt(pageNum)).limit(parseInt(pageSize)).exec(function (err, timetables){
                        cb(err, timetables)
                    })
                }
            }, function(err, data){
                if(err) {
                    winsErr(req, res, 'timetable.find()');
                    return res.json({success: false, msg: locale("system_err")});
                }
                if(data){
                    let ids = [];
                    data.timetables.map(tb => {
                        if(tb){
                            ids.push(tb._id);
                        }
                    });
                    Employee.find({status: {$nin: ['delete', 'fired']}, company: req.company, timetable: {$in: ids}}, {timetable: 1, user: 1, staticRole: 1}).deepPopulate(['user', 'user.avatar']).exec(function(err, emps){
                        if(err){
                            winsErr(req, res, 'time.table.find() - Employee.find()');
                        }
                        return res.json({success: true, all: data.count, timetables: data.timetables, timetableEmp: emps})
                    });
                }else{
                    return res.json({success: false, timetables: [], all: 0})
                }
            })
        }
    });
    router.post('/create/timetable', (req, res, next) => auth.company(req, res, next, ['deal_with_timetable']), function(req, res){
        const {title, days, employees, _id} = (req.body || {})
        if(!title || title === ''){
            return res.json({success: false, msg: locale("settings_routers_all.timetableError.title_empty")});
        }
        if(!days || (days || []).length === 0){
            return res.json({success: false, msg: locale("settings_routers_all.timetableError.day_empty")});
        }else if ((days|| []).some(day => (!day.title || day.title === '') || (!day.startingHour || day.startingHour === '') || (!day.endingHour || day.endingHour === ''))){
            return res.json({success: false, msg: locale("settings_routers_all.timetableError.hour_empty")});
        }
        if((employees || []).length === 0){
            return res.json({success: false, msg: locale("settings_routers_all.timetableError.employee_empty")});
        }
        let time = new Timetable();
        time.title = title;
        time.days = days;
        time.company = (req || {}).company;
        time.created_by.emp = ((req || {}).employee || {})._id;
        time.created_by.user = ((req || {}).employee || {}).user;
        time.status = 'active';
        time.save((err, tim) => {
            if(err){
                winsErr(req, res, 'timetable.save()');
                return res.json({success: false, msg: `${locale("system_err")} 1`})
            }
            Employee.updateMany({_id: {$in: employees}, status: {$nin: ['delete', 'fired']}, company: req.company._id}, {timetable: tim._id}).exec(function(err, many){
                if(err) {
                    winsErr(req, res, 'Employee.updateMany() - timetable');
                    return res.json({success: false, msg: `${locale("system_err")} 2`});
                }
                Employee.find({timetable: tim._id, status: {$nin: ['delete', 'fired']}, company: req.company._id}, {timetable: 1, user: 1, staticRole: 1}).deepPopulate(['user', 'user.avatar']).exec(function(err, employeesss){
                    if(err) {
                        winsErr(req, res, 'Employee.find() - timetable');
                        return res.json({success: false, msg: `${locale("system_err")} 3`});
                    }
                    if(_id && (_id || '').length>0){
                        Timetable.findOneAndUpdate({_id: _id, status: {$ne: 'archived'}, company: req.company._id}, {status: 'archived'}).exec(function(err, changed){
                            if(err) {
                                winsErr(req, res, 'Employee.updateMany() - timetable.findOneAndUpdate()');
                                return res.json({success: false, msg: `${locale("system_err")} 4`});
                            }
                            return res.json({success: true, timetable: tim, changed: _id, emps: employeesss});
                        })
                    }else{
                        return res.json({success: true, timetable: tim, emps: employeesss});
                    }
                })
            });
        });
    });
    router.post('/delete/timetable', (req, res, next) => auth.company(req, res, next, ['deal_with_timetable']), function(req, res){
        const {_id} = (req.body || {});
        Employee.updateMany({status: {$nin: ['delete', 'fired']}, company: req.company._id}, {timetable: null}).exec(function(err, many){
            if(err) {
                winsErr(req, res, 'Employee.updateMany() - timetable');
                return res.json({success: false, msg: `${locale("system_err")} 1`});
            }
            Timetable.findOneAndUpdate({_id: _id, status: {$ne: 'archived'}, company: req.company._id}, {status: 'archived', 'deleted_by.emp': (req.employee || {})._id, 'deleted_by.user': (req.employee || {}).user}).exec(function(err, changed){
                if(err) {
                    winsErr(req, res, 'Employee.updateMany() - timetable.findOneAndUpdate()');
                    return res.json({success: false, msg: `${locale("system_err")} 2`});
                }
                return res.json({success: true, id: _id});
            })
        });
    });
    router.post('/delete/timetable/employee', (req, res, next) => auth.company(req, res, next, ['deal_with_timetable']), function(req, res){
        const {_id, timetable} = (req.body || {});
        Employee.findOneAndUpdate({_id: _id, status: {$nin: ['delete', 'fired']}, company: req.company}, {timetable: null}).exec(function(err, emp) {
            if(err) {
                winsErr(req, res, 'Employee.find() - timetable');
                return res.json({success: false, msg: `${locale("system_err")} 2`});
            }
            return res.json({success: true, timetable: timetable, emp: _id});
        });
    });
    router.get('/get/admins', (req, res, next) => auth.company(req, res, next, ['edit_roles']), function(req, res){
        Employee.find(
            {company: {$in: [...(req.subsidiaries || []), req.company._id]}, status: 'active', staticRole: {$ne: 'employee'}}
        ).deepPopulate(['user']).exec(function(err, admins){
            if(err){winsErr(req, res, '/get/admins')}
            return res.json({success: !(err), admins: admins})
        })
    })
    router.post('/create/hrManager', (req, res, next) => auth.company(req, res, next, ['edit_roles']), function(req, res){
        const {
          employee
        } = req.body || {}
        Employee.findOneAndUpdate(
            {_id: employee, staticRole: 'employee', status: 'active'},
            {staticRole: 'hrManager'},
            {new: true}
        ).deepPopulate(['user']).exec(function(err, emp){
            if(err){
                winsErr(req, res, 'create hrManager')
                return res.json({success: false, msg: locale("system_err")})
            }
            if(emp){
                return res.json({success: true, emp: emp, msg: locale("success")})
            } else {
                return res.json({success: false, msg: locale("employee_not_found")})
            }
        })
    })
    router.post('/derank/employee', (req, res, next) => auth.companyAdministrator(req, res, next), function(req, res){
        const {_id} = req.body;
        Employee.findOne({_id: _id, status: {$nin: ['delete', 'fired']}}).exec(function(err, employee){
            if(err){
                winsErr(req, err, 'derank employee find')
                return res.json({success: false, msg: `${locale("system_err")} 1`});
            }
            if(employee){
                if((employee.company || 'as').toString() === (req.company._id || '').toString()){
                    employee.staticRole = 'employee';
                    employee.save((err, saved) => {
                        if(err){
                            winsErr(req, err, 'derank employee save');
                            return res.json({success: false, msg: `${locale("system_err")} 2`});
                        }
                        return res.json({success: true, _id: _id || saved._id});
                    });
                }else{
                    return res.json({success: false, msg: locale("settings_routers_all.can_change_own_company_worker_position")});
                }
            }else{
                return res.json({success: false, msg: locale("employee_not_found")});
            }
        });
    });
    router.post('/create/attendanceCollector', (req, res, next) => auth.company(req, res, next, ['edit_roles', 'create_employee']), function (req, res){
        const {
            username,
            password
        } = req.body || {}
        function saveUser(){
            let user = new User()
            user.username = string(username);
            user.password = bcrypt.hashSync(string(password));
            user.email = `${Date.now()}email`;
            user.register_id = `${Date.now()}register_id`;
            user.phone = `${Date.now()}phone`;
            user.status = 'active';
            user.save((err, newUser) => {
                if(err){winsErr(req, res, 'user.save()')}
                if(newUser) {
                    let emp = new Employee()
                    emp.user = newUser._id
                    emp.company = req.company._id
                    emp.staticRole = 'attendanceCollector'
                    emp.status = 'active'
                    emp.save((err, newEmp) => {
                        if(err){winsErr(req, res, 'emp.save()')}
                        return res.json({success: !(err), sucmod: !(err), msg: err ? locale("settings_routers_all.user_edit_error") : locale("settings_routers_all.user_edit_success"), emp: newEmp, user: newUser});
                    })
                } else {
                    return res.json({success: false, msg: locale("settings_routers_all.user_edit_error")});
                }
            })
        }
        if(username === ''){
            return res.json({success: false, msg: locale("usernameError.insert")})
        } else if(password === ''){
            return res.json({success: false, msg: locale("passwordError.insert")})
        } else {
            User.findOne(
                {username: {$regex: new RegExp("^"+username+"$", "i")}},
                {_id: 1}
            ).exec(function (err, user){
                if(err){winsErr(req, res, 'User.findOne()')}
                if(user){
                    Employee.findOne({user: user._id, status: 'active'}).exec(function (err, emp){
                        if(err){winsErr(req, res, 'Employee.findOne()'); return res.json({success: false, msg: locale("system_err")})}
                        if(emp) {
                            return res.json({success: false, msg: locale("usernameError.exists")})
                        } else {
                            saveUser()
                        }
                    })
                } else {
                    saveUser()
                }
            })
        }
    });
    router.get('/get/subsidiary/company', (req, res, next) => auth.company(req, res, next, ['read_subsidiary']), function (req, res) {
        // Company.find({parent: companyId, status: {$ne: 'delete'}}).deepPopulate('logo').lean().exec(function(err, com){
        //     if(err){
        //         winsErr(req, err, 'SubsidiaryCompany.find()');
        //         return res.json({success: true, companies: []});
        //     }
        //     return res.json({success: true, companies: com});
        //
        // });
        Company.aggregate([
            {
                $match: {
                    $and: [
                        {'parent': req.company._id},
                        {'status':'active'},
                    ]
                }
            },
            {
                $lookup: {
                    from: 'media',
                    let: {id: '$logo'},
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: [ "$_id",  "$$id" ] },
                            }
                        },
                        {$project: {path: 1}}
                    ],
                    as: "logo"
                }
            },
            {
                $set: {
                    'logo': {$arrayElemAt: [ "$logo", 0 ]}
                }
            },
            {
                $lookup: {
                    from: 'employees',
                    let: {id: '$_id'},
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: [ "$company",  "$$id" ] }
                            }
                        },
                    ],
                    as: "employees"
                }
            },
            {
                $set: {'emp_count': {$size: '$employees'}}
            },
            {$unwind: '$employees'},
            {
                $project: {
                    domain: 1,
                    name: 1,
                    address: 1,
                    email: 1,
                    phone: 1,
                    website: 1,
                    logo: 1,
                    description: 1,
                    emp_count: 1,
                    willBeDeletedBy: 1,
                    deletionRequestBy: 1,
                    cancelledBy: 1,
                    created: 1,
                    'employees': { $cond: { if: { $eq: ['$employees.staticRole', 'lord'] }, then: '$employees', else: null} }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    let: {id: '$employees.user'},
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: [ "$_id",  "$$id" ] }
                            }
                        },
                        {$project: {_id: 1, username: 1, first_name: 1, last_name: 1, avatar:1}}
                    ],
                    as: "employees.user"
                }
            },
            {
                $unwind:
                    {
                        path: '$employees.user',
                        preserveNullAndEmptyArrays: false
                    }
            },
            {
                $lookup: {
                    from: 'media',
                    let: {id: '$employees.user.avatar'},
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: [ "$_id",  "$$id" ] }
                            }
                        },
                        {$project: {_id: 1, path:1}}
                    ],
                    as: "employees.user.avatar"
                }
            },
            {
                $unwind:
                    {
                        path: '$employees.user.avatar',
                                preserveNullAndEmptyArrays: true
                    }
            },
            {
                $group:{
                    _id: '$_id',
                    domain: {$first: '$domain'},
                    name: {$first: '$name'},
                    address: {$first: '$address'},
                    email: {$first: '$email'},
                    phone: {$first: '$phone'},
                    emp_count: {$first: '$emp_count'},
                    website: {$first: '$website'},
                    logo: {$first: '$logo'},
                    created: {$first: '$created'},
                    description: {$first: '$description'},
                    willBeDeletedBy: {$first: '$willBeDeletedBy'},
                    deletionRequestBy: {$first: '$deletionRequestBy'},
                    cancelledBy: {$first: '$cancelledBy'},
                    employees: {$push: '$employees'},
                }
            },
            {
                $sort: {created: -1}
            }
        ]).exec(function(err, com){
            if(err){
                winsErr(req, err, 'SubsidiaryCompany.find()');
                return res.json({success: true, companies: []});
            }
            return res.json({success: true, companies: com});
        })
    });
    router.post('/create/subsidiary/company', (req, res, next) => auth.company(req, res, next, ['create_subsidiary']), function(req, res) {
        const {name, domain, independent, lord = {}} = req.body;

        const domain_regex = new RegExp(/^[a-zA-Z0-9]*$/);
        const domain_rep = new RegExp(".*"+domain+'.*', "i");

        const username_regex = new RegExp("^[0-9a-zA-Z_]*$", "i");
        const register_regex = new RegExp("^[а-яА-ЯөӨүҮёЁ]{2}[0-9]{8}$", "i");

        const {first_name, last_name, register_id, password, _id, username, passwordRep} = lord;

        if(!name || name === ''){
            return res.json({success: false, msg: locale("settings_routers_all.company_name_empty")});
        }

        if(!domain || domain === ''){
            return res.json({success: false, msg: locale("settings_routers_all.companyDomainError.insert")});
        }else if(domain.length < 4){
            return res.json({success: false, msg: locale("settings_routers_all.companyDomainError.short")});
        }else if(domain.length > 20 ){
            return res.json({success: false, msg: locale("settings_routers_all.companyDomainError.long")});
        }else if(!domain_regex.test(domain)){
            return res.json({success: false, msg: locale("settings_routers_all.companyDomainError.latin")});
        }

        if(!username || username === ''){
            return res.json({success: false, msg: locale("usernameError.insert")});
        }else if(!username_regex.test(username)){
            return res.json({success: false, msg: locale("usernameError.accepted_chars")});
        }else if(!first_name || first_name === '') {
            return res.json({success: false, msg: locale("firstNameError.insert")});
        }else if(!last_name || last_name === ''){
            return res.json({success: false, msg: locale("lastNameError.insert")});
        }else if(!register_id || register_id === ''){
            return res.json({success: false, msg: locale("registerIdError.insert")});
        }else if(!register_regex.test(register_id)){
            return res.json({success: false, msg: locale("registerIdError.error")});
        }else if(password !== passwordRep) {
            return res.json({success: false, msg: locale("passwordError.does_not_match")});
        }
        const username_rep = new RegExp(".*"+username+'.*', "i");
        const register_rep = new RegExp(".*"+register_id+'.*', "i");

        Company.findOne({_id: req.company._id, status: 'active'}).exec(function(err, found){
            if(err){
                winsErr('Company.findOne - company');
                return res.json({success: false, msg: `${locale("system_err")}`});
            }
            if(found.parent && found.parent !== '') return res.json({success: false, msg: locale("settings_routers_all.can_create_subsidiary_from_head_company")});
            Company.countDocuments({$expr: {$regexMatch:{"input": "$domain", "regex": domain_rep}}, status: {$ne: 'delete'}}).exec(function(err, countCom) {
                if(err){
                    winsErr('SubsidiaryCompany.countDocuments - domain');
                    return res.json({success: false, msg: `${locale("system_err")} 1`});
                }
                if(countCom){
                    return res.json({success: false, msg: locale("settings_routers_all.companyDomainError.exists")});
                }else{
                    if(_id){
                        let company = new Company;
                        company.name = name;
                        company.domain = domain;
                        company.parent = req.company._id;
                        company.status = 'active';
                        company.independent = independent;
                        company.save((err, com) => {
                            if(err){
                                winsErr(req, err, 'company.save() - create subsidiaryCompany');
                                return res.json({success: false, msg: `${locale("system_err")} 2`});
                            }
                            let emp = new Employee;
                            emp.user = _id;
                            emp.company = com._id;
                            emp.status = 'active';
                            emp.staticRole = 'lord';
                            emp.save((errEmp, employee) => {
                                if(errEmp){
                                    winsErr(req, err, 'employee.save() - create subsidiaryCompany');
                                    return res.json({success: false, msg: `${locale("system_err")} 3`});
                                }
                                return res.json({
                                    success: true,
                                    company:
                                        {
                                            ...company.toObject(),
                                            emp_count: 1,
                                            employees: [{
                                                user: {
                                                    last_name: last_name,
                                                    first_name: first_name,
                                                    username: username
                                                }
                                            }]
                                        }
                                });
                            })
                        })
                    }else{
                        User.countDocuments(
                            {$expr: {
                                    $or: [{
                                        $regexMatch: {
                                            "input": "$username",
                                            "regex": username_rep
                                        }
                                    }, {$regexMatch: {"input": "$register_id", "regex": register_rep}}]
                                }, status: {$ne: 'delete'}}
                        ).lean().exec(function(err, countUser){
                            if(err){
                                winsErr('User.countDocuments - username or register_id');
                                return res.json({success: false, msg: `${locale("system_err")} 4`});
                            }
                            if(countUser){
                                return res.json({success: false, msg: locale("settings_routers_all.user_info_repetition")});
                            }else{
                                let user = new User;
                                user.username = username;
                                user.first_name = first_name;
                                user.last_name = last_name;
                                user.status = 'active';
                                user.register_id = register_id;
                                user.password = bcrypt.hashSync(password);
                                user.save((err, use) => {
                                    if(err){
                                        winsErr(req, err, 'User.save() - create new user - subsidiary');
                                        return res.json({success: false, msg: `${locale("system_err")} 5`});
                                    }
                                    let company = new Company;
                                    company.name = name;
                                    company.domain = domain;
                                    company.parent = req.company._id;
                                    company.status = 'active';
                                    company.independent = independent;
                                    company.save((err, com) => {
                                        if(err){
                                            winsErr(req, err, 'company.save() - create subsidiaryCompany');
                                            return res.json({success: false, msg: `${locale("system_err")} 6`});
                                        }
                                        let emp = new Employee;
                                        emp.user = use._id;
                                        emp.company = com._id;
                                        emp.status = 'active';
                                        emp.staticRole = 'lord';
                                        emp.save((errEmp, employee) => {
                                            if(errEmp){
                                                winsErr(req, err, 'employee.save() - create subsidiaryCompany');
                                                return res.json({success: false, msg: `${locale("system_err")} 7`});
                                            }
                                            return res.json({
                                                success: true,
                                                company:
                                                    {
                                                        ...company.toObject(),
                                                        emp_count: 1,
                                                        employees: [{
                                                            user: {
                                                                last_name: last_name,
                                                                first_name: first_name,
                                                                username: username
                                                            }
                                                        }]
                                                    }
                                            });
                                        })
                                    })
                                })
                            }
                        })
                    }
                }
            });
        });
    });
    router.post('/delete/subsidiary/company', (req, res, next) => auth.company(req, res, next, ['delete_subsidiary']), function(req, res) {
        const {companyId} = req.body;
        const now = new Date();
        Company.findOne({_id: companyId, status: 'active'}).exec(function(err, com){
            if(err){
                winsErr(req, err, 'Company.findOne() - delete subsidiary');
                return res.json({success: false, msg: `${locale("system_err")} 1`});
            }
            if(com){
                if(isValidDate(now)){
                    now.setMonth(now.getMonth() + 1);
                    com.willBeDeletedBy = now;
                    com.deletionRequestedBy = {emp: req.employee._id, user: req.employee.user};
                    com.save((err, saved) => {
                        if(err){
                            winsErr(req, err, 'Company.save() - delete subsidiary');
                            return res.json({success: false, msg: `${locale("system_err")} 3`});
                        }
                        return res.json({success: true, id: companyId, willBeDeletedBy: now, deletionRequestedBy: {emp: req.employee._id, user: req.employee.user}});
                    })
                }else{
                    winsErr(req, err, 'Date now() - delete subsidiary');
                    return res.json({success: false, msg: `${locale("system_err")} 2`});
                }
            }else{
                return res.json({success: false, msg: locale("company_not_found")});
            }
        });
    });
    router.post('/get/users', (req, res, next) => auth.company(req, res, next, ['create_subsidiary']), function(req, res) {
        const {search} = req.body;
        const [name1, name2] = (search || 'a a').split(' ');
        const regex1 = new RegExp(".*"+name1+'.*', "i");
        const regex2 = new RegExp(".*"+name2+'.*', "i");
        Employee.find({company: req.company._id, status: 'active'}).exec(function(err, found){
            if(err){
                winsErr(req, err, 'employee.find() - create subsidiary');
                return res.json({success: true, users: []})
            }
            let arr = found || [];
            arr = (arr || []).map(ar => ar.user);
            User.find({
                    $or: [
                        {$and: [{first_name: {$regex: regex1}}, {last_name: {$regex: regex2}}]},
                        {$and: [{first_name: {$regex: regex2}}, {last_name: {$regex: regex1}}]},
                        {$or: [{register_id: {$regex: regex1}}, {register_id: {$regex: regex2}}]},
                        {first_name: {$regex: regex1}}, {last_name: {$regex: regex1}},
                    ],
                    status: 'active',
                    _id: {$in: arr}
                },
                {username: 1, first_name: 1, last_name: 1, register_id: 1},
                ).limit(10).exec(function(err, users) {
                    if(err){
                        winsErr(req, err, 'user.find() - create subsidiary');
                        return res.json({success: true, users: []})
                    }
                    return res.json({success: true, users: users})
                });
        });
    });
    router.post('/cancel/delete/subsidiary/company', (req, res, next) => auth.company(req, res, next, ['delete_subsidiary', 'create_subsidiary']), function(req, res){
        const {companyId} = req.body;
        Company.findOne({_id: companyId, status: 'active'}).exec(function(err, com){
            if(err){
                winsErr(req, err, 'Company.findOne() - cancel delete subsidiary');
                return res.json({success: false, msg: `${locale("system_err")} 1`});
            }
            if(com){
                com.willBeDeletedBy = null;
                com.cancelledBy = {emp: req.employee._id, user: req.employee.user};
                com.save((err, saved) => {
                    if(err){
                        winsErr(req, err, 'Company.save() - cancel delete subsidiary');
                        return res.json({success: false, msg: `${locale("system_err")} 2`});
                    }
                    return res.json({success: true, id: companyId, willBeDeletedBy: null, cancelledBy: {emp: req.employee._id, user: req.employee.user}});
                })
            }else{
                return res.json({success: false, msg: locale("company_not_found")});
            }
        });
    });
    router.post('/get/roles/orientation', (req, res, next) => auth.company(req, res, next, ['delete_roles', 'create_roles']), function(req, res){
        const {search} = req.body;
        const regex1 = new RegExp(".*"+search+'.*', "i");
        Orientation.find({title: {$regex: regex1}, status: 'active', company: req.company._id}).limit(10).exec(function(err, orien){
            if(err){
                winsErr(req, err, 'Orientation.find()');
                return res.json({success: true, orientation: []});
            }
            return res.json({success: true, orientation: orien || []});
        });
    });
    router.post('/get/roles/job-descriptions', (req, res, next) => auth.company(req, res, next, []), function(req, res){
        const {search} = req.body;
        const regex1 = new RegExp(".*"+search+'.*', "i");
        JobDescription.find({title: {$regex: regex1}, status: 'active', company: req.company._id}).limit(10).exec(function(err, descriptions){
            if(err){
                winsErr(req, err, 'JobDescription.find()');
                return res.json({success: true, jobDescriptions: []});
            }
            return res.json({success: true, jobDescriptions: descriptions || []});
        });
    });
};