import auth from "../../auth";
import async from 'async'
import {isId, isValidDate, winsErr} from "../../config";
import Vacation from "../../models/Vacation";
import {locale} from "../../lang";

module.exports = function(router) {
    router.post('/change/vacation/:employee', (req, res, next) => auth.company(req, res, next, ['create_vacation']), function(req, res){
        const {
            _id, //vacation id
            employee, //employee id
            starting_date,
            ending_date,
            user, //employee-user id
            action,
            status,
            respondedBy
        } = req.body || {}
        let reqComp = req.company || {}
        let endDate = new Date(ending_date)
        endDate.setDate(endDate.getDate() + 1);
        endDate.setMilliseconds(endDate.getMilliseconds() - 1);
        if(action === 'delete') {
            Vacation.findOneAndUpdate({_id: _id}, {$set: {status: 'deleted'}}, {new: true}).exec(function (err, vacation) {
                if(err) {winsErr(req, res, 'Vacation delete')}
                if(vacation) {
                    return res.json({
                        success: !(err),
                        sucmod: !(err),
                        msg: (err ? locale("vacation_routers_all.vacation_delete_error") : locale("vacation_routers_all.vacation_delete_success")),
                        vacation: vacation,
                        delete: true,
                        _id: _id
                    })
                } else {
                    return res.json({
                        success: false,
                        sucmod: false,
                        msg: locale("vacation_routers_all.vacation_not_found")
                    })
                }
            })
        } else if(_id && isId(_id)) { //edit
            Vacation.findOneAndUpdate(
                {_id: _id},
                {$set: {'employee.emp': isId(employee), 'employee.user': isId(user), starting_date: isValidDate(starting_date), ending_date: isValidDate(endDate)}},
                {new: true}).deepPopulate(['employee.emp', 'employee.user']).exec(function(err, vacation){
                if(err) {winsErr(req, res, 'Vacation.findOneAndUpdate()')}
                if(vacation) {
                    return res.json({
                        success: !(err),
                        sucmod: !(err),
                        msg: (err ? locale("vacation_routers_all.vacation_save_error") : locale("vacation_routers_all.vacation_save_success")),
                        vacation: vacation,
                        _id: _id
                    })
                } else {
                    return res.json({
                        success: false,
                        sucmod: false,
                        msg: locale("vacation_routers_all.vacation_not_found")
                    })
                }
            })
        } else { //create
            let vacation = new Vacation();
                vacation.employee.emp = isId(employee);
                vacation.employee.user = isId(user);
                vacation.starting_date = isValidDate(starting_date);
                vacation.ending_date = isValidDate(endDate);
                vacation.company = reqComp._id;
                vacation.save((err, newVacation) => {
                    if(err) {winsErr(req, res, 'vacation.save()')}
                    Vacation.findOne({_id: newVacation._id}).deepPopulate(['employee.user', 'employee.emp']).exec(function(err, vac){
                        if(err){winsErr(req, res, 'Vacation.findOne()')}
                        if(vac) {
                            return res.json({
                                success: !(err),
                                sucmod: !(err),
                                msg: (err ? locale("vacation_routers_all.vacation_save_error") : locale("vacation_routers_all.vacation_save_success")),
                                vacation: vac
                            })
                        } else {
                            return res.json({
                                success: false,
                                sucmod: false,
                                msg: locale("vacation_routers_all.vacation_save_error")
                            })
                        }
                    })
                })
        }
    })
    router.post('/get/vacations', (req, res, next) => auth.company(req, res, next, ['create_vacation']), function(req, res){
        let reqComp = req.company || {};
        const {
            pageSize,
            pageNum
        } = req.query
        async.parallel({
            allVacations: function(cb) {
                Vacation.find({company: reqComp, status: {$ne: 'deleted'}}).deepPopulate(['employee.emp', 'employee.user', 'company', 'approved_by.emp', 'approved_by.user']).limit(pageSize).skip(pageNum*pageSize).sort({created: -1}).lean().exec(function(err, vacations){
                    if(err){winsErr(req, res, 'Vacation.find()')}
                    cb(err, vacations)
                })
            },
            allCount: function(cb) {
                // Vacation.count({company: reqComp, status: {$ne: 'deleted'}}, function(err, count) {
                Vacation.countDocuments({company: reqComp, status: {$ne: 'deleted'}}, function(err, count) {
                    cb(err, count)
                })
            }
        }, function(err, data) {
            if(err) {winsErr(req, res, 'Vacation.find()')}
            if(data) {
                return res.json({success: !(err), sucmod: !(err), vacations: data.allVacations, all: data.allCount})
            } else {
                return res.json({success: !(err), vacation: [], all: 0})
            }
        })
    })
    router.post('/vacation/response', (req, res, next) => auth.company(req, res, next, ['approve_vacation']), function (req, res) {
        const {
            _id,
            respondedBy,
            status
        } = req.body || {}
        Vacation.findOne({_id: _id, status: {$nin: ['idle', 'approved', 'declined', 'deleted']}}).exec(function (err, vacation){
            if(err) {winsErr(req, res, 'Vacation response findOne')}
            if(vacation) {
                vacation.status = status;
                vacation.approved_by = {emp: ((req.employee || {})._id || respondedBy), user: (req.user || {})._id};
                vacation.save((err, vacSaved) => {
                    if(err){winsErr(req, res, 'Vacation response save')}
                    if(vacSaved) {
                        return res.json({
                            success: !(err),
                            sucmod: !(err),
                            employee: req.employee,
                            user: req.user,
                            _id: _id,
                            status: status,
                            msg: (err ? locale("unsuccessful") : locale("success"))
                        })
                    }
                })
            } else {
                return res.json({
                    success: false,
                    sucmod: false,
                    msg: locale("vacation_routers_all.vacation_not_found")
                })
            }
        })
    })
}