import winston from 'winston';
import {check, validationResult} from "express-validator/check";
import {matchedData} from "express-validator/filter";
import User from "../models/User";
import bcrypt from "bcrypt-node";
import jwt from "jsonwebtoken";
import renderFront from "../views/front";
import config from "../config";
import fs from "fs";
import path from "path";
import auth from "../auth";
import locale from "../lang";

module.exports = function (router, cache) {
    router.post('/changeAvatar', auth.user ,[
        check('image'),
    ],function (req, res) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(200).json({success:false,msg: errors.array()[0].msg});
        }
        let data = matchedData(req);
        if(data.image){
            let path = null;
            if(data.image.path && data.image.path !== ''){
                path = data.image._id;
            }
            User.findOne( {_id:req.user._id}, function (err, usr) {
                if (err) {
                    winston.error('/merchant/api/changeAvatar 1');
                    return res.status(200).json({success:false,msg: `${locale("system_err")} 1`});
                }
                if(path){
                    usr.avatar = path;
                }
                usr.save(function (err, ko) {
                    if (err) {
                        winston.error('/merchant/api/submitTimeline 2');
                        return res.status(200).json({success:false,msg: `${locale("system_err")} 2`, err});
                    }
                    return res.status(200).json({success:true, avatar:data.image });
                });
            });
        } else {
            return res.status(200).json({success:false });
        }
    });
};