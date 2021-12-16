import OrlogoZarlaga from '../../models/OrlogoZarlaga';
import Workplan_tag from '../../models/Workplan_tag';
import Company from '../../models/Company';
import SubTag from '../../models/SubTag';
import SalaryLog from '../../models/SalaryLog';
import Employee from '../../models/Employee';
import User from '../../models/User';
import async from 'async';
import auth from '../../auth';
import { isId, isValidDate, winsErr, string, actionsKeys } from '../../config';
import winston from 'winston';
import moment, { locale } from 'moment'

module.exports = function(router){
    router.post('/getOrlogoZarlaga', auth.employee, function(req, res){
        let hadAction = (((req.employee || {}).role || {}).actions || []).some((c) => ['read_orlogo_zarlaga'].indexOf(c) > -1);
        let hasAccess = ((req.employee || {}).staticRole === 'lord' || (req.employee || {}).staticRole === 'hrManager' || (req.employee || {}).staticRole === 'chairman')
            || hadAction;
        let filter = [{status:{$ne:'deleted'}, company:{$in:[req.company._id, ...(req.subsidiaries || [])]}}];
        if(req.body.company && isId(req.body.company)){
            filter = [{status:{$ne:'deleted'}, company:req.body.company}];
        }
        // let filter = [{status:{$ne:'deleted'}}];
        if(!hasAccess){
            filter.push({'created_by.emp': req.employee._id});
        } else {
            if(req.body.user && typeof req.body.user === 'object' && ((req.body.user || {}).user || {}).first_name && ((req.body.user || {}).user || {}).last_name){
                filter.push({'created_by.emp': (req.body.user || {})._id});
            }
            if(req.body.company && req.body.company !== ''){
                filter.push({company:req.body.company});
            }
        }
        if(typeof req.body.subTag === 'string' && req.body.subTag !== ''){
            filter.push({subTag: req.body.subTag});
        }
        if(typeof req.body.search === 'string' && req.body.search !== ''){
            let reg = new RegExp(".*"+req.body.search+'.*', "i");
            filter.push({title: reg});
        }
        if(typeof req.body.type === 'string' && req.body.type !== ''){
            let reg = new RegExp("^"+req.body.type+"$", "i");
            filter.push({type: reg});
        }
        let ending, starting;
        ending = new Date(req.body.ending_date)
        ending.setDate(ending.getDate() +1 )
        ending.setMilliseconds(ending.getMilliseconds() - 1);
        if(isValidDate(req.body.ending_date) && isValidDate(req.body.starting_date)){
            filter.push({$and: [
                    {date:{$lte:new Date(isValidDate(ending))}},
                    {date:{$gte:new Date(isValidDate(req.body.starting_date))}}
                ]});
        }
        let query = {};
        if(req.body.company && req.body.company !== ''){
            query = {company: req.body.company};
        }else{
            query = {company:{$in:[req.company._id, ...(req.subsidiaries || [])]}};
        }


        let sortQu = {date: -1};
        if(req.body.sort && req.body.sort.columnKey && req.body.sort.order ){
            if(req.body.sort.columnKey=== 'date'){
                if(req.body.sort.order  === "ascend"){
                    sortQu = {date: 1};
                } else if(req.body.sort.order  === "descend") {
                    sortQu = {date: -1};
                }
            } else if(req.body.sort.columnKey=== 'amount'){
                if(req.body.sort.order  === "ascend"){
                    sortQu = {amount: 1};
                } else if(req.body.sort.order  === "descend") {
                    sortQu = {amount: -1};
                }
            }
        }
        let companies = [req.company._id, ...(req.subsidiaries|| [])];
        async.parallel({
            workplan_tags : function (callback) {
                Workplan_tag.find({$and: [{status: 'active'}, query]})
                    .sort({company: 1})
                    .deepPopulate(['company'])
                    .lean()
                    .exec( function(err,result) {
                        async.map(result, function(item, cb){
                            SubTag.find({parent_tag: item._id, status:'active'}).sort({created: -1}).lean().exec(function(errT, subTags){
                                cb((err || errT),
                                    {
                                        ...item,
                                        subTags: (subTags || [])
                                    }
                                );
                            });
                        }, function(err, ress){
                            callback(err, ress)
                        });
                    });
            },
            orlogoZarlaga : function (callback) {
                OrlogoZarlaga.find({$and:filter})
                    .sort(sortQu)
                    // .skip((parseInt(req.body.pageNum)*parseInt(req.body.pageSize)))
                    // .limit(parseInt(req.body.pageSize))
                    .deepPopulate(['created_by.emp', 'created_by.user','company'])
                    .exec( function(err,result) {
                        callback(err, result)
                    });
            },
            all : function (callback) {
                OrlogoZarlaga.countDocuments({$and:filter}).exec( function(err,result) {
                    callback(err, result)
                });
            },
            subCompany : function (callback) {
                Company.find({_id:{$in:companies}}, {_id:1, name:1, domain:1})
                    .sort({created: -1})
                    .exec( function(err,result) {
                        callback(err, result)
                    });
            },
        }, function (err, data) {
            if(err) {
                winsErr(req, res, '/getOrlogoZarlaga');
            }
            const {orlogoZarlaga, all, workplan_tags, subCompany} = data || {};
            let ss={orlogo:0, zarlaga:0};
            let companyOrlogo=null;
            if(companies && companies.length>1){
                companyOrlogo = [];
            }
            (orlogoZarlaga || []).map(function (r) {
                if(companyOrlogo && typeof r.company === 'object'){
                    if(companyOrlogo.some(c => c.company._id === r.company._id)){
                        companyOrlogo.map(c => c.company._id === r.company._id? c[r.type] += r.amount : null);
                    } else {
                        companyOrlogo.push({company: r.company, orlogo:0, zarlaga:0, [r.type]:r.amount});
                    }
                }
                ss[r.type] += r.amount;
            })
            let cut = (orlogoZarlaga || []).splice((parseInt(req.body.pageNum)*parseInt(req.body.pageSize)), parseInt(req.body.pageSize));
            return res.json({success:true, starting_date:req.body.starting_date, ending_date:req.body.ending_date, orlogo:ss.orlogo, zarlaga:ss.zarlaga, companyOrlogo:companyOrlogo, orlogoZarlagas:cut, all:all, Workplan_tags:workplan_tags, user: req.body.user, subCompanies:subCompany});
        })
    });
    router.post('/submit/orlogoZarlaga', auth.employee, function(req, res){
        const {amount, type, title, description, date, endDate, startDate, subtag, _id, starting_date, ending_date } = req.body;
        let msg = 'Орлого зарлагын ';
        let regex = /^([0-9])*$/;
        type ? type === 'orlogo' ? msg = 'Орлогын ' : msg = 'Зарлагын ' : null;
        if(!type || type === '') return res.json({success: false, msg: locale("orlogo_zarlaga_routers_all.type_wrong")});
        if(!title || (title || '').trim() === '') return res.json({success: false, msg: locale("orlogo_zarlaga_routers_all.title_wrong")});
        if(!amount || !regex.test(amount) || amount < 0) return res.json({success: false, msg: locale("orlogo_zarlaga_routers_all.amount_wrong")});
        if(subtag && (subtag || '').trim() === '') return res.json({success: false, msg: locale("orlogo_zarlaga_routers_all.date_wrong")});
        if(!date || !isValidDate(date)) return res.json({success: false, msg: locale("orlogo_zarlaga_routers_all.tag_wrong")});
        if(startDate && !isValidDate(startDate)) return res.json({success: false, msg: locale("orlogo_zarlaga_routers_all.start_date_wrong")});
        if(endDate && !isValidDate(endDate)) return res.json({success: false, msg: locale("orlogo_zarlaga_routers_all.end_date_wrong")});
        if(_id && _id !== '' && isId(_id)){
            OrlogoZarlaga.findOne({_id, status: 'active'}).exec(function(err, found){
                if(err) {
                    winsErr(req, err, '/submit/orlogoZarlaga - findOne()');
                    return res.json({success: false, msg: `${locale("system_err")} 2`});
                }
                if(found) {
                    if(((found.created_by || {}).user || 'as').toString() !== (req.user._id || '').toString()){
                        return res.json({success: false, msg: locale("orlogo_zarlaga_routers_all.can_edit_own")});
                    }
                    found.amount = amount;
                    found.type = type;
                    found.title = title;
                    found.description = description || '';
                    found.date = date;
                    endDate ? found.endingDate = endDate : null;
                    startDate ?found.startingDate = startDate : null;
                    subtag ? found.subTag = subtag : null;
                    found.save((err, saved) => {
                        if(err) {
                            winsErr(req, err, '/submit/orlogoZarlaga - found - save');
                            return res.json({success: false, msg: `${locale("system_err")} 3`});
                        }
                        return res.json({success: true, orlogoZarlaga: saved._doc, _id: (_id || saved._id)});
                    });
                }else{
                    return res.json({success: false, msg: locale("orlogo_zarlaga_routers_all.orlogo_zarlaga_not_found")});
                }
            });
        }else{
            let orlogoZarlaga = new OrlogoZarlaga();
            orlogoZarlaga.amount = amount;
            orlogoZarlaga.type = type;
            orlogoZarlaga.company = req.company._id;
            orlogoZarlaga.title = title;
            orlogoZarlaga.description = description || '';
            orlogoZarlaga.date = date;
            endDate ? orlogoZarlaga.endingDate = endDate : null;
            startDate ?orlogoZarlaga.startingDate = startDate : null;
            subtag ? orlogoZarlaga.subTag = subtag : null;
            orlogoZarlaga.created_by = {emp: req.employee._id, user: req.user._id};
            orlogoZarlaga.save((err, saved) => {
                if(err) {
                    winsErr(req, err, '/submit/orlogoZarlaga - save');
                    return res.json({success: false, msg: `${locale("system_err")} 1`});
                }
                return res.json({success: true, orlogoZarlaga: saved._doc, starting_date, ending_date});
            });
        }
    });
    router.post('/publish/orlogoZarlaga', auth.employee, function(req, res){
        const {_id} = req.body;
        OrlogoZarlaga.findOne({_id, status: 'active'}).exec(function(err, found){
            if(err){
                winsErr('/publish/orlogoZarlaga', err, 'findOne');
                return res.json({success: false, msg: `${locale("system_err")} 1`});
            }
            if(found){
                found.status = 'active';
                found.save((err, saved) => {
                    if(err){
                        winsErr('/publish/orlogoZarlaga', err, 'save');
                        return res.json({success: false, msg: `${locale("system_err")} 2`});
                    }
                    return res.json({success: true, _id: _id || saved._id});
                });
            }else{
                return res.json({success: false, msg: locale("orlogo_zarlaga_routers_all.orlogo_zarlaga_not_found")});
            }
        });
    });
    router.post('/delete/orlogoZarlaga', auth.employee, function(req, res){
        const {_id} = req.body;
        OrlogoZarlaga.findOne({_id, status: 'active'}).exec(function(err, found){
            if(err){
                winsErr('/delete/orlogoZarlaga', err, 'findOne');
                return res.json({success: false, msg: `${locale("system_err")} 1`});
            }
            if(found){
                if(((found.created_by || {}).user || 'as').toString() !== (req.user._id || '').toString()){
                    return res.json({success: false, msg: locale("orlogo_zarlaga_routers_all.can_edit_own")});
                }
                found.status = 'deleted';
                found.save((err, saved) => {
                    if(err){
                        winsErr('/delete/orlogoZarlaga', err, 'save');
                        return res.json({success: false, msg: `${locale("system_err")} 2`});
                    }
                    return res.json({success: true, _id: _id || saved._id});
                });
            }else{
                return res.json({success: false, msg: locale("orlogo_zarlaga_routers_all.orlogo_zarlaga_not_found")});
            }
        });
    });
};