import winston from 'winston';
import {check, validationResult} from "express-validator/check";
import {matchedData} from "express-validator/filter";
import async from 'async';
import bcrypt from "bcrypt-node";
import jwt from "jsonwebtoken";
import renderFront from "../views/front";
import config from "../config";
import fs from "fs";
import path from "path";
import {winsErr, isPhoneNum, string} from "../config";
import Company from "../models/Company";
import Employee from "../models/Employee";
import User from "../models/User";
var FB = require('fb');
FB.extend({appId: '1025498560826970', appSecret: '5d35f87bf7565b6ce35f4f224b164864'});
let nodemailer = require('nodemailer');

module.exports = function (router, cache) {
    // router.post('/password/reset', [
    //     check('email')
    //         .not()
    //         .isEmpty()
    //         .withMessage('Имэйл хаяг оруулна уу')
    //         .isEmail()
    //         .withMessage('Имэйл буруу байна')
    //         .trim(),
    // ], function (req, res){
    //     const errors = validationResult(req);
    //     if (!errors.isEmpty()) {
    //         return res.json({success: false, msg: errors.array()[0].msg});
    //     }
    //     let data = matchedData(req);
    //     const emailRegex = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    //     if(emailRegex.test(data.email)){
    //         User.findOne(
    //             {email: {$regex: new RegExp('^'+data.email+'$', 'i')}, status: {$ne: 'delete'}}
    //         ).exec(function (err, user){
    //             if(err){
    //                 winsErr(req, res, '/password/reset')
    //                 return res.json({success: false, msg: 'Системийн алдаа'})
    //             }
    //             if(user){
    //                 var transporter = nodemailer.createTransport({
    //                     service: 'Gmail',
    //                     auth: {
    //                         user: 'info@hrx.mn',
    //                         pass: ''
    //                     }
    //                 })
    //             } else {
    //                 return res.json({success: false, sucmod: false, msg: 'Бүртгэлтэй хэрэглэгч олдсонгүй'})
    //             }
    //         })
    //     }
    // })
};