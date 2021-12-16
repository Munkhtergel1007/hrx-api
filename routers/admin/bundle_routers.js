import winston from 'winston';
import async from 'async';
import bcrypt from "bcrypt-node";
import auth from '../../auth';
import Company from '../../models/Company';
import Admin from '../../models/Admin';
import SystemBundle from '../../models/System_bundle';
import Media from '../../models/Media';
import { isId, isValidDate, winsErr, string, bool } from '../../config';
import Employee from "../../models/Employee";

const types = ["zarlal", "bagtaamj", "semi"];
module.exports = function(router){
    router.get('/get/bundles/', auth.admin, function(req, res){
        SystemBundle.find({status: 'active'}).sort({created: -1}).deepPopulate(['admin', 'admin.avatar']).lean().exec(function(err, bundles){
            if(err){winsErr(req, err, 'SystemBundle.find()')}
            return res.json({success: !(err), bundles: bundles});
        })
    });
    router.post('/insert/bundle', auth.admin, function(req, res){
        const { between = {}, cost, days, desc, title, num_recruitment, sale, type, num_file_size, _id } = req.body || {};
        if(types.indexOf(type) === -1){
            return res.json({success: false, msg: 'Төрөл сонгоно уу!'});
        } else if(between.start_date && !isValidDate(between.start_date) && between.end_date && !isValidDate(between.end_date)){
            return res.json({success: false, msg: 'Хямдрах өдөр зөв эсэхээ шалгана уу!'});
        } else {
            if(isId(_id)){
                SystemBundle.findOne({_id: _id}, function(err, SysBundle){
                    if(err){winsErr(req, err, 'SystemBundle.findOne()')}
                    if(SysBundle){
                        SysBundle.between = between;
                        SysBundle.cost = cost;
                        SysBundle.days = days;
                        SysBundle.desc = string(desc);
                        SysBundle.title = string(title);
                        SysBundle.type = type;
                        SysBundle.num_recruitment = num_recruitment;
                        SysBundle.num_file_size = num_file_size;
                        SysBundle.sale = sale;
                        SysBundle.admin = req.admin._id;
                        SysBundle.status = 'active';
                        SysBundle.save((err, banid) => {
                            if(err){winsErr(req, err, 'bundle.save()')}
                            if(banid){
                                SysBundle.deepPopulate(['admin', 'admin.avatar'], function(err, banidia){
                                    if(err){winsErr(req, err, 'banid.deepPopulate()')}
                                    return res.json({success: !(err), sucmod: !(err), bundle: banidia, msg: (err ? '' : 'Багц амжилттай хадгаллаа!')});
                                })
                            } else {
                                return res.json({success: false, msg: 'Багц хадгалах үед алдаа гарлаа.'});
                            }
                        });
                    } else {
                        return res.json({success: false, msg: 'Багц олдсонгүй!'});
                    }
                });
            } else {
                let bundle = new SystemBundle();
                bundle.between = between;
                bundle.cost = cost;
                bundle.days = days;
                bundle.desc = string(desc);
                bundle.title = string(title);
                bundle.type = type;
                bundle.num_recruitment = num_recruitment;
                bundle.num_file_size = num_file_size;
                bundle.sale = sale;
                bundle.admin = req.admin._id;
                bundle.status = 'active';
                bundle.save((err, banid) => {
                    if(err){winsErr(req, err, 'bundle.save()')}
                    if(banid){
                        bundle.deepPopulate(['admin', 'admin.avatar'], function(err, banidia){
                            if(err){winsErr(req, err, 'banid.deepPopulate()')}
                            return res.json({success: !(err), sucmod: !(err), bundle: banidia, msg: (err ? '' : 'Багц амжилттай хадгаллаа!')});
                        })
                    } else {
                        return res.json({success: false, msg: 'Багц хадгалах үед алдаа гарлаа.'});
                    }
                });
            }
        }
    });
    router.post('/set/bundleStatus', auth.admin, function (req, res) {
        if (req.body.id.match(/^[0-9a-fA-F]{24}$/)){
            SystemBundle.findOneAndUpdate({_id: req.body.id}, {status: req.body.status}, {new: true}, function (err, bundle) {
                if(err) {
                    winsErr(req, res, '/set/bundleStatus')
                } else if(bundle) {
                    res.json({
                        success: true,
                        sucmod: !(err),
                        msg: (err ? 'Үйлдэл амжилтгүй.' : 'Багц амжилттай устгагдлаа.'),
                        bundle: bundle
                    })
                } else {
                    res.json({success: false, msg: 'Багц олдсонгүй'});
                }
            })
        }
    })
};