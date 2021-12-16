import async from 'async';
import auth from '../../auth';
import Company from '../../models/Company';
import User from '../../models/User';
import Employee from '../../models/Employee';
import Media from '../../models/Media';
import CompanyTransaction from '../../models/Company_Transaction';
import SystemBundle from '../../models/System_bundle';
import ChargeRequest from '../../models/charge_request';
import moment from 'moment';
import { isId, isValidDate, winsErr, string, bool } from '../../config';


module.exports = function(router){
    router.get('/get/charge/requests', auth.admin, function(req, res){
        ChargeRequest.find({status: {$ne: 'active'}}).deepPopulate(['employee', 'employee.user', 'type', 'responsed_admin', 'company', 'company.logo']).lean().exec(function(err, chargeRequest){
            if(err){winsErr(req, err, 'ChargeRequest.findOne');}
            return res.json({sda: req.body, chargeRequests: chargeRequest});
        })
    });
    router.get('/get/company/transactions', auth.admin, function(req, res){
        CompanyTransaction.find({}).sort({created: -1}).deepPopulate([
            'company',
            'company.logo',
            'system_bundle',
            'charge_request',
            'charge_request.type',
            'charge_request.employee',
            'charge_request.employee.user',
            'charge_request.responsed_admin'
        ]).lean().exec(function(err, compTrans){
            return res.json({success: !(err), companyTransactions: compTrans});
        });
    });
    router.post('/insert/new/transaction', auth.admin, function(req, res){
        const { num_recruitment, num_file_size, company, cost } = req.body || {};
        if(!isId(company)){
            return res.json({success: false, msg: 'Компани сонгоно уу!'});
        } else if(cost === '' || parseInt(cost) <= 0){
            return res.json({success: false, msg: 'Үнэ оруулна уу!'});
        } else {
            CompanyTransaction.findOne({company: company}).sort({created: -1}).deepPopulate(['system_bundle']).lean().exec(function(err, compT){
                if(err){winsErr(req, res, 'CompanyTransaction.findOne()')}
                let compTrans = new CompanyTransaction();
                compTrans.company = company;
                compTrans.ending_date = compT.ending_date;
                compTrans.transaction = {
                    result: {
                        fileSize: (compT.num_file_size || 0) + (num_file_size || 0),
                        recSize: (compT.num_recruitment || 0) + (num_recruitment || 0),
                    },
                    fileSize: (num_file_size || 0),
                    recSize: (num_recruitment || 0),
                    cost: cost
                };
                compTrans.admin = req.admin._id;
                compTrans.save((err, cp) => {
                    if(err){winsErr(req, res, 'compTrans.save()')}
                    if(cp){
                        compTrans.deepPopulate(['company', 'company.logo', 'system_bundle'], function(err, cp1){
                            return res.json({success: !(err), sucmod: !(err), msg: (err ? 'Багц нэмхэд алдаа гарлаа.' : 'Амжилттай багц нэмлээ.'), transaction: cp1});
                        });
                    } else {
                        return res.json({success: false, msg: 'Багц нэмхэд алдаа гарлаа.'});
                    }
                })
            })
        }
    });
};