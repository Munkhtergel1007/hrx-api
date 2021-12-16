import Salary from '../../models/Salary'
import SalaryLog from '../../models/SalaryLog'
import Employee from '../../models/Employee'
import User from '../../models/User'
import async from 'async'
import auth from '../../auth'
import { isId, isValidDate, winsErr, string, actionsKeys } from '../../config';
import winston from 'winston';
import moment from 'moment'
import {locale} from "../../lang";

module.exports = function(router){
    router.get('/get/salaries', auth.employee, function(req, res){
        let hadAction = (((req.employee || {}).role || {}).actions || []).some((c) => ['read_salary', 'edit_salary'].indexOf(c) > -1);
        let hasAccess = ((req.employee || {}).staticRole === 'lord' || (req.employee || {}).staticRole === 'hrManager' || (req.employee || {}).staticRole === 'chairman')
            || hadAction;


        const {year_month, company, employee} = req.query;
        const date = new Date(year_month);
        let filterSalary = [
            {year_month: date},
            {status: {$ne: 'deleted'}},
        ];
        let filterEmployee = [
            {status: {$nin: ['delete', 'fired']}},
            {staticRole: {$in: ['employee', 'hrManager', 'chairman', 'lord']}},
        ];


        if(!hasAccess){
            filterEmployee = [{status:{$nin: ['delete', 'fired']}}, {_id: req.employee._id}];
            filterSalary = [{year_month: date},{status:'approved'}, {'employee.emp': req.employee._id}];
        } else {
            if(company && company !== '' && company !== 'all'){
                filterEmployee = [...filterEmployee, {company: company}];
                filterSalary = [...filterSalary, {company: company}];
            }else{
                filterEmployee = [...filterEmployee, {company: {$in: [...(req.subsidiaries || []), req.company._id]}}];
                filterSalary = [...filterSalary, {company: {$in: [...(req.subsidiaries || []), req.company._id]}}];
            }
            if(employee && employee !== ''){
                filterEmployee = [...filterEmployee, {_id: employee}];
                filterSalary = [...filterSalary, {employee: employee}];
            }
        }

        if(isValidDate(date)){
            async.parallel({
                employees: function (cb) {
                    Employee.find({$and: filterEmployee}, {user: 1, company: 1, bank: 1}).deepPopulate('company').populate('user', {register_id: 1, last_name: 1, first_name: 1}).lean().exec(function(err, employees) {
                        cb(err, employees)
                    })
                },
                salaries: function(cb){
                    Salary.find({$and: filterSalary}).exec(function(err, salaries){
                        cb(err, salaries)
                    })
                }
            }, function (err, data) {
                if(err) {
                    winsErr(req, res, '/get/salaries');
                }
                let employees = (data.employees || []).map(emp => {
                    let initial_salary = 0;
                    let status = 'idle';
                    let salaryObj = '';
                    let company = {
                        _id: (emp.company || {})._id,
                        name: (emp.company || {}).name
                    };
                    let hungulult = 0;
                    let hool_unaanii_mungu = 0;
                    let add = [
                        {amount: 0, type: 'nemegdel', description: ''},
                        {amount: 0, type: 'uramshuulal', description: ''},
                        {amount: 0, type: 'iluu_tsagiin_huls', description: ''},
                        {amount: 0, type: 'busad', description: ''}
                    ];
                    let sub = [
                        {amount: 0, type: 'taslalt', description: ''},
                        {amount: 0, type: 'hotsrolt', description: ''},
                        {amount: 0, type: 'n_d_sh', description: ''},
                        {amount: 0, type: 'h_h_o_a_t', description: ''},
                        {amount: 0, type: 'busad', description: ''}
                    ];
                    (data.salaries || []).map(salary => {
                        if(((salary.employee || {}).emp || 'sd').toString() === (emp._id || 'as').toString()){
                            add = (salary.add || []);
                            sub = (salary.sub || []);
                            initial_salary = (salary.initial_salary || 0);
                            hungulult = (salary.hungulult || 0);
                            hool_unaanii_mungu = (salary.hool_unaanii_mungu || 0);
                            status = (salary.status || 'idle');
                            salaryObj = salary._id || '';
                        }
                    });
                    return {
                        ...emp,
                        company: company,
                        add: add,
                        sub: sub,
                        hungulult: hungulult,
                        hool_unaanii_mungu: hool_unaanii_mungu,
                        salary: initial_salary,
                        salary_status: status,
                        salary_id: salaryObj
                    };
                });
                return res.json({success: true, employees: employees});
            })
        }else{
            winsErr(req, res, '/get/salaries - date');
            return res.json({success: false, msg: locale("system_err")});
        }
    });
    router.post('/save/salary/employee', (req, res, next) => auth.company(req, res, next, ['read_salary', 'edit_salary']), function(req, res){
        const {_id, userId , salary=0, add=[], sub=[], hool_unaanii_mungu=0, hungulult=0, year_month, salary_id=''} = req.body;
        Employee.findOne({_id: _id, status: {$nin: ['delete', 'fired']}}).exec(function(err, emp){
            if(err){
                winsErr(req, res, '/save/salary/employee - employee.findOne()');
                return res.json({success: false, msg: `${locale("system_err")} 7`});
            }
            if((emp.company || 'as').toString() === (req.company._id || '').toString()){
                if(!_id || _id === '' || !userId || userId === ''){
                    winsErr(req, res, '/save/salary/employee - _id');
                    return res.json({success: false, msg: `${locale("system_err")} 1`});
                }
                let addNew = [
                    {amount: 0, type: 'nemegdel', description: ''},
                    {amount: 0, type: 'uramshuulal', description: ''},
                    {amount: 0, type: 'iluu_tsagiin_huls', description: ''},
                    {amount: 0, type: 'busad', description: ''}
                ];
                let subNew = [
                    {amount: 0, type: 'taslalt', description: ''},
                    {amount: 0, type: 'hotsrolt', description: ''},
                    {amount: 0, type: 'n_d_sh', description: ''},
                    {amount: 0, type: 'h_h_o_a_t', description: ''},
                    {amount: 0, type: 'busad', description: ''}
                ];
                if(Object.keys(add).length !== 0){
                    addNew = add;
                }
                if(Object.keys(sub).length !== 0){
                    subNew = sub;
                }
                if(salary_id === ''){
                    let empSalary = new Salary();
                    empSalary.company = ((req.company || {})._id || req.employee.company);
                    empSalary.employee = {emp: _id, user: userId};
                    empSalary.initial_salary = salary;
                    empSalary.year_month = year_month;
                    empSalary.status = 'idle';
                    empSalary.add = addNew;
                    empSalary.sub = subNew;
                    empSalary.hool_unaanii_mungu = hool_unaanii_mungu || 0;
                    empSalary.hungulult = hungulult || 0;
                    empSalary.save((err, sal) => {
                        if(err){
                            winsErr(req, res, '/save/salary/employee - create - salary.save()');
                            return res.json({success: false, msg: `${locale("system_err")} 2`});
                        }
                        let log = new SalaryLog();
                        log.company = (req.company || {})._id;
                        log.salary = sal._id;
                        log.initial_salary = salary;
                        log.employee = (req.employee || {})._id;
                        log.year_month = year_month;
                        log.employee = {emp: (req.employee || {})._id, user: (req.employee || {}).user};
                        log.action = 'created';
                        log.add = addNew;
                        log.sub = subNew;
                        log.hool_unaanii_mungu = hool_unaanii_mungu || 0;
                        log.hungulult = hungulult || 0;
                        log.save((er, lo) => {
                            if(er){
                                winsErr(req, res, '/save/salary/employee - create - log.save()');
                                return res.json({success: false, msg: `${locale("system_err")} 3`});
                            }
                            return res.json({success: true, salary, emp: _id, add: addNew, sub: subNew, hool_unaanii_mungu: hool_unaanii_mungu, hungulult: hungulult, year_month, status: 'idle', salary_id: sal._id});
                        });
                    });
                }else{
                    let log = new SalaryLog();
                    log.company = (req.company || {})._id;
                    log.salary = salary_id;
                    log.initial_salary = salary;
                    log.action = 'updated';
                    log.year_month = year_month;
                    log.employee = {emp: (req.employee || {})._id, user: (req.employee || {}).user};
                    log.add = addNew;
                    log.sub = subNew;
                    log.hool_unaanii_mungu = hool_unaanii_mungu || 0;
                    log.hungulult = hungulult || 0;
                    log.save((er, lo) => {
                        if(er){
                            winsErr(req, res, '/save/salary/employee - update - log.save()');
                            return res.json({success: false, msg: `${locale("system_err")} 4`});
                        }
                        const date = new Date(year_month);
                        if(!date || !isValidDate(date)){
                            winsErr(req, res, '/save/salary/employee - update - date');
                            return res.json({success: false, msg: `${locale("system_err")} 5`});
                        }
                        Salary.findOneAndUpdate({_id: salary_id, company: {$in: [...(req.subsidiaries || []), req.company._id]}, year_month: date, status: {$nin: ['pending', 'approved']}}, {initial_salary: salary, add: addNew, sub: subNew, status: 'idle', hungulult: hungulult || 0, hool_unaanii_mungu: hool_unaanii_mungu || 0}).exec(function(err, sal){
                            if(err){
                                winsErr(req, res, '/save/salary/employee - update - salary.save()');
                                return res.json({success: false, msg: `${locale("system_err")} 6`});
                            }
                            if(sal){
                                return res.json({success: true, salary, emp: _id, add: addNew, sub: subNew, hool_unaanii_mungu: hool_unaanii_mungu, hungulult: hungulult, year_month, status: 'idle', salary_id: salary_id, prior: sal});
                            }else{
                                return res.json({success: false, msg: locale("salary_routers_all.salary_not_found")});
                            }
                        })
                    });
                }
            }else{
                return res.json({success: false, msg: locale("salary_routers_all.cannot_change_subsidiary_salary")});
            }
        });
    });
    router.post('/change/salary/status', (req, res, next) => auth.company(req, res, next, ['read_salary', 'edit_salary']), function(req, res){
        const {_id, status='pending', year_month} = req.body;
        const date = new Date(year_month);
        if(!_id || _id === ''){
            return res.json({success: false, msg: locale("salary_routers_all.insert_salary")});
        }
        if(!date || !isValidDate(date)){
            winsErr(req, res, '/change/salary/status - date');
            return res.json({success: false, msg: `${locale("system_err")} 1`});
        }
        Salary.findOne({_id: _id, company: {$in: [...(req.subsidiaries || []), req.company._id]}, year_month: date, status: {$ne: 'deleted'}}).exec(function(err, sal){
            if(err){
                winsErr(req, res, '/change/salary/status - salary.find()');
                return res.json({success: false, msg: `${locale("system_err")} 2`});
            }
            Employee.findOne({_id: (sal.employee || {}).emp, status: {$nin: ['delete', 'fired']}}).exec(function(err, emp){
                if(err){
                    winsErr(req, res, '/change/salary/status - employee.find()');
                    return res.json({success: false, msg: `${locale("system_err")} 5`});
                }
                if((emp.company || 'as').toString() === (req.company._id || '').toString()){
                    if(sal){
                        if(
                            (sal.status === 'idle' && status === 'pending') ||
                            ((sal.status === 'pending' || sal.status === 'declined') && status === 'idle') ||
                            // (sal.status === 'approved' && status === 'idle' && (req.employee || {}).staticRole === 'lord')
                            (sal.status === 'approved' && status === 'idle')
                        ){
                            let log = new SalaryLog();
                            log.company = req.company._id;
                            log.salary = _id;
                            log.initial_salary = sal.initial_salary;
                            log.employee = {emp: (req.employee || {})._id, user: (req.employee || {}).user};
                            log.action = status;
                            // if((sal.status === 'approved' && status === 'idle' && (req.employee || {}).staticRole === 'lord')){
                            if((sal.status === 'approved' && status === 'idle')){
                                log.action = 're_open';
                            }
                            log.add = sal.add;
                            log.sub = sal.sub;
                            log.year_month = sal.year_month;
                            log.hungulult = sal.hungulult;
                            log.hool_unaanii_mungu = sal.hool_unaanii_mungu;
                            log.save((err, lo) => {
                                if(err){
                                    winsErr(req, res, '/change/salary/status - log.save()');
                                    return res.json({success: false, msg: `${locale("system_err")} 3`});
                                }
                                sal.status = status;
                                sal.save((er, sa) => {
                                    if(er){
                                        winsErr(req, res, '/change/salary/status - salary.save()');
                                        return res.json({success: false, msg: `${locale("system_err")} 4`});
                                    }
                                    return res.json({success: true, id: _id, status: status, employee: ((sa.employee || {}).emp || '')});
                                })
                            });
                        }else{
                            return res.json({success: false, msg: locale("salary_routers_all.salary_not_found")});
                        }
                    }else{
                        return res.json({success: false, msg: locale("salary_routers_all.salary_not_found")});
                    }
                }else{
                    return res.json({success: false, msg: locale("salary_routers_all.cannot_change_subsidiary_salary")});
                }
            })
        });
    });
    router.post('/delete/salary/employee', (req, res, next) => auth.company(req, res, next, ['read_salary', 'edit_salary']), function(req, res){
        const {_id} = req.body;
        Salary.findOne({_id: _id, company: {$in: [...(req.subsidiaries || []), req.company._id]}, status: 'idle'}).exec(function(err, sal){
            if(err){
                winsErr(req, res, '/delete/salary/employee - salary.find()');
                return res.json({success: false, msg: `${locale("system_err")} 1`});
            }
            Employee.findOne({_id: (sal.employee || {}).emp, status: {$nin: ['delete', 'fired']}}).exec(function(err, emp){
                if(err){
                    winsErr(req, res, '/delete/salary/employee - employee.find()');
                    return res.json({success: false, msg: `${locale("system_err")} 4`});
                }
                if((emp.company || 'as').toString() === (req.company._id || '').toString()){
                    if(sal){
                        let log = new SalaryLog();
                        log.company = req.company._id;
                        log.salary = _id;
                        log.initial_salary = sal.initial_salary;
                        log.action = 'deleted';
                        log.add = sal.add;
                        log.sub = sal.sub;
                        log.year_month = sal.year_month;
                        log.employee = {emp: (req.employee || {})._id, user: (req.employee || {}).user};
                        log.hungulult = sal.hungulult;
                        log.hool_unaanii_mungu = sal.hool_unaanii_mungu;
                        log.save((err, lo) => {
                            if(err){
                                winsErr(req, res, '/complete/salary - log.save()');
                                return res.json({success: false, msg: `${locale("system_err")} 2`});
                            }
                            sal.status = 'deleted';
                            sal.save((er, sa) => {
                                if(er){
                                    winsErr(req, res, '/complete/salary - salary.save()');
                                    return res.json({success: false, msg: `${locale("system_err")} 3`});
                                }
                                return res.json({success: true, id: _id, employee: ((sa.employee || {}).emp || ''), deleted: sal});
                            })
                        });
                    }else{
                        return res.json({success: false, msg: locale("salary_routers_all.salary_not_found")});
                    }
                }else{
                    return res.json({success: false, msg: locale("salary_routers_all.cannot_change_subsidiary_salary")});
                }
            });
        });
    });
    router.post('/complete/salary', (req, res, next) => auth.company(req, res, next, ['read_salary', 'edit_salary']), function(req, res){
        // if((req.employee || {}).staticRole !== 'lord'){
        //     return res.json({success: false, msg: 'Энэ үйлдлийг хийх боломжгүй байна'});
        // }
        const {_id, status, year_month} = req.body;
        const date = new Date(year_month);
        if(!date || !isValidDate(date)){
            winsErr(req, res, '/complete/salary - date');
            return res.json({success: false, msg: `${locale("system_err")} 1`});
        }
        Salary.findOne({_id: _id, company: {$in: [...(req.subsidiaries || []), req.company._id]}, year_month: date, status: 'pending'}).exec(function(err, sal){
            if(err){
                winsErr(req, res, '/complete/salary - salary.find()');
                return res.json({success: false, msg: `${locale("system_err")} 2`});
            }
            Employee.findOne({_id: (sal.employee || {}).emp, status: {$nin: ['delete', 'fired']}}).exec(function(err, emp){
                if(err){
                    winsErr(req, res, '/complete/salary - employee.find()');
                    return res.json({success: false, msg: `${locale("system_err")} 6`});
                }
                if((emp.company || 'as').toString() === (req.company._id || '').toString()){
                    if(sal){
                        let log = new SalaryLog();
                        log.company = req.company._id;
                        log.salary = _id;
                        log.initial_salary = sal.initial_salary;
                        log.employee = {emp: (req.employee || {})._id, user: (req.employee || {}).user};
                        log.action = status;
                        log.add = sal.add;
                        log.sub = sal.sub;
                        log.year_month = sal.year_month;
                        log.hungulult = sal.hungulult;
                        log.hool_unaanii_mungu = sal.hool_unaanii_mungu;
                        log.save((err, lo) => {
                            if(err){
                                winsErr(req, res, '/complete/salary - log.save()');
                                return res.json({success: false, msg: `${locale("system_err")} 3`});
                            }
                            sal.status = status;
                            sal.save((er, sa) => {
                                if(er){
                                    winsErr(req, res, '/complete/salary - salary.save()');
                                    return res.json({success: false, msg: `${locale("system_err")} 4`});
                                }
                                return res.json({success: true, id: _id, status: status, employee: ((sa.employee || {}).emp || '')});
                            })
                        });
                    }else{
                        return res.json({success: false, msg: locale("salary_routers_all.salary_not_found")});
                    }
                }else{
                    return res.json({success: false, msg: locale("salary_routers_all.cannot_change_subsidiary_salary")});
                }
            })
        });
    });
    router.get('/get/salary/logs', (req, res, next) => auth.company(req, res, next, ['read_salary']), function(req, res){
        // if(req.employee.staticRole !== 'lord'){
        //     return res.json({success: false, msg: 'Зөвхөн захирал үзэх боломжтой'});
        // }
        const {year_month} = req.query;
        const date = new Date(year_month);
        SalaryLog.find({year_month: date, company: {$in: [...(req.subsidiaries || []), req.company._id]}}).deepPopulate(['salary']).sort({created: -1}).lean().exec(function(err, logs){
            async.map(logs, function(item, callback){
                let arr = [];
                if((item.employee || {}).user){
                    arr.push(item.employee.user);
                }
                if(((item.salary || {}).employee || {}).user){
                    arr.push(item.salary.employee.user);
                }
                User.find({_id: {$in:arr}}, {first_name: 1, last_name: 1, avatar: 1, register_id: 1}).deepPopulate(['avatar']).lean().exec(function(err, users){
                    if(err){
                        winsErr(req, err, 'User.find');
                        return res.json({success: true, logs: []});
                    }
                    let employee = item.employee || {};
                    let salEmployee = (item.salary || {}).employee || {};
                    (users || []).map(function (r) {
                        if(employee.user && (employee.user || '').toString() === (r._id || 'sa').toString()){
                            employee.user = r;
                        }
                        if(salEmployee.user && (salEmployee.user || '').toString() === (r._id || 'sa').toString()){
                            salEmployee.user = r;
                        }
                    });
                    callback(err, {
                        ...item,
                        employee: employee,
                        salEmployee: salEmployee,
                    });
                });
            }, function(err, logs){
                if(err){
                    winsErr(req, err, 'async.map');
                    return res.json({success: true, logs: []});
                }
                return res.json({success: true, logs: logs});
            });
        });
    });
};