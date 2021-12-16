import express from 'express';
import winston from "winston";
import fs from "fs";
import path from "path";
import renderFront from "../views/front";
import NodeCache from "node-cache";
import auth_routers from "./auth_routers";
import mediaLib_router from "./mediaLib_router";
import user_routers from "./user_routers";
import home_routers from "./home_routers";
import {isPhoneNum, string, winsErr} from "../config";
import CompanyRegReq from '../models/CompRegReq';
import { locale } from "../lang";
const myCache = new NodeCache({deleteOnExpire: false});

module.exports = function(app) {

    app.post('/register/request', function(req, res){
        const {
            full_name,
            email,
            phone,
            company_name,
            position_name,
        } = req.body || {};
        if(!isPhoneNum(phone)){
            return res.json({success: false, check: 'phone', msg: locale("phoneError.insert")});
        } else if(string(full_name) === '' || !isNaN(full_name)){
            return res.json({success: false, check: 'full_name', msg: locale("firstNameError.insert")});
        } else if(string(company_name) === ''){
            return res.json({success: false, check: 'company_name', msg: locale("companyError.name.insert")});
        } else if(string(position_name) === ''){
            return res.json({success: false, check: 'position_name', msg: locale("companyError.role.insert")});
        } else {
            let cm = new CompanyRegReq();
                cm.full_name = full_name;
                cm.email = email;
                cm.phone = phone;
                cm.company_name = company_name;
                cm.position_name = position_name;
                cm.status = 'pending';
                cm.save((err, newCm) => {
                    if(err){winsErr(req, err, 'cm.save');}
                    return res.json({success: !(err)});
                });
        }
    });

    app.get('/logout',function(req, res){
        req.session.destroy();
        res.clearCookie('token', { domain: `.${req.domain}` });
        return res.redirect("/");
    });

    app.get('/app/logout',function(req, res){
        req.session.destroy();
        res.clearCookie('token', { domain: `.${req.domain}` });
        return res.json({success: true});
    });


    app.post('/api/error/add', function(req,res) {
        winston.error(`CLIENT:  ${req.body.url}  ->  ${req.body.error}: `,req.body.errorInfo);
        res.json({success:true});
    });


    app.get('/api/flush/all', function(req,res) {
        myCache.flushAll();
        res.json({success:true});
    });

    const authRouter = express.Router();
    auth_routers(authRouter, myCache);
    app.use('/api',authRouter);

    const mediaLibRouter = express.Router();
    mediaLib_router(mediaLibRouter, myCache);
    app.use('/api',mediaLibRouter);

    const userRouter = express.Router();
    user_routers(userRouter, myCache);
    app.use('/api',userRouter);

    const homeRouter = express.Router();
    home_routers(homeRouter, myCache);
    app.use('/api',homeRouter);

    app.get('/*', function(req,res) {
        var data = fs.readFileSync(`${path.join(__dirname, '../../hrx_react', 'static')}/manifest.json`);
        let manifest = JSON.parse(data);
        // console.log('init main');
        // console.log('req.employee', (req.employees || []).length);
        // console.log('req.company', (req.companies || []).length);
        const initialState = {
            main:{
                user:req.user || null,
                companies:req.companies || [],
                pendingCompanies:req.pendingCompanies || [],
                employees:req.employees || [],
                domain:req.domain
            }
        };
        res.header("Content-Type", "text/html; charset=utf-8");
        res.status(200).end(renderFront(initialState, manifest));
    });
};